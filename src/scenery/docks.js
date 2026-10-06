// docks.js - A great covered dock: the hall of a sea-going world. Stone walls with high windows, a
// timber roof over a court at one end and over two long aisles, and between the aisles a basin of sea
// water open to the sky, running out through a great arch in the far wall to the open sea. A ship
// can lie in the basin; the aisles are quays for exhibitions. Lanterns hang from the beams, cloth
// banners name what each part of the hall holds. Original and generic: any world of ships could use it.
//
//   pieces  'dock-hall'    { west, east, north, south (the inside walls), height (of the walls), roof:
//                            { height, court (z: the court's roof runs from here to the south wall),
//                            slot: [x0, x1] (the open sky over the basin) }, arch: { width, height },
//                            columns: [[x, z], ...] (holding the aisle roofs), windows (metres apart),
//                            lanterns: [[x, z, drop], ...], banners: [...], colors }
//           'balustrade'   { from: [x, z], to: [x, z], height }: a stone rail the body can't pass
//           'hall-banner'  { at, facing, text, sub, emblem, colors: { cloth, ink }, width, height, top }
//
// A banner is cloth on a rod: its words (text, sub) and an emblem (see emblems.js) painted on it.
import * as THREE from 'three';
import { PieceBuilder, facingToYaw } from './kit.js';
import { canvasTexture } from './textures.js';
import { drawEmblem } from './emblems.js';

function materialsFor(kit, colors = {}) {
    const m = kit.materials;
    return {
        wall: m.standard('dock-wall', { color: colors.wall ?? '#8d8478', roughness: 0.9 }),
        stone: m.standard('dock-stone', { color: colors.stone ?? '#6d665c', roughness: 0.85 }),
        timber: m.standard('dock-timber', { color: colors.timber ?? '#3d2b1e', roughness: 0.75 }),
        roof: m.standard('dock-roof', { color: colors.roof ?? '#2a1f18', roughness: 0.8, side: THREE.DoubleSide }),
        iron: m.standard('dock-iron', { color: '#2a2a2c', roughness: 0.5, metalness: 0.7 }),
        lantern: m.get('dock-lantern', () => {
            const material = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: colors.lantern ?? '#ffb45e', emissiveIntensity: 2.4 });
            material.userData.noShadow = true;
            return material;
        }),
        pane: m.get('dock-window', () => {
            const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.window ?? '#ffcf9a').multiplyScalar(1.15) });
            material.userData.noShadow = true;
            return material;
        })
    };
}

// The far wall with its great arch cut through it
function archWall(width, height, archWidth, archHeight, thickness) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.closePath();
    const hole = new THREE.Path();
    const r = archWidth / 2;
    hole.moveTo(-r, 0);
    hole.lineTo(r, 0);
    hole.lineTo(r, archHeight - r);
    hole.absarc(0, archHeight - r, r, 0, Math.PI, false);
    hole.lineTo(-r, 0);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -thickness / 2);
}

