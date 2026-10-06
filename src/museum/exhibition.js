// exhibition.js - Builds one world from its definition (plain data; see src/content/exhibitions/)
// into a Space: the ground, the sky and its light, the air (fog, mist, drifting particles), the
// scenery, the exhibits, its doorways, and its sound. A world is either a whole exhibition, or one
// scene of a universe (its gallery, a location, a legendary moment...): the same builder makes both.
//
// definition: {
//   id, title, kind                          kind: the scene's kind ('gallery', 'location', 'moment'...)
//   arrival: { at: [x, z], facing }          where the visitor appears
//   arrivals: { [scene id]: { at, facing, line } } ...or, coming from another scene, where they appear
//   exit: { at: [x, z], facing }             the doorway back to the museum (or: a portal to 'museum')
//   portals: [{ to, at, facing, frame, title, subtitle, prompt, accent, preview, shape, entity }]
//                                            doorways to other scenes of the universe, or 'museum'
//   bounds: { minX, maxX, minZ, maxZ }       how far the visitor can walk
//   boundary: { radius, sides }              an invisible ring the visitor can't pass (the forest edge)
//   walls: [[ax, az, bx, bz], ...]           invisible walls (the edge of a quay)
//   ground, sky, fog: { color, density }, look: { exposure, bloom }, particleLight
//     ground.visible: false   walk on it, but don't draw it (an indoor floor drawn by the scenery)
//     sky.hidden: true        light and reflections from the sky, but no sky to see (indoors)
//   lights: [{ type: 'hemisphere' | 'directional' | 'point' | 'spot' | 'ambient', ... }]
//   scenery: [{ piece, at | positions, facing, scale, ...the piece's own options }]
//   atmosphere: [{ type: 'particles' | 'mist', ... }]
//   audio: { ambience: [...], room: { amount, decay } }
//   exhibits: [...] (see exhibit.js); in a universe, an exhibit may name an `entity` instead of
//             giving its own words: its placard then tells that entity's story and connections
//   navigation: { at, facing }               the universe's world chart (src/universe/navigation.js)
//   timeline: { from: [x, z], to: [x, z], events }  the universe's events as a walk (src/universe/timeline.js);
//                                            several walks: a list of them, each with its own events
//   moment: { beats, resolution, ... }       a legendary moment held still (src/universe/moment.js)
//   arrivalLine: a line shown on arrival
// }
//
// Anything placed (exhibits, portals) can be given in the frame of a piece that declares one (a
// ship's deck: { frame: 'kestrel', at: [x, z] } is x metres to its right and z to its stern).
//
// In a universe, where each entity is shown is remembered (space.anchors: the first exhibit, post,
// pin or doorway to claim it, unless an exhibit says anchor: false) with where to stand to see it, and
// handed to the universe once the world is built, so placards elsewhere can lead here.
//
// `kit`, handed to every scenery piece and exhibit model: { space, ground, materials, random, time,
// quality, landmarks, frames, named, add, addCollider, addSolid, addReactive, addInteractable,
// onUpdate, guide, cue, say }.
import * as THREE from 'three';
import { Space } from './space.js';
import { createExhibit } from './exhibit.js';
import { buildReturnPortal, buildTravelPortal } from './gallery.js';
import { PROMPTS } from './taxonomy.js';
import { createGround } from '../scenery/ground.js';
import { createSkyDome, environmentMap, directionFrom } from '../scenery/skyDome.js';
import { createParticles, createMist } from '../scenery/atmosphere.js';
import { loadPiece } from '../scenery/catalog.js';
import { createRandom, facingToYaw, toWorld, standBefore } from '../scenery/kit.js';
import { entityExhibit } from '../universe/exhibits.js';

