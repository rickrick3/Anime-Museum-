// registry.js - The exhibitions the museum knows. For each: its summary (what the lobby shows: title,
// tagline, accent, preview, status...) and how to load its world (load(): a promise for the
// exhibition's definition), used only when someone walks in.
//
// Exhibitions can be registered at any time; the lobby gives a newly registered one a gallery
// straight away (it listens for 'add' { exhibition }).
import { EventDispatcher } from 'three';

export class ExhibitionRegistry extends EventDispatcher {
    constructor() {
        super();
        this.items = new Map();
    }

    register(summary) {
        if (!summary?.id || !summary.title) throw new Error('An exhibition needs an id and a title');
        if (this.items.has(summary.id)) throw new Error(`An exhibition called "${summary.id}" is already registered`);
        const exhibition = { status: 'open', order: this.items.size, ...summary };
        this.items.set(exhibition.id, exhibition);
        this.dispatchEvent({ type: 'add', exhibition });
        return exhibition;
    }

    get(id) {
        return this.items.get(id) ?? null;
    }

    // In the order they are shown
    list() {
        return [...this.items.values()].sort((a, b) => a.order - b.order);
    }

    // The full definition of an exhibition's world
    async load(id) {
        const exhibition = this.get(id);
        if (!exhibition) throw new Error(`No exhibition called "${id}"`);
        if (typeof exhibition.load !== 'function') throw new Error(`"${id}" has no world to enter yet`);
        const module = await exhibition.load();
        return module?.default ?? module;
    }
}
