// gallery.js - The museum's doorways between worlds.
//
//   createPortal()        a doorway: a dark frame edged with light, its surface a window into the
//                         world beyond (portalSurface.js), casting that world's light on the floor
//   buildGallery()        an exhibition's place in the lobby: an alcove in the wall with the doorway
//                         at its back, the exhibition's name over it, a plaque beside it, a line of
//                         light in the floor leading to it, and its world's sound leaking out.
//                         An open exhibition can be entered ("Enter Exhibition"); one still in
//                         preparation is sealed behind frosted light.
//   buildTravelPortal()   a doorway standing in a world, to the museum or to another scene of a
//                         universe: a frame on a dark slab with the name of where it goes, or (shape
//                         'oval') a rift of light hanging in the air
//   buildReturnPortal()   the museum's doorway standing in an exhibition's world: "Return to Museum"
//
// All are generic: what they show comes from data (the exhibition's summary: title, tagline,
// accent, preview, ambience, status; or a scene's portal).
import * as THREE from 'three';
import { createPortalMaterial } from '../scenery/portalSurface.js';
import { createText } from '../scenery/text.js';
import { PieceBuilder, facingToYaw, toWorld } from '../scenery/kit.js';
import { PROMPTS, STATUS } from './taxonomy.js';

export const MUSEUM_ACCENT = '#9fe8ff';
export const MUSEUM_PREVIEW = { style: 'museum', sky: ['#04060b', '#0b1220'], far: '#0e1626', near: '#05070c', glow: 0.9 };

// width, height: of the doorway's surface (metres); accent: CSS colour; preview: see portalSurface.js;
// open: whether it can be passed through; glow: how strongly it lights what is in front of it;
// soft: light it with an area light (soft and even, as in the lobby) rather than a point light (cheaper:
// an area light makes every material's shader in the world bigger, and slower to prepare).
// Front: -z. Returns { group, membrane, light, update, surge, focus }.
export function createPortal({
    width = 4.2, height = 6.2, accent = MUSEUM_ACCENT, preview = {}, open = true, materials, frame = true,
    glow: shine = open ? 4.5 : 1.2, soft = true, shape = 'rect'
}) {
    const group = new THREE.Group();
    const material = createPortalMaterial({ preview, accent, open: open ? 1 : 0, size: { width, height }, shape });
    const membrane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    membrane.rotation.y = Math.PI; // Its own +z (where the shader's "out" is) faces the front
    membrane.position.y = height / 2 + 0.02;
    group.add(membrane);

    const glow = materials.get(`portal-edge-${accent}`, () => {
        const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.6) });
        edge.userData.noShadow = true;
        return edge;
    });
    if (frame) {
        const dark = materials.standard('portal-frame', { color: '#0c1017', roughness: 0.28, metalness: 0.75 });
        const b = new PieceBuilder();
        const side = 0.5, deep = 0.7;
        for (const s of [-1, 1]) {
            b.box(dark, side, height + 0.6, deep, s * (width / 2 + side / 2), (height + 0.6) / 2, 0);
            b.box(glow, 0.035, height, 0.04, s * (width / 2 + 0.02), height / 2 + 0.02, -deep / 2 + 0.06);
        }
        b.box(dark, width + side * 2 + 0.3, 0.6, deep + 0.05, 0, height + 0.3, 0);
        b.box(glow, width + 0.04, 0.035, 0.04, 0, height + 0.02, -deep / 2 + 0.06);
        b.box(glow, width, 0.012, 0.05, 0, 0.006, -deep / 2 - 0.15); // The threshold
        group.add(b.build({ castShadow: false }));
    }

    // The world beyond lights the floor and walls in front of the doorway
    const light = soft ? new THREE.RectAreaLight(accent, shine, width, height) : new THREE.PointLight(accent, shine, 9, 1.6);
    light.position.set(0, soft ? height / 2 : height * 0.4, soft ? -0.08 : -0.9);
    group.add(light);

    const base = open ? 1 : 0.8;
    let surge = 0, surgeGoal = 0, focus = 0, focusGoal = 0;
    return {
        group,
        membrane,
        material,
        light,
        update(delta, elapsed) {
            material.uniforms.time.value = elapsed;
            const ease = Math.min(1, delta * 3);
            surge += (surgeGoal - surge) * ease;
            focus += (focusGoal - focus) * ease * 2;
            material.uniforms.surge.value = surge;
            material.uniforms.brightness.value = base * (1 + 0.25 * focus);
            light.intensity = shine * (1 + 0.3 * focus + surge * 3);
        },
        // Stepping through: the doorway floods with light (and settles back after)
        surge() {
            surgeGoal = 1;
            setTimeout(() => { surgeGoal = 0; }, 1600);
        },
        // Looked at: it brightens a little
        focus(on) {
            focusGoal = on ? 1 : 0;
        }
    };
}

