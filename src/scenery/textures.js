// textures.js - Surfaces painted in the browser, once per world: a hull's painted planking, deck
// planks, sailcloth (whole or torn), an emblem on a flag, a sea chart. Nothing is downloaded, and
// everything is original. Each returns a CanvasTexture; the world that uses it frees it.
import * as THREE from 'three';
import { createRandom } from './kit.js';
import { drawEmblem } from './emblems.js';

export function canvasTexture(width, height, paint, { repeat = false, srgb = true } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
}

// A hull's side, from below the keel (bottom of the image) to above the rail (top): painted bands at
// fixed heights, planks running its length with their seams and butt joints.
// bands: [[fromHeight, toHeight, colour], ...] in metres; range: [lowest, highest] heights shown
export function hullTexture({ bands, range: [low, high], plank = 0.22, seed = 3 }) {
    const random = createRandom(seed);
    return canvasTexture(512, 1024, (context, width, height) => {
        const row = y => (1 - (y - low) / (high - low)) * height;
        for (const [from, to, color] of bands) {
            context.fillStyle = color;
            context.fillRect(0, row(to), width, row(from) - row(to));
        }
        // Grain: faint streaks along the planks
        for (let i = 0; i < 900; i++) {
            context.fillStyle = `rgba(${random() > 0.5 ? '255,240,220' : '0,0,0'}, ${0.02 + random() * 0.04})`;
            context.fillRect(random() * width, random() * height, 20 + random() * 80, 1);
        }
        // Seams between the strakes, and the butt joints where planks meet end to end
        context.fillStyle = 'rgba(0, 0, 0, 0.35)';
        for (let y = low; y < high; y += plank) {
            const r = row(y);
            context.fillRect(0, r, width, 1.5);
            const joints = 3 + Math.floor(random() * 3);
            for (let j = 0; j < joints; j++) context.fillRect(random() * width, r - (row(y) - row(y + plank)), 1.5, row(y) - row(y + plank));
        }
        // A little weather at the waterline
        const water = row(0);
        const gradient = context.createLinearGradient(0, water - 40, 0, water + 10);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(20,30,25,0.35)');
        context.fillStyle = gradient;
        context.fillRect(0, water - 40, width, 50);
    });
}

// Deck planks running along v (the image's height), seams along u, caulked dark; repeats
export function deckTexture({ color = '#8a6a4a', planks = 12, seed = 5 } = {}) {
    const random = createRandom(seed);
    return canvasTexture(512, 512, (context, width, height) => {
        const base = new THREE.Color(color);
        const w = width / planks;
        for (let i = 0; i < planks; i++) {
            const shade = base.clone().multiplyScalar(0.82 + random() * 0.3);
            context.fillStyle = `#${shade.getHexString()}`;
            context.fillRect(i * w, 0, w, height);
            // Grain along the plank
            for (let g = 0; g < 40; g++) {
                context.fillStyle = `rgba(0,0,0,${0.03 + random() * 0.05})`;
                context.fillRect(i * w + random() * w, random() * height, 1, 30 + random() * 120);
            }
            // Where two planks meet end to end, and the nails
            const joint = random() * height;
            context.fillStyle = 'rgba(20, 12, 6, 0.6)';
            context.fillRect(i * w, joint, w, 2);
            context.fillStyle = 'rgba(30, 25, 20, 0.7)';
            context.fillRect(i * w + w * 0.25, joint + 6, 2, 2);
            context.fillRect(i * w + w * 0.7, joint + 6, 2, 2);
        }
        context.fillStyle = 'rgba(15, 10, 5, 0.85)';
        for (let i = 0; i <= planks; i++) context.fillRect(i * w - 1, 0, 2, height);
    }, { repeat: true });
}

