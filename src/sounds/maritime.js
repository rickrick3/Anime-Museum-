// maritime.js - The sound of the sea, made in the browser (no recordings, nothing copyrighted):
//
//   ambiences  'harbor-dusk'   waves breathing against the quay, water lapping, gulls, rigging
//                              creaking, a bell buoy far out, the wind
//              'chart-room'    the sea heard through a hull: muffled swell, timbers settling
//              'held-storm'    a storm held still: a low drone, the hiss of rain that never lands,
//                              a held chord, thunder that swells and never breaks
//              'storm-harbor'  the same storm let go: rain, wind in gusts, waves, thunder
//   cues       'creak'         timber or a hinge giving
//              'bell'          a great bronze bell, struck once
//              'thunder'       a crack and a long roll
//
// Registered with the soundscape when this module is imported (see src/soundscape.js).
import { registerAmbience, registerCue, noiseBuffer, reverbBuffer, loopNoise, wobble, ring, every, BELL, CHIME } from '../soundscape.js';

function room(context, output, seconds, level) {
    const space = context.createConvolver();
    space.buffer = reverbBuffer(context, seconds);
    const gain = context.createGain();
    gain.gain.value = level;
    space.connect(gain).connect(output);
    return space;
}

// A short burst of filtered noise with its own envelope (a wave slapping, a gust, a drop)
function burst(context, output, { type = 'lowpass', frequency = 500, q = 0.7, attack = 0.04, decay = 0.4, level = 0.05, when = 0, pan = 0, colour = 'pink', sweep = null }) {
    const start = context.currentTime + when;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, 4, colour);
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, start + attack + decay);
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(output);
    source.start(start, Math.random() * 3);
    source.stop(start + attack + decay + 0.05);
}

// A gull: a few falling cries
function gull(context, output) {
    const pan = Math.random() * 1.6 - 0.8;
    const cries = 2 + Math.floor(Math.random() * 3);
    const pitch = 1500 + Math.random() * 500;
    for (let i = 0; i < cries; i++) {
        const start = context.currentTime + i * (0.28 + Math.random() * 0.12);
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(pitch * 1.25, start);
        oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.72, start + 0.24);
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = pitch * 1.3;
        filter.Q.value = 3;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.012, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
        const panner = context.createStereoPanner();
        panner.pan.value = pan;
        oscillator.connect(filter).connect(gain).connect(panner).connect(output);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
    }
}

// Timber under strain: a sawtooth's buzz through a resonance, sliding as it gives
function creak(context, output, { level = 0.04, when = 0, pan = 0, pitch = 45 } = {}) {
    const start = context.currentTime + when;
    const length = 0.35 + Math.random() * 0.4;
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(pitch, start);
    oscillator.frequency.linearRampToValueAtTime(pitch * (1.2 + Math.random() * 0.4), start + length);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600 + Math.random() * 500;
    filter.Q.value = 7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.06);
    gain.gain.setValueAtTime(level * 0.8, start + length * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    oscillator.connect(filter).connect(gain).connect(panner).connect(output);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
}

function thunder(context, output, volume = 1, distance = 1) {
    // The crack, then the long roll, darker the further off
    burst(context, output, { type: 'highpass', frequency: 1800, attack: 0.005, decay: 0.25, level: 0.12 * volume / distance, colour: 'white' });
    burst(context, output, { type: 'lowpass', frequency: 420 / distance, sweep: 90, attack: 0.08, decay: 4.5, level: 0.22 * volume, when: 0.05 });
    burst(context, output, { type: 'lowpass', frequency: 160, attack: 0.6, decay: 3.5, level: 0.16 * volume, when: 0.6, pan: -0.3 });
    burst(context, output, { type: 'lowpass', frequency: 220, attack: 0.3, decay: 2.5, level: 0.1 * volume, when: 1.6, pan: 0.4 });
}

registerAmbience('harbor-dusk', (context, output) => {
    const space = room(context, output, 2.4, 0.35);
    const nodes = [];
    const wash = loopNoise(context, output, { type: 'lowpass', frequency: 480, gain: 0.07 });
    const foam = loopNoise(context, output, { colour: 'white', type: 'bandpass', frequency: 1400, q: 0.5, gain: 0.012 });
    const wind = loopNoise(context, output, { type: 'bandpass', frequency: 320, q: 0.6, gain: 0.025 });
    nodes.push(wash.source, foam.source, wind.source);
    nodes.push(wobble(context, wash.level.gain, 0.11, 0.04), wobble(context, foam.level.gain, 0.09, 0.008), wobble(context, wind.level.gain, 0.05, 0.012));
    const lap = every(1.2, 3.5, () => burst(context, output, { frequency: 300 + Math.random() * 300, attack: 0.05, decay: 0.35 + Math.random() * 0.3, level: 0.03, pan: Math.random() - 0.5 }));
    const gulls = every(6, 15, () => gull(context, space));
    const rigging = every(4, 11, () => creak(context, space, { level: 0.018, pan: Math.random() * 1.2 - 0.6, pitch: 38 + Math.random() * 20 }));
    const buoy = every(16, 32, () => ring(context, space, { frequency: 392, partials: BELL, level: 0.012, decay: 5, pan: 0.5 }));
    return {
        update(delta) {
            lap(delta);
            gulls(delta);
            rigging(delta);
            buoy(delta);
        },
        stop() { nodes.forEach(node => node.stop()); }
    };
});