// The plaque beside a doorway: a slim stand whose top glows; reading it shows the exhibition's
// placard. Returns the object (front: -z).
function plaqueStand(materials, accent) {
    const b = new PieceBuilder();
    const dark = materials.standard('portal-frame', { color: '#0c1017', roughness: 0.28, metalness: 0.75 });
    b.box(dark, 0.5, 1.05, 0.12, 0, 0.525, 0);
    b.box(dark, 0.6, 0.04, 0.3, 0, 0.02, 0);
    const object = b.build();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), materials.get(`plaque-${accent}`, () =>
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(0.18) })));
    face.position.set(0, 0.72, -0.062);
    face.rotation.y = Math.PI;
    object.add(face);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.01), materials.get(`portal-edge-${accent}`, () =>
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.6) })));
    line.position.set(0, 0.99, -0.064);
    object.add(line);
    return object;
}

// The placard for an exhibition's plaque
export function exhibitionPlacard(summary) {
    const status = STATUS[summary.status] ?? STATUS.open;
    return {
        label: `Exhibition · ${status.label}`,
        title: summary.title,
        meta: summary.tagline,
        body: summary.description,
        footer: status.open
            ? `${summary.exhibits ? `${summary.exhibits} exhibits · ` : ''}Walk up to the doorway to enter`
            : 'This world is still being prepared. Its doorway opens when it is ready.',
        accent: summary.accent
    };
}

