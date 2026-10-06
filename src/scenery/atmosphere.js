// atmosphere.js - What hangs in the air: dust drifting through a beam of light, fireflies over the
// grass, leaves falling, embers rising, soft shafts of light and low mist. Each is one draw call and
// moves entirely on the GPU (only a time value changes each frame), so a world can have several.
//
//   createParticles({ kind, count, box, colors, size, intensity, speed })
//     kind: 'dust' (slow drift), 'fireflies' (wander and blink), 'leaves' (tumble down),
//     'embers' (rise and flicker) or 'rain' (falling streaks; with the world's clock nearly still,
//     drops hanging in the air); box: { min: [x, y, z], max: [x, y, z] } where they live
//   createLightShaft({ radiusTop, radiusBottom, height, color, intensity })
//   createMist({ size, height, color, opacity, layers })
// Each returns an Object3D with .userData.time (a { value } uniform to advance).
import * as THREE from 'three';

const KINDS = { dust: 0, fireflies: 1, leaves: 2, embers: 3, rain: 4 };

const particleVertex = /* glsl */ `
    attribute vec4 seed;
    attribute vec3 color;
    uniform float time;
    uniform float kind;
    uniform float size;
    uniform float speed;
    uniform float pixelRatio;
    uniform vec3 boxMin;
    uniform vec3 boxSize;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSpin;

    void main() {
        vec3 p = position;
        float t = time * speed;
        float alpha = 1.0;
        if (kind < 0.5) {
            // Dust: slow loops, barely moving
            p += vec3(sin(t * (0.11 + seed.x * 0.1) + seed.y * 6.28), sin(t * (0.07 + seed.z * 0.06) + seed.w * 6.28) * 0.6,
                      cos(t * (0.09 + seed.z * 0.1) + seed.x * 6.28)) * 0.6;
            alpha = 0.5 + 0.5 * sin(t * 0.4 + seed.w * 12.0);
        } else if (kind < 1.5) {
            // Fireflies: wander, and light up now and then
            p += vec3(sin(t * (0.3 + seed.x * 0.3) + seed.y * 6.28) * 1.4, sin(t * (0.5 + seed.z * 0.4) + seed.w * 6.28) * 0.35,
                      cos(t * (0.25 + seed.z * 0.3) + seed.x * 6.28) * 1.4);
            float blink = sin(t * (0.6 + seed.y * 0.9) + seed.w * 40.0);
            alpha = smoothstep(0.2, 0.95, blink);
        } else if (kind < 2.5) {
            // Leaves: fall through the box, drifting and tumbling, and start again at the top
            float fall = mod(position.y - boxMin.y - t * (0.45 + seed.x * 0.35), boxSize.y);
            p.y = boxMin.y + fall;
            p.x += sin(t * (0.7 + seed.y) + seed.z * 6.28) * 0.6 + t * 0.15;
            p.z += cos(t * (0.6 + seed.w) + seed.x * 6.28) * 0.5;
            p.x = boxMin.x + mod(p.x - boxMin.x, boxSize.x);
            alpha = smoothstep(0.0, 0.6, fall) * smoothstep(boxSize.y, boxSize.y - 1.5, fall);
        } else if (kind < 3.5) {
            // Embers: rise and flicker out
            float rise = mod(position.y - boxMin.y + t * (0.4 + seed.x * 0.5), boxSize.y);
            p.y = boxMin.y + rise;
            p.x += sin(t * (1.1 + seed.y) + seed.z * 6.28) * 0.3;
            p.z += cos(t * (0.9 + seed.w) + seed.x * 6.28) * 0.3;
            alpha = (1.0 - rise / boxSize.y) * (0.6 + 0.4 * sin(t * 9.0 + seed.w * 30.0));
        } else {
            // Rain: falls fast, slanting with the wind, and starts again at the top
            float fall = mod(position.y - boxMin.y - t * (9.0 + seed.x * 3.0), boxSize.y);
            p.y = boxMin.y + fall;
            p.x += t * 1.6;
            p.x = boxMin.x + mod(p.x - boxMin.x, boxSize.x);
            alpha = 0.55 + 0.45 * seed.y;
        }
        vSpin = t * (1.0 + seed.z * 2.0) + seed.y * 6.28;
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float distance = -mv.z;
        vAlpha = alpha * smoothstep(0.15, 0.8, distance) * smoothstep(60.0, 30.0, distance);
        gl_PointSize = size * (0.6 + seed.z * 0.8) * pixelRatio * 300.0 / max(distance, 0.1);
        gl_Position = projectionMatrix * mv;
    }
`;