export function dockHall(params, kit) {
    const { west = -20, east = 20, north = -30, south = 30 } = params;
    const height = params.height ?? 11;
    const roof = { height: 13.5, court: 0, slot: [-8, 8], ...params.roof };
    const arch = { width: 16, height: 10.5, ...params.arch };
    const m = materialsFor(kit, params.colors);
    const t = 0.7; // Wall thickness
    const b = new PieceBuilder();
    const width = east - west, length = south - north;
    const midX = (west + east) / 2, midZ = (north + south) / 2;

    // The side walls and the near wall, with pilasters every so often; a plinth course along their foot
    b.box(m.wall, t, height, length + t * 2, west - t / 2, height / 2, midZ);
    b.box(m.wall, t, height, length + t * 2, east + t / 2, height / 2, midZ);
    b.box(m.wall, width, height, t, midX, height / 2, south + t / 2);
    for (const [x, inward] of [[west, 1], [east, -1]]) {
        b.box(m.stone, 0.12, 0.6, length, x + inward * 0.06, 0.3, midZ);
        for (let z = north + 4; z < south - 2; z += params.pilasters ?? 8) {
            b.box(m.stone, 0.7, height, 0.9, x + inward * 0.35, height / 2, z);
            kit.addCollider({ x: x + inward * 0.35, z, radius: 0.55 });
        }
    }
    b.box(m.stone, width, 0.6, 0.12, midX, 0.3, south - 0.06);
    // The far wall, open to the sea through its arch, and a dark keystone band over it
    b.add(m.wall, archWall(width + t * 2, height, arch.width, arch.height, t).translate(midX, 0, north - t / 2));
    b.box(m.stone, arch.width + 1.4, 0.7, t + 0.2, midX, arch.height + 0.35, north - t / 2);
    for (const side of [-1, 1]) b.box(m.stone, 1.0, arch.height - arch.width / 2, t + 0.3, midX + side * (arch.width / 2 + 0.5), (arch.height - arch.width / 2) / 2, north - t / 2);
    // Walls as far as the body is concerned
    kit.addCollider({ ax: west, az: north, bx: west, bz: south, radius: 0.15 });
    kit.addCollider({ ax: east, az: north, bx: east, bz: south, radius: 0.15 });
    kit.addCollider({ ax: west, az: south, bx: east, bz: south, radius: 0.15 });
    kit.addCollider({ ax: west, az: north, bx: midX - arch.width / 2, bz: north, radius: 0.15 });
    kit.addCollider({ ax: midX + arch.width / 2, az: north, bx: east, bz: north, radius: 0.15 });

    // High windows along the side walls, lit by the evening outside
    const windowEvery = params.windows ?? 8;
    for (const [x, inward] of [[west, 1], [east, -1]]) {
        for (let z = north + 8; z < south - 2; z += windowEvery) {
            b.add(m.pane, new THREE.PlaneGeometry(1.6, 3.2).rotateY(inward > 0 ? Math.PI / 2 : -Math.PI / 2).translate(x + inward * 0.02, height - 3.4, z));
            b.box(m.timber, 0.08, 3.4, 0.1, x + inward * 0.05, height - 3.4, z);
            b.box(m.timber, 0.08, 0.1, 1.7, x + inward * 0.05, height - 3.4, z);
        }
    }

    // The roof: over the court, a ceiling of planks on deep beams; over each aisle, a lean-to rising
    // from the side wall to the edge of the open sky above the basin
    const [slot0, slot1] = roof.slot;
    const courtLength = south - roof.court;
    b.add(m.roof, new THREE.PlaneGeometry(width + t * 2, courtLength + t).rotateX(Math.PI / 2).translate(midX, roof.height, roof.court + courtLength / 2 + t / 2));
    for (let z = roof.court; z <= south; z += 4) b.box(m.timber, width, 0.5, 0.3, midX, roof.height - 0.25, z);
    for (let x = west + 4; x < east; x += 6) b.box(m.timber, 0.24, 0.3, courtLength, x, roof.height - 0.62, roof.court + courtLength / 2);
    b.box(m.wall, width + t * 2, roof.height - height, t, midX, height + (roof.height - height) / 2, south + t / 2);
    for (const [from, to] of [[west, slot0], [slot1, east]]) {
        const span = Math.abs(to - from), rise = roof.height - height;
        const slope = Math.atan2(rise, span);
        const roofLength = roof.court - north + t;
        const plane = new THREE.PlaneGeometry(Math.hypot(span, rise) + 0.6, roofLength).rotateX(Math.PI / 2);
        const outward = from === west ? -1 : 1; // Which side the wall is on
        plane.rotateZ(outward < 0 ? slope : -slope);
        b.add(m.roof, plane.translate((from + to) / 2, height + rise / 2 + 0.1, north + (roof.court - north) / 2 - t / 2));
        for (let z = north + 2; z < roof.court; z += 4) {
            const rafter = new THREE.BoxGeometry(Math.hypot(span, rise), 0.34, 0.22).rotateZ(outward < 0 ? slope : -slope);
            b.add(m.timber, rafter.translate((from + to) / 2, height + rise / 2 - 0.2, z));
        }
        // The gable above the side wall's top, closing the aisle at the far wall
        const gable = new THREE.Shape();
        gable.moveTo(from === west ? west - t : east + t, height);
        gable.lineTo(from === west ? slot0 : slot1, height);
        gable.lineTo(from === west ? slot0 : slot1, roof.height);
        gable.closePath();
        b.add(m.wall, new THREE.ShapeGeometry(gable).translate(0, 0, north - 0.01));
    }
    // The long beams at the edges of the open sky, and the great beam where the court's roof ends
    for (const x of [slot0, slot1]) b.box(m.timber, 0.6, 0.8, roof.court - north + t, x, roof.height - 0.2, north + (roof.court - north) / 2 - t / 2);
    b.box(m.timber, slot1 - slot0 + 0.6, 1.2, 0.8, (slot0 + slot1) / 2, roof.height - 0.4, roof.court);

    // Columns under the beams
    for (const [x, z] of params.columns ?? []) {
        b.box(m.stone, 0.9, 0.5, 0.9, x, 0.25, z);
        b.cylinder(m.timber, 0.3, 0.34, roof.height - 0.6, x, 0.5, z, 10);
        b.box(m.timber, 0.9, 0.3, 0.9, x, roof.height - 0.75, z);
        kit.addCollider({ x, z, radius: 0.5 });
    }

    // Lanterns hanging on chains
    for (const [x, z, drop = 4] of params.lanterns ?? []) {
        const top = roof.height - 0.6;
        b.box(m.iron, 0.025, drop, 0.025, x, top - drop / 2, z);
        b.add(m.iron, new THREE.ConeGeometry(0.28, 0.22, 8).translate(x, top - drop - 0.05, z));
        b.cylinder(m.lantern, 0.2, 0.2, 0.42, x, top - drop - 0.6, z, 8);
        b.cylinder(m.iron, 0.24, 0.24, 0.06, x, top - drop - 0.66, z, 8);
    }

    const hall = b.build();
    kit.add(hall); // Not a gaze blocker: nothing on show hides behind the hall itself, and it is many triangles

    // The banners' rods and cords, all in one mesh; each banner's cloth is its own
    const rods = new PieceBuilder();
    for (const banner of params.banners ?? []) addBanner(banner, kit, rods);
    kit.add(rods.build({ castShadow: false }));
}
dockHall.takesPositions = true;

