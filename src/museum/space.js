// space.js - A place the visitor can stand in: the museum's lobby, or one exhibition's world.
//
// A space holds everything its place has: its objects (one group), its ground (heightAt, surfaceAt),
// what is solid (colliders for the body, solids for the gaze), what can be noticed (interactables)
// or responds to the visitor (reactives), its light and air (atmosphere), and its sound (ambience,
// room, emitters). Its clock (time) can run slow or stand almost still (timeScale), for a moment
// held in time. It remembers where each entity of a universe stands in it (anchors), so threads of
// light can join related things, and where to put a visitor arriving from elsewhere (arrivals). It can be:
//   attached  put into the running experience: the scene, the player's world, the interaction
//             system, the environment and the soundscape all take it up
//   detached  taken out again, but kept (the lobby waits like this while you are in an exhibition)
//   disposed  detached and freed on the GPU (an exhibition you have left)
//
// Spaces know nothing about what they show; the lobby and exhibition builders fill them.
import * as THREE from 'three';
import { createInteractable } from '../interactions/interactable.js';
import { createReactive } from '../environment/reactive.js';
import { Materials, disposeObject } from '../scenery/kit.js';
import { VIEW_MODEL_LAYER } from '../render.js';

export class Space extends THREE.EventDispatcher {
    // id: unique name; kind: 'lobby', 'exhibition', or a universe scene's kind ('gallery', 'location',
    // 'moment', ...); title: shown to the visitor; exhibition: the id of the exhibition it belongs to
    constructor({ id, kind, title = '', exhibition = null }) {
        super();
        this.id = id;
        this.kind = kind;
        this.title = title;
        this.exhibition = exhibition ?? id;

        this.group = new THREE.Group();
        this.group.name = `space:${id}`;
        this.materials = new Materials(); // Shared by this space's pieces, freed with it
        this.time = { value: 0 }; // Seconds, for shaders that move (wind, particles, water)
        this.timeScale = 1; // How fast that clock runs: 1 as usual, near 0 for a moment held still

        // The ground and what is solid (see Movement.setWorld)
        this.bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
        this.colliders = [];
        this.solids = [];
        this.heightAt = () => 0;
        this.surfaceAt = () => 'stone';
        this.isFirmGround = () => true; // Nothing here is sand
        this.isUnderWater = () => false;

        // Where the visitor appears: { position (x, z), yaw }, unless arriving from a space listed in
        // arrivals ({ [space id]: { position, yaw } })
        this.spawn = { position: new THREE.Vector3(), yaw: 0 };
        this.arrivals = {};

        // Where the things of a universe are shown here: entity id -> { point (Vector3), where (words),
        // stand ({ x, z, yaw }: where to stand to see it) } (see src/universe/connections.js)
        this.anchors = new Map();
        // Its doorways to other scenes: [{ id (the scene), x, z, within (metres at which to prepare it) }]
        this.exits = [];

        // How it looks: background, fog, environment map (reflections), exposure and bloom; static
        // shadows are drawn once on arrival instead of every frame
        this.atmosphere = {
            background: new THREE.Color('#000000'),
            fog: null,
            environment: null,
            environmentIntensity: 1,
            look: {},
            staticShadows: true
        };
        this.particleColor = new THREE.Color(0.6, 0.6, 0.65); // Dust and pollen take this light

        // How it sounds (see soundscape.js)
        this.ambience = null;
        this.room = { amount: 0, decay: 2 };
        this.emitters = [];

        this.interactables = [];
        this.reactives = [];
        this.updaters = [];
        this.disposables = []; // Render targets and the like, outside the scene graph
        this.host = null;
        this.emitting = [];
    }

    get attached() {
        return this.host !== null;
    }

    // Where to stand when arriving from the space `from` (its id)
    arrivalFrom(from) {
        return this.arrivals[from] ?? this.spawn;
    }

    // The doorways that lead on from here (see Museum.anticipate)
    doorways() {
        return this.exits;
    }

    // What the player's body walks in (see Movement.setWorld)
    get world() {
        return {
            groundHeightAt: this.heightAt,
            bounds: this.bounds,
            colliders: this.colliders,
            isUnderWater: this.isUnderWater,
            isFirmGround: this.isFirmGround,
            surfaceAt: this.surfaceAt
        };
    }

    // For the environment's particles (see Environment.updateLight)
    lightColor(target) {
        return target.copy(this.particleColor);
    }

    add(object) {
        this.group.add(object);
        return object;
    }

    // Say that entity `id` is shown here, at `anchor`, unless something already shows it
    claim(id, anchor) {
        if (!this.anchors.has(id)) this.anchors.set(id, anchor);
        return this.anchors.get(id);
    }

