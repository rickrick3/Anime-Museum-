// lobby.js - The museum itself: an entrance hall leading into a tall octagonal rotunda, dark and
// polished, lit by a shaft of light falling from an opening in its ceiling onto a slowly turning
// installation of rings. Around the rotunda are the galleries: one alcove per exhibition, each with
// a doorway into its world. Lines of light in the floor lead from the middle to each doorway.
//
//                         north
//                  NW  ┌─────────┐  NE
//                     /           \
//              west  │   ( ◎ )     │  east        ◎ the installation, under the oculus
//                     \           /
//                  SW  └──┐   ┌──┘  SE          SW, SE: benches and wall texts
//                         │   │
//                         │ ● │  entrance hall  ● where you arrive
//                         └───┘  main doors
//
// Galleries take the sides north, west, east, then northwest and northeast, in the order the
// exhibitions are registered (or as the museum's content says). An empty side waits as a wall with
// the faint outline of a doorway to come; registering an exhibition later opens it (addGallery).
// The lobby is built once and kept while you visit an exhibition.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Space } from './space.js';
import { buildGallery } from './gallery.js';
import { createExhibit } from './exhibit.js';
import { createMirrorFloor } from '../scenery/mirrorFloor.js';
import { createParticles, createLightShaft } from '../scenery/atmosphere.js';
import { createText } from '../scenery/text.js';
import { PieceBuilder, facingToYaw, toWorld, disposeObject } from '../scenery/kit.js';

const APOTHEM = 12; // Metres from the middle to each wall
const HEIGHT = 10;
const SIDE = 2 * APOTHEM * Math.tan(Math.PI / 8);
const CORNER = APOTHEM / Math.cos(Math.PI / 8);
const HALL = { width: 6, length: 9, height: 7, opening: 4.8 };
const ACCENT = '#9fe8ff';

// Directions (degrees clockwise from north) of the octagon's sides
const SIDES = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315 };
const GALLERY_SIDES = ['north', 'west', 'east', 'northwest', 'northeast'];

// The side of the rotunda in direction `direction`: its middle, and the way it faces (inward)
function sideAt(direction) {
    const a = THREE.MathUtils.degToRad(direction);
    return {
        direction,
        facing: (direction + 180) % 360,
        center: { x: Math.sin(a) * APOTHEM, z: -Math.cos(a) * APOTHEM },
        length: SIDE,
        apothem: APOTHEM
    };
}

// A dark room with strips of light, rendered once as the lobby's reflections
function studioEnvironment(renderer, accents) {
    const scene = new THREE.Scene();
    const geometries = [], materials = [];
    const add = (geometry, material, x, y, z) => {
        geometries.push(geometry);
        materials.push(material);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        return mesh;
    };
    add(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: '#05070c', side: THREE.BackSide }), 0, 5, 0);
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe8ff').multiplyScalar(2.5) });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        add(new THREE.BoxGeometry(0.3, 9, 0.3), strip, Math.sin(a) * 12.5, 5, -Math.cos(a) * 12.5);
    }
    add(new THREE.TorusGeometry(3, 0.25, 8, 48).rotateX(Math.PI / 2), strip, 0, 10, 0);
    accents.forEach(({ direction, color }) => {
        const a = THREE.MathUtils.degToRad(direction);
        add(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.5), side: THREE.DoubleSide }),
            Math.sin(a) * 13, 3.5, -Math.cos(a) * 13).lookAt(0, 3.5, 0);
    });
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(scene, 0.03);
    generator.dispose();
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    return target;
}

