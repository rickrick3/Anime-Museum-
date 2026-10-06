// playerController.js - The player: a body that walks the sand, a head that looks around and
// moves with each step and breath, and two hands at the bottom of the view.
//
//   PlayerController       input, and the order things happen in each frame
//    ├── PointerLock        captures the mouse (Esc releases it, a click locks it again)
//    ├── FirstPersonCamera  the mouse turns the body (yaw) and tilts the head (pitch)
//    ├── Movement           walking, hurrying, jumping and the sand physics
//    ├── MovementState      idle / walking / sprinting / sliding / jumping / falling / landing
//    ├── Breathing          one breath, shared by the head and the hands
//    ├── HeadBob            the head's motion: gait, breath, landing
//    ├── Hands              the first-person hands
//    └── Interaction        noticing things: gaze, focus, E to interact (src/interactions/)
//
// Everything else (footsteps, the story, interactable and reactive things) talks to the player
// through this class: position, state, slide, surface, interaction, the pointer lock events, and what
// the body does: 'step' { step } and 'land' { strength } events (also the onStep / onLand hooks).
// The player never knows what is around it; the environment (src/environment/) listens instead.
//
// A player can be moved to another world (setWorld, then teleport), held still for a moment
// (inputEnabled = false: the keys don't move it, though the mouse still looks around), and led a
// few steps on its own feet (walkTo: up a gangplank, through a door; see guide.js).
import { EventDispatcher } from 'three';
import { PointerLock } from './pointerLock.js';
import { FirstPersonCamera } from './firstPersonCamera.js';
import { Movement, WALK_SPEED } from './movement.js';
import { MovementState } from './movementState.js';
import { Breathing } from './breathing.js';
import { HeadBob } from './headBob.js';
import { Hands } from './hands.js';
import { Guide } from './guide.js';
import { Interaction } from '../interactions/interaction.js';

const KEY_BINDINGS = {
    ArrowUp: 'forward',
    KeyW: 'forward',
    ArrowDown: 'backward',
    KeyS: 'backward',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ShiftLeft: 'hurry',
    ShiftRight: 'hurry'
};

const HURRY_EFFORT = 0.7; // How hard hurrying works the lungs (0..1; see breathing.js)

export class PlayerController extends EventDispatcher {
    // camera: the scene's camera, placed and pointed where the player starts (it must be in the
    // scene, as the hands hang from it); domElement: what the pointer locks to
    // world: { groundHeightAt, bounds, colliders, isUnderWater, isFirmGround, surfaceAt } (see movement.js)
    // options: { scene, interaction: { distance, occlusion } } (see interaction.js)
    constructor(camera, domElement, world, { scene = null, interaction = {} } = {}) {
        super();
        this.camera = camera;
        this.pointerLock = new PointerLock(domElement);
        this.view = new FirstPersonCamera(camera);
        this.movement = new Movement(camera.position.clone(), world);
        this.state = new MovementState();
        this.breathing = new Breathing();
        this.head = new HeadBob();
        this.hands = new Hands(camera);
        this.interaction = new Interaction(this, { scene, ...interaction });
        this.guide = new Guide();
        this.inputEnabled = true; // false holds the body still (e.g. while stepping through a doorway)

        // The hands answer what the interaction notices; it knows nothing about them
        this.interaction.addEventListener('targetchange', ({ interactable }) => {
            this.hands.setReady(interactable !== null);
        });
        this.interaction.addEventListener('interact', () => this.hands.reach());

        // Hooks: onStep(step) when a foot lands, onLand(strength) after a jump (the 'step' and
        // 'land' events say the same, for any number of listeners)
        // step: { surface: 'sand' | 'water' | 'stone' | ..., intensity, speed, foot, x, z, heading, effort, downhill }
        this.onStep = null;
        this.onLand = null;

        this.pointerLock.onMove = (dx, dy) => this.view.look(dx, dy);
        this.pointerLock.addEventListener('unlock', () => this.releaseKeys());
        this.movement.onLand = strength => {
            this.state.land(strength);
            this.head.land(strength);
            this.hands.land(strength);
            this.onLand?.(strength);
            this.dispatchEvent({ type: 'land', strength });
        };

        document.addEventListener('keydown', event => {
            this.setKey(event.code, true);
            if (event.code === 'Space') this.jump();
        });
        document.addEventListener('keyup', event => this.setKey(event.code, false));
        window.addEventListener('blur', () => this.releaseKeys()); // Keys let go in another window never come up
    }

