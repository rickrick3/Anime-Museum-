// behaviors.js - How an exhibit answers when it is examined. Each behaviour moves the named parts of
// the exhibit's model (see src/scenery/artifacts.js) and is over after a few seconds:
//
//   lift        the piece rises from its stand, turns once in the light, and settles back
//   illuminate  a ring of light climbs around it and it glows warmly from within, then cools
//   unfold      a scroll unrolls (and stays open)
//   sequence    plaques light one after another (and stay softly lit)
//   reveal      pins rise and points of light glow
//   open        a cover (a book's, a lid) swings open, and stays open; its pages brighten
//   swing       a bell swings back and forth, ringing at each turn, and comes to rest
//   pulse       anything else: a moment's pause
//
// createBehavior(name, parts, { cue }) returns { start() -> Promise, update(delta), running }.
// cue(name) plays a sound (a timeline ticks once per plaque).
import * as THREE from 'three';

const ease = t => t * t * (3 - 2 * t);
const clamp01 = t => THREE.MathUtils.clamp(t, 0, 1);

class Behavior {
    constructor(parts, { cue = () => {} } = {}) {
        this.parts = parts;
        this.cue = cue;
        this.running = false;
        this.time = 0;
        this.duration = 0.5;
        this.resolve = null;
    }

    start() {
        if (this.running) return this.promise;
        this.running = true;
        this.time = 0;
        this.begin();
        this.promise = new Promise(resolve => { this.resolve = resolve; });
        return this.promise;
    }

    update(delta) {
        if (!this.running) return;
        this.time += delta;
        this.step(Math.min(this.time, this.duration));
        if (this.time >= this.duration) {
            this.running = false;
            this.end();
            this.resolve?.();
        }
    }

    begin() {}
    step() {}
    end() {}
}

class Lift extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.duration = 5.2;
        const moving = parts.moving;
        this.rest = moving ? { position: moving.position.clone(), rotation: moving.rotation.clone() } : null;
    }

    step(t) {
        const moving = this.parts.moving;
        if (!moving) return;
        const up = ease(clamp01(t / 0.9)) * (1 - ease(clamp01((t - 4.2) / 1.0)));
        const turn = ease(clamp01((t - 0.6) / 3.6)) * Math.PI * 2;
        moving.position.copy(this.rest.position);
        moving.position.y += up * (0.1 + 0.008 * Math.sin(t * 2.4));
        moving.rotation.copy(this.rest.rotation);
        moving.rotation.y += turn;
        moving.rotation.z += up * 0.12 * Math.sin(t * 1.3); // Tipping a little to catch the light
    }

    end() {
        this.parts.moving?.position.copy(this.rest.position);
        this.parts.moving?.rotation.copy(this.rest.rotation);
    }
}

class Illuminate extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.duration = 5.5;
        this.ringBase = parts.ring?.position.y ?? 0;
    }

    step(t) {
        const { ring, glows = [] } = this.parts;
        if (ring) {
            const climb = clamp01(t / 2.6);
            ring.visible = climb < 1;
            ring.position.y = this.ringBase + ease(climb) * 2.1;
            ring.material.opacity = Math.sin(Math.PI * climb) * 0.9;
            ring.scale.setScalar(1 - 0.35 * ease(climb));
        }
        // It warms from within as the ring passes, and slowly cools again
        const on = ease(clamp01((t - 0.4) / 1.4)) * (1 - ease(clamp01((t - 3.6) / 1.9)));
        glows.forEach(glow => { glow.material.emissiveIntensity = glow.base + on * (glow.peak ?? 1); });
    }

    end() {
        const { ring, glows = [] } = this.parts;
        if (ring) {
            ring.position.y = this.ringBase;
            ring.material.opacity = 0;
            ring.scale.setScalar(1);
            ring.visible = false;
        }
        glows.forEach(glow => { glow.material.emissiveIntensity = glow.base; });
    }
}

class Unfold extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.open = false;
    }

    begin() {
        this.duration = this.open ? 0.4 : 1.8; // Already open: just a moment
    }

    step(t) {
        if (this.open) return;
        const { paper, rollers, unfoldWidth = 0.8 } = this.parts;
        const amount = 0.12 + 0.88 * ease(clamp01(t / 1.6));
        if (paper) paper.scale.x = amount;
        rollers?.forEach(roller => {
            roller.position.x = roller.userData.side * (unfoldWidth / 2) * amount;
            roller.rotation.z = roller.userData.side * amount * 6;
        });
    }

    end() {
        this.open = true;
    }
}