export class Lobby extends Space {
    // content: the museum's own content (src/content/museum.js); museum: the Museum (for doorways);
    // services: { placard, soundscape }; renderer: Renderer; quality: { low }
    constructor({ content, museum, services, renderer, quality }) {
        super({ id: 'lobby', kind: 'lobby', title: content.title });
        this.content = content;
        this.museum = museum;
        this.services = services;
        this.renderer = renderer;
        this.quality = quality;
        this.sides = new Map(); // side name -> { group, colliders, interactables?, emitter?, update?, arrival?, exhibition? }
        this.galleries = new Map(); // exhibition id -> side name

        this.bounds = { minX: -APOTHEM - 2.6, maxX: APOTHEM + 2.6, minZ: -APOTHEM - 2.6, maxZ: APOTHEM + HALL.length + 0.5 };
        this.surfaceAt = () => 'stone';
        this.spawn = { position: new THREE.Vector3(0, 0, APOTHEM + 6.6), yaw: 0 };
        this.particleColor.set('#7d8ea6');
        this.ambience = [{ preset: 'museum-hall', volume: 1 }];
        this.room = { amount: 0.45, decay: 3.6 };

        const m = this.materials;
        this.wallMaterial = m.standard('lobby-wall', { color: '#111620', roughness: 0.5, metalness: 0.25 });
        this.trimMaterial = m.standard('lobby-trim', { color: '#090c12', roughness: 0.22, metalness: 0.85 });
        this.stripMaterial = m.get('lobby-strip', () => {
            const material = new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe8ff').multiplyScalar(1.35) });
            material.userData.noShadow = true;
            return material;
        });
        this.dimMaterial = m.get('lobby-dim', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT).multiplyScalar(0.28) }));
    }

    // exhibitions: the registered summaries, in order
    async build(exhibitions) {
        RectAreaLightUniformsLib.init();
        const assigned = this.assignSides(exhibitions);

        this.buildAtmosphere(assigned);
        this.buildFloor();
        this.buildRotunda();
        this.buildHall();
        this.buildInstallation();
        for (const name of Object.keys(SIDES)) {
            if (name === 'south') continue;
            if (GALLERY_SIDES.includes(name)) this.buildEmptySide(name);
            else this.buildQuietSide(name);
        }
        assigned.forEach(({ exhibition }) => this.addGallery(exhibition));
        await this.buildGuide(assigned);
        return this;
    }

    // Which side each exhibition takes: as the content says, else the next free one
    assignSides(exhibitions) {
        const wanted = Object.fromEntries((this.content.galleries ?? []).map(({ exhibition, side }) => [exhibition, side]));
        const reserved = Object.values(wanted);
        const taken = new Set(this.galleries.values());
        const result = [];
        for (const exhibition of exhibitions) {
            let side = wanted[exhibition.id] ?? exhibition.side;
            if (!GALLERY_SIDES.includes(side) || taken.has(side)) {
                side = GALLERY_SIDES.find(name => !taken.has(name) && !reserved.includes(name)) ??
                    GALLERY_SIDES.find(name => !taken.has(name));
            }
            if (!side) {
                console.warn(`No room in the lobby for "${exhibition.id}"`);
                continue;
            }
            taken.add(side);
            this.galleries.set(exhibition.id, side);
            result.push({ exhibition, side, direction: SIDES[side] });
        }
        return result;
    }

    buildAtmosphere(assigned) {
        const atmosphere = this.atmosphere;
        atmosphere.background = new THREE.Color('#03050a');
        atmosphere.fog = new THREE.FogExp2('#04060b', 0.018);
        const environment = this.track(studioEnvironment(this.renderer.renderer,
            assigned.map(({ direction, exhibition }) => ({ direction, color: exhibition.accent ?? ACCENT }))));
        atmosphere.environment = environment.texture;
        atmosphere.environmentIntensity = 0.7;
        atmosphere.look = { exposure: 0.95, bloom: { strength: 0.6, radius: 0.5, threshold: 0.68 } };

        this.add(new THREE.HemisphereLight('#3c4a66', '#05060a', 0.65));
        const shaft = new THREE.SpotLight('#dceeff', 260, 26, 0.62, 0.75, 1.4);
        shaft.position.set(0, HEIGHT + 0.5, 0);
        shaft.target.position.set(0, 0, 0);
        this.add(shaft);
        this.add(shaft.target);
    }

    buildFloor() {
        const floor = createMirrorFloor({
            width: 32, depth: 42, reflect: !this.quality.low, renderer: this.renderer.renderer, tileSize: 2, strength: 0.6
        });
        floor.position.set(0, 0, 4.5);
        this.add(floor);

        // Inlaid light: a ring around the installation, and a line in from the entrance hall
        const inlay = new PieceBuilder();
        inlay.add(this.stripMaterial, new THREE.TorusGeometry(3.9, 0.022, 6, 160).rotateX(Math.PI / 2).translate(0, 0.006, 0));
        const length = APOTHEM + HALL.length - 4.4 - 1.2;
        inlay.box(this.dimMaterial, 0.05, 0.008, length, 0, 0.004, 4.4 + length / 2);
        this.add(inlay.build({ castShadow: false }));
    }

    // The octagon's corners (pilasters with light), the band of light high up, and the ceiling
    buildRotunda() {
        const b = new PieceBuilder();
        for (let i = 0; i < 8; i++) {
            const angle = 22.5 + i * 45;
            const a = THREE.MathUtils.degToRad(angle);
            const x = Math.sin(a) * CORNER, z = -Math.cos(a) * CORNER;
            const yaw = facingToYaw(angle + 180);
            b.add(this.trimMaterial, new THREE.BoxGeometry(0.8, HEIGHT, 0.8).rotateY(yaw).translate(x, HEIGHT / 2, z));
            const inner = toWorld(0, -0.41, x, z, yaw);
            b.add(this.stripMaterial, new THREE.BoxGeometry(0.06, HEIGHT - 1.6, 0.02).rotateY(yaw).translate(inner.x, HEIGHT / 2 + 0.2, inner.z));
            this.addCollider({ x, z, radius: 0.5 });
        }
        for (const [, direction] of Object.entries(SIDES)) {
            const side = sideAt(direction);
            const yaw = facingToYaw(side.facing);
            const p = toWorld(0, -0.03, side.center.x, side.center.z, yaw);
            b.add(this.stripMaterial, new THREE.BoxGeometry(SIDE - 0.6, 0.035, 0.035).rotateY(yaw).translate(p.x, 9.55, p.z));
        }
        this.add(b.build({ castShadow: false }));

        // The ceiling, open in the middle to a bright oculus
        const shape = new THREE.Shape();
        for (let i = 0; i < 8; i++) {
            const a = THREE.MathUtils.degToRad(22.5 + i * 45);
            const x = Math.sin(a) * (CORNER + 3), z = -Math.cos(a) * (CORNER + 3);
            if (i === 0) shape.moveTo(x, z);
            else shape.lineTo(x, z);
        }
        const hole = new THREE.Path();
        hole.absarc(0, 0, 3, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const ceiling = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48).rotateX(Math.PI / 2),
            this.materials.standard('lobby-ceiling', { color: '#07090e', roughness: 0.65, side: THREE.DoubleSide }));
        ceiling.position.y = HEIGHT;
        this.add(ceiling);
        const glow = new PieceBuilder();
        glow.add(this.stripMaterial, new THREE.TorusGeometry(3.04, 0.05, 8, 96).rotateX(Math.PI / 2).translate(0, HEIGHT - 0.02, 0));
        for (const radius of [6.4, 9.2]) {
            glow.add(this.dimMaterial, new THREE.TorusGeometry(radius, 0.018, 6, 160).rotateX(Math.PI / 2).translate(0, HEIGHT - 0.02, 0));
        }
        this.add(glow.build({ castShadow: false }));
        const well = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.2, 48, 1, true),
            this.materials.standard('oculus-well', { color: '#0a0e16', roughness: 0.5, side: THREE.BackSide }));
        well.position.y = HEIGHT + 0.6;
        this.add(well);
        const sky = new THREE.Mesh(new THREE.CircleGeometry(3, 48).rotateX(Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8ecff').multiplyScalar(1.4) }));
        sky.position.y = HEIGHT + 1.2;
        this.add(sky);
    }

    // The entrance hall: from the main doors into the rotunda, with the museum's name over the way in
    buildHall() {
        const { width, length, height, opening } = HALL;
        const start = APOTHEM, end = APOTHEM + length;
        const b = new PieceBuilder();
        const wall = this.wallMaterial;
        const half = width / 2;
        // The rotunda's south side, open to the hall
        const piece = (SIDE - width) / 2;
        for (const s of [-1, 1]) {
            b.box(wall, piece, HEIGHT, 0.4, s * (half + piece / 2), HEIGHT / 2, start + 0.2);
            this.addWall(s * SIDE / 2, start, s * half, start, 0.1);
        }
        b.box(wall, width, HEIGHT - opening, 0.4, 0, opening + (HEIGHT - opening) / 2, start + 0.2);
        b.box(this.trimMaterial, width + 0.4, 0.1, 0.12, 0, opening + 0.05, start - 0.04);
        // The hall's walls, ceiling and the main doors
        for (const s of [-1, 1]) {
            b.box(wall, 0.4, height, length + 0.4, s * (half + 0.2), height / 2, start + length / 2 + 0.2);
            this.addWall(s * half, start, s * half, end, 0.1);
            for (let i = 0; i < 4; i++) {
                b.box(this.stripMaterial, 0.02, height - 1.2, 0.05, s * (half - 0.01), height / 2 + 0.2, start + 1.4 + i * 2.2);
            }
        }
        b.box(this.materials.standard('hall-ceiling', { color: '#07090e', roughness: 0.6 }), width + 0.8, 0.3, length + 0.4, 0, height + 0.15, start + length / 2 + 0.2);
        b.box(wall, width, height, 0.4, 0, height / 2, end + 0.2);
        this.addWall(-half, end, half, end, 0.1);
        const bronze = this.materials.standard('door-bronze', { color: '#1d1913', roughness: 0.35, metalness: 0.8 });
        for (const s of [-1, 1]) b.box(bronze, 2.4, 5.4, 0.12, s * 1.22, 2.7, end - 0.06);
        b.box(this.stripMaterial, 0.03, 5.4, 0.13, 0, 2.7, end - 0.06); // Daylight between the doors
        b.box(this.trimMaterial, 5.3, 0.2, 0.2, 0, 5.5, end - 0.1);
        this.add(b.build({ castShadow: false }));

        const light = new THREE.RectAreaLight('#dbe9ff', 0.7, width - 1, length - 1);
        light.position.set(0, height - 0.05, start + length / 2);
        light.rotation.x = -Math.PI / 2;
        this.add(light);

        // The museum's name, over the way into the rotunda
        const title = createText([
            { text: this.content.title.toUpperCase(), size: 1, weight: 300, spacing: 0.3, color: '#f2f8ff' },
            { text: (this.content.subtitle ?? '').toUpperCase(), size: 0.3, weight: 600, spacing: 0.7, color: ACCENT, gap: 0.9 }
        ], { size: 0.3, intensity: 1.7 });
        title.position.set(0, opening + (height - opening) / 2, start + 0.42);
        this.add(title);
        const doors = createText([{ text: 'MAIN ENTRANCE', size: 1, weight: 600, spacing: 0.6, color: '#8fa6bd' }], { size: 0.12, intensity: 1 });
        doors.position.set(0, 6.0, end - 0.02);
        doors.rotation.y = Math.PI;
        this.add(doors);

        // A wall text to read on the way in
        const welcome = this.content.welcomeWall;
        if (welcome) {
            const text = createText([
                { text: welcome.title.toUpperCase(), size: 1, weight: 300, spacing: 0.25, color: '#eef6ff' },
                ...welcome.lines.map((line, i) => ({ text: line, font: 'serif', italic: true, size: 0.6, color: '#b9c8d8', gap: i === 0 ? 1.1 : 0.45 }))
            ], { size: 0.24, align: 'left', intensity: 1.2 });
            text.position.set(half - 0.02, 2.6, start + 1.6);
            text.rotation.y = -Math.PI / 2;
            this.add(text);
        }
    }

    // The installation in the middle: a dais, three slow rings of light around a faceted core, motes
    // rising through the shaft of light from the oculus
    buildInstallation() {
        const dais = new PieceBuilder();
        dais.cylinder(this.trimMaterial, 3, 3.1, 0.24, 0, 0, 0, 64);
        dais.add(this.stripMaterial, new THREE.TorusGeometry(3.0, 0.02, 6, 160).rotateX(Math.PI / 2).translate(0, 0.24, 0));
        dais.cylinder(this.materials.standard('dais-top', { color: '#0d121b', roughness: 0.2, metalness: 0.6 }), 2.4, 2.4, 0.06, 0, 0.24, 0, 64);
        this.add(dais.build({ castShadow: false }));
        this.addCollider({ x: 0, z: 0, radius: 3.05 });

        const accent = new THREE.Color(ACCENT);
        const hologram = new THREE.Group();
        hologram.position.y = 3.6;
        const rings = [1.9, 1.45, 1.0].map((radius, i) => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, i === 0 ? 0.016 : 0.012, 8, 160),
                new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2.6 - i * 0.4) }));
            ring.rotation.set(Math.PI / 2 + i * 0.5, i * 0.9, 0);
            hologram.add(ring);
            return ring;
        });
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1),
            new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.8), wireframe: true, transparent: true, opacity: 0.7 }));
        hologram.add(core);
        const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0),
            new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2.2) }));
        hologram.add(inner);
        this.add(hologram);

        const shaft = createLightShaft({ radiusTop: 2.7, radiusBottom: 3.7, height: HEIGHT, color: '#cfe8ff', intensity: 0.05 });
        this.add(shaft);
        const motes = createParticles({
            kind: 'embers', count: this.quality.low ? 60 : 140, box: { min: [-2.4, 0.4, -2.4], max: [2.4, 8.5, 2.4] },
            colors: ['#bfeaff', '#ffffff', '#8fd8ff'], size: 0.035, intensity: 1.6, speed: 0.35, seed: 3
        });
        this.add(motes);
        const dust = createParticles({
            kind: 'dust', count: this.quality.low ? 120 : 320, box: { min: [-11, 0.3, -11], max: [11, 9.5, APOTHEM + HALL.length - 1] },
            colors: ['#cfe8ff', '#ffffff'], size: 0.022, intensity: 0.7, seed: 5
        });
        this.add(dust);

        this.onUpdate((delta, elapsed) => {
            rings.forEach((ring, i) => {
                ring.rotation.x += delta * (0.08 + i * 0.05) * (i % 2 ? -1 : 1);
                ring.rotation.y += delta * (0.11 + i * 0.03);
            });
            core.rotation.y += delta * 0.25;
            core.rotation.x += delta * 0.1;
            inner.rotation.y -= delta * 0.4;
            hologram.position.y = 3.6 + Math.sin(elapsed * 0.6) * 0.06;
            shaft.userData.time.value = elapsed;
            motes.userData.time.value = elapsed;
            dust.userData.time.value = elapsed;
        });
    }

    // A side waiting for a gallery: a plain wall with the faint outline of a doorway to come
    buildEmptySide(name) {
        const side = sideAt(SIDES[name]);
        const yaw = facingToYaw(side.facing);
        const group = new THREE.Group();
        group.position.set(side.center.x, 0, side.center.z);
        group.rotation.y = yaw;
        const b = new PieceBuilder();
        b.box(this.wallMaterial, SIDE, HEIGHT, 0.4, 0, HEIGHT / 2, 0.2);
        const w = 5.6, h = 7.4;
        for (const s of [-1, 1]) b.box(this.dimMaterial, 0.025, h, 0.02, s * w / 2, h / 2, -0.01);
        b.box(this.dimMaterial, w, 0.025, 0.02, 0, h, -0.01);
        group.add(b.build({ castShadow: false }));
        this.add(group);
        const a = toWorld(-SIDE / 2, 0, side.center.x, side.center.z, yaw);
        const c = toWorld(SIDE / 2, 0, side.center.x, side.center.z, yaw);
        this.sides.set(name, { group, colliders: [this.addWall(a.x, a.z, c.x, c.z, 0.1)] });
    }

    // The southwest and southeast sides: a wall text and a bench to sit and look at the galleries from
    buildQuietSide(name) {
        const side = sideAt(SIDES[name]);
        const yaw = facingToYaw(side.facing);
        const group = new THREE.Group();
        group.position.set(side.center.x, 0, side.center.z);
        group.rotation.y = yaw;
        const b = new PieceBuilder();
        b.box(this.wallMaterial, SIDE, HEIGHT, 0.4, 0, HEIGHT / 2, 0.2);
        // A bench, a few steps out from the wall, with a soft light under its seat
        const bench = this.materials.standard('bench', { color: '#12161e', roughness: 0.35, metalness: 0.4 });
        b.box(bench, 3.2, 0.12, 0.75, 0, 0.44, -3.2);
        for (const s of [-1, 1]) b.box(bench, 0.12, 0.38, 0.6, s * 1.3, 0.19, -3.2);
        b.box(this.stripMaterial, 3.0, 0.01, 0.01, 0, 0.37, -3.2 - 0.36);
        group.add(b.build({ castShadow: false }));
        const wallText = this.content.walls?.[name];
        if (wallText) {
            const text = createText([
                { text: wallText.title.toUpperCase(), size: 1, weight: 300, spacing: 0.25, color: '#eef6ff' },
                ...wallText.lines.map((line, i) => ({ text: line, font: 'serif', italic: true, size: 0.6, color: '#b9c8d8', gap: i === 0 ? 1.1 : 0.45 }))
            ], { size: 0.3, intensity: 1.2 });
            text.position.set(0, 3.6, -0.02);
            text.rotation.y = Math.PI;
            group.add(text);
        }
        this.add(group);
        const a = toWorld(-SIDE / 2, 0, side.center.x, side.center.z, yaw);
        const c = toWorld(SIDE / 2, 0, side.center.x, side.center.z, yaw);
        this.addWall(a.x, a.z, c.x, c.z, 0.1);
        const benchA = toWorld(-1.5, -3.2, side.center.x, side.center.z, yaw);
        const benchB = toWorld(1.5, -3.2, side.center.x, side.center.z, yaw);
        this.addWall(benchA.x, benchA.z, benchB.x, benchB.z, 0.38);
    }

    // Give an exhibition its gallery: opens its side of the rotunda (now, or as soon as the lobby is built)
    addGallery(exhibition) {
        const name = this.galleries.get(exhibition.id) ?? this.assignSides([exhibition])[0]?.side;
        if (!name) return null;
        const previous = this.sides.get(name);
        if (previous?.exhibition) return previous;
        if (previous) {
            this.group.remove(previous.group);
            disposeObject(previous.group);
            this.removeColliders(previous.colliders);
        }
        const record = buildGallery(exhibition, sideAt(SIDES[name]), {
            space: this,
            museum: this.museum,
            placard: this.services.placard,
            wallHeight: HEIGHT,
            wallMaterial: this.wallMaterial,
            trimMaterial: this.trimMaterial
        });
        record.exhibition = exhibition;
        this.sides.set(name, record);
        return record;
    }

    // The doorways that can be walked through: [{ id, x, z }]
    doorways() {
        const list = [];
        this.sides.forEach(record => {
            if (record.exhibition && record.open) list.push({ id: record.exhibition.id, x: record.doorPoint.x, z: record.doorPoint.z });
        });
        return list;
    }

    // Where to stand when coming back from an exhibition: in front of its doorway, facing the middle
    arrivalFrom(exhibitionId) {
        const record = this.sides.get(this.galleries.get(exhibitionId));
        return record?.arrival ?? this.spawn;
    }

    // The museum's guide in the entrance hall: a plan of the rotunda with a light for each gallery
    async buildGuide(assigned) {
        const guide = this.content.guide;
        if (!guide) return;
        await createExhibit({
            id: 'museum-guide',
            type: 'guide',
            title: guide.title,
            meta: guide.meta,
            description: guide.description,
            entries: assigned.map(({ exhibition, side }) => ({
                title: exhibition.title,
                text: `${side[0].toUpperCase()}${side.slice(1)} gallery · ${exhibition.status === 'open' ? 'Open' : 'In preparation'}`
            })),
            at: [-HALL.width / 2 + 0.9, APOTHEM + 4.2],
            facing: 90,
            model: {
                name: 'museum-guide',
                params: {
                    galleries: assigned.map(({ exhibition, direction }) => ({
                        facing: direction, color: exhibition.accent ?? ACCENT, open: exhibition.status === 'open'
                    }))
                }
            },
            display: 'none',
            marker: false,
            radius: 0.42,
            anchorHeight: 1.45
        }, {
            kit: { space: this, materials: this.materials },
            space: this,
            exhibition: { id: 'museum', title: this.content.title, accent: ACCENT },
            index: 0,
            total: 1,
            services: this.services
        });
    }
}
