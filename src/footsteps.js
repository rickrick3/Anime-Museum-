// footsteps.js - Footstep sounds made in the browser (no audio files).
//
// Each step follows the three phases of a footfall (after Andy Farnell's procedural
// footsteps): the heel strikes, the weight rolls along the foot, and the toe pushes off.
// On sand, each phase compresses grains: a soft thump, a crunch that swells as the weight
// rolls forward, and a small scuff as the toe kicks sand back. A few variations are
// synthesised once; each step picks one and plays it at a slightly different pitch and time.
// Uphill steps are heavier, downhill steps scuff more, and sliding makes a continuous hiss.
//
// Other grounds follow the same phases with their own materials: on stone the heel clicks and
// the sole taps a moment later; wood knocks hollow; packed earth thuds with a little grit; grass
// swishes. Each step plays on whatever the ground is where the foot lands (step.surface).

const VARIATIONS = 8;
const LOUDNESS = 0.9;

// Simple one-pole filters, run over a Float32Array in place
export function lowpass(data, cutoff, sampleRate) {
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    let y = 0;
    for (let i = 0; i < data.length; i++) {
        y += a * (data[i] - y);
        data[i] = y;
    }
}

export function highpass(data, cutoff, sampleRate) {
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
        low += a * (data[i] - low);
        data[i] -= low;
    }
}

export function normalize(data, peak) {
    let max = 0;
    for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
    if (max > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / max;
}

// Scatter grain clicks into `target`, with density following `density(time)` (0..1)
export function scatterGrains(target, sampleRate, count, from, to, density, loudness = 1) {
    let placed = 0;
    while (placed < count) {
        const time = from + Math.random() * (to - from);
        if (Math.random() > density(time)) continue; // Rejection sampling
        placed++;
        const start = Math.floor(time * sampleRate);
        const size = Math.pow(Math.random(), 3) * loudness; // Mostly tiny grains, a few larger
        const length = Math.floor((0.0005 + Math.random() * 0.002) * sampleRate);
        for (let i = 0; i < length && start + i < target.length; i++) {
            target[start + i] += (Math.random() * 2 - 1) * size * Math.exp((-i / length) * 4);
        }
    }
}

// Force of a footfall over time (0..1): heel strike, roll to the ball, toe push-off
function footForce(t) {
    const heel = Math.exp(-Math.pow((t - 0.03) / 0.025, 2));
    const roll = Math.exp(-Math.pow((t - 0.12) / 0.05, 2)) * 0.8;
    const toe = Math.exp(-Math.pow((t - 0.24) / 0.035, 2)) * 0.9;
    return Math.min(1, heel + roll + toe);
}

// A two-pole resonator (band-pass, RBJ cookbook) run over a Float32Array in place: gives noise a
// pitch, like the hollow of a wooden floor
export function resonate(data, frequency, q, sampleRate) {
    const w = (2 * Math.PI * frequency) / sampleRate;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0;
    const a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - alpha) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < data.length; i++) {
        const x = data[i];
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        data[i] = y;
    }
}

// Add a burst of noise into `target` at `at` seconds: dying away over `decay` seconds, filtered
// between `high` and `low` Hz (0 skips either), at `level`
function addBurst(target, sampleRate, at, { decay, high = 0, low = 0, level = 1, attack = 0.0015 }) {
    const length = Math.min(target.length, Math.floor((decay * 6 + attack) * sampleRate));
    const burst = new Float32Array(length);
    const attackSamples = Math.max(1, attack * sampleRate);
    for (let i = 0; i < length; i++) {
        const envelope = i < attackSamples ? i / attackSamples : Math.exp(-(i - attackSamples) / (decay * sampleRate));
        burst[i] = (Math.random() * 2 - 1) * envelope;
    }
    if (high) highpass(burst, high, sampleRate);
    if (low) lowpass(burst, low, sampleRate);
    normalize(burst, level);
    const start = Math.floor(at * sampleRate);
    for (let i = 0; i < length && start + i < target.length; i++) target[start + i] += burst[i];
}

// Add a short, low knock (a sine that drops a little in pitch) into `target` at `at` seconds
function addKnock(target, sampleRate, at, { frequency, decay, level }) {
    const start = Math.floor(at * sampleRate);
    const length = Math.floor(decay * 6 * sampleRate);
    let phase = 0;
    for (let i = 0; i < length && start + i < target.length; i++) {
        const t = i / sampleRate;
        phase += (2 * Math.PI * frequency * (1 - 0.25 * Math.min(1, t / decay))) / sampleRate;
        const envelope = Math.min(1, i / (0.002 * sampleRate)) * Math.exp(-t / decay);
        target[start + i] += Math.sin(phase) * envelope * level;
    }
}