const particleFragment = /* glsl */ `
    uniform float kind;
    uniform float intensity;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSpin;

    void main() {
        vec2 c = gl_PointCoord - 0.5;
        float shape;
        if (kind > 3.5) {
            // A drop of rain: a thin streak, brightest at its middle
            float streak = (1.0 - smoothstep(0.035, 0.1, abs(c.x + c.y * 0.12))) * (1.0 - smoothstep(0.15, 0.5, abs(c.y)));
            if (streak < 0.02) discard;
            gl_FragColor = vec4(vColor * intensity * streak, vAlpha * streak);
        } else if (kind > 1.5 && kind < 2.5) {
            // A leaf: a pointed oval with a midrib, turning as it falls
            float s = sin(vSpin), k = cos(vSpin);
            vec2 r = vec2(c.x * k - c.y * s, c.x * s + c.y * k);
            r.x *= 1.0 + 0.6 * abs(sin(vSpin * 0.7)); // Seen edge-on now and then
            float leaf = 1.0 - smoothstep(0.16, 0.2, abs(r.x) + r.y * r.y * 1.6 + 0.02);
            shape = leaf * (1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.015, abs(r.x))));
            if (shape < 0.05 || length(c) > 0.5) discard;
            gl_FragColor = vec4(vColor * intensity * (0.8 + 0.2 * shape), vAlpha * smoothstep(0.0, 0.3, shape));
        } else {
            float d = length(c);
            if (d > 0.5) discard;
            shape = smoothstep(0.5, 0.0, d);
            shape *= shape;
            gl_FragColor = vec4(vColor * intensity * shape, vAlpha * shape);
        }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

export function createParticles({
    kind = 'dust', count = 200, box, colors = ['#ffffff'], size = 0.05, intensity = 1, speed = 1, seed = 1
}) {
    const min = new THREE.Vector3(...box.min), max = new THREE.Vector3(...box.max);
    const extent = new THREE.Vector3().subVectors(max, min);
    let state = seed * 9973;
    const random = () => {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const colorArray = new Float32Array(count * 3);
    const palette = colors.map(value => new THREE.Color(value));
    for (let i = 0; i < count; i++) {
        positions.set([min.x + random() * extent.x, min.y + random() * extent.y, min.z + random() * extent.z], i * 3);
        seeds.set([random(), random(), random(), random()], i * 4);
        palette[Math.floor(random() * palette.length)].toArray(colorArray, i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const time = { value: 0 };
    const leaves = kind === 'leaves';
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time,
            kind: { value: KINDS[kind] ?? 0 },
            size: { value: size },
            speed: { value: speed },
            intensity: { value: intensity },
            pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            boxMin: { value: min },
            boxSize: { value: extent }
        },
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: leaves ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // They move in the shader
    points.userData.time = time;
    return points;
}

// A soft shaft of light: a cone open at both ends, brightest where you look across its middle,
// fading toward its edges, its top and its foot, with a slow shimmer of dust in it
export function createLightShaft({ radiusTop = 1.5, radiusBottom = 3, height = 10, color = '#cfe8ff', intensity = 0.25 } = {}) {
    const time = { value: 0 };
    const material = new THREE.ShaderMaterial({
        uniforms: { time, color: { value: new THREE.Color(color) }, intensity: { value: intensity } },
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vHeight;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vHeight = uv.y;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float time;
            uniform vec3 color;
            uniform float intensity;
            varying vec3 vNormal;
            varying vec3 vView;
            varying float vHeight;
            varying vec2 vUv;
            void main() {
                float across = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.6);
                float along = smoothstep(0.0, 0.25, vHeight) * smoothstep(1.0, 0.7, vHeight);
                float shimmer = 0.8 + 0.2 * sin(vUv.x * 40.0 + time * 0.6) * sin(vUv.y * 9.0 - time * 0.3);
                gl_FragColor = vec4(color * intensity * across * along * shimmer, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 1, true).translate(0, height / 2, 0), material);
    shaft.userData.time = time;
    shaft.renderOrder = 2;
    return shaft;
}

// Low mist lying over the ground: a few soft, slowly drifting layers. It thins as the eye comes
// close to a layer, so it never looks like a flat sheet.
export function createMist({ size = 80, height = 0.5, color = '#8a7f99', opacity = 0.25, layers = 3 } = {}) {
    const time = { value: 0 };
    const group = new THREE.Group();
    for (let i = 0; i < layers; i++) {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time, color: { value: new THREE.Color(color) }, opacity: { value: opacity / layers * 1.6 },
                offset: { value: i * 17.3 }
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                varying vec3 vWorld;
                void main() {
                    vUv = uv;
                    vec4 world = modelMatrix * vec4(position, 1.0);
                    vWorld = world.xyz;
                    gl_Position = projectionMatrix * viewMatrix * world;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float time;
                uniform vec3 color;
                uniform float opacity;
                uniform float offset;
                varying vec2 vUv;
                varying vec3 vWorld;
                float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                float noise(vec2 p) {
                    vec2 i = floor(p), f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
                }
                void main() {
                    vec2 p = vWorld.xz * 0.06 + vec2(time * 0.012 + offset, time * 0.007);
                    float n = noise(p) * 0.6 + noise(p * 2.3 + 4.0) * 0.3 + noise(p * 5.1) * 0.1;
                    float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
                    float near = smoothstep(0.2, 2.0, abs(cameraPosition.y - vWorld.y)) * smoothstep(1.0, 6.0, length(cameraPosition.xz - vWorld.xz));
                    gl_FragColor = vec4(color, smoothstep(0.35, 0.85, n) * opacity * edge * near);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }
            `,
            transparent: true,
            depthWrite: false
        });
        const layer = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), material);
        layer.position.y = height * (0.4 + (i / Math.max(1, layers - 1)) * 0.9);
        layer.renderOrder = 3;
        group.add(layer);
    }
    group.userData.time = time;
    return group;
}
