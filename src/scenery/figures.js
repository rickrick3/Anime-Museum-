// figures.js - People, as a museum shows them: stylised figures built from simple shapes, never
// likenesses. A figure is a build (its clothes and bearing) and a pose (what its arms are doing):
//
//   builds  captain (long coat, wide hat), navigator (short jacket, scarf, satchel), shipwright
//           (broad, apron, headband), townsfolk (cloak and hood), child
//   poses   rest, hip, lantern-raised, lantern-low, spyglass, hammer
//
// figureGeometry() gives the shapes (in the figure's own space: feet at the origin, facing -z) for
// whoever draws them: a bronze statue on a plinth, a glowing echo of someone who was there, or a
// crowd of dark silhouettes holding lanterns, merged into a couple of draw calls.
//
//   models  'character-statue' { figure, name, epithet, accent, metal }  for a gallery
//           'echo-figure' { figure, accent }                              a person remembered, in light
//   pieces  'crowd' { positions: [[x, z, facing, figure], ...] }           silhouettes with lanterns
import * as THREE from 'three';
import { PieceBuilder, createRandom } from './kit.js';
import { createText } from './text.js';

// ---- Shapes -----------------------------------------------------------------------------------

function capsuleBetween(a, b, radius) {
    const length = Math.max(0.001, a.distanceTo(b));
    const geometry = new THREE.CapsuleGeometry(radius, length, 3, 8);
    const direction = b.clone().sub(a).normalize();
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction));
    const middle = a.clone().add(b).multiplyScalar(0.5);
    return geometry.translate(middle.x, middle.y, middle.z);
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Arms: where the elbow and the hand are (the right arm; the left mirrors it)
const ARMS = {
    rest: { elbow: v(0.27, 1.12, 0.04), hand: v(0.28, 0.86, 0.0) },
    hip: { elbow: v(0.37, 1.13, 0.06), hand: v(0.21, 0.99, -0.06) },
    'lantern-raised': { elbow: v(0.33, 1.62, -0.06), hand: v(0.3, 1.96, -0.14), lantern: v(0.3, 1.74, -0.15) },
    'lantern-low': { elbow: v(0.28, 1.14, -0.14), hand: v(0.22, 1.2, -0.38), lantern: v(0.22, 1.0, -0.39) },
    spyglass: { elbow: v(0.3, 1.42, -0.22), hand: v(0.09, 1.6, -0.2), spyglass: true },
    hammer: { elbow: v(0.37, 1.27, 0.06), hand: v(0.24, 1.52, 0.03), hammer: true }
};

const BUILDS = {
    captain: { hem: 0.5, flare: 0.31, shoulders: 0.215, right: 'lantern-raised', left: 'hip', hat: 'brim', boots: 0.42 },
    navigator: { hem: 0.92, flare: 0.22, shoulders: 0.2, right: 'spyglass', left: 'rest', scarf: true, satchel: true, bun: true, boots: 0.3 },
    shipwright: { hem: 0.88, flare: 0.25, shoulders: 0.25, broad: 1.18, right: 'hammer', left: 'rest', apron: true, band: true, boots: 0.25 },
    townsfolk: { hem: 0.12, flare: 0.3, shoulders: 0.2, right: 'lantern-raised', left: 'rest', hood: true },
    child: { hem: 0.3, flare: 0.25, shoulders: 0.19, right: 'lantern-raised', left: 'rest', scale: 0.66, cap: true }
};