// Fade the tail so nothing clicks at the end, and set the level
function finishStep(data, sampleRate, peak = 0.9) {
    const fade = Math.floor(0.02 * sampleRate);
    for (let i = 0; i < fade; i++) data[data.length - 1 - i] *= i / fade;
    normalize(data, peak);
    return data;
}

// A shoe on polished stone: the heel clicks over a short, dull knock; a moment later the sole taps,
// softer. (The room's reverb, if any, makes the hall around it.)
function synthesizeStoneStep(sampleRate) {
    const data = new Float32Array(Math.floor(sampleRate * 0.3));
    const heel = 0.004;
    addBurst(data, sampleRate, heel, { decay: 0.0035, high: 1500, low: 9000, level: 1 });
    addKnock(data, sampleRate, heel, { frequency: 130 + Math.random() * 50, decay: 0.022, level: 0.55 });
    const sole = heel + 0.075 + Math.random() * 0.035;
    addBurst(data, sampleRate, sole, { decay: 0.006, high: 700, low: 5000, level: 0.4 });
    addKnock(data, sampleRate, sole, { frequency: 105 + Math.random() * 30, decay: 0.018, level: 0.25 });
    return finishStep(data, sampleRate);
}

// Boards underfoot: a hollow knock that rings a little, then the sole
function synthesizeWoodStep(sampleRate) {
    const length = Math.floor(sampleRate * 0.35);
    const data = new Float32Array(length);
    const body = new Float32Array(length);
    addBurst(body, sampleRate, 0.004, { decay: 0.012, level: 1 });
    resonate(body, 190 + Math.random() * 60, 6, sampleRate);
    normalize(body, 0.9);
    const ring = new Float32Array(length);
    addBurst(ring, sampleRate, 0.004, { decay: 0.008, level: 1 });
    resonate(ring, 520 + Math.random() * 120, 9, sampleRate);
    normalize(ring, 0.35);
    for (let i = 0; i < length; i++) data[i] = body[i] + ring[i];
    addBurst(data, sampleRate, 0.004, { decay: 0.003, high: 1200, low: 6000, level: 0.35 });
    addBurst(data, sampleRate, 0.09 + Math.random() * 0.03, { decay: 0.01, high: 300, low: 2500, level: 0.3 });
    return finishStep(data, sampleRate);
}

// Packed earth: a soft thud and a little grit under the roll of the foot
function synthesizeEarthStep(sampleRate) {
    const length = Math.floor(sampleRate * 0.36);
    const data = new Float32Array(length);
    addBurst(data, sampleRate, 0.006, { decay: 0.035, low: 180, level: 0.8, attack: 0.008 });
    const grit = new Float32Array(length);
    scatterGrains(grit, sampleRate, 110 + Math.floor(Math.random() * 60), 0.01, 0.28, footForce, 0.8);
    highpass(grit, 350, sampleRate);
    lowpass(grit, 2600, sampleRate);
    normalize(grit, 0.45);
    for (let i = 0; i < length; i++) data[i] += grit[i];
    return finishStep(data, sampleRate);
}

// Grass: a muffled thud under a soft swish of blades
function synthesizeGrassStep(sampleRate) {
    const length = Math.floor(sampleRate * 0.4);
    const data = new Float32Array(length);
    addBurst(data, sampleRate, 0.008, { decay: 0.03, low: 160, level: 0.55, attack: 0.01 });
    const swish = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        swish[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.3)) ** 2;
    }
    highpass(swish, 1400, sampleRate);
    lowpass(swish, 6000, sampleRate);
    normalize(swish, 0.35);
    scatterGrains(swish, sampleRate, 70, 0.02, 0.3, footForce, 0.5);
    for (let i = 0; i < length; i++) data[i] += swish[i];
    return finishStep(data, sampleRate);
}

// How each ground sounds beyond its samples: how loud, and how bright from a walk to hurrying (Hz)
const SURFACES = {
    sand: { loudness: 1, brightness: [2500, 6000] },
    water: { loudness: 1, brightness: [2500, 6000] },
    stone: { loudness: 0.62, brightness: [7000, 11000] },
    wood: { loudness: 0.75, brightness: [4000, 8000] },
    earth: { loudness: 0.85, brightness: [2200, 5000] },
    grass: { loudness: 0.7, brightness: [3000, 6500] }
};

