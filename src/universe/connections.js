// connections.js - Threads of light between related things. When something of a universe is
// examined, a fine thread rises from it and arcs over to each thing it is connected to that stands
// in the same place (its crew's standard, its ship, the pin of its home on the chart table, the rift
// into a moment it lived through), a spark running ahead along each. They hang there a while, then
// fade. Nothing to read: the room itself shows how its things belong together.
//
// Where each entity stands is the space's anchors (entity id -> { point, where, stand }); `where` is a
// few words for the placard ("on the chart table"), so a placard can say where to find a connection,
// and `stand` ({ x, z, yaw }) is where to stand to see it, so the placard can offer to go there.
// route() is that offer: to a thing in this space, a short step through the dark to stand before it;
// to a thing shown in another scene of the universe, the journey there (see Museum.goTo, Museum.visit).
import * as THREE from 'three';

const GROW = 1.1; // Seconds for a thread to reach its end
const STAGGER = 0.18; // Seconds between one thread and the next
const HOLD = 9; // Seconds they stay
const FADE = 1.6;
const SEGMENTS = 48;
const RADIAL = 5;

export class Connections {
    // space: the Space; universe: the Universe; accent: the threads' colour; here: the location this
    // space is (its id), if it is one; museum: for going to things (route)
    constructor(space, universe, { accent = '#9fe8ff', soundscape = null, here = null, museum = null } = {}) {
        this.space = space;
        this.universe = universe;
        this.soundscape = soundscape;
        this.here = here;
        this.museum = museum;
        this.accent = accent;
        this.color = new THREE.Color(accent).multiplyScalar(2.4);
        this.threads = [];
        this.age = 0;
        space.onUpdate(delta => this.update(delta));
        space.addEventListener('dispose', () => this.clear());
    }

    // A few words on where a connected entity is to be found from here, or null
    hint(entity) {
        if (entity.id === this.here) return 'here';
        const anchor = this.space.anchors.get(entity.id);
        if (anchor?.where) return anchor.where;
        const at = id => this.universe.get(id)?.name;
        if (entity.kind === 'moment' && entity.location && !anchor) return `entered at ${at(entity.location)}`;
        if (entity.kind === 'vehicle' && entity.home && entity.home !== this.here && !anchor) return `at ${at(entity.home)}`;
        return null;
    }

    // How to go to an entity from here: { note, go() }, or null if it can't be reached. In this space:
    // step through the dark to stand before it. Elsewhere in the universe: travel to the scene that
    // shows it (and stand before it there, if it is shown in that scene).
    route(entity) {
        const { museum, universe, space } = this;
        if (!museum || entity.id === this.here) return null;
        const anchor = space.anchors.get(entity.id);
        if (anchor?.stand) return { note: anchor.where ?? 'here', go: () => museum.goTo(anchor.stand, { tint: this.accent, look: anchor.point }) };
        const destination = universe.destination(entity.id);
        if (!destination || destination.scene === space.scene) return null;
        const scene = universe.scene(destination.scene);
        const note = destination.where ?? scene.title; // Its key is drawn dashed: it is somewhere else
        return { note, go: () => museum.visit(destination.scene, { from: space.scene, focus: destination.focus ?? null }) };
    }

    // An entity's placard content with each connection that can be reached given a key (1-9) and a way
    // there: items get `key`, and links lists [{ key, go }] for the placard to follow
    withLinks(content) {
        let key = 0;
        const links = [];
        for (const entry of content.entries ?? []) {
            for (const item of entry.items ?? []) {
                if (key >= 9) break;
                const entity = item.id ? this.universe.get(item.id) : null;
                const route = entity && this.route(entity);
                if (!route) continue;
                item.key = ++key;
                item.travel = !this.space.anchors.get(item.id)?.stand;
                if (!item.travel) item.where = null; // Its number takes the visitor to it: no need to say where
                else item.where = route.note;
                links.push({ key, go: route.go });
            }
        }
        return { ...content, links };
    }

    // How many of an entity's connections can be seen from here
    visibleFrom(id) {
        return this.universe.connections(id).filter(({ entity }) => this.space.anchors.has(entity.id) && entity.id !== id).length;
    }

    // Draw threads from `id` (standing at `from`) to everything it is connected to that is here
    show(id, from) {
        this.clear();
        const targets = this.universe.connections(id)
            .map(({ entity }) => this.space.anchors.get(entity.id))
            .filter(anchor => anchor && anchor.point.distanceToSquared(from) > 0.5);
        targets.forEach((anchor, i) => this.thread(from, anchor.point, i * STAGGER));
        this.age = 0;
        return targets.length;
    }

    thread(from, to, delay) {
        const lift = 1.2 + from.distanceTo(to) * 0.18;
        const middle = from.clone().lerp(to, 0.5);
        middle.y = Math.max(from.y, to.y) + lift;
        const curve = new THREE.QuadraticBezierCurve3(from.clone(), middle, to.clone());
        const geometry = new THREE.TubeGeometry(curve, SEGMENTS, 0.011, RADIAL);
        geometry.setDrawRange(0, 0);
        const material = new THREE.MeshBasicMaterial({
            color: this.color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 4;
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({
            color: this.color.clone().multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
        }));
        spark.visible = false;
        this.space.add(mesh);
        this.space.add(spark);
        this.threads.push({ mesh, spark, curve, delay, arrived: false, end: to.clone() });
    }

    update(delta) {
        if (!this.threads.length) return;
        this.age += delta;
        const fading = this.age > HOLD ? 1 - (this.age - HOLD) / FADE : 1;
        if (fading <= 0) {
            this.clear();
            return;
        }
        for (const thread of this.threads) {
            const t = THREE.MathUtils.clamp((this.age - thread.delay) / GROW, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            thread.mesh.geometry.setDrawRange(0, Math.floor(eased * SEGMENTS) * RADIAL * 6);
            thread.mesh.material.opacity = 0.85 * fading * (0.75 + 0.25 * Math.sin(this.age * 3 + thread.delay * 10));
            thread.spark.visible = t > 0 && t < 1;
            if (thread.spark.visible) thread.spark.position.copy(thread.curve.getPoint(eased));
            if (t >= 1 && !thread.arrived) {
                thread.arrived = true;
                this.soundscape?.cue('chime', { position: thread.end, volume: 0.25 });
            }
        }
    }

    clear() {
        for (const { mesh, spark } of this.threads) {
            mesh.removeFromParent();
            spark.removeFromParent();
            mesh.geometry.dispose();
            mesh.material.dispose();
            spark.geometry.dispose();
            spark.material.dispose();
        }
        this.threads = [];
    }
}