// Sailcloth: panels sewn side by side, a little weathered; torn: ragged rips through it (alpha);
// emblem: a mark painted large in its middle (see emblems.js; its field is left as the cloth)
export function sailTexture({ color = '#e9dfc6', torn = false, seed = 9, emblem = null } = {}) {
    const random = createRandom(seed);
    const size = emblem ? 512 : 256;
    return canvasTexture(size, size, (context, width, height) => {
        context.fillStyle = color;
        context.fillRect(0, 0, width, height);
        context.fillStyle = 'rgba(90, 70, 40, 0.18)';
        for (let x = 0; x < width; x += width / 9) context.fillRect(x, 0, 2, height);
        for (let i = 0; i < 300; i++) {
            context.fillStyle = `rgba(80,60,30,${random() * 0.05})`;
            context.fillRect(random() * width, random() * height, 6 + random() * 20, 6 + random() * 20);
        }
        context.fillStyle = 'rgba(90, 70, 40, 0.25)'; // Reef points and the bolt rope
        context.fillRect(0, 0, width, 4);
        context.fillRect(0, height - 4, width, 4);
        if (emblem) {
            context.save();
            context.translate(width * 0.18, height * 0.16);
            context.globalAlpha = 0.92;
            drawEmblem(context, width * 0.64, height * 0.64, { ...emblem, fill: false, border: false });
            context.restore();
        }
        if (torn) {
            context.globalCompositeOperation = 'destination-out';
            for (let r = 0; r < 4; r++) {
                let x = random() * width, y = random() * height * 0.6;
                context.beginPath();
                context.moveTo(x, y);
                for (let s = 0; s < 8; s++) {
                    x += (random() - 0.3) * 30;
                    y += 10 + random() * 22;
                    context.lineTo(x, y);
                }
                context.lineWidth = 6 + random() * 10;
                context.stroke();
            }
            context.globalCompositeOperation = 'source-over';
        }
    });
}

// An emblem on cloth (see emblems.js for the motifs: a lantern, a skull over crossed things, an anchor)
// field: the cloth; ink: the emblem; ...the motif's own options
export function emblemTexture(options = {}) {
    return canvasTexture(512, 512, (context, width, height) => drawEmblem(context, width, height, options));
}

// A wanted poster, laid out the museum's own way: weathered paper, a heading, a sepia frame with the
// person's silhouette (head, shoulders and hat, in their own colours), their name and the price on
// their head. Nothing in it comes from any series' own posters.
// name, bounty, currency, heading, footer, figure: { hat, hair, palette }, seed
export function posterTexture({ name = '', bounty = '', currency = '', heading = 'WANTED', footer = '', figure = {}, seed = 7 } = {}) {
    const random = createRandom(seed);
    return canvasTexture(512, 720, (context, width, height) => {
        // Paper, a little stained, darker at the edges
        context.fillStyle = '#e4d3ae';
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 260; i++) {
            context.fillStyle = `rgba(120, 80, 30, ${random() * 0.07})`;
            context.beginPath();
            context.arc(random() * width, random() * height, 4 + random() * 40, 0, Math.PI * 2);
            context.fill();
        }
        const edge = context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.75);
        edge.addColorStop(0, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(70, 40, 10, 0.45)');
        context.fillStyle = edge;
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#2c1d10';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '700 92px Georgia, serif';
        context.fillText(heading, width / 2, 74);
        // The frame and the silhouette in it
        const fx = 46, fy = 130, fw = width - 92, fh = 330;
        const sepia = context.createLinearGradient(0, fy, 0, fy + fh);
        sepia.addColorStop(0, '#b9a07a');
        sepia.addColorStop(1, '#8a6f4c');
        context.fillStyle = sepia;
        context.fillRect(fx, fy, fw, fh);
        context.save();
        context.beginPath();
        context.rect(fx, fy, fw, fh);
        context.clip();
        silhouette(context, width / 2, fy + fh, figure);
        context.restore();
        context.lineWidth = 6;
        context.strokeStyle = '#2c1d10';
        context.strokeRect(fx, fy, fw, fh);
        // Name and price
        context.fillStyle = '#2c1d10';
        context.font = '600 30px Georgia, serif';
        context.fillText('DEAD OR ALIVE', width / 2, 495);
        let size = 58;
        context.font = `700 ${size}px Georgia, serif`;
        while (context.measureText(name.toUpperCase()).width > width - 70 && size > 24) {
            size -= 2;
            context.font = `700 ${size}px Georgia, serif`;
        }
        context.fillText(name.toUpperCase(), width / 2, 560);
        context.font = '700 50px Georgia, serif';
        context.fillText(`${currency}${bounty}`, width / 2, 632);
        if (footer) {
            context.font = 'italic 20px Georgia, serif';
            context.fillText(footer, width / 2, 688);
        }
    });
}