class Sequence extends Behavior {
    begin() {
        const count = this.parts.plaques?.length ?? 0;
        this.duration = count * 0.38 + 0.9;
        this.lit = 0;
    }

    step(t) {
        const plaques = this.parts.plaques ?? [];
        plaques.forEach(({ material }, i) => {
            const start = i * 0.38;
            if (t >= start && i >= this.lit) {
                this.lit = i + 1;
                this.cue('tick');
            }
            const local = t - start;
            // A bright moment as it lights, then a soft glow that stays
            material.emissiveIntensity = local < 0 ? material.emissiveIntensity
                : 0.35 + 1.2 * Math.exp(-local * 2.5) * clamp01(local * 12);
        });
    }
}

class Reveal extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.duration = 2.6;
    }

    step(t) {
        const { markers = [], glows = [], glowDots = [] } = this.parts;
        markers.forEach((pin, i) => {
            const local = clamp01((t - i * 0.12) / 0.7);
            pin.scale.y = 0.35 + 0.65 * ease(local);
        });
        const flare = Math.exp(-Math.max(0, t - 0.6) * 1.6) * clamp01(t * 3);
        glows.forEach(glow => { glow.material.emissiveIntensity = glow.base + 2.4 * flare + 0.6 * clamp01(t); });
        glowDots.forEach(dot => { dot.material.color.copy(dot.color).multiplyScalar(1 + 1.5 * flare); });
    }

    end() {
        // The pins stay up and gently lit once revealed
        (this.parts.glows ?? []).forEach(glow => { glow.base = 1; glow.material.emissiveIntensity = 1; });
    }
}

class Open extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.open = false;
        this.rest = parts.cover?.rotation.z ?? 0;
    }

    begin() {
        this.duration = this.open ? 0.4 : 1.6; // Already open: just a moment
    }

    step(t) {
        const { cover, coverAngle = Math.PI, glows = [] } = this.parts;
        if (!this.open && cover) cover.rotation.z = this.rest + coverAngle * ease(clamp01(t / 1.2));
        const light = this.open ? 1 : ease(clamp01((t - 0.5) / 1.0));
        glows.forEach(glow => { glow.material.emissiveIntensity = glow.base + light * (glow.peak ?? 0.3); });
    }

    end() {
        this.open = true;
    }
}

class Swing extends Behavior {
    constructor(parts, options) {
        super(parts, options);
        this.duration = 6;
        this.rest = parts.moving?.rotation.x ?? 0;
        this.rung = 0;
    }

    begin() {
        this.rung = 0;
    }

    step(t) {
        const { moving, glows = [] } = this.parts;
        if (!moving) return;
        const angle = 0.55 * Math.sin(t * 2.6) * Math.exp(-t * 0.45);
        moving.rotation.x = this.rest + angle;
        // It rings each time it reaches the top of its swing
        const turns = Math.floor((t * 2.6 + Math.PI / 2) / Math.PI);
        if (turns > this.rung && t < 4.5) {
            this.rung = turns;
            this.cue('bell');
        }
        const light = Math.exp(-t * 0.6);
        glows.forEach(glow => { glow.material.emissiveIntensity = glow.base + light * (glow.peak ?? 0.4); });
    }

    end() {
        if (this.parts.moving) this.parts.moving.rotation.x = this.rest;
        (this.parts.glows ?? []).forEach(glow => { glow.material.emissiveIntensity = glow.base; });
    }
}

class Pulse extends Behavior {}

const BEHAVIORS = { lift: Lift, illuminate: Illuminate, unfold: Unfold, sequence: Sequence, reveal: Reveal, open: Open, swing: Swing, pulse: Pulse };

export function registerBehavior(name, Class) {
    BEHAVIORS[name] = Class;
}

export function createBehavior(name, parts = {}, options = {}) {
    const Class = BEHAVIORS[name] ?? Pulse;
    return new Class(parts, options);
}

export { Behavior };