    addCollider(collider) {
        this.colliders.push(collider);
        return collider;
    }

    // A wall from (ax, az) to (bx, bz), `thickness` either side
    addWall(ax, az, bx, bz, thickness = 0.12) {
        return this.addCollider({ ax, az, bx, bz, radius: thickness });
    }

    removeColliders(list) {
        for (const collider of list) {
            const index = this.colliders.indexOf(collider);
            if (index !== -1) this.colliders.splice(index, 1); // In place: the body holds this array
        }
    }

    // Something solid enough to hide what is behind it from the gaze
    addSolid(object) {
        this.solids.push(object);
        if (this.host) this.host.interaction.occlusion.addBlocker(object);
        return object;
    }

    // definition: as createInteractable() takes. Registered whenever the space is attached.
    addInteractable(definition) {
        const item = createInteractable(definition);
        this.interactables.push(item);
        if (this.host) this.host.interaction.register(item);
        return item;
    }

    removeInteractable(item) {
        const index = this.interactables.indexOf(item);
        if (index === -1) return;
        this.interactables.splice(index, 1);
        if (this.host) this.host.interaction.unregister(item);
    }

    // definition: as createReactive() takes. Registered with the environment whenever attached.
    addReactive(definition) {
        const item = createReactive(definition);
        this.reactives.push(item);
        if (this.host) this.host.environment.registerReactive(item);
        return item;
    }

    // emitter: { preset | url, position, radius, volume } (see Soundscape.addEmitter)
    addEmitter(emitter) {
        this.emitters.push(emitter);
        if (this.host) this.emitting.push(this.host.soundscape.addEmitter(emitter));
        return emitter;
    }

    // fn(delta, elapsed) every frame while attached
    onUpdate(fn) {
        this.updaters.push(fn);
        return fn;
    }

    offUpdate(fn) {
        const index = this.updaters.indexOf(fn);
        if (index !== -1) this.updaters.splice(index, 1);
    }

    // Something to free with the space that isn't in its scene graph
    track(resource) {
        this.disposables.push(resource);
        return resource;
    }

    // host: { scene, renderer (Renderer), player, interaction, environment, soundscape }
    attach(host) {
        if (this.host) return;
        this.host = host;
        const { scene, renderer, player, interaction, environment, soundscape } = host;

        scene.add(this.group);
        this.group.updateMatrixWorld(true);
        // Its lights light the first-person hands too (they are drawn on their own layer)
        this.group.traverse(object => {
            if (object.isLight) object.layers.enable(VIEW_MODEL_LAYER);
        });

        const { atmosphere } = this;
        scene.background = atmosphere.background;
        scene.fog = atmosphere.fog;
        scene.environment = atmosphere.environment;
        scene.environmentIntensity = atmosphere.environmentIntensity;
        renderer.setLook(atmosphere.look);
        const shadowMap = renderer.renderer.shadowMap;
        shadowMap.autoUpdate = !atmosphere.staticShadows;
        shadowMap.needsUpdate = true;

        player.setWorld(this.world);
        interaction.occlusion.groundHeightAt = this.heightAt;
        this.solids.forEach(object => interaction.occlusion.addBlocker(object));
        environment.setWorld(this);
        this.interactables.forEach(item => interaction.register(item));
        this.reactives.forEach(item => environment.registerReactive(item));

        soundscape.setAmbience(this.ambience);
        soundscape.setRoom(this.room);
        this.emitting = this.emitters.map(emitter => soundscape.addEmitter(emitter));
        this.dispatchEvent({ type: 'attach' });
    }

    detach() {
        const host = this.host;
        if (!host) return;
        this.interactables.forEach(item => host.interaction.unregister(item));
        this.reactives.forEach(item => host.environment.unregisterReactive(item));
        this.solids.forEach(object => host.interaction.occlusion.removeBlocker(object));
        this.emitting.forEach(item => host.soundscape.removeEmitter(item));
        this.emitting = [];
        host.scene.remove(this.group);
        this.host = null;
        this.dispatchEvent({ type: 'detach' });
    }

    update(delta, elapsed) {
        this.time.value += delta * this.timeScale;
        for (const fn of this.updaters) fn(delta, elapsed);
    }

    // Detach it and free everything it made on the GPU
    dispose() {
        this.detach();
        disposeObject(this.group);
        this.materials.dispose();
        this.disposables.forEach(resource => resource.dispose());
        this.disposables = [];
        this.updaters = [];
        this.interactables = [];
        this.reactives = [];
        this.colliders.length = 0;
        this.solids = [];
        this.group.clear();
        this.dispatchEvent({ type: 'dispose' });
    }
}