registerAmbience('chart-room', (context, output) => {
    const space = room(context, output, 3.2, 0.45);
    const nodes = [];
    const sea = loopNoise(context, output, { type: 'lowpass', frequency: 240, gain: 0.07 });
    nodes.push(sea.source, wobble(context, sea.level.gain, 0.1, 0.045));
    const tone = context.createOscillator();
    tone.frequency.value = 58;
    const toneLevel = context.createGain();
    toneLevel.gain.value = 0.012;
    tone.connect(toneLevel).connect(output);
    tone.start();
    nodes.push(tone);
    const timbers = every(5, 13, () => creak(context, space, { level: 0.014, pan: Math.random() * 1.4 - 0.7, pitch: 30 + Math.random() * 14 }));
    const chime = every(20, 40, () => ring(context, space, { frequency: [659.25, 783.99, 987.77][Math.floor(Math.random() * 3)], partials: CHIME, level: 0.006, decay: 3.5, pan: Math.random() - 0.5 }));
    return {
        update(delta) {
            timbers(delta);
            chime(delta);
        },
        stop() { nodes.forEach(node => node.stop()); }
    };
});

registerAmbience('held-storm', (context, output) => {
    const space = room(context, output, 5, 0.6);
    const nodes = [];
    // A low drone, two notes beating slowly against each other
    for (const [frequency, amount] of [[46, 0.05], [48.6, 0.04], [92.5, 0.012]]) {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        const gain = context.createGain();
        gain.gain.value = amount;
        oscillator.connect(gain).connect(output);
        oscillator.start();
        nodes.push(oscillator, wobble(context, gain.gain, 0.04 + Math.random() * 0.03, amount * 0.4));
    }
    // The rain that never lands: a fine, high, unmoving hiss
    const hiss = loopNoise(context, output, { colour: 'white', type: 'bandpass', frequency: 6500, q: 1.6, gain: 0.008 });
    nodes.push(hiss.source, wobble(context, hiss.level.gain, 0.03, 0.003));
    // A held chord, far off
    [196, 233.08, 293.66, 349.23].forEach(frequency => {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        const gain = context.createGain();
        gain.gain.value = 0.004;
        oscillator.connect(gain).connect(space);
        oscillator.start();
        nodes.push(oscillator, wobble(context, gain.gain, 0.02 + Math.random() * 0.04, 0.0035));
    });
    // Thunder that swells and never breaks
    const swell = every(11, 22, () => burst(context, space, { type: 'lowpass', frequency: 110, attack: 3.5, decay: 4, level: 0.06, pan: Math.random() - 0.5 }));
    return {
        update: swell,
        stop() { nodes.forEach(node => node.stop()); }
    };
});

registerAmbience('storm-harbor', (context, output) => {
    const space = room(context, output, 2.5, 0.3);
    const nodes = [];
    const rain = loopNoise(context, output, { colour: 'white', type: 'highpass', frequency: 1600, q: 0.5, gain: 0.035 });
    const drum = loopNoise(context, output, { type: 'lowpass', frequency: 260, gain: 0.05 });
    const wind = loopNoise(context, output, { type: 'bandpass', frequency: 480, q: 0.8, gain: 0.04 });
    nodes.push(rain.source, drum.source, wind.source);
    nodes.push(wobble(context, wind.level.gain, 0.08, 0.03), wobble(context, wind.filter.frequency, 0.06, 180), wobble(context, drum.level.gain, 0.12, 0.03));
    const waves = every(1.5, 4, () => burst(context, output, { frequency: 380, attack: 0.3, decay: 1.4, level: 0.05, pan: Math.random() - 0.5 }));
    const rolls = every(14, 30, () => thunder(context, space, 0.6, 1.8));
    return {
        update(delta) {
            waves(delta);
            rolls(delta);
        },
        stop() { nodes.forEach(node => node.stop()); }
    };
});

registerCue('creak', (context, output, volume) => {
    creak(context, output, { level: 0.07 * volume, pitch: 40 + Math.random() * 15 });
    if (Math.random() < 0.6) creak(context, output, { level: 0.04 * volume, when: 0.3 + Math.random() * 0.3, pitch: 50 + Math.random() * 20 });
});

registerCue('thunder', (context, output, volume) => thunder(context, output, volume));

// A great bronze bell struck once: a deep strike, its hum, and the long ring after
registerCue('bell', (context, output, volume) => {
    ring(context, output, { frequency: 146.8, partials: BELL, level: 0.07 * volume, decay: 7 });
    ring(context, output, { frequency: 293.6, partials: BELL, level: 0.02 * volume, decay: 4, when: 0.01 });
});
