// exhibit.js - One thing on show: its model (from the catalogue), how it is displayed (on a
// pedestal, in a glass case, or standing in the world), the museum's small numbered marker beside
// it, and what happens when it is examined: the hand reaches (the interaction system does that),
// the exhibit answers (a behaviour), a sound plays, and its placard appears beside it.
//
// An exhibit is data (see src/content/exhibitions/):
//   id, type ('artifact', 'weapon', 'character', 'timeline', 'lore', 'map', ...; see taxonomy.js)
//   title, meta (a line under the title), description (text or [paragraphs]), entries ([{ title, text }])
//   at: [x, z], facing (degrees, see kit.js), model: 'name' or { name, params } (see catalog.js)
//   display: 'pedestal' | 'case' | 'none'; height (of the pedestal); case: [width, height, depth]
//   marker: false, or { offset: [x, z] } (from the exhibit, in its own frame)
//   radius (metres the body keeps away), reach (metres from which it can be examined)
//   prompt, behavior, cue, label: to override the type's
//   placard: what its placard says, if not the above: content, or a function returning it when it
//            is examined (an exhibit of a universe's entity: its story and what it is connected to)
// It uses the generic interaction system like everything else: createExhibit only registers an
// interactable with its own prompt and interact().
import * as THREE from 'three';
import { loadModel } from '../scenery/catalog.js';
import { createText } from '../scenery/text.js';
import { facingToYaw, toWorld, PieceBuilder, mergeStatic } from '../scenery/kit.js';
import { exhibitType } from './taxonomy.js';
import { createBehavior } from './behaviors.js';

const HANDS_FREE = 0.8; // Seconds after examining something before something else can be

function pedestal(builder, materials, accent, { width = 0.62, depth = 0.62, height = 0.95 }) {
    builder.box(materials.stone, width, height - 0.06, depth, 0, (height - 0.06) / 2, 0);
    builder.box(materials.stone, width + 0.12, 0.06, depth + 0.12, 0, 0.03, 0);
    builder.box(materials.cap, width + 0.04, 0.05, depth + 0.04, 0, height - 0.025, 0);
    builder.box(accent, width + 0.045, 0.012, depth + 0.045, 0, height - 0.07, 0); // A fine line of light
}

// The glass case: its panes, and a slim dark frame along its edges
function glassCase(group, materials, [width, height, depth], base) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth).translate(0, base + height / 2, 0), materials.glass);
    glass.renderOrder = 5;
    group.add(glass);
    const frame = new PieceBuilder();
    const t = 0.018;
    for (const x of [-1, 1]) {
        for (const z of [-1, 1]) frame.box(materials.cap, t, height, t, x * width / 2, base + height / 2, z * depth / 2);
    }
    for (const y of [base, base + height]) {
        for (const z of [-1, 1]) frame.box(materials.cap, width, t, t, 0, y, z * depth / 2);
        for (const x of [-1, 1]) frame.box(materials.cap, t, t, depth, x * width / 2, y, 0);
    }
    group.add(frame.build());
}

// The museum's own small label beside an exhibit: a slim post with a tilted plate, its number and type
function marker(group, materials, accent, { number, label, offset }) {
    const post = new PieceBuilder();
    post.box(materials.cap, 0.045, 0.98, 0.045, 0, 0.49, 0);
    post.box(materials.cap, 0.2, 0.02, 0.2, 0, 0.01, 0);
    const plate = new THREE.Group();
    plate.position.set(0, 1.0, 0);
    plate.rotation.x = 0.55; // Tipped back toward the reader
    plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.02), materials.cap));
    plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.006, 0.022).translate(0, 0.105, 0), accent));
    const text = createText([
        { text: number, size: 1, weight: 300, spacing: 0.08, color: '#e9f6ff' },
        { text: label.toUpperCase(), size: 0.42, weight: 600, spacing: 0.3, color: '#8fb3c8', gap: 0.5 }
    ], { size: 0.075, padding: 0.1 });
    text.position.set(0, -0.005, -0.0115);
    text.rotation.y = Math.PI;
    plate.add(text);
    const object = post.build();
    object.add(plate);
    object.position.set(offset[0], 0, offset[1]);
    group.add(object);
}

// The objects a model's behaviour moves or changes (see behaviors.js), so they aren't merged away
function movingParts(parts) {
    const keep = new Set();
    const add = value => {
        if (value?.isObject3D) keep.add(value);
        else if (value?.mesh?.isObject3D) keep.add(value.mesh);
    };
    for (const value of Object.values(parts)) {
        if (Array.isArray(value)) value.forEach(add);
        else add(value);
    }
    return keep;
}

function displayMaterials(space, accentColor) {
    const m = space.materials;
    return {
        stone: m.standard('pedestal-stone', { color: '#1a1d24', roughness: 0.55, metalness: 0.2 }),
        cap: m.standard('pedestal-cap', { color: '#0b0d12', roughness: 0.3, metalness: 0.6 }),
        glass: m.get('case-glass', () => new THREE.MeshStandardMaterial({
            color: '#dff4ff', transparent: true, opacity: 0.12, roughness: 0.04, metalness: 0.1, depthWrite: false,
            side: THREE.DoubleSide, envMapIntensity: 1.5
        })),
        accent: m.get(`accent-line-${accentColor}`, () => {
            const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor).multiplyScalar(2.2) });
            material.userData.noShadow = true;
            return material;
        })
    };
}

