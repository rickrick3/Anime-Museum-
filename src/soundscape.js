// soundscape.js - The sound of the places: each world's ambience, the sound of another world leaking
// through its doorway as you approach, and the small sounds of exhibits answering you.
//
//   museum ambience ─┐
//   world ambience ──┼─ crossfade ─▶ ambience bus ─▶ AmbientAudio.masterGain
//   doorway leaks ───┘ (positional)
//   cues (exhibits, doorways) ─────────────▶ AmbientAudio.effectsInput (with the room's echo)
//
// Ambience is a list of layers: { preset: 'museum-hall' | 'forest-dusk' | ..., volume } made in the
// browser (no files, nothing copyrighted), or { url, volume } for a recording added later (fetched,
// decoded, looped). New presets: registerAmbience(name, factory) (the sea's are in src/sounds/).
// Cues: cue(name, { position, volume }).
// Nothing plays until the AmbientAudio has started (it needs a click); what was asked for before
// that starts then.
import { lowpass, highpass, normalize, scatterGrains } from './footsteps.js';

const FADE = 2.2; // Seconds a world's ambience takes to cross into the next
const HEARING = 12; // Metres at which a positional cue has faded away

// ---- Shared building blocks -----------------------------------------------------------------

const buffers = new WeakMap(); // context -> { name: AudioBuffer }

function cached(context, name, make) {
    if (!buffers.has(context)) buffers.set(context, {});
    const store = buffers.get(context);
    store[name] ??= make();
    return store[name];
}

function bufferFrom(context, channels) {
    const buffer = context.createBuffer(channels.length, channels[0].length, context.sampleRate);
    channels.forEach((data, i) => buffer.copyToChannel(data, i));
    return buffer;
}

function noiseBuffer(context, seconds = 4, colour = 'pink') {
    return cached(context, `noise-${colour}-${seconds}`, () => {
        const length = Math.floor(seconds * context.sampleRate);
        const channels = [new Float32Array(length), new Float32Array(length)];
        for (const data of channels) {
            // Pink-ish noise (Paul Kellet's economy filter)
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < length; i++) {
                const white = Math.random() * 2 - 1;
                if (colour === 'white') {
                    data[i] = white * 0.5;
                    continue;
                }
                b0 = 0.99765 * b0 + white * 0.099046;
                b1 = 0.963 * b1 + white * 0.2965164;
                b2 = 0.57 * b2 + white * 1.0526913;
                data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
            }
            // Crossfade the ends so it loops without a seam
            const fade = Math.floor(0.05 * context.sampleRate);
            for (let i = 0; i < fade; i++) {
                const t = i / fade;
                data[i] = data[i] * t + data[length - fade + i] * (1 - t);
            }
        }
        return bufferFrom(context, channels.map(data => data.subarray(0, length - Math.floor(0.05 * context.sampleRate))));
    });
}

function reverbBuffer(context, seconds) {
    return cached(context, `reverb-${seconds}`, () => {
        const length = Math.floor(seconds * context.sampleRate);
        const channels = [new Float32Array(length), new Float32Array(length)];
        for (const data of channels) {
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
        return bufferFrom(context, channels);
    });
}

function loopNoise(context, output, { colour = 'pink', type = 'lowpass', frequency = 800, q = 0.7, gain = 0.05 }) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, 4, colour);
    source.loop = true;
    source.loopStart = Math.random() * 2; // Two layers of the same noise never line up
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const level = context.createGain();
    level.gain.value = gain;
    source.connect(filter).connect(level).connect(output);
    source.start(0, source.loopStart);
    return { source, filter, level };
}

// A slow wobble on an AudioParam: around its value, by depth, at rate Hz
function wobble(context, param, rate, depth) {
    const lfo = context.createOscillator();
    lfo.frequency.value = rate;
    lfo.type = 'sine';
    const amount = context.createGain();
    amount.gain.value = depth;
    lfo.connect(amount).connect(param);
    lfo.start();
    return lfo;
}

// A struck bell or chime: partials that ring and die away at different speeds
function ring(context, output, { frequency, partials = [[1, 1, 1]], level = 0.05, decay = 2.5, when = 0, pan = 0 }) {
    const start = context.currentTime + when;
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(output);
    for (const [ratio, amplitude, length] of partials) {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency * ratio;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level * amplitude, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + decay * length);
        oscillator.connect(gain).connect(panner);
        oscillator.start(start);
        oscillator.stop(start + decay * length + 0.05);
    }
}

