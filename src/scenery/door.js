// door.js - A door that can be gone through: a leaf on hinges in an opening a piece has left in its
// wall. Looked at, it says "Enter" from outside and "Step outside" from within; on E the hand
// reaches (the interaction system does that), the door swings open with a creak, and the visitor
// is walked through it on their own feet. Once open it stays open, and can simply be walked through.
// Generic: a ship's cabin, a house, a station building... whatever leaves an opening for it.
//
// addDoorway(kit, { x, z, y, yaw, width, height, hinge, material, prompts, inside, outside, swing })
//   x, z, y, yaw   the middle of the opening at floor level, and which way its outside faces
//                  (the door's own -z is outside, as every piece's front is its -z)
//   inside, outside  how far to walk in and out (metres from the opening)
//   prompts        { enter, leave }
// Returns { group, open(), isOpen }.
import * as THREE from 'three';
import { toWorld } from './kit.js';

const SWING_TIME = 0.75; // Seconds to swing open

export function addDoorway(kit, {
    x, z, y = 0, yaw = 0, width = 1, height = 2, hinge = 'left', material, prompts = {}, inside = 1.4, outside = 1.2,
    swing = Math.PI * 0.55, thickness = 0.06
}) {
    const side = hinge === 'left' ? -1 : 1;
    const frame = new THREE.Group();
    frame.position.set(x, y, z);
    frame.rotation.y = yaw;

    // The leaf turns about its hinge post, at one side of the opening; it opens inward (+z)
    const pivot = new THREE.Group();
    pivot.position.set(side * width / 2, 0, 0);
    frame.add(pivot);
    const leaf = new THREE.Group();
    const boards = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, height - 0.03, thickness).translate(-side * (width / 2), height / 2, 0), material);
    boards.castShadow = boards.receiveShadow = true;
    leaf.add(boards);
    // Battens across the boards, and an iron ring for a handle
    const dark = kit.materials.standard('door-iron', { color: '#1c1a18', roughness: 0.5, metalness: 0.7 });
    for (const h of [0.35, height - 0.4]) {
        leaf.add(new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.09, 0.03).translate(-side * (width / 2), h, -thickness / 2 - 0.015), material));
    }
    leaf.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16).translate(-side * (width - 0.14), height * 0.48, -thickness / 2 - 0.03), dark));
    pivot.add(leaf);
    // The opening itself, unseen, so the doorway can still be looked at once the leaf has swung aside
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0), new THREE.MeshBasicMaterial());
    opening.visible = false;
    frame.add(opening);
    kit.add(frame);
    frame.updateMatrixWorld(true);

    // While closed it is a wall across the opening
    const a = toWorld(-width / 2, 0, x, z, yaw), b = toWorld(width / 2, 0, x, z, yaw);
    let closed = kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: 0.08 });

    const state = { open: 0, goal: 0, isOpen: false };
    kit.onUpdate(delta => {
        if (state.open === state.goal) return;
        const step = delta / SWING_TIME;
        state.open = state.goal > state.open ? Math.min(state.goal, state.open + step) : Math.max(state.goal, state.open - step);
        const t = state.open;
        // Quick to start, slowing as it comes to rest, with a small bounce off its stop
        const eased = 1 - Math.pow(1 - t, 3) + 0.04 * Math.sin(t * Math.PI) * (1 - t);
        pivot.rotation.y = side * swing * eased; // Inward, away from whoever opens it
    });

    const point = (local) => toWorld(0, local, x, z, yaw);
    const out = point(-outside), outNear = point(-0.55), inNear = point(0.55), deep = point(inside);
    // Which side the visitor is on: the door's -z is outside
    const outsideNow = () => {
        const visitor = kit.visitor();
        if (!visitor) return true;
        const dx = visitor.x - x, dz = visitor.z - z;
        return dx * Math.sin(yaw) + dz * Math.cos(yaw) < 0;
    };
    const center = new THREE.Vector3(x, y + height / 2, z);

    const open = () => {
        if (state.isOpen) return Promise.resolve();
        state.isOpen = true;
        state.goal = 1;
        kit.cue('creak', center, 0.8);
        if (closed) {
            kit.space.removeColliders([closed]);
            closed = null;
        }
        return new Promise(resolve => setTimeout(resolve, SWING_TIME * 600));
    };

    const interactable = kit.addInteractable({
        id: `door:${kit.space.id}:${x.toFixed(2)},${z.toFixed(2)}`,
        object: frame,
        prompt: prompts.enter ?? 'Enter',
        interactionType: 'door',
        maxDistance: 2.6,
        cooldown: 0.6,
        dynamic: true, // It swings
        onFocus() {
            interactable.prompt = outsideNow() ? (prompts.enter ?? 'Enter') : (prompts.leave ?? 'Step outside');
        },
        async interact() {
            const entering = outsideNow();
            await open();
            const path = entering ? [[outNear.x, outNear.z], [inNear.x, inNear.z], [deep.x, deep.z]]
                : [[inNear.x, inNear.z], [outNear.x, outNear.z], [out.x, out.z]];
            await kit.guide(path);
        }
    });
    return { group: frame, open, get isOpen() { return state.isOpen; } };
}
