// audio.js - Ambient music with a proximity-driven volume fade and reverb, and the bus that sound
// effects play through
//
// Signal graph:
//   music (or oscillator drone) -> analyser -> dry ----------> master -> speakers
//                                          \-> wet -> reverb -/
//   sound effects -> effectsInput -------------------------> effects -> speakers
//                               \-> room send -> room reverb -/
//
// Without a music URL there is no music (and no drone): other sounds (e.g. a soundscape) can play
// into masterGain instead. setRoom() sets how much the space echoes the sound effects.

export class AmbientAudio {
    constructor(musicUrl = null) {
        this.musicUrl = musicUrl;
        this.context = null;
        this.analyser = null;
        this.frequencyData = null;
        this.userVolume = 0.7; // Set by the volume slider
        this.proximityVolume = 1; // Set by distance to the orb
        this.room = { amount: 0, decay: 2 }; // How much the space echoes sound effects (see setRoom)
        this.startListeners = [];
    }

    get started() {
        return this.context !== null;
    }

    // Must be called from a user gesture (browser autoplay policies)
    start() {
        if (this.context) return;

        const context = new (window.AudioContext || window.webkitAudioContext)();
        this.context = context;

        this.masterGain = context.createGain();
        this.masterGain.gain.value = this.userVolume * this.proximityVolume;
        this.masterGain.connect(context.destination);

        // Sound effects (footsteps) skip the proximity fade, but follow the volume slider
        this.effectsGain = context.createGain();
        this.effectsGain.gain.value = this.userVolume;
        this.effectsGain.connect(context.destination);

        // ...and play into effectsInput: straight through, and a little into the room's own reverb,
        // so a stone hall echoes and open ground doesn't
        this.effectsInput = context.createGain();
        this.effectsInput.connect(this.effectsGain);
        this.roomSend = context.createGain();
        this.roomSend.gain.value = this.room.amount;
        this.roomReverb = context.createConvolver();
        this.roomReverb.buffer = this.createImpulseResponse(this.room.decay);
        this.roomDecay = this.room.decay;
        this.effectsInput.connect(this.roomSend);
        this.roomSend.connect(this.roomReverb);
        this.roomReverb.connect(this.effectsGain);

        this.dryGain = context.createGain();
        this.dryGain.gain.value = 1;

        this.wetGain = context.createGain();
        this.wetGain.gain.value = 0; // Start with no reverb

        this.convolver = context.createConvolver();
        this.convolver.buffer = this.createImpulseResponse();

        // Analyser drives the orb's sound-wave visualisation
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 256;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        this.analyser.connect(this.dryGain);
        this.analyser.connect(this.wetGain);
        this.dryGain.connect(this.masterGain);
        this.wetGain.connect(this.convolver);
        this.convolver.connect(this.masterGain);

        if (this.musicUrl) this.loadMusic();

        const listeners = this.startListeners;
        this.startListeners = [];
        listeners.forEach(listener => listener(context));
    }

    // Call `listener(context)` once the audio has started (at once if it already has)
    onStart(listener) {
        if (this.context) listener(this.context);
        else this.startListeners.push(listener);
    }

    // How much the space echoes sound effects: amount 0 (open air) .. 1, decay in seconds
    setRoom(amount, decay = this.room.decay) {
        this.room = { amount, decay };
        if (!this.context) return;
        this.roomSend.gain.setTargetAtTime(amount, this.context.currentTime, 0.2);
        if (Math.abs(decay - this.roomDecay) > 0.05) {
            this.roomDecay = decay;
            this.roomReverb.buffer = this.createImpulseResponse(decay);
        }
    }

    // `seconds` (two by default) of exponentially decaying noise: a simple reverb tail
    createImpulseResponse(seconds = 2) {
        const sampleRate = this.context.sampleRate;
        const length = Math.floor(seconds * sampleRate);
        const impulseResponse = this.context.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulseResponse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(0.5, i / (length * 0.25));
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }

        return impulseResponse;
    }

    async loadMusic() {
        try {
            const response = await fetch(this.musicUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const audioBuffer = await this.context.decodeAudioData(await response.arrayBuffer());

            const music = this.context.createBufferSource();
            music.buffer = audioBuffer;
            music.loop = true;
            music.connect(this.analyser);
            music.start(0);
        } catch (error) {
            console.error('Error loading audio, falling back to a drone:', error);
            this.playDrone();
        }
    }

    // Fallback ambient drone if the music file can't be loaded
    playDrone() {
        const frequencies = [146.83, 196.00, 220.00]; // D3, G3, A3 (peaceful chord)

        frequencies.forEach(frequency => {
            const oscillator = this.context.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;

            const gain = this.context.createGain();
            gain.gain.value = 0.05; // Very quiet

            oscillator.connect(gain);
            gain.connect(this.analyser);
            oscillator.start();
        });

        // A slow LFO for subtle movement
        const lfo = this.context.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 0.03;
        lfo.connect(lfoGain);
        lfoGain.connect(this.masterGain.gain);
        lfo.start();
    }

    setUserVolume(volume) {
        this.userVolume = volume;
        this.applyVolume();
    }

    // proximity: 0 (far from the orb) .. 1 (at the orb).
    // The world fades out and becomes more reverberant as you approach.
    setProximity(proximity) {
        if (!this.context) return;

        this.proximityVolume = Math.max(0, 1 - proximity);
        this.applyVolume();

        const now = this.context.currentTime;
        this.wetGain.gain.setTargetAtTime(proximity * 0.8, now, 0.1);
        this.dryGain.gain.setTargetAtTime(1 - (proximity * 0.5), now, 0.1);
    }

    applyVolume() {
        if (!this.context) return;
        const now = this.context.currentTime;
        this.masterGain.gain.setTargetAtTime(this.userVolume * this.proximityVolume, now, 0.1);
        this.effectsGain.gain.setTargetAtTime(this.userVolume, now, 0.1);
    }

    swellReverb() {
        if (!this.context) return;
        this.wetGain.gain.setTargetAtTime(1.0, this.context.currentTime, 0.5);
    }

    // A rising tone for the moment of transformation
    playTransition() {
        if (!this.context) return;

        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 3);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 5);

        oscillator.connect(gain);
        gain.connect(this.masterGain);
        oscillator.start();
        oscillator.stop(now + 5);
    }

    // Current frequency spectrum (0-255 per bin), or null before audio starts
    getFrequencyData() {
        if (!this.analyser) return null;
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }
}
