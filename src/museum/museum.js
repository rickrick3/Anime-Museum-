// museum.js - The museum: the exhibitions it knows, its lobby, and the journeys between them.
//
//   Museum
//    ├── registry     the exhibitions (registry.js): summaries now, worlds loaded on entering
//    ├── lobby        the building (lobby.js), built once and kept
//    ├── universe     the universe being visited, if the exhibition is one (src/universe/universe.js)
//    ├── current      the space the visitor is in: the lobby, an exhibition, or one scene of a universe
//    └── travel       doorway → light → dark (the next world is loaded and put in place) → the new world
//
// An exhibition is either one world, or a universe: its data (characters, places, moments...) and
// scenes that can be walked into. Entering a universe puts the visitor in its entry scene; its
// doorways then lead from scene to scene (visit), and one leads back to the museum. Only the scene
// the visitor stands in is kept: the one they left is freed as soon as they arrive.
// An exhibition's world is only made when the visitor means to go there: as they walk toward its
// doorway (within PREPARE_WITHIN metres), it is quietly built a piece at a time and its shaders are
// compiled in parallel, so stepping through takes moments rather than a loading screen. If they
// wander far off for a while instead, it is let go again. It is freed on the GPU once left. Inside a
// universe the same is true of its scenes: walking up to a doorway (or the chart table) prepares the
// scene it leads to. The museum never knows what an exhibition shows.
//
// Events: 'enter' { space } once the visitor stands in a new space, 'leave' { space } as they go.
import * as THREE from 'three';
import { ExhibitionRegistry } from './registry.js';
import { Lobby } from './lobby.js';
import { buildExhibition } from './exhibition.js';
import { MUSEUM_ACCENT } from './gallery.js';
import { Universe } from '../universe/universe.js';

const MIN_DARK = 0.7; // Seconds the name of the place ahead stays up, even if it loads at once
const PREPARE_WITHIN = 15; // Metres from an open doorway at which its world begins to be made
const PREPARE_SCENE_WITHIN = 9; // ...and from a doorway between the scenes of a universe
const RELEASE_AFTER = 30; // Seconds spent well away from a doorway before its world is let go again
const SETTLE = 5; // Seconds after arriving somewhere before anything is prepared (no hitches as the view opens)
const EYE = 1.65; // Metres: roughly where the eyes are, for looking at something on arrival

// Where to stand and how far to look up or down to see `point` from `stand` ({ x, z, yaw, look }) in
// `space` (look: what to look at from there, if not the point itself: an exhibit that stands for something)
function standing(space, stand, target = null) {
    let pitch = -0.08;
    const point = stand.look ?? target;
    if (point) {
        const eye = space.heightAt(stand.x, stand.z) + EYE;
        pitch = THREE.MathUtils.clamp(Math.atan2(point.y - eye, Math.hypot(point.x - stand.x, point.z - stand.z)), -0.9, 0.6);
    }
    return { position: new THREE.Vector3(stand.x, 0, stand.z), yaw: stand.yaw, pitch };
}

// What the dark between two scenes of a universe says, by the kind of scene ahead
const SCENE_LABELS = {
    gallery: universe => universe.title,
    location: universe => `${universe.title} · ${universe.label('location')}`,
    vehicle: universe => `${universe.title} · ${universe.label('vehicle')}`,
    moment: () => 'Legendary Moment'
};

export class Museum extends THREE.EventDispatcher {
    // host: { scene, camera, renderer (Renderer), player, interaction, environment, soundscape }
    // services: { placard, transition, storyText }; content: the museum's own content; quality
    constructor({ host, services, content, quality }) {
        super();
        this.host = host;
        this.services = services;
        this.content = content;
        this.quality = quality;
        this.registry = new ExhibitionRegistry();
        this.lobby = null;
        this.current = null;
        this.universe = null; // The universe whose scene the visitor is in, if any
        this.travelling = false;
        this.prepared = new Map(); // exhibition id, or `universe:scene` -> { promise, space, universe, away, cancelled }
        this.settling = SETTLE;
        this.registry.addEventListener('add', ({ exhibition }) => this.lobby?.addGallery(exhibition));
    }

    get soundscape() {
        return this.host.soundscape;
    }

    // summary: { id, title, tagline, description, status, accent, preview, ambience, load }
    registerExhibition(summary) {
        return this.registry.register(summary);
    }

    // Build the lobby and stand in its entrance hall
    async open() {
        const { host, services, content, quality } = this;
        this.lobby = new Lobby({ content, museum: this, services: { placard: services.placard, soundscape: host.soundscape }, renderer: host.renderer, quality });
        await this.lobby.build(this.registry.list());
        this.place(this.lobby, this.lobby.spawn);
        await host.renderer.compile(host.scene, host.camera).catch(() => {});
    }

