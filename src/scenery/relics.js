// relics.js - Exhibit models for a universe's things, generic enough for many stories: a faction's
// standard with its emblem, a post on a timeline walk, a chart on a chart table, a log book on a
// writing desk, a lantern on a hook, a memorial. All original, built from primitives; properly
// licensed models could take their place later (see src/scenery/catalog.js).
//
// Each model is (params, kit) => a Group whose origin sits on the ground and whose front faces -z,
// with userData.parts naming what its behaviour moves (see src/museum/behaviors.js).
import * as THREE from 'three';
import { createText } from './text.js';
import { PieceBuilder } from './kit.js';
import { emblemTexture, chartTexture } from './textures.js';

const glowing = (color, intensity = 2.4) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
    material.userData.noShadow = true;
    return material;
};

function risingRing(accent, radius, y = 0.02) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = y;
    return ring;
}

function shadows(group) {
    group.traverse(part => {
        if (part.isMesh && !part.material.userData?.noShadow && !part.material.transparent) part.castShadow = part.receiveShadow = true;
    });
    return group;
}

// ---- A faction's standard: its emblem on cloth, high on a pole ------------------------------

// params: emblem (see emblems.js; else the entity's emblem, else a lantern in field and ink), accent, height
export function factionStandard(params) {
    const height = params.height ?? 3.4;
    const wood = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.35, metalness: 0.85 });
    const emblem = emblemTexture(params.emblem ?? params.entity?.emblem ?? { field: params.field ?? '#14213a', ink: params.ink ?? '#e8c56a' });
    const cloth = new THREE.MeshStandardMaterial({ map: emblem, emissiveMap: emblem, emissive: '#ffffff', emissiveIntensity: 0.06, roughness: 0.85, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const b = new PieceBuilder();
    b.add(wood, new THREE.CylinderGeometry(0.5, 0.56, 0.18, 24).translate(0, 0.09, 0));
    b.add(wood, new THREE.CylinderGeometry(0.045, 0.055, height, 10).translate(0, height / 2, 0));
    b.add(wood, new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8).rotateZ(Math.PI / 2).translate(0, height - 0.18, -0.06));
    b.add(brass, new THREE.SphereGeometry(0.08, 12, 8).translate(0, height + 0.06, 0));
    for (const side of [-1, 1]) b.add(brass, new THREE.SphereGeometry(0.045, 10, 8).translate(side * 0.78, height - 0.18, -0.06));
    // The cloth hangs in soft folds
    const banner = new THREE.PlaneGeometry(1.3, 1.9, 12, 12);
    const position = banner.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i);
        position.setZ(i, Math.sin(x * 5.5) * 0.04 * (0.4 + (0.95 - y) * 0.4));
    }
    banner.computeVertexNormals();
    const flag = new THREE.Mesh(banner.translate(0, height - 0.18 - 0.98, -0.1), cloth);
    group.add(flag);
    // A swallowtail of brass tassels along its foot
    for (let i = 0; i < 5; i++) {
        b.add(brass, new THREE.ConeGeometry(0.03, 0.14, 6).rotateX(Math.PI).translate(-0.52 + i * 0.26, height - 2.22, -0.1));
    }
    group.add(b.build());
    const ring = risingRing(params.accent ?? '#e8c56a', 0.62);
    group.add(ring);
    group.userData.parts = { ring, glows: [{ material: cloth, base: 0.06, peak: 0.55 }] };
    return shadows(group);
}

// ---- A post on a timeline walk ----------------------------------------------------------------

// params: era (e.g. 'Year 4'), title, accent, moment (true: this event can be walked into)
export function timelinePost(params) {
    const accent = new THREE.Color(params.moment ? params.momentAccent ?? '#ffcf7a' : params.accent ?? '#57d6c8');
    const brass = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.35, metalness: 0.85 });
    const plateMaterial = new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.3, metalness: 0.5, emissive: accent, emissiveIntensity: 0.08 });
    const group = new THREE.Group();
    const base = new PieceBuilder();
    base.add(brass, new THREE.CylinderGeometry(0.2, 0.24, 0.06, 20).translate(0, 0.03, 0));
    base.add(brass, new THREE.CylinderGeometry(0.035, 0.045, 1.05, 10).translate(0, 0.55, 0));
    group.add(base.build());
    const plate = new THREE.Group();
    plate.position.set(0, 1.1, 0);
    plate.rotation.x = 0.6; // Tipped back toward the reader
    plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.03), plateMaterial));
    plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.008, 0.035).translate(0, 0.196, 0), glowing(accent, 2)));
    const text = createText([
        { text: (params.era ?? '').toUpperCase(), size: 0.5, weight: 600, spacing: 0.32, color: `#${accent.getHexString()}` },
        { text: params.title ?? '', font: 'serif', italic: true, size: 0.62, color: '#efe6d6', gap: 0.4 }
    ], { size: 0.07, padding: 0.08, intensity: 1.2 });
    const fit = Math.min(1, 0.56 / text.userData.size.width);
    text.scale.setScalar(fit);
    text.position.z = -0.017;
    text.rotation.y = Math.PI;
    plate.add(text);
    group.add(plate);
    if (params.moment) {
        // A small flame over the post: this one can be entered
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.7, 1), glowing('#ffcf7a', 1.4));
        flame.position.set(0, 1.42, 0.05);
        group.add(flame);
    }
    const ring = risingRing(accent, 0.34);
    group.add(ring);
    group.userData.parts = { ring, glows: [{ material: plateMaterial, base: 0.08, peak: 0.9 }] };
    return shadows(group);
}