// summary: the exhibition's summary; side: { center: { x, z }, facing (the way the doorway faces,
// toward the middle of the lobby), length (of the wall), apothem }
// context: { space, materials, museum, placard, wallHeight, wallMaterial }
// Returns { group, colliders, interactables, emitter, dispose-ables } for the lobby to keep.
export function buildGallery(summary, side, { space, museum, placard, wallHeight, wallMaterial, trimMaterial }) {
    const status = STATUS[summary.status] ?? STATUS.open;
    const accent = summary.accent ?? MUSEUM_ACCENT;
    const materials = space.materials;
    const yaw = facingToYaw(side.facing);
    const group = new THREE.Group();
    group.position.set(side.center.x, 0, side.center.z);
    group.rotation.y = yaw;
    const colliders = [];
    const interactables = [];
    const toW = (lx, lz) => toWorld(lx, lz, side.center.x, side.center.z, yaw);
    const wall = (ax, az, bx, bz) => {
        const a = toW(ax, az), b = toW(bx, bz);
        colliders.push(space.addWall(a.x, a.z, b.x, b.z, 0.1));
    };

    // The wall, with an opening into a deep alcove (the wall's face is at z = 0; the alcove goes to +z)
    const L = side.length, H = wallHeight;
    const opening = 5.6, alcove = 2.0, openingHeight = 7.4;
    const b = new PieceBuilder();
    const piece = (L - opening) / 2;
    for (const s of [-1, 1]) {
        b.box(wallMaterial, piece, H, 0.4, s * (opening / 2 + piece / 2), H / 2, 0.2);
        b.box(wallMaterial, 0.4, openingHeight, alcove, s * (opening / 2 + 0.2), openingHeight / 2, alcove / 2);
        wall(s * L / 2, 0, s * opening / 2, 0);
        wall(s * opening / 2, 0, s * opening / 2, alcove);
    }
    b.box(wallMaterial, opening, H - openingHeight, 0.4, 0, openingHeight + (H - openingHeight) / 2, 0.2);
    b.box(wallMaterial, opening + 0.8, 0.3, alcove, 0, openingHeight + 0.15, alcove / 2); // The alcove's ceiling
    b.box(wallMaterial, opening, openingHeight, 0.3, 0, openingHeight / 2, alcove + 0.15);
    // The opening's edges catch the world's light
    const edge = materials.get(`portal-edge-${accent}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.6) }));
    for (const s of [-1, 1]) b.box(edge, 0.03, openingHeight, 0.03, s * (opening / 2 - 0.015), openingHeight / 2, -0.02);
    b.box(edge, opening, 0.03, 0.03, 0, openingHeight - 0.015, -0.02);
    b.box(trimMaterial, opening + 0.6, 0.08, 0.1, 0, openingHeight + 0.05, -0.05);
    group.add(b.build({ castShadow: false }));

    // The doorway at the back of the alcove
    const portal = createPortal({ width: 4.3, height: 6.4, accent, preview: summary.preview, open: status.open, materials });
    portal.group.position.z = alcove - 0.55;
    group.add(portal.group);
    wall(-opening / 2, alcove - 0.85, opening / 2, alcove - 0.85); // You can stand right before it, not in it

    // The exhibition's name over the opening
    const title = createText([
        { text: summary.title.toUpperCase(), size: 1, weight: 300, spacing: 0.34, color: '#f2f8ff' },
        { text: (status.open ? status.label : PROMPTS.sealed).toUpperCase(), size: 0.3, weight: 600, spacing: 0.6, color: accent, gap: 0.7 }
    ], { size: 0.5, intensity: status.open ? 1.6 : 0.9 });
    title.position.set(0, openingHeight + 1.15, -0.03);
    title.rotation.y = Math.PI;
    group.add(title);
    if (summary.tagline) {
        const tagline = createText([{ text: summary.tagline, font: 'serif', italic: true, size: 1, color: '#c9d6e3' }], { size: 0.2, intensity: 0.9 });
        tagline.position.set(0, openingHeight + 0.4, -0.03);
        tagline.rotation.y = Math.PI;
        group.add(tagline);
    }

    // The plaque beside it
    const stand = plaqueStand(materials, accent);
    stand.position.set(opening / 2 + 1.1, 0, -0.9);
    group.add(stand);
    const standAt = toW(opening / 2 + 1.1, -0.9);
    colliders.push(space.addCollider({ x: standAt.x, z: standAt.z, radius: 0.32 }));
    const plaquePoint = new THREE.Vector3(standAt.x, 1.6, standAt.z);
    const plaqueItem = space.addInteractable({
        id: `gallery-plaque:${summary.id}`,
        object: stand,
        prompt: PROMPTS.read,
        interactionType: 'read',
        interact: () => {
            placard.show(exhibitionPlacard(summary), { point: plaquePoint, range: 7, owner: plaqueItem });
            museum.soundscape.cue('chime', { position: plaquePoint, volume: 0.6 });
        }
    });
    interactables.push(plaqueItem);

    // The doorway itself: enter it, or (sealed) only see that it is in preparation
    const doorPoint = toW(0, alcove - 0.55);
    const doorway = space.addInteractable({
        id: `gallery-door:${summary.id}`,
        object: portal.membrane,
        prompt: status.open ? PROMPTS.enter : PROMPTS.sealed,
        interactionType: status.open ? 'enter' : 'sealed',
        maxDistance: 4.5,
        highlight: false, // The doorway brightens on its own (below)
        cooldown: 1,
        interact: status.open ? () => {
            portal.surge();
            return museum.enterExhibition(summary.id);
        } : null,
        onFocus: () => portal.focus(true),
        onBlur: () => portal.focus(false)
    });
    interactables.push(doorway);

    // A line of light in the floor, from the middle of the lobby to the doorway
    const lineLength = side.apothem - 4.4;
    const floorLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, lineLength),
        materials.get(`floor-line-${accent}-${status.open}`, () => new THREE.MeshBasicMaterial({
            color: new THREE.Color(accent).multiplyScalar(status.open ? 1.6 : 0.45)
        })));
    floorLine.position.set(0, 0.004, -lineLength / 2 - 0.5);
    group.add(floorLine);

    // Its world can be heard as you come near
    const emitter = summary.ambience && status.open
        ? space.addEmitter({ preset: summary.ambience, position: new THREE.Vector3(doorPoint.x, 2, doorPoint.z), radius: 10, volume: 0.55 })
        : null;

    space.add(group);
    const update = space.onUpdate((delta, elapsed) => portal.update(delta, elapsed));
    return {
        group, colliders, interactables, emitter, portal, update, doorPoint, open: status.open,
        // In front of the doorway, facing the middle of the lobby: where you come back out
        arrival: { position: toW(0, -2.2), yaw: facingToYaw(side.facing) }
    };
}

// A doorway standing in a world: a freestanding frame on a dark slab with the name of where it
// leads above it and that place seen through it, or (shape 'oval') a frameless rift of light.
// at: [x, z], facing: the way it faces; y: ground height; title, subtitle: what it says over it;
// prompt: the word under the crosshair; accent, preview: its light and what it shows (see
// portalSurface.js); ambience: a sound preset leaking out of it; go(): what stepping through does.
// Returns { group, interactable, portal, anchor }.
export function buildTravelPortal({
    space, at, facing = 0, y = 0, title, subtitle = '', prompt = PROMPTS.travel, accent = MUSEUM_ACCENT,
    preview = MUSEUM_PREVIEW, shape = 'rect', width, height, ambience = null, go
}) {
    const materials = space.materials;
    const yaw = facingToYaw(facing);
    const rift = shape === 'oval';
    const w = width ?? (rift ? 2.4 : 3.4), h = height ?? (rift ? 3.4 : 5.2);
    const group = new THREE.Group();
    group.position.set(at[0], y, at[1]);
    group.rotation.y = yaw;

    let lift = 0.15;
    if (rift) {
        lift = 0.35;
    } else {
        const slab = new PieceBuilder();
        const dark = materials.standard('portal-frame', { color: '#0c1017', roughness: 0.28, metalness: 0.75 });
        slab.box(dark, w + 3.2, 0.5, 3.2, 0, -0.1, 0.4);
        const edge = materials.get(`portal-edge-${accent}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.6) }));
        slab.box(edge, w + 3.2, 0.02, 0.03, 0, 0.15, -1.2);
        group.add(slab.build());
    }

    const portal = createPortal({ width: w, height: h, accent, preview, open: true, materials, glow: rift ? 3.5 : 6, soft: false, frame: !rift, shape });
    portal.group.position.y = lift;
    group.add(portal.group);

    if (!rift && title) {
        const label = createText([
            { text: title.toUpperCase(), size: 1, weight: 300, spacing: 0.34, color: '#f2f8ff' },
            ...(subtitle ? [{ text: subtitle.toUpperCase(), size: 0.32, weight: 600, spacing: 0.6, color: accent, gap: 0.7 }] : [])
        ], { size: 0.32, intensity: 1.5 });
        label.position.set(0, lift + h + 0.6 + 0.55, -0.36);
        label.rotation.y = Math.PI;
        group.add(label);
    }
    space.add(group);

    if (rift) {
        space.addCollider({ x: at[0], z: at[1], radius: 0.7 });
    } else {
        const wallA = toWorld(-(w / 2 + 0.5), 0.1, at[0], at[1], yaw), wallB = toWorld(w / 2 + 0.5, 0.1, at[0], at[1], yaw);
        space.addWall(wallA.x, wallA.z, wallB.x, wallB.z, 0.4);
    }

    const interactable = space.addInteractable({
        id: `portal:${space.id}:${title}`,
        object: portal.membrane,
        prompt,
        interactionType: 'travel',
        maxDistance: 4.5,
        highlight: false,
        cooldown: 1,
        interact: () => {
            portal.surge();
            return go();
        },
        onFocus: () => portal.focus(true),
        onBlur: () => portal.focus(false)
    });
    space.onUpdate((delta, elapsed) => portal.update(delta, elapsed));
    const doorPoint = toWorld(0, 0, at[0], at[1], yaw);
    if (ambience) space.addEmitter({ preset: ambience, position: new THREE.Vector3(doorPoint.x, y + 2, doorPoint.z), radius: 8, volume: 0.7 });
    const anchor = new THREE.Vector3(doorPoint.x, y + lift + h * 0.5, doorPoint.z);
    return { group, interactable, portal, anchor };
}

// The museum's doorway in an exhibition's world: a freestanding frame on a dark slab, "Return to
// Museum" above it, the museum's own hall seen through it.
// at: [x, z], facing: the way it faces; y: ground height. Returns { group, interactable, portal, anchor }.
export function buildReturnPortal({ space, museum, at, facing = 0, y = 0, title = 'Return to Museum' }) {
    return buildTravelPortal({
        space, at, facing, y, title, subtitle: 'Virtual Anime Museum', prompt: PROMPTS.returnToMuseum,
        ambience: 'museum-hall', go: () => museum.returnToMuseum()
    });
}