const CHIME = [[1, 1, 1], [2.76, 0.4, 0.55], [5.4, 0.18, 0.3]];
const BELL = [[1, 1, 1], [2.0, 0.5, 0.8], [2.76, 0.35, 0.6], [4.07, 0.2, 0.4], [0.5, 0.4, 1.2]];

// Calls `play` every `min`..`max` seconds while the preset lives (driven by the soundscape's update)
function every(min, max, play) {
    let wait = min + Math.random() * (max - min);
    return delta => {
        wait -= delta;
        if (wait > 0) return;
        wait = min + Math.random() * (max - min);
        play();
    };
}

// ---- Ambience presets -----------------------------------------------------------------------
// Each is (context, output) => { stop(), update?(delta) }, playing into `output`.

const AMBIENCE = {
    // The museum's halls: a deep, still room tone, a slow chord breathing far off, now and then a
    // faint glint of sound high up in the dome
    'museum-hall'(context, output) {
        const nodes = [];
        const space = context.createConvolver();
        space.buffer = reverbBuffer(context, 5);
        const spaceLevel = context.createGain();
        spaceLevel.gain.value = 0.6;
        space.connect(spaceLevel).connect(output);

        const drone = context.createBiquadFilter();
        drone.type = 'lowpass';
        drone.frequency.value = 280;
        const droneLevel = context.createGain();
        droneLevel.gain.value = 0.05;
        drone.connect(droneLevel).connect(output);
        [[55, 'sine', 1], [82.6, 'sine', 0.7], [110.3, 'triangle', 0.25]].forEach(([frequency, type, amount]) => {
            const oscillator = context.createOscillator();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            const gain = context.createGain();
            gain.gain.value = amount;
            oscillator.connect(gain).connect(drone);
            oscillator.start();
            nodes.push(oscillator, wobble(context, gain.gain, 0.05 + Math.random() * 0.04, amount * 0.3));
        });

        // A minor chord with an added ninth, each note swelling on its own slow breath
        [220, 329.63, 493.88, 523.25].forEach(frequency => {
            const oscillator = context.createOscillator();
            oscillator.frequency.value = frequency;
            const gain = context.createGain();
            gain.gain.value = 0.006;
            oscillator.connect(gain);
            gain.connect(space);
            gain.connect(output);
            oscillator.start();
            nodes.push(oscillator, wobble(context, gain.gain, 0.03 + Math.random() * 0.05, 0.0055));
        });

        const air = loopNoise(context, output, { type: 'bandpass', frequency: 420, q: 0.5, gain: 0.018 });
        nodes.push(air.source, wobble(context, air.level.gain, 0.04, 0.006));

        const glint = every(9, 20, () => ring(context, space, {
            frequency: [1318.5, 1567.98, 1760, 1975.5][Math.floor(Math.random() * 4)],
            partials: CHIME, level: 0.012, decay: 3.5, pan: Math.random() * 1.2 - 0.6
        }));
        return {
            update: glint,
            stop() {
                nodes.forEach(node => node.stop());
            }
        };
    },

    // A forest valley at dusk: wind moving through the trees in slow gusts, the leaves hissing with
    // it, crickets on both sides, a wind chime somewhere in the village, a temple bell far off
    'forest-dusk'(context, output) {
        const nodes = [];
        const space = context.createConvolver();
        space.buffer = reverbBuffer(context, 3);
        const spaceLevel = context.createGain();
        spaceLevel.gain.value = 0.5;
        space.connect(spaceLevel).connect(output);

        const wind = loopNoise(context, output, { type: 'bandpass', frequency: 380, q: 0.6, gain: 0.07 });
        const leaves = loopNoise(context, output, { colour: 'white', type: 'highpass', frequency: 2600, q: 0.4, gain: 0.012 });
        nodes.push(wind.source, leaves.source);
        nodes.push(wobble(context, wind.level.gain, 0.06, 0.035), wobble(context, wind.filter.frequency, 0.045, 120));
        nodes.push(wobble(context, leaves.level.gain, 0.06, 0.008));

        // Crickets: a few seconds of chirping, looped, one for each side
        const crickets = side => cached(context, `crickets-${side}`, () => {
            const rate = context.sampleRate;
            const data = new Float32Array(Math.floor(rate * (5 + side)));
            let t = Math.random() * 0.3;
            while (t < data.length / rate - 0.3) {
                const pitch = 4300 + Math.random() * 500;
                const pulses = 3 + Math.floor(Math.random() * 3);
                for (let p = 0; p < pulses; p++) {
                    const start = Math.floor((t + p * 0.032) * rate);
                    const length = Math.floor(0.016 * rate);
                    for (let i = 0; i < length && start + i < data.length; i++) {
                        const envelope = Math.sin((Math.PI * i) / length);
                        data[start + i] += Math.sin((2 * Math.PI * pitch * i) / rate) * envelope * 0.5;
                    }
                }
                t += 0.25 + Math.random() * 0.9;
            }
            const fade = Math.floor(0.05 * rate);
            for (let i = 0; i < fade; i++) data[data.length - 1 - i] *= i / fade;
            return bufferFrom(context, [data]);
        });
        [-0.7, 0.6].forEach((pan, side) => {
            const source = context.createBufferSource();
            source.buffer = crickets(side);
            source.loop = true;
            const panner = context.createStereoPanner();
            panner.pan.value = pan;
            const gain = context.createGain();
            gain.gain.value = 0.012;
            source.connect(gain).connect(panner).connect(output);
            gain.connect(space);
            source.start(context.currentTime + Math.random());
            nodes.push(source);
        });

        const notes = [587.33, 659.25, 783.99, 880, 987.77, 1174.66];
        const chimes = every(7, 18, () => {
            const count = 2 + Math.floor(Math.random() * 3);
            const pan = Math.random() * 1.4 - 0.7;
            for (let i = 0; i < count; i++) {
                ring(context, space, {
                    frequency: notes[Math.floor(Math.random() * notes.length)], partials: CHIME,
                    level: 0.016, decay: 2.6, when: i * (0.18 + Math.random() * 0.3), pan
                });
            }
        });
        const bell = every(28, 50, () => ring(context, space, {
            frequency: 98, partials: BELL, level: 0.035, decay: 7, pan: -0.2 + Math.random() * 0.4
        }));
        return {
            update(delta) {
                chimes(delta);
                bell(delta);
            },
            stop() {
                nodes.forEach(node => node.stop());
            }
        };
    }
};