    // Walk through an open exhibition's doorway (its world made now, unless it already is)
    enterExhibition(id) {
        const summary = this.registry.get(id);
        if (!summary) return Promise.reject(new Error(`No exhibition called "${id}"`));
        return this.travel({
            tint: summary.accent,
            label: 'Exhibition',
            title: summary.title,
            tagline: summary.tagline,
            arrive: async () => {
                const space = await this.prepare(id, { gently: false });
                this.universe = this.prepared.get(id)?.universe ?? null;
                this.prepared.delete(id); // It is the world being entered now, no longer waiting
                return { space, at: space.spawn, line: space.arrivalLine };
            }
        });
    }

    // Walk through a doorway into another scene of the universe being visited. from: the scene
    // being left (its arrivals say where to stand when coming back from it); focus: an entity to stand
    // before on arrival, if that scene shows it (a placard's link to something shown there)
    visit(sceneId, { from = null, focus = null } = {}) {
        const universe = this.universe;
        const scene = universe?.scene(sceneId);
        if (!scene) return Promise.reject(new Error(`No scene called "${sceneId}" here`));
        const leaving = this.current;
        return this.travel({
            tint: scene.accent ?? universe.accent,
            label: SCENE_LABELS[scene.kind]?.(universe) ?? universe.title,
            title: scene.title,
            tagline: scene.tagline,
            arrive: async () => {
                const space = await this.prepareScene(sceneId, { gently: false });
                this.prepared.delete(`${universe.id}:${sceneId}`); // Being entered now, no longer waiting
                const anchor = focus ? space.anchors.get(focus) : null;
                if (anchor?.stand) return { space, at: standing(space, anchor.stand, anchor.point) };
                const at = space.arrivalFrom(leaving?.id ?? (from ? `${universe.id}:${from}` : null));
                return { space, at, line: at.line ?? (at === space.spawn ? space.arrivalLine : null) };
            }
        });
    }

    // What a world's builder is handed
    buildContext({ universe = null, gently = false } = {}) {
        return {
            renderer: this.host.renderer, quality: this.quality, museum: this, gently, universe,
            services: { placard: this.services.placard, soundscape: this.host.soundscape, storyText: this.services.storyText }
        };
    }

    // Make an exhibition's world ready to step into: loaded, built, and its shaders compiled.
    // gently: a piece at a time, between frames (while the visitor is walking). Returns a promise for the space.
    prepare(id, { gently = true } = {}) {
        const summary = this.registry.get(id);
        return this.remember(id, gently, async record => {
            const definition = await this.registry.load(id);
            if (!definition.scenes) return buildExhibition(definition, summary, this.buildContext({ gently }));
            // A universe: its data now, and the scene it is entered by
            record.universe = new Universe(definition, summary);
            const entry = await record.universe.loadScene(record.universe.entry);
            return buildExhibition(entry, summary, this.buildContext({ universe: record.universe, gently }));
        });
    }

    // The same for a scene of the universe being visited
    prepareScene(sceneId, { gently = true } = {}) {
        const universe = this.universe;
        return this.remember(`${universe.id}:${sceneId}`, gently, async () => {
            const definition = await universe.loadScene(sceneId);
            return buildExhibition(definition, universe.summary, this.buildContext({ universe, gently }));
        });
    }

    // A world being made, remembered under `key` until it is entered or let go
    remember(key, gently, make) {
        const existing = this.prepared.get(key);
        if (existing) return existing.promise;
        const record = { space: null, universe: null, away: 0, cancelled: false, gently };
        record.promise = (async () => {
            const space = await make(record);
            if (record.cancelled) {
                space.dispose();
                throw new Error(`"${key}" was let go before it was ready`);
            }
            await this.warm(space, { gently: record.gently });
            record.space = space;
            return space;
        })();
        record.promise.catch(() => {
            if (this.prepared.get(key) === record) this.prepared.delete(key);
        });
        this.prepared.set(key, record);
        return record.promise;
    }

    // Let a prepared world go again (the visitor walked off)
    release(id) {
        const record = this.prepared.get(id);
        if (!record) return;
        record.cancelled = true;
        record.space?.dispose();
        this.prepared.delete(id);
    }