function synthesizeSandStep(sampleRate) {
    const length = Math.floor(sampleRate * 0.42);
    const heel = new Float32Array(length);
    const crunch = new Float32Array(length);
    const scuff = new Float32Array(length);

    // 1. Heel: low, soft thud with a gentle attack
    const heelAttack = 0.012 * sampleRate;
    const heelDecay = 0.045 * sampleRate;
    for (let i = 0; i < length; i++) {
        const envelope = i < heelAttack ? i / heelAttack : Math.exp(-(i - heelAttack) / heelDecay);
        heel[i] = (Math.random() * 2 - 1) * envelope;
    }
    lowpass(heel, 150, sampleRate);
    lowpass(heel, 220, sampleRate);
    normalize(heel, 1);

    // 2. Crunch: grains compressing under the foot, following the force of the footfall
    scatterGrains(crunch, sampleRate, 300 + Math.floor(Math.random() * 150), 0.01, 0.32, footForce);
    highpass(crunch, 500, sampleRate);
    lowpass(crunch, 4500, sampleRate);
    normalize(crunch, 1);

    // 3. Toe-off: a short scuff of sand pushed backwards
    const scuffStart = 0.21 + Math.random() * 0.03;
    for (let i = Math.floor(scuffStart * sampleRate); i < length; i++) {
        const t = i / sampleRate - scuffStart;
        const envelope = Math.min(1, t / 0.02) * Math.exp(-t / 0.05);
        scuff[i] = (Math.random() * 2 - 1) * envelope;
    }
    highpass(scuff, 900, sampleRate);
    lowpass(scuff, 3500, sampleRate);
    normalize(scuff, 1);

    const step = new Float32Array(length);
    for (let i = 0; i < length; i++) step[i] = heel[i] * 0.5 + crunch[i] * 0.38 + scuff[i] * 0.16;

    // Fade the tail so nothing clicks at the end
    const fade = Math.floor(0.03 * sampleRate);
    for (let i = 0; i < fade; i++) step[length - 1 - i] *= i / fade;
    normalize(step, 0.9);
    return step;
}

// A step in shallow water: a soft slosh with a few bubbly drips
function synthesizeWaterStep(sampleRate) {
    const length = Math.floor(sampleRate * 0.5);
    const slosh = new Float32Array(length);
    const attack = 0.03 * sampleRate;
    const decay = 0.12 * sampleRate;
    for (let i = 0; i < length; i++) {
        const envelope = i < attack ? i / attack : Math.exp(-(i - attack) / decay);
        slosh[i] = (Math.random() * 2 - 1) * envelope;
    }
    highpass(slosh, 200, sampleRate);
    lowpass(slosh, 1400, sampleRate);
    normalize(slosh, 0.7);

    const drips = 3 + Math.floor(Math.random() * 4);
    for (let d = 0; d < drips; d++) {
        const start = Math.floor((0.05 + Math.random() * 0.3) * sampleRate);
        const frequency = 600 + Math.random() * 900;
        const dripLength = Math.floor(0.03 * sampleRate);
        for (let i = 0; i < dripLength && start + i < length; i++) {
            const t = i / sampleRate;
            slosh[start + i] += Math.sin(2 * Math.PI * frequency * t * (1 + t * 8)) *
                Math.exp(-i / (dripLength / 4)) * 0.25;
        }
    }
    normalize(slosh, 0.9);
    return slosh;
}

// Two seconds of sand pouring and hissing, to loop while sliding
function synthesizeSlide(sampleRate) {
    const length = sampleRate * 2;
    const hiss = new Float32Array(length);
    for (let i = 0; i < length; i++) hiss[i] = Math.random() * 2 - 1;
    highpass(hiss, 400, sampleRate);
    lowpass(hiss, 3000, sampleRate);
    normalize(hiss, 0.4);
    // Grains tumbling over each other, at an uneven rate
    const grains = new Float32Array(length);
    scatterGrains(grains, sampleRate, 2500, 0, 2, t => 0.6 + 0.4 * Math.sin(t * 9) * Math.sin(t * 2.3));
    highpass(grains, 700, sampleRate);
    normalize(grains, 0.6);
    const loop = new Float32Array(length);
    for (let i = 0; i < length; i++) loop[i] = hiss[i] + grains[i];
    // Crossfade the ends so the loop is seamless
    const fade = Math.floor(0.1 * sampleRate);
    for (let i = 0; i < fade; i++) {
        const t = i / fade;
        loop[i] = loop[i] * t + loop[length - fade + i] * (1 - t);
    }
    return loop.subarray(0, length - fade);
}

export class Footsteps {
    // audio: the AmbientAudio instance (footsteps play once its context has started)
    constructor(audio) {
        this.audio = audio;
        this.sounds = null;
        this.lastIndex = -1;
        this.slideGain = null;
    }

    get context() {
        return this.audio.context;
    }