export function registerAmbience(name, factory) {
    AMBIENCE[name] = factory;
}

// A recording (added later, properly licensed): fetched once, looped
function recording(url) {
    return (context, output) => {
        let source = null;
        let stopped = false;
        cachedRecording(context, url).then(buffer => {
            if (stopped || !buffer) return;
            source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(output);
            source.start();
        });
        return { stop() { stopped = true; source?.stop(); } };
    };
}

const recordings = new Map();
function cachedRecording(context, url) {
    if (!recordings.has(url)) {
        recordings.set(url, fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.arrayBuffer();
            })
            .then(data => context.decodeAudioData(data))
            .catch(error => {
                console.warn(`Ambience "${url}" could not be loaded`, error);
                return null;
            }));
    }
    return recordings.get(url);
}

// ---- Cues -----------------------------------------------------------------------------------
// Each is (context, output, volume) => void: a one-shot sound into `output`

const CUES = {
    // Stepping through a doorway: a rising rush of air and a low swell
    portal(context, output, volume) {
        const now = context.currentTime;
        const source = context.createBufferSource();
        source.buffer = noiseBuffer(context, 4, 'white');
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 0.9;
        filter.frequency.setValueAtTime(180, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 1.1);
        filter.frequency.exponentialRampToValueAtTime(500, now + 2.4);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22 * volume, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
        source.connect(filter).connect(gain).connect(output);
        source.start(now);
        source.stop(now + 2.7);
        const swell = context.createOscillator();
        swell.frequency.setValueAtTime(55, now);
        swell.frequency.exponentialRampToValueAtTime(110, now + 1.2);
        const swellGain = context.createGain();
        swellGain.gain.setValueAtTime(0, now);
        swellGain.gain.linearRampToValueAtTime(0.12 * volume, now + 0.8);
        swellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        swell.connect(swellGain).connect(output);
        swell.start(now);
        swell.stop(now + 2.5);
    },
    // A soft chime: something answers
    chime(context, output, volume) {
        ring(context, output, { frequency: 1046.5, partials: CHIME, level: 0.06 * volume, decay: 2.4 });
        ring(context, output, { frequency: 1567.98, partials: CHIME, level: 0.03 * volume, decay: 2.2, when: 0.12 });
    },
    // A blade drawn and ringing
    metal(context, output, volume) {
        const now = context.currentTime;
        const data = new Float32Array(Math.floor(context.sampleRate * 0.5));
        scatterGrains(data, context.sampleRate, 400, 0, 0.45, t => Math.sin(Math.PI * t / 0.45));
        highpass(data, 3000, context.sampleRate);
        normalize(data, 0.5);
        const source = context.createBufferSource();
        source.buffer = bufferFrom(context, [data]);
        const gain = context.createGain();
        gain.gain.value = 0.12 * volume;
        source.connect(gain).connect(output);
        source.start(now);
        ring(context, output, { frequency: 2093, partials: [[1, 1, 1], [1.62, 0.6, 0.8], [2.83, 0.4, 0.5], [4.1, 0.25, 0.3]], level: 0.035 * volume, decay: 3, when: 0.35 });
    },
    // Paper unrolling: a crackle that runs along
    paper(context, output, volume) {
        const rate = context.sampleRate;
        const data = new Float32Array(Math.floor(rate * 1.2));
        scatterGrains(data, rate, 900, 0, 1.1, t => 0.3 + 0.7 * Math.sin(Math.PI * t / 1.1));
        highpass(data, 1800, rate);
        lowpass(data, 7000, rate);
        normalize(data, 0.6);
        const source = context.createBufferSource();
        source.buffer = bufferFrom(context, [data]);
        const gain = context.createGain();
        gain.gain.value = 0.16 * volume;
        source.connect(gain).connect(output);
        source.start();
    },
    // A deep hum rising, with a bell's overtone over it
    resonance(context, output, volume) {
        const now = context.currentTime;
        [110, 164.8, 220].forEach((frequency, i) => {
            const oscillator = context.createOscillator();
            oscillator.frequency.value = frequency;
            const gain = context.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime((0.05 / (i + 1)) * volume, now + 1.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 5);
            oscillator.connect(gain).connect(output);
            oscillator.start(now);
            oscillator.stop(now + 5.1);
        });
        ring(context, output, { frequency: 659.25, partials: BELL, level: 0.02 * volume, decay: 4, when: 0.9 });
    },
    // Points of light coming up one after another
    reveal(context, output, volume) {
        [587.33, 659.25, 783.99, 880, 1174.66].forEach((frequency, i) => {
            ring(context, output, { frequency, partials: CHIME, level: 0.03 * volume, decay: 1.6, when: 0.15 + i * 0.16 });
        });
    },
    // One plaque lighting: a wooden tap and a small tone
    tick(context, output, volume) {
        ring(context, output, { frequency: 880, partials: [[1, 1, 1], [3.2, 0.3, 0.3]], level: 0.03 * volume, decay: 0.9 });
        ring(context, output, { frequency: 196, partials: [[1, 1, 1]], level: 0.04 * volume, decay: 0.12 });
    }
};

