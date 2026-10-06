// timeline.js - A universe's history as a walk: a line of light set into the floor from PAST to
// PRESENT, and along it, on alternate sides, a post for each event in the order it happened. Read
// a post and its event tells its story, and threads of light reach to whatever it touched that is in
// the room. An event that became a legendary moment carries a small flame: that one can be entered.
// Beside a post there can be a small 3D display of the event (a ship in miniature, a flag, a
// scaffold...): history told by things, not by walls of text.
//
// buildTimeline({ space, kit, universe, services, connections, from: [x, z], to: [x, z], side, accent,
//                 events, displays, title, where })
//   events    the events to show (ids), in order; else the universe's whole timeline
//   displays  { [event id]: { model: name | { name, params }, scale, height } } shown beside its post
//   title     words set into the floor before the PAST end (e.g. the name of this walk)
//   where     how a placard says where its posts are ('on the timeline')
import * as THREE from 'three';
import { createExhibit } from '../museum/exhibit.js';
import { createText } from '../scenery/text.js';
import { loadModel } from '../scenery/catalog.js';
import { standBefore, PieceBuilder, mergeStatic } from '../scenery/kit.js';
import { entityExhibit } from './exhibits.js';

export async function buildTimeline({
    space, kit, universe, services, connections, from, to, side = 1.15, accent = kit.accent,
    words = { past: 'Past', present: 'Present' }, events: only = null, displays = {}, title = null, where = 'on the timeline'
}) {
    const events = only ? only.map(id => universe.get(id)).filter(Boolean) : universe.timeline;
    if (!events.length) return;
    const a = new THREE.Vector2(...from), b = new THREE.Vector2(...to);
    const along = b.clone().sub(a);
    const length = along.length();
    along.normalize();
    const across = new THREE.Vector2(-along.y, along.x);
    const angle = Math.atan2(along.x, along.y);

    // The line in the floor, with a bright mark where each event stands
    const glow = kit.materials.get(`timeline-line-${accent}`, () => {
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(0.75) });
        material.userData.noShadow = true;
        return material;
    });
    const floorY = kit.ground.heightAt((a.x + b.x) / 2, (a.y + b.y) / 2);
    const floor = new PieceBuilder(); // The line and its marks, drawn as one
    floor.add(glow, new THREE.BoxGeometry(0.03, 0.01, length).rotateY(angle).translate((a.x + b.x) / 2, floorY + 0.012, (a.y + b.y) / 2));
    for (const [word, point, turn] of [[words.past, a, 0], [words.present, b, Math.PI]]) {
        const label = createText([{ text: word.toUpperCase(), size: 1, weight: 600, spacing: 0.5, color: accent }], { size: 0.16, intensity: 1.2 });
        label.rotation.set(-Math.PI / 2, 0, angle + turn + Math.PI);
        const offset = turn ? -0.5 : 0.5;
        label.position.set(point.x + along.x * -offset, floorY + 0.014, point.y + along.y * -offset);
        kit.add(label);
    }
    if (title) {
        const label = createText([{ text: title.toUpperCase(), size: 1, weight: 300, spacing: 0.45, color: '#f2ead8' }], { size: 0.13, intensity: 1.1 });
        label.rotation.set(-Math.PI / 2, 0, angle + Math.PI);
        label.position.set(a.x - along.x * 1.0, floorY + 0.014, a.y - along.y * 1.0);
        kit.add(label);
    }

    for (const [index, event] of events.entries()) {
        const t = (index + 0.5) / events.length;
        const centre = a.clone().addScaledVector(along, t * length);
        const s = index % 2 ? -1 : 1;
        const at = centre.clone().addScaledVector(across, s * side);
        // Facing the line, where the reader stands
        const facing = THREE.MathUtils.radToDeg(Math.atan2(centre.x - at.x, -(centre.y - at.y)));
        floor.add(glow, new THREE.RingGeometry(0.1, 0.14, 24).rotateX(-Math.PI / 2).translate(centre.x, floorY + 0.013, centre.y));
        const exhibit = entityExhibit({
            id: `timeline:${event.id}`,
            entity: event.id,
            model: { name: 'timeline-post', params: { era: event.era ?? '', title: event.name, accent, moment: Boolean(event.moment) } },
            at: [at.x, at.y],
            facing,
            display: 'none',
            marker: false,
            radius: 0.28,
            reach: 2.6,
            anchorHeight: 1.35
        }, universe, connections);
        const { anchor } = await createExhibit(exhibit, {
            kit, space, index, total: events.length, services,
            exhibition: { id: universe.id, title: universe.title, accent },
            onExamine: (definition, point) => connections?.show(event.id, point)
        });
        space.claim(event.id, { point: anchor, where, stand: standBefore(at.x, at.y, facing, 1.25) });

        // Its display: a small low plinth just beyond the post, and the thing on it
        const display = displays[event.id];
        if (display) await addDisplay(kit, display, at.clone().addScaledVector(across, s * 0.95), facing, accent);
    }
    kit.add(floor.build({ castShadow: false, receiveShadow: false }));
}

async function addDisplay(kit, display, at, facing, accent) {
    const spec = typeof display.model === 'string' ? { name: display.model } : display.model;
    const build = await loadModel(spec.name);
    const model = build({ accent, ...spec.params }, kit);
    if (model.userData.parts?.ring) model.userData.parts.ring.visible = false; // Only an exhibit's ring ever rises
    const height = display.height ?? 0.55;
    const group = new THREE.Group();
    group.position.set(at.x, kit.ground.heightAt(at.x, at.y), at.y);
    group.rotation.y = -THREE.MathUtils.degToRad(facing);
    const b = new PieceBuilder();
    const stone = kit.materials.standard('timeline-plinth', { color: '#1a1d24', roughness: 0.5, metalness: 0.25 });
    b.cylinder(stone, 0.34, 0.38, height, 0, 0, 0, 20);
    group.add(b.build());
    model.scale.setScalar(display.scale ?? 1);
    model.position.y = height;
    group.add(model);
    group.traverse(object => {
        if (object.isMesh && !object.material.transparent && !object.material.userData?.noShadow) object.castShadow = true;
    });
    mergeStatic(group, new Set([model.userData.parts?.spin].filter(Boolean)));
    kit.add(group);
    kit.addCollider({ x: at.x, z: at.y, radius: 0.38 });
    // Something on it may move gently (a flag, a flame)
    if (model.userData.parts?.spin) kit.onUpdate(delta => { model.userData.parts.spin.rotation.y += delta * 0.4; });
}