function addLights(space, lights = [], { shadows, center = [0, 0] }) {
    for (const spec of lights) {
        let light;
        if (spec.type === 'hemisphere') {
            light = new THREE.HemisphereLight(spec.sky, spec.ground, spec.intensity ?? 1);
        } else if (spec.type === 'ambient') {
            light = new THREE.AmbientLight(spec.color, spec.intensity ?? 0.3);
        } else if (spec.type === 'directional') {
            light = new THREE.DirectionalLight(spec.color, spec.intensity ?? 1);
            const direction = directionFrom(spec.facing ?? 0, spec.elevation ?? 40);
            light.target.position.set(center[0], 0, center[1]);
            light.position.copy(light.target.position).addScaledVector(direction, 80);
            space.add(light.target);
            if (shadows && spec.shadows) {
                const reach = spec.shadowArea ?? 50;
                light.castShadow = true;
                light.shadow.mapSize.set(2048, 2048);
                const camera = light.shadow.camera;
                camera.left = camera.bottom = -reach;
                camera.right = camera.top = reach;
                camera.near = 10;
                camera.far = 180;
                light.shadow.bias = -0.0005;
                light.shadow.normalBias = 0.05;
                light.shadow.radius = 3;
            }
        } else if (spec.type === 'point') {
            light = new THREE.PointLight(spec.color, spec.intensity ?? 5, spec.distance ?? 10, spec.decay ?? 2);
            light.position.set(...spec.at);
        } else if (spec.type === 'spot') {
            light = new THREE.SpotLight(spec.color, spec.intensity ?? 20, spec.distance ?? 20, spec.angle ?? 0.6, spec.penumbra ?? 0.6, spec.decay ?? 1.5);
            light.position.set(...spec.at);
            light.target.position.set(...(spec.target ?? [spec.at[0], 0, spec.at[2]]));
            space.add(light.target);
            if (shadows && spec.shadows) {
                light.castShadow = true;
                light.shadow.mapSize.set(1024, 1024);
                light.shadow.bias = -0.0008;
                light.shadow.normalBias = 0.04;
                light.shadow.radius = 3;
            }
        }
        if (light) {
            if (spec.name) light.name = spec.name;
            space.add(light);
            if (spec.name) space.named[spec.name] = light;
        }
    }
}

// How a piece is placed: once at `at`, once per entry of `positions`, or (a scattering piece) once
const placements = (item, piece) => {
    if (item.positions && !piece.takesPositions) return item.positions.map(at => ({ ...item, at: [at[0], at[1]], facing: at[2] ?? item.facing }));
    return [item];
};

// Where something given in a frame really is: { at: [x, z], facing } in the world
function resolvePlacement(item, frames) {
    if (!item.frame) return { at: item.at, facing: item.facing ?? 0 };
    const frame = frames[item.frame];
    if (!frame) throw new Error(`Nothing declares a frame called "${item.frame}"`);
    const p = toWorld(item.at[0], item.at[1], frame.x, frame.z, frame.yaw);
    return { at: [p.x, p.z], facing: (item.facing ?? 0) + frame.facing };
}

// Let the browser draw a frame (used while building in the background, so walking stays smooth)
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

// definition: the world (see above); summary: its exhibition's registry entry (accent, title, ...);
// context: { renderer (Renderer), quality, museum, services: { placard, soundscape, storyText },
//            gently, universe (when the world is one scene of a universe) }
// gently: build a piece at a time, a frame between each, rather than all at once
export async function buildExhibition(definition, summary, context) {
    const universe = context.universe ?? null;
    const space = new Space({
        id: universe ? `${universe.id}:${definition.id}` : definition.id,
        kind: definition.kind ?? 'exhibition',
        title: definition.title ?? summary.title,
        exhibition: summary.id
    });
    space.scene = definition.id;
    try {
        await fill(space, definition, summary, context);
        return space;
    } catch (error) {
        space.dispose(); // Nothing half-made is left behind
        throw error;
    }
}