// definition: as above. context: { kit, space, exhibition: { id, title, accent }, index, total,
// services: { placard, soundscape }, onExamine(definition, anchor) }. Returns { interactable, root,
// behavior, anchor }.
export async function createExhibit(definition, { kit, space, exhibition, index, total, services, onExamine = null }) {
    const type = exhibitType(definition.type);
    const label = definition.label ?? type.label;
    const accentColor = definition.accent ?? exhibition.accent ?? '#9fe8ff';
    const materials = displayMaterials(space, accentColor);
    const modelSpec = typeof definition.model === 'string' ? { name: definition.model } : definition.model;
    const build = await loadModel(modelSpec.name);
    const model = build({ accent: accentColor, count: definition.entries?.length, ...modelSpec.params }, kit);
    const parts = model.userData.parts ?? {};
    if (parts.ring) parts.ring.visible = false; // Not drawn until it climbs (an invisible ring still costs a draw)

    const [x, z] = definition.at;
    const yaw = facingToYaw(definition.facing ?? 0);
    const root = new THREE.Group();
    root.name = `exhibit:${definition.id}`;
    root.position.set(x, kit.ground ? kit.ground.heightAt(x, z) : 0, z);
    root.rotation.y = yaw;

    // How it is shown
    const display = definition.display ?? 'pedestal';
    let top = 0;
    if (display === 'pedestal' || display === 'case') {
        const caseSize = definition.case ?? [0.62, 0.5, 0.62];
        const width = display === 'case' ? caseSize[0] + 0.1 : 0.62;
        const depth = display === 'case' ? caseSize[2] + 0.1 : 0.62;
        top = definition.height ?? 0.95;
        const builder = new PieceBuilder();
        pedestal(builder, materials, materials.accent, { width, depth, height: top });
        root.add(builder.build());
        if (display === 'case') glassCase(root, materials, caseSize, top);
    }
    model.position.y = top;
    root.add(model);
    if (definition.marker !== false) {
        marker(root, materials, materials.accent, {
            number: `No. ${String(index + 1).padStart(2, '0')}`,
            label,
            offset: definition.marker?.offset ?? [0.75, -0.55]
        });
    }
    // Everything solid casts and receives shadows (receiving is part of a shader's identity: doing it
    // the same way everywhere means fewer shaders to compile)
    root.traverse(object => {
        if (object.isMesh && !object.material.transparent && !object.material.userData?.noShadow) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    // What doesn't move is drawn as one mesh per material; what its behaviour moves is left alone
    mergeStatic(root, movingParts(parts));
    space.add(root);
    kit.landmarks?.push({ piece: 'exhibit', x, z, yaw });

    // The body keeps a little away from it (and from its marker)
    space.addCollider({ x, z, radius: definition.radius ?? 0.45 });
    if (definition.marker !== false) {
        const [ox, oz] = definition.marker?.offset ?? [0.75, -0.55];
        const markerAt = toWorld(ox, oz, x, z, yaw);
        space.addCollider({ x: markerAt.x, z: markerAt.z, radius: 0.08 });
    }

    // What it says on its placard, and where that appears
    const anchor = new THREE.Vector3(x, root.position.y + (definition.anchorHeight ?? top + 0.55), z);
    const placard = {
        label: `${label} · ${exhibition.title}`,
        title: definition.title,
        meta: definition.meta,
        body: definition.description,
        entries: definition.entries,
        footer: `No. ${String(index + 1).padStart(2, '0')} of ${String(total).padStart(2, '0')}`,
        accent: accentColor
    };

    const cue = (name, volume = 1) => services.soundscape.cue(name, { position: anchor, volume });
    const behavior = createBehavior(definition.behavior ?? type.behavior, parts, { cue: name => cue(name, 0.8) });
    space.onUpdate(delta => {
        behavior.update(delta);
        if (parts.spin) parts.spin.rotation.y += delta * 0.4;
    });

    const interactable = space.addInteractable({
        id: `exhibit:${exhibition.id}:${definition.id}`,
        object: root,
        prompt: definition.prompt ?? type.prompt,
        interactionType: definition.type ?? 'artifact',
        maxDistance: definition.reach ?? 3.2,
        cooldown: 0.4,
        dynamic: Boolean(parts.moving), // Its bounds follow it while it lifts and turns
        interact() {
            const content = typeof definition.placard === 'function' ? definition.placard()
                : { ...placard, ...definition.placard, footer: definition.placard?.footer ?? placard.footer };
            services.placard.show(content, { point: anchor, range: definition.placardRange ?? 6, owner: interactable });
            cue(definition.cue ?? type.cue);
            onExamine?.(definition, anchor);
            // The exhibit answers for a few seconds, but the visitor's hands are free again almost at
            // once: they can turn to the next thing (or a doorway) while it is still answering
            const answering = behavior.start();
            return Promise.race([answering, new Promise(resolve => setTimeout(resolve, HANDS_FREE * 1000))]);
        }
    });
    return { interactable, root, behavior, anchor };
}