    get isLocked() {
        return this.pointerLock.isLocked;
    }

    // Where the eyes are, without the head's motion
    get eye() {
        return this.movement.position;
    }

    // Where the player is: above the spot they stand on, at eye height (the same point as eye)
    get position() {
        return this.movement.position;
    }

    // What the ground under the feet is made of ('sand', 'water', 'stone', ...; see movement.js)
    get surface() {
        const { movement } = this;
        return movement.wading ? 'water' : movement.surfaceAt(movement.position.x, movement.position.z);
    }

    // Sliding velocity over the ground (x, z)
    get slide() {
        return this.movement.slide;
    }

    get sliding() {
        return this.movement.sliding;
    }

    lock() {
        this.pointerLock.lock();
    }

    setKey(code, pressed) {
        const action = KEY_BINDINGS[code];
        if (!action) return;
        // Walking off on your own while being led: the visitor takes over
        if (this.guide.active) {
            if (!pressed || action === 'hurry') return;
            this.guide.release(this.movement.moving);
        }
        this.movement.moving[action] = pressed;
    }

    releaseKeys() {
        const moving = this.movement.moving;
        Object.keys(moving).forEach(action => { moving[action] = false; });
    }

    jump() {
        if (this.isLocked && this.inputEnabled) this.movement.jump();
    }

    // Stand on the ground where the camera is, at eye height
    placeOnGround() {
        this.movement.placeOnGround();
        this.view.update(0, this.eye, this.head);
    }

    // Walk in another world from now on (see Movement.setWorld); call teleport() to stand somewhere in it
    setWorld(world) {
        this.movement.setWorld(world);
    }

    // Walk along `points` ([[x, z], ...]) on the body's own feet, as if the keys were held, looking
    // where it goes. Resolves on arrival (or when the visitor walks off on their own).
    walkTo(points, options) {
        return this.guide.start(points, options);
    }

    // Stand at `position` (x, z; on the ground there), facing `yaw` and looking `pitch` up (radians)
    teleport({ position, yaw = this.view.yaw, pitch = 0 }) {
        this.guide.release(this.movement.moving);
        this.movement.teleport(position.x, position.z);
        this.view.yaw = yaw;
        this.view.pitch = pitch;
        this.view.turnRate.set(0, 0);
        this.view.update(0, this.eye, this.head);
    }

    update(delta) {
        const { movement, state, head } = this;

        // The body moves (on its own feet when being led), then everything else follows from what it did
        const guided = this.isLocked && this.guide.update(delta, movement.position, this.view, movement.moving);
        movement.update(delta, this.view.yaw, this.isLocked && (this.inputEnabled || guided));
        state.update(delta, movement);

        const sliding = movement.sliding;
        const walkSpeed = sliding ? 0 : movement.speed;
        this.breathing.update(delta, state.current === 'sprinting' ? HURRY_EFFORT : movement.effort);
        const stepped = head.update(
            delta, walkSpeed, movement.walking && !sliding, movement.effort, state.airborne, this.breathing.value
        );
        if (stepped) this.step(walkSpeed);

        this.view.update(delta, movement.position, head);
        this.interaction.update(delta); // From where the eyes are now
        this.hands.update(delta, state, head.gait, this.breathing.value, this.view);
    }

    // A foot landed: tell whoever listens (footsteps, the sand, nearby plants)
    step(walkSpeed) {
        const { movement } = this;
        const { position, heading } = movement;
        const gradient = movement.slopeAt(position.x, position.z);
        const step = {
            surface: this.surface,
            intensity: Math.min(1, walkSpeed / WALK_SPEED),
            speed: walkSpeed, // m/s
            foot: this.head.gait.foot,
            x: position.x,
            z: position.z,
            heading: Math.atan2(heading.x, heading.y),
            effort: movement.effort,
            downhill: Math.max(0, -(gradient.x * heading.x + gradient.y * heading.y))
        };
        this.onStep?.(step);
        this.dispatchEvent({ type: 'step', step });
    }
}