async function fill(space, definition, summary, { renderer, quality, museum, services, gently = false, universe = null }) {
    const random = createRandom(definition.seed ?? 7);
    const breathe = gently ? nextFrame : () => null;
    const accent = definition.accent ?? summary.accent ?? '#9fe8ff';
    space.named = {};

    // Scenery kits first: some pieces shape the ground they stand on (a temple's platform, a ship's
    // deck), and some declare frames other things can be placed in
    const scenery = definition.scenery ?? [];
    const pieces = await Promise.all(scenery.map(item => loadPiece(item.piece)));
    const frames = {};
    // and everything placed keeps a little ground clear around it, so forests and grass scattered
    // later don't grow through it (its `clearance`, in metres)
    const areas = [];
    const reserve = (at, radius) => {
        if (radius > 0) areas.push({ shape: 'circle', at, radius, blend: 0 });
    };
    scenery.forEach((item, i) => {
        const piece = pieces[i];
        placements(item, piece).forEach(placed => {
            if (!placed.at || piece.takesPositions) return;
            const [x, z] = placed.at;
            const params = { ...placed, x, z, yaw: facingToYaw(placed.facing ?? 0), scale: placed.scale ?? 1 };
            if (piece.areas) areas.push(...piece.areas(params));
            if (piece.frames) Object.assign(frames, piece.frames(params));
            reserve(placed.at, placed.clearance ?? piece.clearance ?? 0);
        });
    });
    const exhibits = (definition.exhibits ?? []).map(exhibit => ({ ...exhibit, ...resolvePlacement(exhibit, frames) }));
    exhibits.forEach(exhibit => reserve(exhibit.at, exhibit.clearance ?? 2.2));
    const portals = (definition.portals ?? []).map(portal => ({ ...portal, ...resolvePlacement(portal, frames) }));
    portals.forEach(portal => reserve(portal.at, 4));
    if (definition.exit) reserve(definition.exit.at, 4);

    // The ground
    await breathe();
    const groundSpec = definition.ground ?? {};
    const ground = createGround({ ...groundSpec, areas: [...(groundSpec.areas ?? []), ...areas] });
    if (groundSpec.visible !== false) space.add(ground.mesh);
    else ground.mesh.geometry.dispose();
    space.heightAt = ground.heightAt;
    space.surfaceAt = ground.surfaceAt;
    if (definition.bounds) space.bounds = definition.bounds;
    if (definition.boundary) {
        // An invisible ring at the forest's edge
        const { radius, sides = 28, center = [0, 0] } = definition.boundary;
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2, b = ((i + 1) / sides) * Math.PI * 2;
            space.addWall(center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius,
                center[0] + Math.cos(b) * radius, center[1] + Math.sin(b) * radius, 0.2);
        }
    }
    for (const [ax, az, bx, bz, thickness = 0.15] of definition.walls ?? []) space.addWall(ax, az, bx, bz, thickness);

    // Sky, light and air
    await breathe();
    const sky = definition.sky ?? {};
    const dome = createSkyDome(sky);
    if (!sky.hidden) space.add(dome);
    const environment = space.track(environmentMap(renderer.renderer, dome));
    if (sky.hidden) {
        dome.geometry.dispose();
        dome.material.dispose();
    }
    const atmosphere = space.atmosphere;
    atmosphere.environment = environment.texture;
    atmosphere.environmentIntensity = definition.environmentIntensity ?? 0.5;
    const fog = definition.fog ?? { color: '#000000', density: 0.01 };
    atmosphere.fog = new THREE.FogExp2(fog.color, fog.density);
    atmosphere.background = new THREE.Color(fog.color);
    atmosphere.look = definition.look ?? {};
    atmosphere.staticShadows = true;
    if (definition.particleLight) space.particleColor.set(definition.particleLight);
    addLights(space, definition.lights, { shadows: quality.shadows, center: definition.lightCenter });

    // The scenery
    const cue = (name, position = null, volume = 1) => services.soundscape.cue(name, { position, volume });
    const kit = {
        space,
        ground,
        materials: space.materials,
        random,
        time: space.time,
        quality,
        accent,
        landmarks: [],
        frames,
        named: space.named,
        add: object => space.add(object),
        addCollider: collider => space.addCollider(collider),
        addSolid: object => space.addSolid(object),
        addReactive: reactive => space.addReactive(reactive),
        addInteractable: interactable => space.addInteractable(interactable),
        onUpdate: fn => space.onUpdate(fn),
        // Lead the visitor along a path ([[x, z], ...]) on their own feet; resolves on arrival
        guide: (points, options) => space.host?.player.walkTo(points, options) ?? Promise.resolve(),
        // Where the visitor is now (Vector3), or null
        visitor: () => space.host?.player.position ?? null,
        cue,
        say: (line, seconds = 6) => services.storyText?.show(line, seconds)
    };
    for (const [i, item] of scenery.entries()) {
        await breathe();
        const piece = pieces[i];
        placements(item, piece).forEach(placed => {
            if (!placed.at || piece.takesPositions) {
                piece(placed, kit);
                return;
            }
            const [x, z] = placed.at;
            const params = { ...placed, x, z, y: ground.heightAt(x, z), yaw: facingToYaw(placed.facing ?? 0), scale: placed.scale ?? 1 };
            piece(params, kit);
            kit.landmarks.push({ piece: item.piece, x, z, yaw: params.yaw });
        });
    }

    // What hangs in the air
    for (const spec of definition.atmosphere ?? []) {
        let object = null;
        if (spec.type === 'particles') {
            const count = Math.round((spec.count ?? 100) * (quality.low ? 0.5 : 1));
            object = createParticles({ ...spec, count });
        } else if (spec.type === 'mist') {
            object = createMist(spec);
            if (spec.at) object.position.set(spec.at[0], spec.y ?? 0, spec.at[1]);
        }
        if (!object) continue;
        space.add(object);
        if (spec.name) space.named[spec.name] = object;
        const time = object.userData.time;
        space.onUpdate(() => { time.value = space.time.value; }); // The space's clock: it may be held still
    }

    // A universe's features: threads of light between related things, its world chart, its timeline,
    // a legendary moment. Each is its own small download, made only for the worlds that use it.
    let connections = null;
    if (universe) {
        const { Connections } = await import('../universe/connections.js');
        connections = new Connections(space, universe, { accent, soundscape: services.soundscape, here: definition.location, museum });
    }

    // The exhibits; the map table (if any) shows where every one of them is
    const spots = exhibits.map(exhibit => ({ id: exhibit.id, x: exhibit.at[0], z: exhibit.at[1] }));
    const examined = connections ? (definition, anchor) => definition.entity && connections.show(definition.entity, anchor) : null;
    for (const [index, exhibit] of exhibits.entries()) {
        await breathe();
        const resolved = universe && exhibit.entity ? entityExhibit(exhibit, universe, connections) : exhibit;
        const { anchor } = await createExhibit(resolved, {
            kit: { ...kit, exhibitSpots: spots.map(spot => ({ ...spot, self: spot.id === exhibit.id })) },
            space,
            exhibition: { id: summary.id, title: universe?.title ?? definition.title ?? summary.title, accent },
            index,
            total: exhibits.length,
            services,
            onExamine: examined
        });
        // Threads to it lead to its anchor, or (anchorPoint) to the thing it stands for (a ship, not its plaque)
        const point = exhibit.anchorPoint ? new THREE.Vector3(...exhibit.anchorPoint) : anchor;
        if (exhibit.entity && exhibit.anchor !== false) {
            const stand = exhibit.stand
                ? { x: exhibit.stand[0], z: exhibit.stand[1], yaw: facingToYaw(exhibit.stand[2] ?? 0) }
                : { ...standBefore(exhibit.at[0], exhibit.at[1], exhibit.facing ?? 0, (exhibit.radius ?? 0.45) + (exhibit.standOff ?? 1.5)), look: anchor };
            space.claim(exhibit.entity, { point, where: exhibit.where ?? null, stand });
        }
    }

    if (universe && definition.navigation) {
        await breathe();
        const { buildNavigation } = await import('../universe/navigation.js');
        buildNavigation({ space, kit, universe, museum, services, connections, ...definition.navigation });
    }
    if (universe && definition.timeline) {
        await breathe();
        const { buildTimeline } = await import('../universe/timeline.js');
        for (const walk of [definition.timeline].flat()) await buildTimeline({ space, kit, universe, services, connections, ...walk });
    }
    if (definition.moment) {
        await breathe();
        const { buildMoment } = await import('../universe/moment.js');
        buildMoment({ space, kit, services, renderer, quality, ...definition.moment });
    }

    // Its doorways: to the museum, and to the universe's other scenes
    if (definition.exit) {
        const exit = definition.exit;
        buildReturnPortal({ space, museum, at: exit.at, facing: exit.facing, y: ground.heightAt(exit.at[0], exit.at[1]) });
    }
    for (const portal of portals) {
        const target = portal.to === 'museum' ? null : universe?.scene(portal.to);
        if (portal.to !== 'museum' && !target) throw new Error(`Portal to "${portal.to}": no such scene`);
        const { anchor } = buildTravelPortal({
            space,
            at: portal.at,
            facing: portal.facing,
            y: ground.heightAt(portal.at[0], portal.at[1]),
            title: portal.title ?? (target ? target.title : 'Return to Museum'),
            subtitle: portal.subtitle ?? (target ? universe.title : 'Virtual Anime Museum'),
            prompt: portal.prompt ?? (target ? `${PROMPTS.travel} · ${target.title}` : PROMPTS.returnToMuseum),
            accent: portal.accent ?? target?.accent ?? (target ? accent : undefined),
            preview: portal.preview,
            shape: portal.shape,
            width: portal.width,
            height: portal.height,
            ambience: portal.ambience ?? (target ? null : 'museum-hall'),
            go: () => (portal.to === 'museum' ? museum.returnToMuseum() : museum.visit(portal.to, { from: definition.id }))
        });
        if (portal.entity) space.claim(portal.entity, { point: anchor, where: portal.where ?? null, stand: standBefore(portal.at[0], portal.at[1], portal.facing ?? 0, 3.2) });
        if (target) space.exits.push({ id: portal.to, x: portal.at[0], z: portal.at[1] });
    }

    // Where the visitor appears: from the museum, or back from another scene
    const toArrival = ({ at, facing = 0, line = null }) => ({ position: new THREE.Vector3(at[0], 0, at[1]), yaw: facingToYaw(facing), line });
    space.spawn = toArrival(definition.arrival ?? { at: [0, 0], facing: 0 });
    for (const [from, arrival] of Object.entries(definition.arrivals ?? {})) {
        space.arrivals[universe ? `${universe.id}:${from}` : from] = toArrival(arrival);
    }
    space.ambience = definition.audio?.ambience ?? null;
    space.room = definition.audio?.room ?? { amount: 0.05, decay: 1.5 };
    space.arrivalLine = definition.arrivalLine ?? null;
    space.connections = connections;
    universe?.place(definition.id, space.anchors); // So what is shown here can be found from elsewhere
}