// options: { figure (a build name), right, left (pose names), scale }
// Returns { body: [geometry], glow: [geometry], lights: [Vector3] } in the figure's own space.
export function figureGeometry({ figure = 'townsfolk', right, left, scale: extra = 1 } = {}) {
    const build = BUILDS[figure] ?? BUILDS.townsfolk;
    const scale = (build.scale ?? 1) * extra;
    const broad = build.broad ?? 1;
    const body = [], glow = [], lights = [];
    const add = geometry => body.push(geometry);

    // Legs and boots (under a long coat only the boots show)
    for (const side of [-1, 1]) {
        add(capsuleBetween(v(side * 0.1, 0.12, 0), v(side * 0.1, 0.86, 0), 0.075 * broad));
        add(new THREE.CylinderGeometry(0.085 * broad, 0.09 * broad, build.boots ?? 0.2, 8).translate(side * 0.1, (build.boots ?? 0.2) / 2, -0.01));
        add(new THREE.BoxGeometry(0.1 * broad, 0.06, 0.2).translate(side * 0.1, 0.03, -0.06));
    }
    // The coat: a profile turned about the body, flared at the hem, flattened front to back
    const hem = build.hem, flare = build.flare * broad, s = build.shoulders * broad;
    const profile = [[0.0, hem - 0.01], [flare, hem], [flare * 0.82, (hem + 0.95) / 2], [0.19 * broad, 0.95], [0.17 * broad, 1.12],
        [s, 1.36], [s * 0.6, 1.47], [0.05, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
    add(new THREE.LatheGeometry(profile, 14).scale(1, 1, 0.72));
    // Neck and head
    add(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 8).translate(0, 1.53, 0));
    add(new THREE.SphereGeometry(0.11, 14, 12).scale(1, 1.12, 1.02).translate(0, 1.66, 0));
    if (build.bun) add(new THREE.SphereGeometry(0.06, 10, 8).translate(0, 1.72, 0.09));
    if (build.hat === 'brim') {
        add(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 20).rotateZ(-0.12).translate(0, 1.76, 0));
        add(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 14).rotateZ(-0.12).translate(0.005, 1.84, 0));
    }
    if (build.cap) add(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.69, 0));
    if (build.band) add(new THREE.TorusGeometry(0.108, 0.018, 6, 18).rotateX(Math.PI / 2).translate(0, 1.71, 0));
    if (build.hood) add(new THREE.SphereGeometry(0.15, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.15, 1.15).translate(0, 1.66, 0.02));
    if (build.apron) add(new THREE.BoxGeometry(0.34, 0.66, 0.02).translate(0, 0.95, -0.165));
    if (build.scarf) {
        add(new THREE.TorusGeometry(0.07, 0.03, 6, 14).rotateX(Math.PI / 2).translate(0, 1.5, 0));
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0.04, 1.5, 0.06), v(0.12, 1.4, 0.2), v(0.26, 1.3, 0.3), v(0.4, 1.28, 0.34)]), 10, 0.03, 5));
    }
    if (build.satchel) {
        add(new THREE.BoxGeometry(0.06, 0.24, 0.3).translate(-0.24, 0.98, 0.0));
        add(new THREE.TorusGeometry(0.3, 0.012, 4, 20, Math.PI).rotateZ(-0.55).translate(-0.06, 1.15, 0));
    }

    // Arms, and what the hands hold
    for (const side of [-1, 1]) {
        const pose = ARMS[(side > 0 ? right : left) ?? (side > 0 ? build.right : build.left)] ?? ARMS.rest;
        const mirror = p => v(p.x * side, p.y, p.z);
        const shoulder = v(side * (s - 0.02), 1.4, 0);
        const elbow = mirror(pose.elbow), hand = mirror(pose.hand);
        add(capsuleBetween(shoulder, elbow, 0.058 * broad));
        add(capsuleBetween(elbow, hand, 0.05 * broad));
        add(new THREE.SphereGeometry(0.055, 8, 6).translate(hand.x, hand.y, hand.z));
        if (pose.lantern) {
            const at = mirror(pose.lantern);
            add(new THREE.CylinderGeometry(0.005, 0.005, hand.y - at.y - 0.1, 4).translate(at.x, (hand.y + at.y + 0.1) / 2, at.z));
            add(new THREE.ConeGeometry(0.08, 0.07, 8).translate(at.x, at.y + 0.1, at.z));
            add(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 8).translate(at.x, at.y - 0.08, at.z));
            glow.push(new THREE.CylinderGeometry(0.062, 0.062, 0.15, 8).translate(at.x, at.y, at.z));
            lights.push(at.clone());
        }
        if (pose.spyglass) {
            add(capsuleBetween(hand.clone().add(v(0.02, 0.0, 0.08)), hand.clone().add(v(-0.04, 0.02, -0.34)), 0.028));
            add(capsuleBetween(hand.clone().add(v(-0.04, 0.02, -0.3)), hand.clone().add(v(-0.06, 0.03, -0.46)), 0.036));
        }
        if (pose.hammer) {
            const end = hand.clone().add(v(-0.18 * side, 0.32, 0.3));
            add(capsuleBetween(hand.clone().add(v(0.03 * side, -0.08, -0.06)), end, 0.02));
            add(new THREE.BoxGeometry(0.2, 0.08, 0.08).translate(end.x, end.y, end.z));
        }
    }
    const all = [...body, ...glow];
    all.forEach(geometry => geometry.scale(scale, scale, scale));
    lights.forEach(point => point.multiplyScalar(scale));
    return { body, glow, lights };
}

// ---- A statue in a gallery --------------------------------------------------------------------

