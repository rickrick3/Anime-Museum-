// navigation.js - A universe's world, laid out as a chart you can stand over: a round table whose top
// holds a hologram of the sea (or whatever the world is), drawn from the universe's own data: its
// locations as islands, and the world's own shapes (its map features: sea lanes, continents, the
// names of its seas). Each location with a place on the chart (its `chart: [u, v]`, -1..1 across the
// table) is a pin of light with its name over it. Look at one: a place that can be entered offers to
// go there ("Travel", or the universe's own word); the others are locked for now ("Uncharted", or
// the universe's own word) and only tell what is known of them. The table itself, read, tells of the world.
//
// buildNavigation({ space, kit, universe, museum, services, connections, at, facing, radius, title, accent })
// The universe's map ({ title, travel, locked, features }) says how it is drawn and what it is called.
// Generic: the same table charts any universe with locations.
import * as THREE from 'three';
import { PieceBuilder, facingToYaw, toWorld, standBefore } from '../scenery/kit.js';
import { chartTexture } from '../scenery/textures.js';
import { createText } from '../scenery/text.js';
import { createLightShaft } from '../scenery/atmosphere.js';
import { PROMPTS } from '../museum/taxonomy.js';

export function buildNavigation({
    space, kit, universe, museum, services, connections = null, at, facing = 0, radius = 1.45, height = 0.95, title,
    accent = '#8fe3ff', open = '#ffcf7a'
}) {
    const map = universe.map ?? {};
    const heading = title ?? map.title ?? 'The Known World';
    const travel = map.travel ?? PROMPTS.travel;
    const locked = map.locked ?? 'Uncharted';
    const yaw = facingToYaw(facing);
    const [x, z] = at;
    const m = kit.materials;
    const wood = m.standard('chart-table-wood', { color: '#3a281b', roughness: 0.5 });
    const lacquer = m.standard('chart-table-top', { color: '#0d1014', roughness: 0.35, metalness: 0.4 });
    const brass = m.standard('chart-table-brass', { color: '#b08a4a', roughness: 0.3, metalness: 0.9 });
    const group = new THREE.Group();
    group.position.set(x, kit.ground.heightAt(x, z), z);
    group.rotation.y = yaw;
    const base = group.position.y;

    // The table: a round top with a brass rim, on a turned pedestal and a heavy foot
    const b = new PieceBuilder();
    b.cylinder(lacquer, radius, radius - 0.04, 0.09, 0, height - 0.09, 0, 64);
    b.add(brass, new THREE.TorusGeometry(radius, 0.025, 6, 128).rotateX(Math.PI / 2).translate(0, height, 0));
    b.cylinder(wood, 0.22 * radius / 1.45, 0.3 * radius / 1.45, height - 0.2, 0, 0.12, 0, 16);
    b.cylinder(wood, 0.75 * radius / 1.45, 0.8 * radius / 1.45, 0.12, 0, 0, 0, 24);
    for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        b.box(brass, 0.02, 0.012, i % 8 ? 0.06 : 0.16, Math.sin(a) * (radius - 0.06), height + 0.006, -Math.cos(a) * (radius - 0.06), -a);
    }
    group.add(b.build());

    // The hologram: the chart drawn in light, a little above the table, and a soft glow rising
    const locations = universe.all('location').filter(location => location.chart);
    const islands = locations.map((location, i) => ({ at: location.chart, size: location.scene ? 0.08 : 0.055, seed: i * 7 + 3, unfinished: !location.scene }));
    const chart = chartTexture({ islands, ink: '#ffffff', transparent: true, seed: 11, weight: 2.6, size: 2048, features: map.features ?? [] });
    const hologram = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.94, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
        map: chart, color: new THREE.Color(accent).multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    hologram.position.y = height + 0.05;
    group.add(hologram);
    const shaft = createLightShaft({ radiusTop: radius * 0.92, radiusBottom: radius * 0.94, height: 0.9, color: accent, intensity: 0.06 });
    shaft.position.y = height + 0.04;
    group.add(shaft);
    kit.add(group);
    kit.addCollider({ x, z, radius: radius + 0.1 });

    // A pin of light over each location
    const labels = [];
    const stems = new PieceBuilder();
    const stemMaterial = c => {
        const material = new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        material.userData.noShadow = true;
        return material;
    };
    const stemOpen = stemMaterial(new THREE.Color(open).multiplyScalar(2.6));
    const stemShut = stemMaterial(new THREE.Color(accent).multiplyScalar(0.9));
    const scale = radius * 0.94;
    const from = space.scene;
    const reach = radius * 1.7 + 1.4; // A pin across the table can still be chosen
    for (const location of locations) {
        const charted = Boolean(location.scene && universe.scene(location.scene));
        const [u, v] = location.chart;
        const local = toWorld(u * scale, v * scale, 0, 0, 0);
        const world = toWorld(local.x, local.z, x, z, yaw);
        const color = new THREE.Color(charted ? open : accent).multiplyScalar(charted ? 2.6 : 0.9);
        const pin = new THREE.Group();
        pin.position.set(world.x, base + height + 0.05, world.z);
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const tall = charted ? 0.5 : 0.26;
        // Its stem and rings join every other pin's in one mesh (see below); only the gem is its own
        const foot = new THREE.Vector3(world.x, base + height + 0.05, world.z);
        stems.add(charted ? stemOpen : stemShut, new THREE.CylinderGeometry(0.006, 0.006, tall, 6).translate(foot.x, foot.y + tall / 2, foot.z));
        stems.add(charted ? stemOpen : stemShut, new THREE.RingGeometry(0.05, 0.065, 24).rotateX(-Math.PI / 2).translate(foot.x, foot.y + 0.004, foot.z));
        if (charted) stems.add(stemOpen, new THREE.RingGeometry(0.1, 0.112, 32).rotateX(-Math.PI / 2).translate(foot.x, foot.y + 0.004, foot.z));
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(charted ? 0.06 : 0.035), material);
        gem.position.y = tall + 0.04;
        pin.add(gem);
        const label = createText([
            { text: location.name.toUpperCase(), size: 1, weight: 600, spacing: 0.22, color: charted ? '#fff1d6' : '#a9d9ea' },
            { text: (charted ? travel : locked).toUpperCase(), size: 0.55, weight: 600, spacing: 0.4, color: charted ? open : '#6d9fb3', gap: 0.35 }
        ], { size: charted ? 0.06 : 0.045, padding: 0.05, intensity: charted ? 1.6 : 0.9 });
        label.position.y = gem.position.y + 0.14;
        pin.add(label);
        labels.push(label);
        // Something larger than the pin for the gaze to rest on
        const target = new THREE.Mesh(new THREE.SphereGeometry(charted ? 0.16 : 0.11, 8, 6), new THREE.MeshBasicMaterial());
        target.position.y = gem.position.y;
        target.visible = false;
        pin.add(target);
        kit.add(pin);
        const point = new THREE.Vector3(world.x, base + height + 0.05 + gem.position.y, world.z);
        // Stand at the table's edge beside the pin, looking across it
        const out = Math.hypot(world.x - x, world.z - z);
        const away = out > 0.05 ? THREE.MathUtils.radToDeg(Math.atan2(world.x - x, -(world.z - z))) : facing + 180;
        space.claim(location.id, { point, where: 'on the chart table', stand: standBefore(world.x, world.z, away, radius - out + 0.85) });

        let focus = 0, focusGoal = 0;
        kit.onUpdate((delta, elapsed) => {
            focus += (focusGoal - focus) * Math.min(1, delta * 6);
            gem.rotation.y += delta * (0.8 + focus * 2);
            gem.position.y = tall + 0.04 + Math.sin(elapsed * 1.5 + u * 5) * 0.012;
            gem.scale.setScalar(1 + focus * 0.6);
            material.color.copy(color).multiplyScalar(1 + focus * 0.8);
        });
        const describe = () => {
            const described = universe.describe(location.id, { hint: other => connections?.hint(other) ?? null });
            const content = connections ? connections.withLinks(described) : described;
            const footer = charted ? `Press E over its light: ${travel.toLowerCase()}` : content.links?.length ? 'Press a number to go there' : `${locked}: it can't be visited yet`;
            return { ...content, footer };
        };
        if (charted) space.exits.push({ id: location.scene, x, z, within: radius + 5 });
        const pinItem = kit.addInteractable({
            id: `chart-pin:${location.id}`,
            object: target,
            prompt: charted ? `${travel} · ${location.name}` : `${location.name} · ${locked}`,
            interactionType: charted ? 'travel' : 'read',
            maxDistance: reach,
            highlight: false,
            cooldown: 1,
            onFocus: () => { focusGoal = 1; },
            onBlur: () => { focusGoal = 0; },
            interact: charted ? () => {
                kit.cue('reveal', point, 0.6);
                return museum.visit(location.scene, { from });
            } : () => {
                kit.cue('chime', point, 0.4);
                services.placard.show(describe(), { point, range: 6, owner: pinItem });
            }
        });
    }

    kit.add(stems.build({ castShadow: false, receiveShadow: false }));

    // The labels turn to whoever stands at the table
    const eye = new THREE.Vector3();
    kit.onUpdate(() => {
        const visitor = kit.visitor();
        if (!visitor) return;
        eye.copy(visitor);
        labels.forEach(label => {
            label.getWorldPosition(label.userData.world ??= new THREE.Vector3());
            label.rotation.y = Math.atan2(eye.x - label.userData.world.x, eye.z - label.userData.world.z);
        });
    });

    // Reading the table itself: the world, and which of its places can be visited
    const centre = new THREE.Vector3(x, base + height + 0.6, z);
    const tableItem = kit.addInteractable({
        id: `chart-table:${universe.id}`,
        object: group.children[0],
        prompt: PROMPTS.read,
        interactionType: 'read',
        maxDistance: 3,
        interact: () => {
            kit.cue('reveal', centre, 0.5);
            services.placard.show({
                label: `${heading} · ${universe.title}`,
                title: universe.title,
                meta: universe.tagline,
                body: map.description ?? universe.definition.description ?? '',
                entries: locations.filter(location => location.scene).map(location => ({ title: location.name, text: travel.toLowerCase() }))
                    .concat([{ title: locked, text: locations.filter(location => !location.scene).map(location => location.name).join(', ') }]),
                footer: 'Look at a light on the chart to go there',
                accent: open
            }, { point: centre, range: 6, owner: tableItem });
        }
    });
    kit.onUpdate((delta, elapsed) => {
        shaft.userData.time.value = elapsed;
        hologram.material.opacity = 0.82 + 0.08 * Math.sin(elapsed * 1.3);
    });
    return { group };
}