    // Synthesise the variations the first time they're needed
    getSounds() {
        if (!this.sounds) {
            const context = this.context;
            const toBuffer = data => {
                const buffer = context.createBuffer(1, data.length, context.sampleRate);
                buffer.copyToChannel(data, 0);
                return buffer;
            };
            const rate = context.sampleRate;
            this.sounds = {
                sand: Array.from({ length: VARIATIONS }, () => toBuffer(synthesizeSandStep(rate))),
                water: Array.from({ length: 4 }, () => toBuffer(synthesizeWaterStep(rate))),
                slide: toBuffer(synthesizeSlide(rate))
            };
            // The other grounds are only made once someone walks on them
            this.makers = {
                stone: () => toBuffer(synthesizeStoneStep(rate)),
                wood: () => toBuffer(synthesizeWoodStep(rate)),
                earth: () => toBuffer(synthesizeEarthStep(rate)),
                grass: () => toBuffer(synthesizeGrassStep(rate))
            };
        }
        return this.sounds;
    }

    // The variations for a ground ('sand', 'stone', ...); a ground without its own sounds like sand
    surfaceSounds(surface) {
        const sounds = this.getSounds();
        if (!sounds[surface] && this.makers[surface]) {
            sounds[surface] = Array.from({ length: 6 }, this.makers[surface]);
        }
        return sounds[surface] ?? sounds.sand;
    }

    // Pick a variation, never the same one twice in a row
    pick(buffers) {
        let index = Math.floor(Math.random() * buffers.length);
        if (index === this.lastIndex) index = (index + 1) % buffers.length;
        this.lastIndex = index;
        return buffers[index];
    }

    play(buffer, { volume, rate = 1, pan = 0, brightness = 6000, delay = 0 }) {
        const context = this.context;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;

        const tone = context.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = brightness;

        const gain = context.createGain();
        gain.gain.value = volume * LOUDNESS;

        const panner = context.createStereoPanner();
        panner.pan.value = pan;

        source.connect(tone).connect(gain).connect(panner).connect(this.audio.effectsInput);
        source.start(context.currentTime + 0.01 + delay);
    }

    // step: { surface, intensity (0..1 pace), foot (±1), effort (0..1), downhill (slope) }
    step({ surface, intensity, foot = 1, effort = 0, downhill = 0 }) {
        if (!this.audio.started || intensity <= 0.05) return;

        const sounds = this.getSounds();
        const vary = spread => 1 + (Math.random() - 0.5) * spread;
        const pace = Math.min(1.7, intensity);
        const ground = SURFACES[surface] ?? SURFACES.sand;
        const [dull, bright] = ground.brightness;

        this.play(this.pick(this.surfaceSounds(surface)), {
            // Heavier when climbing, softer when strolling
            volume: (0.35 + 0.55 * Math.min(1, pace) + 0.3 * effort) * ground.loudness * vary(0.3),
            // Quicker steps are shorter and a touch higher; hard climbing steps are lower
            rate: (0.94 + 0.08 * pace - 0.1 * effort) * vary(0.1),
            pan: foot * 0.08,
            brightness: dull + (bright - dull) * Math.min(1, pace),
            delay: Math.random() * 0.02 // Human timing, not a metronome
        });

        // Going down a dune, the foot skids: an extra scuff of sliding sand
        if (surface === 'sand' && downhill > 0.2) {
            this.play(this.pick(sounds.sand), {
                volume: Math.min(0.5, downhill) * 0.6,
                rate: 1.25 * vary(0.1),
                pan: foot * 0.08,
                brightness: 3000,
                delay: 0.05 + Math.random() * 0.03
            });
        }
    }

    // strength: 0..1 how hard the landing was: both feet, a little apart, heavier and lower
    // surface: what the ground is there (sand unless said otherwise)
    land(strength, surface = 'sand') {
        if (!this.audio.started) return;
        const sounds = this.surfaceSounds(surface === 'water' ? 'sand' : surface);
        const volume = (0.6 + 0.5 * strength) * (SURFACES[surface] ?? SURFACES.sand).loudness;
        this.play(this.pick(sounds), { volume, rate: 0.82, pan: -0.08 });
        this.play(this.pick(sounds), { volume: volume * 0.8, rate: 0.86, pan: 0.08, delay: 0.035 });
    }

    // Continuous hiss of sand while sliding; speed in m/s (0 = silent)
    slide(speed) {
        if (!this.audio.started) return;
        const context = this.context;

        if (!this.slideGain) {
            const source = context.createBufferSource();
            source.buffer = this.getSounds().slide;
            source.loop = true;
            this.slideFilter = context.createBiquadFilter();
            this.slideFilter.type = 'bandpass';
            this.slideFilter.Q.value = 0.7;
            this.slideGain = context.createGain();
            this.slideGain.gain.value = 0;
            source.connect(this.slideFilter).connect(this.slideGain).connect(this.audio.effectsInput);
            source.start();
        }

        const amount = Math.min(1, Math.max(0, (speed - 0.5) / 4));
        const now = context.currentTime;
        this.slideGain.gain.setTargetAtTime(amount * 0.8 * LOUDNESS, now, 0.08);
        this.slideFilter.frequency.setTargetAtTime(900 + amount * 1800, now, 0.1);
    }
}
