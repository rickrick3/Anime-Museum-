// portalSurface.js - The glowing surface of a doorway into another world. It is a window more than a
// door: through it you see that world's sky and horizon, a few layers deep, shifting with parallax
// as you move, under a slowly turning membrane of light in the exhibition's accent colour.
//
// Everything comes from data (an exhibition's `preview`):
//   style      'mountains' (ridges and pines), 'sea' (a horizon over water), 'city' (a skyline with
//              lit windows) or 'museum' (the dark hall with its rings of light)
//   sky        [top, horizon] colours
//   far, near  the colours of the far and near layers
//   celestial  { x, y, size, color }: a sun or moon (x, y: 0..1 across and up the view)
// A sealed doorway (open = 0) is frosted: the world shows only as a dim, grey shape behind it.
// shape 'oval': no frame at all, a ragged oval of light hanging in the air (a rift into a moment).
import * as THREE from 'three';

const STYLES = { mountains: 0, sea: 1, city: 2, museum: 3 };

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vView;
    void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        // From the surface toward the eye, in the doorway's own space (x right, y up, z out)
        vView = transpose(mat3(modelMatrix)) * (cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const fragmentShader = /* glsl */ `
    uniform float time;
    uniform float style;
    uniform float open;
    uniform float surge;
    uniform float brightness;
    uniform float oval;
    uniform vec2 size;
    uniform vec3 skyTop;
    uniform vec3 skyHorizon;
    uniform vec3 farColor;
    uniform vec3 nearColor;
    uniform vec3 glow;
    uniform vec3 celestialColor;
    uniform vec3 celestial;
    varying vec2 vUv;
    varying vec3 vView;

    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
                   mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
    }

    // Where the line of sight through this point meets a picture \`depth\` metres behind the surface,
    // in units of the doorway's height
    vec2 behind(float depth) {
        vec3 v = normalize(vView);
        vec2 p = vUv * size - v.xy / max(v.z, 0.3) * depth;
        return p / size.y;
    }

    void main() {
        float width = size.x / size.y;
        vec2 s = behind(9.0);
        vec3 color = mix(skyHorizon, skyTop, smoothstep(0.1, 1.15, s.y));

        // Stars, faint, in the darker skies
        float night = 1.0 - smoothstep(0.05, 0.25, dot(skyTop, vec3(0.3, 0.59, 0.11)));
        vec2 starCell = floor(s * 90.0);
        float star = step(0.985, hash2(starCell)) * smoothstep(0.45, 0.9, s.y);
        color += vec3(star) * night * (0.5 + 0.5 * sin(time * 2.0 + hash2(starCell) * 40.0));

        // The sun or moon, with its halo
        vec2 body = vec2(celestial.x * width, celestial.y);
        float d = length(s - body);
        color += celestialColor * (smoothstep(celestial.z, celestial.z * 0.8, d) * 1.2 + exp(-d * 6.0) * 0.22);

        vec2 f = behind(4.5);
        vec2 n = behind(1.6);
        if (style < 0.5) {
            // Mountains: a hazy far range, then a nearer ridge furred with pines
            float far = 0.36 + 0.12 * fbm(vec2(f.x * 1.4, 1.0)) + 0.04 * sin(f.x * 2.3);
            color = mix(color, mix(farColor, skyHorizon, 0.4), smoothstep(far + 0.004, far - 0.004, f.y));
            float near = 0.2 + 0.1 * fbm(vec2(n.x * 2.2 + 7.0, 3.0)) + 0.035 * noise(vec2(n.x * 42.0, 0.0));
            color = mix(color, nearColor, smoothstep(near + 0.004, near - 0.004, n.y));
        } else if (style < 1.5) {
            // Sea: a flat horizon, the water darkening toward us, the sun's path glittering on it
            float horizon = 0.3;
            if (f.y < horizon) {
                float depth = (horizon - f.y) / horizon;
                vec3 sea = mix(mix(skyHorizon, farColor, 0.55), nearColor, smoothstep(0.0, 1.0, depth));
                float path = exp(-abs(f.x - body.x) * (6.0 - 4.0 * depth));
                float glint = noise(vec2(f.x * 30.0, f.y * 160.0 - time * 1.5));
                color = sea + celestialColor * path * smoothstep(0.55, 0.9, glint) * 0.9;
            }
            // A dark headland at one side
            float land = 0.16 + 0.12 * fbm(vec2(n.x * 3.0, 9.0)) - 0.25 * smoothstep(0.2, 0.9, n.x / width);
            color = mix(color, nearColor * 0.6, smoothstep(land + 0.004, land - 0.004, n.y));
        } else if (style < 2.5) {
            // City: a skyline of towers with lit windows, a nearer row darker and taller
            float cell = floor(f.x * 16.0);
            float tower = 0.24 + 0.22 * hash(cell * 1.7);
            if (f.y < tower) {
                vec2 window = floor(vec2(f.x * 160.0, f.y * 110.0));
                float lit = step(0.72, hash2(window)) * step(0.3, fract(f.x * 160.0)) * step(0.35, fract(f.y * 110.0));
                color = farColor + glow * lit * 0.6;
            }
            float nearCell = floor(n.x * 7.0);
            float nearTower = 0.12 + 0.3 * hash(nearCell * 3.1 + 2.0);
            if (n.y < nearTower) {
                float sign = step(0.8, hash(nearCell + 9.0)) * step(nearTower - 0.08, n.y) * step(n.y, nearTower - 0.03);
                color = nearColor + glow * sign * 1.4;
            }
        } else {
            // The museum: its dark hall, the band of light around it, rings over the middle
            float band = exp(-abs(f.y - 0.62) * 70.0);
            color = mix(skyHorizon, skyTop, smoothstep(0.0, 1.0, s.y)) + glow * band * 0.5;
            vec2 c = behind(3.0) - vec2(width * 0.5, 0.42);
            float ring = exp(-abs(length(c * vec2(1.0, 2.6)) - 0.18) * 90.0);
            float ring2 = exp(-abs(length(c * vec2(1.0, 2.6)) - 0.28) * 120.0);
            color += glow * (ring + ring2 * 0.6) * (0.8 + 0.2 * sin(time));
            color = mix(color, nearColor, smoothstep(0.17, 0.165, n.y));
        }

        // The membrane: a slow, turning veil of light, brightest toward the frame
        vec2 m = vUv * vec2(width, 1.0) * 2.6;
        float veil = fbm(m + vec2(fbm(m + time * 0.06), fbm(m - time * 0.045 + 3.0)) * 1.6);
        float edgeDistance = min(min(vUv.x, 1.0 - vUv.x) * width, min(vUv.y, 1.0 - vUv.y));
        float edge = exp(-edgeDistance * 16.0);
        color += glow * (veil * veil * 0.22 + edge * (0.45 + 0.15 * sin(time * 1.4)));

        // Sealed: frosted glass, the world behind only a dim grey shape
        float luminance = dot(color, vec3(0.3, 0.59, 0.11));
        vec3 frosted = vec3(luminance) * 0.4 + glow * (0.04 + 0.12 * edge) + (noise(vUv * 420.0) - 0.5) * 0.015;
        color = mix(frosted, color, open);

        // A rift: a ragged oval, its rim burning brighter, fading out at its edge
        float alpha = 1.0;
        if (oval > 0.5) {
            vec2 c = (vUv - 0.5) * 2.0;
            float angle = atan(c.y, c.x);
            float rag = 0.06 * noise(vec2(angle * 3.0 + time * 0.4, time * 0.3)) + 0.03 * sin(angle * 7.0 - time * 1.3);
            float r = length(c) + rag;
            alpha = smoothstep(1.0, 0.86, r);
            color += glow * exp(-abs(r - 0.9) * 22.0) * (1.2 + 0.4 * sin(time * 2.1 + angle * 3.0));
        }

        // Stepping through: everything brightens toward the light
        color = color * (1.0 + surge * 2.5) + glow * surge * 2.0;
        gl_FragColor = vec4(color * brightness, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

// preview: the exhibition's preview (see above); accent: its colour (CSS); open: 0 sealed .. 1 open;
// size: { width, height } in metres; shape: 'rect' or 'oval'. Returns a ShaderMaterial; advance
// uniforms.time each frame.
export function createPortalMaterial({ preview = {}, accent = '#9fe8ff', open = 1, size, shape = 'rect' }) {
    const toColor = value => new THREE.Color(value);
    const [top, horizon] = preview.sky ?? ['#0b1020', '#27324d'];
    const celestial = preview.celestial ?? { x: 0.5, y: 0.6, size: 0, color: '#000000' };
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            style: { value: STYLES[preview.style] ?? 0 },
            open: { value: open },
            surge: { value: 0 },
            brightness: { value: 1 },
            oval: { value: shape === 'oval' ? 1 : 0 },
            size: { value: new THREE.Vector2(size.width, size.height) },
            skyTop: { value: toColor(top) },
            skyHorizon: { value: toColor(horizon) },
            farColor: { value: toColor(preview.far ?? '#1a2133') },
            nearColor: { value: toColor(preview.near ?? '#0a0d16') },
            glow: { value: toColor(accent).multiplyScalar(preview.glow ?? 1) },
            celestialColor: { value: toColor(celestial.color ?? '#ffffff') },
            celestial: { value: new THREE.Vector3(celestial.x ?? 0.5, celestial.y ?? 0.6, celestial.size ?? 0.06) }
        },
        vertexShader,
        fragmentShader,
        transparent: shape === 'oval',
        depthWrite: shape !== 'oval',
        side: shape === 'oval' ? THREE.DoubleSide : THREE.FrontSide
    });
}
