// emblems.js - Marks on cloth, wood and paper: a crew's flag, a navy's ensign, a stamp on a poster.
// Every shape is original and generic, drawn on a 2D canvas; a content pack only picks a motif and its
// colours (a crew's `emblem`), so no series' own flag or logo is ever drawn:
//
//   motif 'lantern'  a lantern with rays of light around it (rays: how many)
//   motif 'skull'    a skull over two crossed things (crossed: 'bones' | 'swords' | 'axes' | 'none'),
//                    in front of a backing ('ring' | 'cross' | 'star' | 'sun' | 'none'), with a band
//                    across its brow if `band` is a colour
//   motif 'anchor'   an anchor under a star, between wings of waves (a navy's mark)
//
// drawEmblem(context, width, height, { motif, field, ink, accent, border, fill, ...the motif's own })
// draws it to fill the given area (designed on a 512 square). field: the cloth; ink: the mark; accent:
// its second colour; border: a fine frame; fill: false leaves the background alone.

export function drawEmblem(context, width, height, { motif = 'lantern', field = '#14213a', ink = '#e8c56a', accent = null, border = true, fill = true, ...rest } = {}) {
    context.save();
    if (fill) {
        context.fillStyle = field;
        context.fillRect(0, 0, width, height);
    }
    context.scale(width / 512, height / 512);
    context.strokeStyle = ink;
    context.fillStyle = ink;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (border) {
        context.lineWidth = 6;
        context.strokeRect(22, 22, 468, 468);
    }
    const options = { field, ink, accent: accent ?? ink, ...rest };
    if (motif === 'skull') skull(context, 256, 256, options);
    else if (motif === 'anchor') anchor(context, 256, 256, options);
    else lantern(context, 256, 256, options);
    context.restore();
}

// Two long things crossed behind (bones, swords or axes), drawn about (x, y)
function crossedPair(context, x, y, kind, ink, field) {
    if (kind === 'none') return;
    for (const turn of [-1, 1]) {
        context.save();
        context.translate(x, y + 40);
        context.rotate(turn * Math.PI / 4);
        context.fillStyle = ink;
        if (kind === 'bones') {
            context.fillRect(-170, -14, 340, 28);
            for (const end of [-1, 1]) {
                for (const knob of [-1, 1]) {
                    context.beginPath();
                    context.arc(end * 172, knob * 17, 22, 0, Math.PI * 2);
                    context.fill();
                }
            }
        } else if (kind === 'swords') {
            // A curved blade, a guard, a grip and a pommel; a fine line down the blade
            context.beginPath();
            context.moveTo(-120, -9);
            context.quadraticCurveTo(60, -22, 190, -2);
            context.quadraticCurveTo(70, 6, -120, 9);
            context.closePath();
            context.fill();
            context.fillRect(-132, -32, 14, 64);
            context.fillRect(-196, -9, 66, 18);
            context.beginPath();
            context.arc(-200, 0, 15, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = field;
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(-110, 0);
            context.quadraticCurveTo(60, -10, 170, -2);
            context.stroke();
        } else if (kind === 'axes') {
            context.fillRect(-180, -9, 330, 18);
            context.beginPath();
            context.moveTo(130, -10);
            context.quadraticCurveTo(200, -80, 215, -70);
            context.quadraticCurveTo(190, 0, 215, 70);
            context.quadraticCurveTo(200, 80, 130, 10);
            context.closePath();
            context.fill();
        }
        context.restore();
    }
}

function skull(context, x, y, { field, ink, accent, crossed = 'bones', backing = 'none', band = null }) {
    // What stands behind it
    context.save();
    context.strokeStyle = accent;
    context.fillStyle = accent;
    if (backing === 'ring') {
        context.lineWidth = 26;
        context.beginPath();
        context.arc(x, y - 6, 196, 0, Math.PI * 2);
        context.stroke();
    } else if (backing === 'cross') {
        context.fillRect(x - 26, y - 220, 52, 440);
        context.fillRect(x - 200, y - 92, 400, 52);
    } else if (backing === 'star') {
        context.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 ? 96 : 226;
            context.lineTo(x + Math.cos(a) * r, y - 10 + Math.sin(a) * r);
        }
        context.closePath();
        context.globalAlpha = 0.85;
        context.fill();
    } else if (backing === 'sun') {
        context.lineWidth = 16;
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            context.beginPath();
            context.moveTo(x + Math.cos(a) * 150, y - 10 + Math.sin(a) * 150);
            context.lineTo(x + Math.cos(a) * (i % 2 ? 196 : 228), y - 10 + Math.sin(a) * (i % 2 ? 196 : 228));
            context.stroke();
        }
    }
    context.restore();
    crossedPair(context, x, y, crossed, ink, field);

    // The skull: a broad crown, cheekbones narrowing to a jaw, hollow eyes, a nose, a row of teeth
    context.fillStyle = ink;
    context.beginPath();
    context.ellipse(x, y - 34, 104, 96, 0, Math.PI * 0.92, Math.PI * 2.08);
    context.quadraticCurveTo(x + 100, y + 40, x + 62, y + 58);
    context.lineTo(x + 58, y + 98);
    context.quadraticCurveTo(x, y + 116, x - 58, y + 98);
    context.lineTo(x - 62, y + 58);
    context.quadraticCurveTo(x - 100, y + 40, x - 104, y - 20);
    context.closePath();
    context.fill();
    if (band) {
        // A band tied across the brow, its knot and tails to one side
        context.fillStyle = band;
        context.beginPath();
        context.ellipse(x, y - 34, 108, 100, 0, Math.PI * 1.05, Math.PI * 1.95);
        context.lineTo(x + 95, y - 52);
        context.quadraticCurveTo(x, y - 84, x - 95, y - 52);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(x + 92, y - 70);
        context.quadraticCurveTo(x + 150, y - 90, x + 168, y - 40);
        context.quadraticCurveTo(x + 140, y - 60, x + 98, y - 50);
        context.fill();
    }
    context.fillStyle = field;
    for (const side of [-1, 1]) {
        context.beginPath();
        context.ellipse(x + side * 40, y + 2, 28, 32, side * -0.25, 0, Math.PI * 2);
        context.fill();
    }
    context.beginPath();
    context.moveTo(x, y + 36);
    context.lineTo(x + 13, y + 60);
    context.lineTo(x - 13, y + 60);
    context.closePath();
    context.fill();
    context.lineWidth = 5;
    context.strokeStyle = field;
    for (let i = -2; i <= 2; i++) {
        context.beginPath();
        context.moveTo(x + i * 17, y + 80);
        context.lineTo(x + i * 17, y + 104);
        context.stroke();
    }
}

