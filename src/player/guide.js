// guide.js - A few steps taken for the visitor: up a gangplank on "Board", through a door on
// "Enter". The body walks as if the keys were held, so the gait, the footsteps, the breathing and
// the collisions are all the ordinary ones; the head turns gently to look where the feet are going.
// It ends on arrival, if the way is blocked, or if the visitor takes over (any movement key).
//
//   const done = guide.start([[x, z], ...]);   // in the PlayerController: player.walkTo(points)
import * as THREE from 'three';

const ARRIVE = 0.3; // Metres from a waypoint that count as there
const TURN = 5; // How quickly the body turns toward the next waypoint (per second)
const STUCK_AFTER = 1.2; // Seconds without getting closer before giving up on a waypoint

export class Guide {
    constructor() {
        this.points = null;
        this.index = 0;
        this.resolve = null;
        this.best = Infinity;
        this.stuck = 0;
        this.hurry = false;
    }

    get active() {
        return this.points !== null;
    }

    // points: [[x, z], ...] in the world; hurry: walk briskly. Resolves when it is over.
    start(points, { hurry = false } = {}) {
        this.finish();
        this.points = points.map(([x, z]) => new THREE.Vector2(x, z));
        this.index = 0;
        this.best = Infinity;
        this.stuck = 0;
        this.hurry = hurry;
        return new Promise(resolve => { this.resolve = resolve; });
    }

    // Let go: the visitor walks on their own again
    finish() {
        if (!this.points) return;
        this.points = null;
        const resolve = this.resolve;
        this.resolve = null;
        resolve?.();
    }

    // Each frame, before the body moves: point the body at the next waypoint and "hold the keys".
    // moving: the body's keys (Movement.moving); view: the FirstPersonCamera. Returns whether it is guiding.
    update(delta, position, view, moving) {
        if (!this.points) return false;
        let target = this.points[this.index];
        let distance = Math.hypot(target.x - position.x, target.y - position.z);
        while (distance < ARRIVE) {
            this.index += 1;
            this.best = Infinity;
            this.stuck = 0;
            if (this.index >= this.points.length) {
                this.release(moving);
                return false;
            }
            target = this.points[this.index];
            distance = Math.hypot(target.x - position.x, target.y - position.z);
        }

        // Something in the way: give up on this waypoint after a moment
        if (distance < this.best - 0.02) {
            this.best = distance;
            this.stuck = 0;
        } else if ((this.stuck += delta) > STUCK_AFTER) {
            this.index += 1;
            this.best = Infinity;
            this.stuck = 0;
            if (this.index >= this.points.length) {
                this.release(moving);
                return false;
            }
        }

        // Turn toward it (yaw 0 looks along -z), and walk
        const want = Math.atan2(-(target.x - position.x), -(target.y - position.z));
        const turn = THREE.MathUtils.euclideanModulo(want - view.yaw + Math.PI, Math.PI * 2) - Math.PI;
        const step = turn * Math.min(1, delta * TURN);
        view.yaw += step;
        view.turned.x += step; // The hands trail the turn, as they do when the mouse turns
        view.pitch += (-0.08 - view.pitch) * Math.min(1, delta * 1.5); // Eyes on the way ahead
        const facing = Math.abs(turn) < 1.2; // Turn on the spot first if it is behind
        moving.forward = facing;
        moving.backward = moving.left = moving.right = false;
        moving.hurry = this.hurry;
        return true;
    }

    release(moving) {
        Object.keys(moving).forEach(key => { moving[key] = false; });
        this.finish();
    }
}