// ---- A stone rail ---------------------------------------------------------------------------------

export function balustrade(params, kit) {
    const [ax, az] = params.from, [bx, bz] = params.to;
    const length = Math.hypot(bx - ax, bz - az);
    const height = params.height ?? 1.0;
    const m = kit.materials;
    const stone = m.standard('balustrade-stone', { color: params.color ?? '#a39a8a', roughness: 0.85 });
    const y = kit.ground.heightAt((ax + bx) / 2, (az + bz) / 2);
    const b = new PieceBuilder();
    b.box(stone, length, 0.12, 0.34, 0, height - 0.06, 0);
    b.box(stone, length, 0.14, 0.3, 0, 0.07, 0);
    for (let s = 0.25; s < length; s += 0.36) b.cylinder(stone, 0.06, 0.08, height - 0.2, s - length / 2, 0.14, 0, 8);
    const object = b.build();
    object.position.set((ax + bx) / 2, y, (az + bz) / 2);
    object.rotation.y = Math.atan2(-(bz - az), bx - ax);
    kit.add(object);
    kit.addCollider({ ax, az, bx, bz, radius: 0.22 });
}
balustrade.takesPositions = true;

// ---- A banner of cloth on a rod ------------------------------------------------------------------

function bannerTexture({ text = '', sub = '', emblem = null, colors = {} }) {
    return canvasTexture(256, 768, (context, width, height) => {
        context.fillStyle = colors.cloth ?? '#1c2a44';
        context.fillRect(0, 0, width, height);
        context.strokeStyle = colors.ink ?? '#e8dcc0';
        context.lineWidth = 4;
        context.strokeRect(12, 12, width - 24, height - 60);
        if (emblem) {
            context.save();
            context.translate(28, 44);
            drawEmblem(context, width - 56, width - 56, { ...emblem, fill: false, border: false, field: colors.cloth ?? emblem.field });
            context.restore();
        }
        context.fillStyle = colors.ink ?? '#e8dcc0';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // The words run down the cloth, a letter under the other
        const letters = [...text.toUpperCase()];
        const top = emblem ? width + 20 : 70;
        const room = height - 110 - top;
        const step = Math.min(56, room / Math.max(1, letters.length));
        context.font = `600 ${Math.round(step * 0.82)}px Georgia, serif`;
        letters.forEach((letter, i) => context.fillText(letter, width / 2, top + step * (i + 0.5)));
        if (sub) {
            context.font = 'italic 22px Georgia, serif';
            context.fillText(sub, width / 2, height - 82);
        }
        // A swallowtail cut from its foot
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.moveTo(0, height);
        context.lineTo(width / 2, height - 44);
        context.lineTo(width, height);
        context.closePath();
        context.fill();
        context.globalCompositeOperation = 'source-over';
    });
}

// params: at, facing, text, sub, emblem, colors: { cloth, ink }, width, height (of the cloth), top (height
// of the rod). rods: a PieceBuilder to put its rod and cord in (else they are added on their own)
function addBanner(params, kit, rods = null) {
    const width = params.width ?? 1.4, height = params.height ?? width * 3;
    const top = params.top ?? 9;
    const map = bannerTexture(params);
    const cloth = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.12 });
    const geometry = new THREE.PlaneGeometry(width, height, 6, 10);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i);
        position.setZ(i, Math.sin(x * 4 + y * 0.8) * 0.04 * (0.5 - y / height));
    }
    geometry.computeVertexNormals();
    const group = new THREE.Group();
    const [x, z] = params.at;
    group.position.set(x, kit.ground.heightAt(x, z), z);
    group.rotation.y = facingToYaw(params.facing ?? 0) + Math.PI;
    const banner = new THREE.Mesh(geometry.translate(0, top - height / 2, 0), cloth);
    group.add(banner);
    const rod = kit.materials.standard('banner-rod', { color: '#b08a4a', roughness: 0.35, metalness: 0.85 });
    const parts = [new THREE.CylinderGeometry(0.03, 0.03, width + 0.3, 8).rotateZ(Math.PI / 2).translate(0, top + 0.04, 0)];
    if (params.hang !== false) parts.push(new THREE.CylinderGeometry(0.01, 0.01, params.hang ?? 3, 4).translate(0, top + (params.hang ?? 3) / 2, 0));
    group.updateMatrix();
    const own = rods ?? new PieceBuilder();
    parts.forEach(part => own.add(rod, part.applyMatrix4(group.matrix)));
    if (!rods) kit.add(own.build({ castShadow: false }));
    kit.add(group);
}

export function banner(params, kit) {
    addBanner(params, kit);
}
banner.takesPositions = true;