function anchor(context, x, y, { accent, waves = true, star = true }) {
    context.lineWidth = 26;
    context.beginPath();
    context.moveTo(x, y - 110);
    context.lineTo(x, y + 140);
    context.stroke();
    context.lineWidth = 18;
    context.beginPath();
    context.arc(x, y - 132, 26, 0, Math.PI * 2);
    context.stroke();
    context.fillRect(x - 86, y - 76, 172, 22);
    context.lineWidth = 24;
    context.beginPath();
    context.arc(x, y + 40, 112, Math.PI * 0.12, Math.PI * 0.88);
    context.stroke();
    for (const side of [-1, 1]) { // The flukes
        context.beginPath();
        context.moveTo(x + side * 100, y + 98);
        context.lineTo(x + side * 140, y + 70);
        context.lineTo(x + side * 122, y + 122);
        context.closePath();
        context.fill();
    }
    context.fillStyle = accent;
    context.strokeStyle = accent;
    if (star) {
        context.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 ? 18 : 44;
            context.lineTo(x + Math.cos(a) * r, y - 200 + Math.sin(a) * r);
        }
        context.closePath();
        context.fill();
    }
    if (waves) {
        context.lineWidth = 12;
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const ox = x + side * (150 + i * 28);
                context.beginPath();
                context.moveTo(ox, y - 60 + i * 50);
                context.quadraticCurveTo(ox + side * 40, y - 30 + i * 50, ox + side * 10, y + 10 + i * 50);
                context.stroke();
            }
        }
    }
}

function lantern(context, cx, cy, { rays = 8 }) {
    context.lineWidth = 10;
    for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + Math.PI / rays;
        context.beginPath();
        context.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
        context.lineTo(cx + Math.cos(a) * (i % 2 ? 175 : 205), cy + Math.sin(a) * (i % 2 ? 175 : 205));
        context.stroke();
    }
    // A ring to hang it by, a cap, a body with a window, a base
    context.lineWidth = 9;
    context.beginPath();
    context.arc(cx, cy - 102, 16, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(cx - 52, cy - 52);
    context.lineTo(cx, cy - 86);
    context.lineTo(cx + 52, cy - 52);
    context.closePath();
    context.fill();
    context.fillRect(cx - 46, cy - 52, 92, 12);
    context.lineWidth = 10;
    context.strokeRect(cx - 40, cy - 40, 80, 100);
    context.beginPath(); // The flame in its window
    context.moveTo(cx, cy - 22);
    context.quadraticCurveTo(cx + 22, cy + 14, cx, cy + 40);
    context.quadraticCurveTo(cx - 22, cy + 14, cx, cy - 22);
    context.fill();
    context.fillRect(cx - 52, cy + 60, 104, 14);
}