// params: figure, name, epithet, accent, metal ('bronze' | 'pale'), plinth (height)
export function characterStatue(params) {
    const accent = new THREE.Color(params.accent ?? '#ffcf8a');
    const metal = params.metal === 'pale'
        ? new THREE.MeshStandardMaterial({ color: '#c9c2b4', roughness: 0.55, metalness: 0.1, emissive: accent, emissiveIntensity: 0 })
        : new THREE.MeshStandardMaterial({ color: '#6d5a3f', roughness: 0.38, metalness: 0.75, emissive: accent, emissiveIntensity: 0 });
    const flame = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc27a').multiplyScalar(2.4) });
    const stone = new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.4, metalness: 0.3 });
    const line = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.8) });
    const group = new THREE.Group();
    const plinth = params.plinth ?? 0.7;
    const base = new PieceBuilder();
    base.cylinder(stone, 0.55, 0.6, plinth, 0, 0, 0, 32);
    base.cylinder(stone, 0.66, 0.66, 0.08, 0, 0, 0, 32);
    base.add(line, new THREE.TorusGeometry(0.556, 0.007, 4, 64).rotateX(Math.PI / 2).translate(0, plinth - 0.06, 0));
    group.add(base.build());

    const shapes = figureGeometry({ figure: params.figure, scale: params.scale ?? 1.08 });
    const figure = new PieceBuilder();
    shapes.body.forEach(geometry => figure.add(metal, geometry));
    shapes.glow.forEach(geometry => figure.add(flame, geometry));
    const built = figure.build();
    built.position.y = plinth;
    group.add(built);

    // The name on the plinth's face
    if (params.name) {
        const label = createText([
            { text: params.name.toUpperCase(), size: 1, weight: 400, spacing: 0.22, color: '#efe6d6' },
            ...(params.epithet ? [{ text: params.epithet, font: 'serif', italic: true, size: 0.62, color: '#b9ad98', gap: 0.35 }] : [])
        ], { size: 0.075, padding: 0.06, intensity: 1.1 });
        label.position.set(0, plinth * 0.62, -0.6);
        label.rotation.y = Math.PI;
        group.add(label);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = plinth + 0.02;
    group.add(ring);
    group.userData.parts = { ring, glows: [{ material: metal, base: 0, peak: 0.05 }] };
    return group;
}

// ---- An echo: a person remembered, standing in light -------------------------------------------

export function echoMaterial(color, { opacity = 0.9, time = { value: 0 } } = {}) {
    const material = new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: 1 }, opacity: { value: opacity }, time },
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vHeight;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-mv.xyz);
                vHeight = (modelMatrix * vec4(position, 1.0)).y;
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 color;
            uniform float intensity;
            uniform float opacity;
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vHeight;
            void main() {
                float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
                float lines = 0.8 + 0.2 * sin(vHeight * 46.0 - time * 1.6);
                float shimmer = 0.9 + 0.1 * sin(time * 2.3 + vHeight * 3.0);
                vec3 c = color * (0.18 + rim * 1.6) * lines * shimmer * intensity;
                gl_FragColor = vec4(c, (0.22 + rim * 0.9) * opacity);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    // So the behaviours that warm a glow (see src/museum/behaviors.js) can warm this one too
    Object.defineProperty(material, 'emissiveIntensity', {
        get: () => material.uniforms.intensity.value,
        set: value => { material.uniforms.intensity.value = value; }
    });
    return material;
}

// params: figure, accent, scale
export function echoFigure(params, kit) {
    const accent = new THREE.Color(params.accent ?? '#ffd59a');
    const time = kit?.time ?? { value: 0 };
    const material = echoMaterial(accent, { time });
    const flame = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(2.6) });
    const shapes = figureGeometry({ figure: params.figure, scale: params.scale ?? 1 });
    const builder = new PieceBuilder();
    shapes.body.forEach(geometry => builder.add(material, geometry));
    shapes.glow.forEach(geometry => builder.add(flame, geometry));
    const group = new THREE.Group();
    const figure = builder.build({ castShadow: false, receiveShadow: false });
    group.add(figure);
    // A pool of light at its feet, and motes drifting up through it
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
        color: accent.clone().multiplyScalar(0.5), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    pool.position.y = 0.02;
    group.add(pool);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.01, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = 0.03;
    group.add(ring);
    group.userData.parts = { ring, glows: [{ material, base: 1, peak: 1.6 }] };
    return group;
}

// ---- A crowd of silhouettes, each holding up a lantern ----------------------------------------

// params: positions: [[x, z, facing, figure], ...], color, glow (CSS); the lanterns' material is
// named 'lantern-glow' in the world's materials, so a moment can brighten them all at once
export function crowd(params, kit) {
    const random = createRandom(params.seed ?? 21);
    const dark = kit.materials.standard('silhouette', { color: params.color ?? '#14161c', roughness: 0.9 });
    const flame = kit.materials.get('lantern-glow', () => {
        const material = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: params.glow ?? '#ffb560', emissiveIntensity: 2.2 });
        material.userData.noShadow = true;
        return material;
    });
    const builder = new PieceBuilder();
    for (const [x, z, facing = 0, figure] of params.positions ?? []) {
        const kind = figure ?? (random() < 0.15 ? 'child' : 'townsfolk');
        const right = random() < 0.6 ? 'lantern-raised' : 'lantern-low';
        const shapes = figureGeometry({ figure: kind, right, scale: 0.94 + random() * 0.12 });
        const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(x, kit.ground.heightAt(x, z), z),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(facing) + (random() - 0.5) * 0.3),
            new THREE.Vector3(1, 1, 1)
        );
        shapes.body.forEach(geometry => builder.add(dark, geometry.applyMatrix4(matrix)));
        shapes.glow.forEach(geometry => builder.add(flame, geometry.applyMatrix4(matrix)));
        if (kind !== 'child') kit.addCollider({ x, z, radius: 0.28 });
    }
    kit.add(builder.build());
}
crowd.takesPositions = true;
