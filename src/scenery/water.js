// water.js - The sea: a wide surface that swells and glints, mirroring the sky and catching the sun,
// the moon and every lantern near it. It is an ordinary lit material (so the world's light, fog and
// reflections all reach it), its surface moved by a few long swells and roughened by two layers of
// ripples drifting across each other. Its clock is the world's: in a moment held still, the sea
// holds still too.
//
// Piece 'sea'. params: level (height of the surface), size (metres across), center, color,
// swell (metres), ripples (0..1 how rough), roughness, segments
import * as THREE from 'three';

// Ripples that tile: heights from waves with whole-number frequencies across the tile, turned
// into a normal map
function rippleNormals(size = 256, seed = 1) {
    const waves = [];
    let s = seed * 7919;
    const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 14; i++) {
        const fx = Math.round((random() - 0.5) * 14), fy = Math.round((random() - 0.5) * 14);
        if (fx === 0 && fy === 0) continue;
        waves.push({ fx, fy, amplitude: 1 / Math.hypot(fx, fy), phase: random() * Math.PI * 2 });
    }
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let dx = 0, dy = 0;
            for (const w of waves) {
                const angle = (2 * Math.PI * (w.fx * x + w.fy * y)) / size + w.phase;
                const slope = w.amplitude * Math.cos(angle) * 2 * Math.PI / size;
                dx += slope * w.fx;
                dy += slope * w.fy;
            }
            const n = new THREE.Vector3(-dx * 18, -dy * 18, 1).normalize();
            const i = (y * size + x) * 4;
            data[i] = (n.x * 0.5 + 0.5) * 255;
            data[i + 1] = (n.y * 0.5 + 0.5) * 255;
            data[i + 2] = (n.z * 0.5 + 0.5) * 255;
            data[i + 3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

// The long swells: direction (x, z), wavelength (m), height (relative), speed (rad/s)
const SWELLS = [
    [[0.8, 0.6], 23, 1.0, 0.9],
    [[-0.4, 0.92], 11, 0.55, 1.4],
    [[0.95, -0.3], 6.5, 0.3, 2.1]
];

export function sea(params, kit) {
    const size = params.size ?? 400;
    const segments = params.segments ?? (kit.quality.low ? 90 : 160);
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments).rotateX(-Math.PI / 2);
    const normalMap = rippleNormals(256, params.seed ?? 3);
    const tile = params.tile ?? 7; // Metres one tile of ripples covers
    const material = new THREE.MeshStandardMaterial({
        color: params.color ?? '#0d2a33',
        roughness: params.roughness ?? 0.1,
        metalness: 0,
        normalMap,
        normalScale: new THREE.Vector2(params.ripples ?? 0.55, params.ripples ?? 0.55),
        envMapIntensity: params.reflections ?? 1.1
    });
    const uniforms = {
        waveTime: kit.time,
        waveSwell: { value: params.swell ?? 0.12 },
        waveTile: { value: size / tile },
        waveFlow: { value: params.flow ?? 1 }
    };
    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        const swells = SWELLS.map(([[dx, dz], length, height, speed]) => {
            const k = (2 * Math.PI / length).toFixed(4);
            return `{
                vec2 d = normalize(vec2(${dx.toFixed(3)}, ${dz.toFixed(3)}));
                float phase = dot(d, waveWorld.xz) * ${k} + waveTime * ${speed.toFixed(3)};
                waveHeight += ${height.toFixed(3)} * sin(phase);
                waveSlope += ${height.toFixed(3)} * ${k} * cos(phase) * d;
            }`;
        }).join('\n');
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float waveTime;
                uniform float waveSwell;`)
            .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
                vec4 waveWorld = modelMatrix * vec4(position, 1.0);
                float waveHeight = 0.0;
                vec2 waveSlope = vec2(0.0);
                ${swells}
                waveHeight *= waveSwell;
                waveSlope *= waveSwell;
                objectNormal = normalize(vec3(-waveSlope.x, 1.0, -waveSlope.y));`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                transformed.y += waveHeight;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform float waveTime;
                uniform float waveTile;
                uniform float waveFlow;`)
            .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', `
                vec2 rippleUv = vNormalMapUv * waveTile;
                vec3 n1 = texture2D(normalMap, rippleUv + waveTime * waveFlow * vec2(0.021, 0.013)).xyz * 2.0 - 1.0;
                vec3 n2 = texture2D(normalMap, rippleUv * 1.73 + waveTime * waveFlow * vec2(-0.017, 0.024)).xyz * 2.0 - 1.0;
                vec3 mapN = normalize(vec3(n1.xy + n2.xy, n1.z * n2.z));`);
    };
    material.customProgramCacheKey = () => 'sea';
    const surface = new THREE.Mesh(geometry, material);
    const [cx, cz] = params.center ?? [0, 0];
    surface.position.set(cx, params.level ?? 0, cz);
    surface.receiveShadow = true;
    surface.renderOrder = -1;
    kit.add(surface);
    if (params.name) kit.named[params.name] = surface;
    return surface;
}
sea.takesPositions = true; // Placed by its own center, not on the ground