// Head and shoulders, seen from the front, in the figure's own colours: no face, just its shape
function silhouette(context, x, bottom, { hat = 'none', hair = 'short', palette = {} } = {}) {
    const coat = palette.coat ?? palette.shirt ?? '#3a3f4a';
    const skin = palette.skin ?? '#cdbba4';
    const hairColor = palette.hair ?? '#2a221c';
    const hatColor = palette.hat ?? '#3a2a1e';
    context.save();
    context.globalAlpha = 0.88;
    context.fillStyle = coat;
    context.beginPath();
    context.moveTo(x - 170, bottom);
    context.quadraticCurveTo(x - 160, bottom - 120, x - 60, bottom - 140);
    context.lineTo(x + 60, bottom - 140);
    context.quadraticCurveTo(x + 160, bottom - 120, x + 170, bottom);
    context.closePath();
    context.fill();
    context.fillStyle = skin;
    context.fillRect(x - 24, bottom - 170, 48, 40);
    context.beginPath();
    context.ellipse(x, bottom - 225, 62, 72, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = hairColor;
    if (hair === 'afro') {
        context.beginPath();
        context.arc(x, bottom - 260, 100, 0, Math.PI * 2);
        context.fill();
    } else if (hair === 'long') {
        context.fillRect(x - 70, bottom - 260, 140, 120);
    }
    if (hair !== 'none' && hair !== 'afro') {
        context.beginPath();
        context.ellipse(x, bottom - 250, 66, 50, 0, Math.PI, Math.PI * 2);
        context.fill();
    }
    context.fillStyle = hatColor;
    if (hat === 'straw' || hat === 'cowboy') {
        context.beginPath();
        context.ellipse(x, bottom - 270, 140, 22, 0, 0, Math.PI * 2);
        context.fill();
        context.beginPath();
        context.ellipse(x, bottom - 292, 66, 44, 0, Math.PI, Math.PI * 2);
        context.fill();
        context.fillStyle = palette.band ?? '#8a1e1e';
        context.fillRect(x - 66, bottom - 294, 132, 14);
    } else if (hat === 'tricorne' || hat === 'bicorne') {
        context.beginPath();
        context.moveTo(x - 130, bottom - 262);
        context.quadraticCurveTo(x, bottom - 380, x + 130, bottom - 262);
        context.quadraticCurveTo(x, bottom - 290, x - 130, bottom - 262);
        context.fill();
    } else if (hat === 'top') {
        context.fillRect(x - 56, bottom - 380, 112, 110);
        context.fillRect(x - 96, bottom - 280, 192, 14);
    } else if (hat === 'bandana' || hat === 'cap') {
        context.beginPath();
        context.ellipse(x, bottom - 262, 70, 52, 0, Math.PI, Math.PI * 2);
        context.fill();
    }
    context.restore();
}

// A sea chart: islands drawn as coastlines with fine hatching, a compass rose, rhumb lines.
// islands: [{ at: [u, v] (-1..1), size, seed }]; unfinished: coastlines that stop partway, blank to
// one side. For a chart on a table, or a hologram (ink on transparent: transparent: true).
// weight: how heavy the ink's lines are (a hologram seen from a few steps away wants them bold)
// features: the world's own shapes, drawn under the islands: bands ({ type: 'band', from: [u, v],
// to: [u, v], width, color, label, edges: true }: a sea lane, a continent, a belt of calm water) and
// labels ({ type: 'label', at: [u, v], text, size, color }: the name of a sea)
export function chartTexture({ islands = [], paper = '#d9c9a3', ink = '#3a2c1c', unfinished = false, transparent = false, seed = 4, size = 1024, weight = 1, features = [] } = {}) {
    const random = createRandom(seed);
    return canvasTexture(size, size, (context, width, height) => {
        if (!transparent) {
            context.fillStyle = paper;
            context.fillRect(0, 0, width, height);
            for (let i = 0; i < 500; i++) {
                context.fillStyle = `rgba(90,60,20,${random() * 0.06})`;
                context.fillRect(random() * width, random() * height, 4 + random() * 40, 4 + random() * 40);
            }
        }
        const cx = width / 2, cy = height / 2;
        context.strokeStyle = ink;
        context.fillStyle = ink;
        const scale = width / 2;
        // Rhumb lines from the compass rose
        context.globalAlpha = transparent ? 0.35 : 0.25;
        context.lineWidth = 1.5 * weight;
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            context.beginPath();
            context.moveTo(cx, cy);
            context.lineTo(cx + Math.cos(a) * width, cy + Math.sin(a) * width);
            context.stroke();
        }
        context.globalAlpha = 1;
        // The rose
        context.lineWidth = 2 * weight;
        context.beginPath();
        context.arc(cx, cy, scale * 0.12, 0, Math.PI * 2);
        context.stroke();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 ? scale * 0.09 : scale * 0.17;
            context.beginPath();
            context.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            context.lineTo(cx + Math.cos(a + 0.35) * scale * 0.03, cy + Math.sin(a + 0.35) * scale * 0.03);
            context.lineTo(cx + Math.cos(a - 0.35) * scale * 0.03, cy + Math.sin(a - 0.35) * scale * 0.03);
            context.closePath();
            if (i % 2) context.stroke();
            else context.fill();
        }
        // The world's own shapes: bands first, labels over them
        for (const feature of features.filter(item => item.type === 'band')) drawBand(context, feature, cx, cy, scale, weight, ink);
        for (const feature of features.filter(item => item.type === 'label')) {
            const [u, v] = feature.at;
            context.save();
            context.fillStyle = feature.color ?? ink;
            context.globalAlpha = feature.opacity ?? 0.85;
            context.font = `${feature.italic === false ? '' : 'italic '}${feature.weight ?? 600} ${Math.round(scale * (feature.size ?? 0.05))}px Georgia, serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            spaced(context, feature.text.toUpperCase(), cx + u * scale, cy + v * scale, scale * (feature.size ?? 0.05) * 0.25);
            context.restore();
        }
        // The islands: a wobbling coastline, hatched inside along its edge
        islands.forEach(({ at: [u, v], size: islandSize = 0.1, seed: islandSeed = 1, unfinished: stop = unfinished }) => {
            const own = createRandom(islandSeed * 97 + 13);
            const ix = cx + u * scale, iy = cy + v * scale;
            const radius = islandSize * scale;
            const points = [];
            const lobes = [own() * 6, own() * 6, own() * 6];
            for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                const r = radius * (0.75 + 0.18 * Math.sin(a * 3 + lobes[0]) + 0.1 * Math.sin(a * 5 + lobes[1]) + 0.06 * Math.sin(a * 9 + lobes[2]));
                points.push([ix + Math.cos(a) * r, iy + Math.sin(a) * r * 0.8]);
            }
            const drawn = stop ? Math.floor(points.length * (0.45 + own() * 0.2)) : points.length;
            context.lineWidth = 2.5 * weight;
            context.beginPath();
            points.slice(0, drawn).forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
            context.stroke();
            context.lineWidth = weight;
            context.globalAlpha = 0.6;
            for (let i = 0; i < drawn; i += 2) {
                const [x, y] = points[i];
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x + (ix - x) * 0.12, y + (iy - y) * 0.12);
                context.stroke();
            }
            context.globalAlpha = 1;
            // Soundings scattered off its shore
            context.font = `${Math.round(scale * 0.022)}px Georgia, serif`;
            for (let s = 0; s < 6; s++) {
                const a = own() * Math.PI * 2;
                const d = radius * (1.3 + own() * 0.8);
                context.fillText(String(3 + Math.floor(own() * 40)), ix + Math.cos(a) * d, iy + Math.sin(a) * d);
            }
        });
    }, { srgb: !transparent });
}

// Letters drawn one by one with space between them, centred on (x, y)
function spaced(context, text, x, y, spacing) {
    const widths = [...text].map(character => context.measureText(character).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (text.length - 1);
    let left = x - total / 2;
    context.textAlign = 'left';
    [...text].forEach((character, i) => {
        context.fillText(character, left, y);
        left += widths[i] + spacing;
    });
}

// A band across a chart: filled faintly, edged with fine lines, its name written along it
function drawBand(context, { from, to, width = 0.1, color, label, edges = true, opacity = 0.22 }, cx, cy, scale, weight, ink) {
    const ax = cx + from[0] * scale, ay = cy + from[1] * scale;
    const bx = cx + to[0] * scale, by = cy + to[1] * scale;
    const angle = Math.atan2(by - ay, bx - ax);
    const length = Math.hypot(bx - ax, by - ay);
    const half = (width * scale) / 2;
    context.save();
    context.translate(ax, ay);
    context.rotate(angle);
    context.fillStyle = color ?? ink;
    context.globalAlpha = opacity;
    context.fillRect(0, -half, length, half * 2);
    if (edges) {
        context.globalAlpha = Math.min(1, opacity * 3.5);
        context.strokeStyle = color ?? ink;
        context.lineWidth = 1.6 * weight;
        for (const y of [-half, half]) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(length, y);
            context.stroke();
        }
    }
    if (label) {
        context.globalAlpha = 0.9;
        context.fillStyle = color ?? ink;
        context.font = `600 ${Math.round(Math.min(half * 0.9, scale * 0.045))}px Georgia, serif`;
        context.textBaseline = 'middle';
        const repeat = Math.max(1, Math.floor(length / (scale * 0.75)));
        for (let i = 0; i < repeat; i++) spaced(context, label.toUpperCase(), length * (i + 0.5) / repeat, 0, scale * 0.012);
    }
    context.restore();
}