// ---- A chart on a chart table -------------------------------------------------------------------

// params: islands (see chartTexture), unfinished
export function chartTable(params) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.35, metalness: 0.85 });
    const chart = chartTexture({ islands: params.islands ?? [{ at: [-0.3, -0.1], size: 0.22, seed: 2 }, { at: [0.35, 0.3], size: 0.14, seed: 5 }], unfinished: params.unfinished ?? true, size: 512 });
    const paper = new THREE.MeshStandardMaterial({ map: chart, emissiveMap: chart, emissive: '#ffe2b0', emissiveIntensity: 0.0, roughness: 0.9 });
    const group = new THREE.Group();
    const top = 0.86;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.85).translate(0, top, 0), wood));
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, top, 0.07).translate(x * 0.58, top / 2, z * 0.36), wood));
    }
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7).rotateX(-Math.PI / 2).rotateY(Math.PI), paper);
    sheet.position.y = top + 0.032;
    sheet.rotation.y = 0.06;
    group.add(sheet);
    // Dividers lying open on it, an inkpot, a candle stub
    for (const side of [-1, 1]) {
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.22, 5).rotateZ(Math.PI / 2).rotateY(side * 0.25).translate(0.2 + side * 0.03, top + 0.045, 0.12), brass));
    }
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 10).translate(-0.48, top + 0.06, -0.25), new THREE.MeshStandardMaterial({ color: '#101418', roughness: 0.1 })));
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8).translate(0.5, top + 0.08, -0.28), new THREE.MeshStandardMaterial({ color: '#e8dcc0' })));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6).scale(1, 1.8, 1).translate(0.5, top + 0.15, -0.28), glowing('#ffb85a', 3)));
    group.userData.parts = { glows: [{ material: paper, base: 0, peak: 0.35 }] };
    return shadows(group);
}

// ---- A log book on a writing desk ---------------------------------------------------------------

function pageTexture(lines = []) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 340;
    const context = canvas.getContext('2d');
    context.fillStyle = '#e9dcc0';
    context.fillRect(0, 0, 512, 340);
    context.fillStyle = 'rgba(90,60,20,0.18)';
    context.fillRect(254, 0, 4, 340);
    context.strokeStyle = 'rgba(60, 50, 40, 0.45)';
    context.lineWidth = 1.2;
    // Pencilled lines of weather on the left page; the right page holds the content's own words
    for (let y = 40; y < 320; y += 22) {
        context.beginPath();
        context.moveTo(28, y);
        let x = 28;
        while (x < 230) {
            x += 8 + Math.random() * 30;
            context.lineTo(Math.min(x, 230), y + (Math.random() - 0.5) * 2);
        }
        context.stroke();
    }
    context.fillStyle = 'rgba(40, 32, 26, 0.85)';
    context.font = 'italic 21px Georgia, serif';
    let y = 70;
    for (const line of lines) {
        const words = line.split(' ');
        let row = '';
        for (const word of words) {
            if (context.measureText(`${row} ${word}`).width > 210 && row) {
                context.fillText(row, 280, y);
                y += 28;
                row = word;
            } else {
                row = row ? `${row} ${word}` : word;
            }
        }
        context.fillText(row, 280, y);
        y += 40;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// params: lines (what is written on the open page)
export function logBook(params) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.6 });
    const leather = new THREE.MeshStandardMaterial({ color: '#4a2a1c', roughness: 0.55 });
    const pageMap = pageTexture(params.lines ?? []);
    const pages = new THREE.MeshStandardMaterial({ map: pageMap, emissiveMap: pageMap, emissive: '#ffe6b8', emissiveIntensity: 0.05, roughness: 0.9 });
    const group = new THREE.Group();
    const top = 0.78;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.55).translate(0, top, 0), wood));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, top - 0.05, 0.5).translate(0, (top - 0.05) / 2, 0.02), wood));
    // The book: its pages (both sides drawn on one sheet), and a cover that swings open from the left
    const book = new THREE.Group();
    book.position.set(0, top + 0.025, -0.02);
    book.rotation.y = Math.PI + 0.08;
    const width = 0.42, depth = 0.3;
    book.add(new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, depth).translate(0, 0.017, 0), leather));
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.02, depth - 0.02).rotateX(-Math.PI / 2), pages);
    sheet.position.y = 0.036;
    book.add(sheet);
    const hinge = new THREE.Group(); // The cover turns about the book's spine (its middle)
    hinge.position.set(0, 0.04, 0);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(width / 2 + 0.01, 0.012, depth + 0.01).translate(width / 4, 0, 0), leather);
    hinge.add(cover);
    hinge.rotation.z = 0; // Closed: lying over the right page
    book.add(hinge);
    group.add(book);
    // A candle beside it
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.16, 8).translate(0.36, top + 0.105, 0.12), new THREE.MeshStandardMaterial({ color: '#efe4cc' })));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6).scale(1, 1.9, 1).translate(0.36, top + 0.215, 0.12), glowing('#ffb85a', 3)));
    group.userData.parts = { cover: hinge, coverAngle: Math.PI * 0.96, glows: [{ material: pages, base: 0.05, peak: 0.3 }] };
    return shadows(group);
}

