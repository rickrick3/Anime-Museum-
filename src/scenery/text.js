// text.js - Words in the world: exhibition titles over doorways, wall texts, labels on plaques.
// Drawn once into a canvas with the system's own fonts (nothing is downloaded or bundled) and shown
// on a plane, so they stay crisp and cost one draw call each. Bright text (intensity > 1) glows
// under bloom.
import * as THREE from 'three';
import { FONTS } from './kit.js';

const PIXELS_PER_LINE = 128; // Canvas pixels for the height of the largest line

// lines: [{ text, size (relative, 1 = the largest), weight, font: 'sans' | 'serif', italic,
//           spacing (em between letters), color (CSS), gap (em above this line) }]
// Returns { canvas, width, height } in pixels.
function drawLines(lines, align, padding) {
    const largest = Math.max(...lines.map(line => line.size ?? 1));
    const scale = PIXELS_PER_LINE / largest;
    const measure = document.createElement('canvas').getContext('2d');

    const laid = lines.map(line => {
        const px = Math.round((line.size ?? 1) * scale);
        const font = `${line.italic ? 'italic ' : ''}${line.weight ?? 400} ${px}px ${FONTS[line.font ?? 'sans'] ?? line.font}`;
        measure.font = font;
        const spacing = (line.spacing ?? 0) * px;
        const characters = [...line.text];
        const widths = characters.map(character => measure.measureText(character).width);
        const width = widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, characters.length - 1);
        return { ...line, px, font, spacing, characters, widths, width, gap: (line.gap ?? 0.35) * px };
    });

    const pad = Math.round(padding * PIXELS_PER_LINE);
    const width = Math.ceil(Math.max(...laid.map(line => line.width))) + pad * 2;
    const height = Math.ceil(laid.reduce((sum, line, i) => sum + line.px * 1.25 + (i > 0 ? line.gap : 0), 0)) + pad * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.textBaseline = 'middle';

    let y = pad;
    laid.forEach((line, i) => {
        if (i > 0) y += line.gap;
        context.font = line.font;
        context.fillStyle = line.color ?? '#ffffff';
        let x = align === 'left' ? pad : align === 'right' ? width - pad - line.width : (width - line.width) / 2;
        const middle = y + line.px * 0.625;
        // Letter by letter, so the spacing is the same in every browser
        line.characters.forEach((character, j) => {
            context.fillText(character, x, middle);
            x += line.widths[j] + line.spacing;
        });
        y += line.px * 1.25;
    });
    return { canvas, width, height };
}

// A flat label in the world, centred on its origin (or aligned left / right), facing +z.
// lines: as above, or a plain string; size: metres for the font size of the largest line;
// intensity: brightness (above 1 glows under bloom); opacity: 0..1
export function createText(lines, { size = 0.3, align = 'center', padding = 0.15, intensity = 1, opacity = 1,
    depthWrite = false } = {}) {
    const list = typeof lines === 'string' ? [{ text: lines }] : lines;
    const { canvas, width, height: pixels } = drawLines(list, align, padding);
    const height = (pixels / PIXELS_PER_LINE) * size;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const metres = { width: (width / pixels) * height, height };
    const geometry = new THREE.PlaneGeometry(metres.width, metres.height);
    if (align === 'left') geometry.translate(metres.width / 2, 0, 0);
    if (align === 'right') geometry.translate(-metres.width / 2, 0, 0);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite,
        color: new THREE.Color(intensity, intensity, intensity)
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.size = metres;
    return mesh;
}
