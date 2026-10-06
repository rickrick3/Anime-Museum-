// skyDome.js - A painted sky for an exhibition world: a gradient from the horizon to the zenith, a sun
// or moon with its halo, and stars if it is dark enough. All from data (an exhibition's `sky`):
//
//   top, middle, horizon, below   colours from the zenith down to under the horizon
//   bodies    [{ facing, elevation, size, color, glow, phase }]: suns and moons (degrees; size: the
//             disc's angular radius; glow: halo strength; phase: 0..1 how much of a moon is lit)
//   stars     0..1 how many stars show
//
// The same dome lights the world's reflections: environmentMap() renders it once into an
// environment map for shiny things to mirror.
import * as THREE from 'three';

const RADIUS = 450;

const vertexShader = /* glsl */ `
    varying vec3 vDirection;
    void main() {
        vDirection = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // Always at the far plane
    }
`;

const fragmentShader = /* glsl */ `
    #define MAX_BODIES 2
    uniform vec3 top;
    uniform vec3 middle;
    uniform vec3 horizon;
    uniform vec3 below;
    uniform float stars;
    uniform float time;
    uniform int bodyCount;
    uniform vec3 bodyDirection[MAX_BODIES];
    uniform vec3 bodyColor[MAX_BODIES];
    uniform vec3 bodyShape[MAX_BODIES]; // angular radius, glow, phase
    varying vec3 vDirection;

    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

    void main() {
        vec3 direction = normalize(vDirection);
        float up = direction.y;
        vec3 color = up > 0.0
            ? mix(mix(horizon, middle, smoothstep(0.0, 0.28, up)), top, smoothstep(0.22, 0.95, up))
            : mix(horizon, below, smoothstep(0.0, 0.12, -up));

        // Stars above the haze
        vec3 cell = floor(direction * 260.0);
        float star = step(0.9965, hash(cell)) * smoothstep(0.08, 0.35, up);
        color += vec3(0.85, 0.9, 1.0) * star * stars * (0.55 + 0.45 * sin(time * 1.7 + hash(cell + 3.0) * 50.0));

        for (int i = 0; i < MAX_BODIES; i++) {
            if (i >= bodyCount) break;
            float angle = acos(clamp(dot(direction, bodyDirection[i]), -1.0, 1.0));
            float radius = bodyShape[i].x;
            float disc = smoothstep(radius, radius * 0.92, angle);
            // A moon's lit side: shade the disc from one edge by its phase
            vec3 side = normalize(cross(bodyDirection[i], vec3(0.0, 1.0, 0.0)));
            float across = dot(direction - bodyDirection[i], side) / max(radius, 1e-4);
            float lit = mix(1.0, smoothstep(-0.3, 0.3, across + 2.0 * bodyShape[i].z - 1.0), step(bodyShape[i].z, 0.99));
            color = mix(color, bodyColor[i] * 2.2, disc * mix(0.12, 1.0, lit));
            color += bodyColor[i] * bodyShape[i].y * (exp(-angle * 9.0) * 0.5 + exp(-angle * 2.5) * 0.12);
        }
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

function directionFrom(facing, elevation) {
    const azimuth = THREE.MathUtils.degToRad(facing);
    const altitude = THREE.MathUtils.degToRad(elevation);
    return new THREE.Vector3(
        Math.sin(azimuth) * Math.cos(altitude), Math.sin(altitude), -Math.cos(azimuth) * Math.cos(altitude)
    );
}

export function createSkyDome({
    top = '#0d1430', middle = '#3a3a66', horizon = '#d98a5c', below = '#1a1420', bodies = [], stars = 0
} = {}) {
    const list = bodies.slice(0, 2);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            top: { value: new THREE.Color(top) },
            middle: { value: new THREE.Color(middle) },
            horizon: { value: new THREE.Color(horizon) },
            below: { value: new THREE.Color(below) },
            stars: { value: stars },
            time: { value: 0 },
            bodyCount: { value: list.length },
            bodyDirection: { value: [0, 1].map(i => (list[i] ? directionFrom(list[i].facing ?? 0, list[i].elevation ?? 20) : new THREE.Vector3(0, 1, 0))) },
            bodyColor: { value: [0, 1].map(i => new THREE.Color(list[i]?.color ?? '#ffffff')) },
            bodyShape: {
                value: [0, 1].map(i => new THREE.Vector3(
                    THREE.MathUtils.degToRad(list[i]?.size ?? 1.5), list[i]?.glow ?? 1, list[i]?.phase ?? 1
                ))
            }
        },
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 48, 24), material);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    dome.userData.isSky = true;
    // Where each body is, for lights that should come from it
    dome.userData.bodies = list.map(body => directionFrom(body.facing ?? 0, body.elevation ?? 20));
    return dome;
}

// Render the dome (and its colours) into an environment map once; returns the render target, whose
// .texture goes to scene.environment. Dispose the target with the world.
export function environmentMap(renderer, dome) {
    const scene = new THREE.Scene();
    const copy = new THREE.Mesh(dome.geometry, dome.material);
    scene.add(copy);
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(scene, 0, 1, 1000);
    generator.dispose();
    return target;
}

export { directionFrom };