// ---- A lantern on a hook ----------------------------------------------------------------------

// params: height (of its hook), bracket (true: from a wall bracket behind it)
export function hangingLantern(params) {
    const tin = new THREE.MeshStandardMaterial({ color: '#5a5650', roughness: 0.45, metalness: 0.7 });
    const flame = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: '#ffb45e', emissiveIntensity: 2.2 });
    flame.userData.noShadow = true;
    const group = new THREE.Group();
    const hook = params.height ?? 1.95;
    if (params.bracket !== false) {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42).translate(0, hook, 0.2), tin));
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.03).translate(0, hook - 0.15, 0.4), tin));
    }
    const lantern = new THREE.Group();
    lantern.position.set(0, hook - 0.02, 0);
    lantern.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 5, 12), tin));
    lantern.add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.1, 8).translate(0, -0.1, 0), tin));
    lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 8).translate(0, -0.25, 0), flame));
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        lantern.add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.22, 0.015).translate(Math.cos(a) * 0.088, -0.25, Math.sin(a) * 0.088), tin));
    }
    lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8).translate(0, -0.37, 0), tin));
    group.add(lantern);
    group.userData.parts = { moving: lantern, glows: [{ material: flame, base: 2.2, peak: 3 }] };
    return group;
}

// ---- A memorial ---------------------------------------------------------------------------------

// params: title, lines (its inscription), accent; a stepped base, a stone with the inscription, a
// bronze lantern on top, and small lanterns set around its foot
export function memorial(params) {
    const stone = new THREE.MeshStandardMaterial({ color: '#8f887c', roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: '#5d574e', roughness: 0.9 });
    const bronze = new THREE.MeshStandardMaterial({ color: '#6a5232', roughness: 0.4, metalness: 0.8 });
    const flame = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: params.accent ?? '#ffb45e', emissiveIntensity: 1.8 });
    flame.userData.noShadow = true;
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 2.2).translate(0, 0.125, 0), dark));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6).translate(0, 0.375, 0), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.55).translate(0, 1.45, 0), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.7).translate(0, 2.46, 0), dark));
    // The bronze lantern on top
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 8).translate(0, 2.56, 0), bronze));
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 8).translate(0, 2.78, 0), flame));
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.03).translate(Math.cos(a) * 0.16, 2.78, Math.sin(a) * 0.16), bronze));
    }
    group.add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 8).translate(0, 3.07, 0), bronze));
    group.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 12).translate(0, 3.22, 0), bronze));
    // The inscription
    if (params.title) {
        const text = createText([
            { text: params.title.toUpperCase(), size: 1, weight: 600, spacing: 0.3, color: '#2c271f' },
            ...(params.lines ?? []).map((line, i) => ({ text: line, font: 'serif', italic: true, size: 0.62, color: '#3a332a', gap: i === 0 ? 0.6 : 0.3 }))
        ], { size: 0.13, padding: 0.04 });
        const fit = Math.min(1, 0.74 / text.userData.size.width);
        text.scale.setScalar(fit);
        text.position.set(0, 1.75, -0.28);
        text.rotation.y = Math.PI;
        group.add(text);
    }
    // Small lanterns around its foot, left by the town
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95;
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 6).translate(x, 0.32, z), flame));
        group.add(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 6).translate(x, 0.42, z), bronze));
    }
    const ring = risingRing(params.accent ?? '#ffcf7a', 1.2, 0.27);
    group.add(ring);
    group.userData.parts = { ring, glows: [{ material: flame, base: 1.8, peak: 2.6 }] };
    return shadows(group);
}