export function registerCue(name, factory) {
    CUES[name] = factory;
}

// The building blocks, for presets and cues made elsewhere (see src/sounds/)
export { cached, bufferFrom, noiseBuffer, reverbBuffer, loopNoise, wobble, ring, every, CHIME, BELL };

// ---- The soundscape -------------------------------------------------------------------------

export class Soundscape {
    // audio: AmbientAudio; camera: the listener
    constructor(audio, camera) {
        this.audio = audio;
        this.camera = camera;
        this.context = null;
        this.wanted = null; // The ambience asked for, applied once the audio starts
        this.current = null; // { gain, layers: [{ stop, update }] }
        this.fading = [];
        this.emitters = new Set();
        audio.onStart(context => this.begin(context));
    }

    begin(context) {
        this.context = context;
        this.bus = context.createGain();
        this.bus.connect(this.audio.masterGain);
        if (this.wanted) this.setAmbience(this.wanted.layers, { fade: 1.5 });
        this.emitters.forEach(emitter => this.startEmitter(emitter));
    }

    // layers: [{ preset, volume } | { url, volume }], or null for silence. Crosses over from what plays now.
    setAmbience(layers, { fade = FADE } = {}) {
        this.wanted = { layers };
        if (!this.context) return;
        const context = this.context;
        const now = context.currentTime;
        if (this.current) {
            const old = this.current;
            old.gain.gain.cancelScheduledValues(now);
            old.gain.gain.setValueAtTime(old.gain.gain.value, now);
            old.gain.gain.linearRampToValueAtTime(0, now + fade);
            old.until = fade + 0.2;
            this.fading.push(old);
            this.current = null;
        }
        if (!layers?.length) return;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + fade);
        gain.connect(this.bus);
        this.current = { gain, layers: layers.map(layer => this.startLayer(layer, gain)).filter(Boolean) };
    }

    startLayer(layer, output) {
        const factory = layer.url ? recording(layer.url) : AMBIENCE[layer.preset];
        if (!factory) {
            console.warn(`Unknown ambience "${layer.preset}"`);
            return null;
        }
        const level = this.context.createGain();
        level.gain.value = layer.volume ?? 1;
        level.connect(output);
        const playing = factory(this.context, level);
        return { ...playing, level };
    }

    // How much the space echoes footsteps and cues: { amount, decay }
    setRoom({ amount = 0, decay = 2 } = {}) {
        this.audio.setRoom(amount, decay);
    }

    // A world heard from a place in this one (e.g. through a doorway): { preset | url, position
    // (Vector3), radius (metres at which it is gone), volume }. Returns it; pass it to removeEmitter.
    addEmitter(emitter) {
        const item = { radius: 8, volume: 0.6, ...emitter, playing: null, gain: null, panner: null };
        this.emitters.add(item);
        if (this.context) this.startEmitter(item);
        return item;
    }

    removeEmitter(item) {
        if (!this.emitters.delete(item)) return;
        this.stopEmitter(item);
    }

    startEmitter(item) {
        const context = this.context;
        item.panner = context.createStereoPanner();
        item.gain = context.createGain();
        item.gain.gain.value = 0;
        item.gain.connect(item.panner).connect(this.bus);
        item.playing = this.startLayer({ preset: item.preset, url: item.url }, item.gain); // Its volume is the distance's
    }

    stopEmitter(item) {
        if (!item.gain) return;
        const now = this.context.currentTime;
        item.gain.gain.setTargetAtTime(0, now, 0.2);
        const { playing, gain, panner } = item;
        setTimeout(() => {
            playing?.stop();
            gain.disconnect();
            panner.disconnect();
        }, 1500);
        item.gain = null;
    }

    // name: a cue (see CUES); position: where it sounds from (Vector3, optional); volume: 0..1
    cue(name, { position = null, volume = 1 } = {}) {
        const context = this.context;
        const play = CUES[name];
        if (!context || !play) return;
        let output = this.audio.effectsInput;
        if (position) {
            const { distance, right } = this.listen(position);
            const fade = Math.max(0, 1 - distance / HEARING);
            volume *= 0.35 + 0.65 * fade * fade;
            const panner = context.createStereoPanner();
            panner.pan.value = right * 0.6;
            panner.connect(output);
            output = panner;
        }
        play(context, output, volume);
    }

    // Distance to a point, and how far to the listener's right it is (-1..1)
    listen(position) {
        const camera = this.camera.position;
        const dx = position.x - camera.x, dz = position.z - camera.z;
        const distance = Math.hypot(dx, dz);
        const m = this.camera.matrixWorld.elements; // Column 0: the listener's right
        return { distance, right: distance > 0.01 ? (dx * m[0] + dz * m[2]) / distance : 0 };
    }

    update(delta) {
        if (!this.context) return;
        this.current?.layers.forEach(layer => layer.update?.(delta));
        for (let i = this.fading.length - 1; i >= 0; i--) {
            const old = this.fading[i];
            old.until -= delta;
            old.layers.forEach(layer => layer.update?.(delta));
            if (old.until <= 0) {
                old.layers.forEach(layer => layer.stop());
                old.gain.disconnect();
                this.fading.splice(i, 1);
            }
        }
        const now = this.context.currentTime;
        this.emitters.forEach(item => {
            if (!item.gain) return;
            const { distance, right } = this.listen(item.position);
            const near = Math.max(0, 1 - distance / item.radius);
            item.gain.gain.setTargetAtTime(item.volume * near * near, now, 0.15);
            item.panner.pan.setTargetAtTime(right * 0.7 * Math.min(1, distance / 2), now, 0.15);
            item.playing?.update?.(delta);
        });
    }
}
