// moment.js - A legendary moment as a place: the world held still at its turning point. The rain
// hangs in the air, the sea stops mid-swell, the lightning stays in the sky (the space's clock is
// slowed almost to nothing: see Space.timeScale). Only the echoes move: columns of drifting light
// where something happened. Observe an echo and it tells that part of the story. When every echo
// has been found, time moves again and the moment plays out: its resolution (the lightning flashes,
// thunder rolls, the lights brighten, a ship comes on, the sound of the storm comes back), and the
// visitor has seen it happen.
//
// buildMoment({ space, kit, services, beats, resolution, timeScale, accent })
//   beats       [{ id, at: [x, z], text, prompt, height }]     the echoes, in any order
//   resolution  { delay, ease (seconds for time to come back), timeScale, flash (a named lightning),
//                 light (a named light that flares with it), cue, brighten: [{ material, by }],
//                 move: [{ name, by: [x, y, z], over }], ambience, lines: [{ text, after, seconds }] }
//   timeScale   how fast time runs while held (0.02: almost still)
// Generic: any story's moment is beats and a resolution, in its own words and its own world.
import * as THREE from 'three';
import { createLightShaft, createParticles } from '../scenery/atmosphere.js';

const ease = t => t * t * (3 - 2 * t);

export function buildMoment({ space, kit, services, beats = [], resolution = {}, timeScale = 0.02, accent }) {
    const color = new THREE.Color(accent ?? kit.accent ?? '#ffd59a');
    space.timeScale = timeScale;
    const found = new Set();
    let resolved = false;

    const echoes = beats.map(beat => {
        const [x, z] = beat.at;
        const y = kit.ground.heightAt(x, z);
        const group = new THREE.Group();
        group.position.set(x, y, z);
        const shaft = createLightShaft({ radiusTop: 0.35, radiusBottom: 0.55, height: beat.height ?? 3.2, color: `#${color.getHexString()}`, intensity: 0.22 });
        group.add(shaft);
        const motes = createParticles({
            kind: 'embers', count: kit.quality.low ? 18 : 36, box: { min: [-0.5, 0.1, -0.5], max: [0.5, beat.height ?? 3, 0.5] },
            colors: [`#${color.getHexString()}`, '#ffffff'], size: 0.04, intensity: 1.8, speed: 0.4, seed: beat.id.length + 3
        });
        group.add(motes);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(2), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 48).rotateX(-Math.PI / 2), ringMaterial);
        ring.position.y = 0.03;
        group.add(ring);
        const target = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 8).translate(0, 1.2, 0), new THREE.MeshBasicMaterial());
        target.visible = false;
        group.add(target);
        kit.add(group);
        const point = new THREE.Vector3(x, y + 1.6, z);
        const echo = { beat, group, shaft, motes, ring, ringMaterial, point, glow: 1, glowGoal: 1, pulse: 0 };
        echo.interactable = kit.addInteractable({
            id: `echo:${beat.id}`,
            object: target,
            prompt: beat.prompt ?? 'Observe',
            interactionType: 'observe',
            maxDistance: 3.6,
            highlight: false,
            cooldown: 1,
            onFocus: () => { echo.glowGoal = found.has(beat.id) ? 0.55 : 1.6; },
            onBlur: () => { echo.glowGoal = found.has(beat.id) ? 0.35 : 1; },
            interact: () => observe(echo)
        });
        return echo;
    });

    function observe(echo) {
        const { beat } = echo;
        services.storyText?.show(beat.text, beat.seconds ?? 9);
        kit.cue('resonance', echo.point, 0.7);
        echo.pulse = 1;
        if (!found.has(beat.id)) {
            found.add(beat.id);
            echo.glowGoal = 0.35;
            if (found.size === echoes.length && !resolved) {
                resolved = true;
                setTimeout(resolve, (resolution.delay ?? 7) * 1000);
            }
        }
        return new Promise(done => setTimeout(done, 900));
    }

    // Time comes back, and the moment plays out
    let returning = null; // { from, to, t, duration }
    const flares = [];
    const moves = [];
    function resolve() {
        if (!space.attached) return; // The visitor left before it played out
        returning = { from: space.timeScale, to: resolution.timeScale ?? 1, t: 0, duration: resolution.ease ?? 3.5 };
        const flash = resolution.flash ? space.named[resolution.flash] : null;
        if (flash) flares.push({ kind: 'flash', target: flash, t: 0 });
        const light = resolution.light ? space.named[resolution.light] : null;
        if (light) flares.push({ kind: 'light', target: light, t: 0, base: light.intensity });
        if (resolution.cue) setTimeout(() => kit.cue(resolution.cue, null, 1), (resolution.cueAfter ?? 0.9) * 1000);
        for (const { material, by = 2 } of resolution.brighten ?? []) {
            const target = space.materials.cache.get(material);
            if (target) flares.push({ kind: 'brighten', target, t: 0, from: target.emissiveIntensity, to: target.emissiveIntensity * by });
        }
        for (const { name, by = [0, 0, 0], over = 30 } of resolution.move ?? []) {
            const object = space.named[name];
            if (object) moves.push({ object, from: object.position.clone(), by: new THREE.Vector3(...by), over, t: 0 });
        }
        if (resolution.ambience) {
            space.ambience = resolution.ambience;
            services.soundscape.setAmbience(resolution.ambience, { fade: 3 });
        }
        for (const { text, after = 0, seconds = 8 } of resolution.lines ?? []) {
            setTimeout(() => space.attached && services.storyText?.show(text, seconds), after * 1000);
        }
        space.dispatchEvent({ type: 'resolved' });
    }

    kit.onUpdate((delta, elapsed) => {
        // The echoes are the one thing not held still
        for (const echo of echoes) {
            echo.glow += (echo.glowGoal - echo.glow) * Math.min(1, delta * 3);
            echo.pulse = Math.max(0, echo.pulse - delta * 0.8);
            const strength = echo.glow + echo.pulse * 2;
            echo.shaft.material.uniforms.intensity.value = 0.22 * strength;
            echo.shaft.userData.time.value = elapsed;
            echo.motes.userData.time.value = elapsed;
            echo.ringMaterial.opacity = 0.25 + 0.5 * Math.min(1.5, strength) * (0.8 + 0.2 * Math.sin(elapsed * 2 + echo.point.x));
            echo.ring.scale.setScalar(1 + echo.pulse * 0.8);
        }
        if (returning) {
            returning.t = Math.min(1, returning.t + delta / returning.duration);
            space.timeScale = THREE.MathUtils.lerp(returning.from, returning.to, ease(returning.t));
            if (returning.t >= 1) returning = null;
        }
        for (let i = flares.length - 1; i >= 0; i--) {
            const flare = flares[i];
            flare.t += delta;
            if (flare.kind === 'flash') {
                // A blinding instant, a flicker, then the bolt is gone
                const { material, base } = flare.target;
                const k = flare.t < 0.12 ? 3 : flare.t < 0.25 ? 0.6 : flare.t < 0.35 ? 2.2 : Math.max(0, 1 - (flare.t - 0.35) / 0.5);
                material.color.copy(base).multiplyScalar(k);
                if (flare.t > 0.9) {
                    flare.target.object.visible = false;
                    flares.splice(i, 1);
                }
            } else if (flare.kind === 'light') {
                const k = flare.t < 0.12 ? 1 : flare.t < 0.25 ? 0.2 : flare.t < 0.35 ? 0.8 : Math.max(0, 1 - (flare.t - 0.35) / 0.7) * 0.6;
                flare.target.intensity = flare.base + (resolution.lightPeak ?? 6) * k;
                if (flare.t > 1.1) {
                    flare.target.intensity = flare.base;
                    flares.splice(i, 1);
                }
            } else if (flare.kind === 'brighten') {
                const k = ease(Math.min(1, flare.t / 4));
                flare.target.emissiveIntensity = THREE.MathUtils.lerp(flare.from, flare.to, k);
                if (k >= 1) flares.splice(i, 1);
            }
        }
        for (const move of moves) {
            move.t = Math.min(1, move.t + delta / move.over);
            move.object.position.copy(move.from).addScaledVector(move.by, ease(move.t));
        }
    });
    return { echoes, resolve };
}