    // Compile a world's shaders before it is shown, in a scene lit and fogged as it will be (browsers
    // that can do this in parallel do it without holding up the frame), and send its textures to the GPU
    // a few at a time, so nothing stalls the first time it comes into view
    async warm(space, { gently = true } = {}) {
        const renderer = this.host.renderer.renderer;
        const staging = new THREE.Scene();
        staging.fog = space.atmosphere.fog;
        staging.environment = space.atmosphere.environment;
        staging.add(space.group);
        await this.host.renderer.compile(staging, this.host.camera).catch(() => {});
        staging.remove(space.group);
        const textures = new Set();
        space.group.traverse(object => {
            for (const material of [object.material].flat()) {
                if (!material) continue;
                for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
            }
        });
        let sent = 0;
        for (const texture of textures) {
            renderer.initTexture(texture);
            if (gently && ++sent % 6 === 0) await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    // Start making a world as the visitor walks toward its doorway (in the lobby, an exhibition's; in
    // a universe, another of its scenes), and let it go if they stay far away
    anticipate(delta) {
        if (!this.current || this.travelling) return;
        this.settling -= delta;
        if (this.settling > 0) return;
        const inLobby = this.current === this.lobby;
        if (!inLobby && !this.universe) return;
        const { x, z } = this.host.player.position;
        for (const door of this.current.doorways()) {
            const key = inLobby ? door.id : `${this.universe.id}:${door.id}`;
            const near = door.within ?? (inLobby ? PREPARE_WITHIN : PREPARE_SCENE_WITHIN);
            const distance = Math.hypot(door.x - x, door.z - z);
            const record = this.prepared.get(key);
            if (distance < near) {
                if (record) record.away = 0;
                else (inLobby ? this.prepare(door.id) : this.prepareScene(door.id)).catch(error => console.warn(`Could not prepare "${key}"`, error));
            } else if (record) {
                record.away = distance > near + 11 ? record.away + delta : 0;
                if (record.away > RELEASE_AFTER) this.release(key);
            }
        }
    }

    // Let go of scenes prepared for doorways that aren't here any more
    tidy() {
        const here = new Set(this.universe && this.current !== this.lobby ? this.current.doorways().map(door => `${this.universe.id}:${door.id}`) : []);
        for (const key of [...this.prepared.keys()]) {
            if (key.includes(':') && !here.has(key)) this.release(key);
        }
    }

    // Step to another part of the space the visitor is in: a blink of dark, and they stand at
    // `stand` ({ x, z, yaw }), looking at `look` (a point), what they came to see (a placard's link to
    // something in the same room)
    async goTo(stand, { tint = MUSEUM_ACCENT, look = null } = {}) {
        if (this.travelling || !this.current) return;
        this.travelling = true;
        const { player } = this.host;
        const { transition, placard } = this.services;
        player.inputEnabled = false;
        placard.hide(true);
        this.soundscape.cue('reveal', { volume: 0.35 });
        try {
            await transition.out({ tint, quick: true });
            player.teleport(standing(this.current, stand, look));
            await transition.in({ quick: true });
        } finally {
            player.inputEnabled = true;
            this.travelling = false;
        }
    }

    // Walk back through the museum's doorway
    returnToMuseum() {
        const from = this.current;
        return this.travel({
            tint: MUSEUM_ACCENT,
            label: 'Returning to',
            title: this.content.title,
            tagline: this.content.subtitle,
            arrive: async () => {
                this.universe = null;
                return { space: this.lobby, at: this.lobby.arrivalFrom(from?.exhibition ?? from?.id) };
            }
        });
    }

    // The journey: out to dark, the next space put in place while it is dark, back in. If the next
    // space can't be made, the visitor stays where they were.
    async travel({ tint, label, title, tagline, arrive }) {
        if (this.travelling) return;
        this.travelling = true;
        const { player, renderer, scene, camera, soundscape } = this.host;
        const { transition, placard, storyText } = this.services;
        player.inputEnabled = false;
        placard.hide(true);
        storyText.hide();
        soundscape.cue('portal', { volume: 0.9 });
        const started = performance.now();
        await transition.out({ tint, label, title, tagline });

        try {
            const { space, at, line } = await arrive();
            const previous = this.current;
            this.place(space, at);
            await renderer.compile(scene, camera).catch(() => {});
            if (previous && previous !== this.lobby && previous !== space) previous.dispose();
            const waited = (performance.now() - started) / 1000;
            if (waited < MIN_DARK + 0.75) await new Promise(resolve => setTimeout(resolve, (MIN_DARK + 0.75 - waited) * 1000));
            if (line) setTimeout(() => storyText.show(line, 7), 900);
        } catch (error) {
            console.error('Could not enter the next space', error);
            storyText.show('That doorway is not ready yet. The museum keeps you here a little longer.', 5);
        } finally {
            this.tidy();
            await transition.in();
            player.inputEnabled = true;
            this.travelling = false;
            this.settling = SETTLE;
        }
    }

    // Put the visitor in `space` at `at` ({ position, yaw }), leaving the space they were in
    place(space, at) {
        const previous = this.current;
        if (previous && previous !== space) {
            this.dispatchEvent({ type: 'leave', space: previous });
            previous.detach();
        }
        space.attach(this.host);
        this.current = space;
        this.host.player.teleport({ position: at.position, yaw: at.yaw, pitch: at.pitch ?? 0 });
        this.dispatchEvent({ type: 'enter', space });
    }

    update(delta, elapsed) {
        this.anticipate(delta);
        this.current?.update(delta, elapsed);
        this.services.placard.update(delta, this.host.player.position);
        this.services.transition.update(delta);
    }
}
