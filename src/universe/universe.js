// universe.js - One anime universe as data: its characters, crews, factions, vehicles, locations,
// artifacts, events and legendary moments, each able to point at the others, and the scenes that
// can be walked into (loaded only when someone goes there).
//
// The definition is plain data (see src/content/exhibitions/<id>/universe.js; schema.js has the shape
// of every kind):
//
//   id, title, tagline, description
//   vocabulary   { faction: 'Navy', vehicle: 'Ship', ... }  the universe's own words for its kinds
//   entry        the scene a visitor arrives in from the museum
//   characters, crews, factions, vehicles (or ships), locations, artifacts, events, moments: [entity, ...]
//   timeline     [event id, ...] in the order they happened (else: the events, as listed)
//   map          how its world chart is drawn (features, the words for travelling and for locked places)
//   scenes       { id: { title, tagline, kind: 'gallery' | 'location' | 'vehicle' | 'moment', accent,
//                        load: () => import('./scenes/<id>.js') } }
//
// An entity: { id, name, epithet, description (text or [paragraphs]), facts: [{ label, value }], scene
// (a scene id, if it can be entered), chart: [u, v] (a location's place on the world chart),
// relationships: [{ with, as, inverse }] (between people), ...references } where references are the
// fields in kinds.js (origin, affiliation, crew, members, ship, territory, events, moments, ...), each
// an id or a list of ids.
//
// The universe also remembers where each entity has been seen (placements: the scene that shows it,
// and where in it), so a placard can offer to take the visitor there from anywhere in the universe.
//
// The universe never knows which story it holds; it only follows the references both ways.
import { KINDS, REFERENCES, CONNECTION_ORDER } from './kinds.js';
import { normalize, validate } from './schema.js';

const list = value => (value == null ? [] : Array.isArray(value) ? value : [value]);

export class Universe {
    // definition: as above; summary: the exhibition's summary (accent, preview...)
    constructor(definition, summary = {}) {
        if (!definition?.id) throw new Error('A universe needs an id');
        this.id = definition.id;
        this.definition = definition;
        this.summary = summary;
        this.title = definition.title ?? summary.title ?? definition.id;
        this.tagline = definition.tagline ?? summary.tagline ?? '';
        this.accent = summary.accent ?? definition.accent ?? '#9fe8ff';
        this.vocabulary = definition.vocabulary ?? {};
        this.scenes = definition.scenes ?? {};
        this.entry = definition.entry ?? Object.keys(this.scenes)[0];
        this.map = definition.map ?? {};

        this.entities = new Map(); // id -> entity (with its kind)
        this.backlinks = new Map(); // id -> [{ field, from: entity }]
        this.relations = new Map(); // id -> [{ entity, note }] the people they are related to
        this.placements = new Map(); // id -> { scene, where } the scene that shows it (once built)
        for (const [kind, { collection, also = [] }] of Object.entries(KINDS)) {
            for (const name of [collection, ...also]) {
                for (const item of definition[name] ?? []) {
                    if (!item?.id) throw new Error(`Every ${kind} in "${this.id}" needs an id`);
                    if (this.entities.has(item.id)) throw new Error(`"${item.id}" appears twice in "${this.id}"`);
                    this.entities.set(item.id, normalize(kind, item));
                }
            }
        }
        this.link();
        this.timeline = (definition.timeline ?? this.all('event').map(event => event.id))
            .map(id => this.get(id)).filter(Boolean);
        if (import.meta.env?.DEV) validate(this).forEach(problem => console.warn(`[${this.id}] ${problem}`));
    }

    // Follow every reference once: check it leads somewhere, and remember it from the other end
    link() {
        for (const entity of this.entities.values()) {
            for (const [field, reference] of Object.entries(REFERENCES)) {
                for (const id of list(entity[field])) {
                    const target = this.entities.get(id);
                    if (!target) {
                        console.warn(`"${entity.id}".${field} points at "${id}", which "${this.id}" doesn't have`);
                        continue;
                    }
                    if (target.kind !== reference.kind) {
                        console.warn(`"${entity.id}".${field} should point at a ${reference.kind}, but "${id}" is a ${target.kind}`);
                    }
                    if (!this.backlinks.has(id)) this.backlinks.set(id, []);
                    this.backlinks.get(id).push({ field, from: entity });
                }
            }
            // Relationships, both ways: what they are to this person, and (if said) what this person is to them
            for (const relation of entity.relationships ?? []) {
                const other = this.entities.get(relation.with);
                if (!other) continue;
                this.relate(entity.id, other, relation.as);
                this.relate(other.id, entity, relation.inverse ?? null);
            }
            if (entity.scene && !this.scenes[entity.scene]) {
                console.warn(`"${entity.id}" opens onto scene "${entity.scene}", which "${this.id}" doesn't have`);
            }
        }
    }

    relate(id, other, note) {
        if (!this.relations.has(id)) this.relations.set(id, []);
        const known = this.relations.get(id).find(item => item.entity === other);
        if (known) known.note ??= note;
        else this.relations.get(id).push({ entity: other, note });
    }

    get(id) {
        return this.entities.get(id) ?? null;
    }

    // Every entity of a kind ('character', 'location', ...), in the order the content lists them
    all(kind) {
        return [...this.entities.values()].filter(entity => entity.kind === kind);
    }

    // What this universe calls a kind: label('vehicle') -> 'Ship'; plural: label('vehicle', 2) -> 'Ships'
    label(kind, count = 1) {
        const own = this.vocabulary[kind];
        if (count === 1) return own ?? KINDS[kind]?.label ?? kind;
        if (own) return this.vocabulary[`${kind}s`] ?? (own.endsWith('s') ? own : `${own}s`);
        return KINDS[kind]?.plural ?? kind;
    }

    // Everything one entity is connected to, either way: [{ label, plural, entity, field, outgoing, note }],
    // each other entity once, in a stable order (factions, crews, places, ships, people, objects,
    // events, moments)
    connections(id) {
        const entity = this.get(id);
        if (!entity) return [];
        const seen = new Set([id]);
        const found = [];
        for (const { entity: other, note } of this.relations.get(id) ?? []) {
            seen.add(other.id);
            found.push({ field: 'relationships', outgoing: true, entity: other, label: 'Relationships', plural: 'Relationships', note });
        }
        for (const [field, reference] of Object.entries(REFERENCES)) {
            const ids = list(entity[field]);
            for (const otherId of ids) {
                const other = this.get(otherId);
                if (!other || seen.has(otherId)) continue;
                seen.add(otherId);
                const label = reference.vocab ? this.label(other.kind) : reference.label;
                const plural = reference.vocab ? this.label(other.kind, 2) : reference.label;
                found.push({ field, outgoing: true, entity: other, label, plural });
            }
        }
        for (const { field, from } of this.backlinks.get(id) ?? []) {
            if (seen.has(from.id)) continue;
            seen.add(from.id);
            found.push({ field, outgoing: false, entity: from, label: this.label(from.kind), plural: this.label(from.kind, 2) });
        }
        const rank = item => (item.field === 'relationships' ? CONNECTION_ORDER.indexOf('character') - 0.5 : CONNECTION_ORDER.indexOf(item.entity.kind));
        return found.sort((a, b) => rank(a) - rank(b));
    }

    // A scene's summary ({ id, title, tagline, kind, accent, load }), or null
    scene(id) {
        const scene = this.scenes[id];
        return scene ? { id, ...scene } : null;
    }

    // The definition of a scene, loaded now (each scene is its own small download)
    async loadScene(id) {
        const scene = this.scene(id);
        if (!scene) throw new Error(`"${this.id}" has no scene called "${id}"`);
        if (typeof scene.load !== 'function') throw new Error(`Scene "${id}" of "${this.id}" has nothing to load`);
        const module = await scene.load();
        return { id, ...(module?.default ?? module) };
    }

    // Remember what a scene shows, once it has been built: anchors (entity id -> { where }), so the
    // things in it can be found from other scenes later
    place(sceneId, anchors) {
        for (const [id, anchor] of anchors) {
            if (!this.entities.has(id)) continue;
            const known = this.placements.get(id);
            if (!known || sceneId === this.entry) this.placements.set(id, { scene: sceneId, where: anchor.where ?? null });
        }
    }

    // The scene to go to for an entity seen from somewhere else, or null: a place that can be entered
    // is entered; a moment is entered through its location; anything else is wherever it was last shown
    destination(id) {
        const entity = this.get(id);
        if (!entity) return null;
        if (entity.kind === 'location' && entity.scene && this.scenes[entity.scene]) return { scene: entity.scene, where: null };
        if (entity.kind === 'moment') {
            const location = this.get(entity.location);
            if (location?.scene && this.scenes[location.scene]) return { scene: location.scene, where: null, focus: id };
        }
        const placed = this.placements.get(id);
        return placed ? { scene: placed.scene, where: placed.where, focus: id } : null;
    }

    // The placard for an entity: what it is, a line about it, its story, a few facts, and its
    // connections (people, places, crew...), each connection an item ({ id, text, relation, where })
    // with its text also joined up for plain display. most: how many items of one kind are shown. hint(entity): an optional note for a connection, e.g.
    // where to find it from here.
    describe(id, { hint = null, most = 4 } = {}) {
        const entity = this.get(id);
        if (!entity) return null;
        const facts = (entity.facts ?? []).map(({ label, value }) => ({ title: label, text: value }));
        const grouped = new Map(); // label -> { plural, items }
        for (const { label, plural, entity: other, note: relation } of this.connections(id)) {
            if (!grouped.has(label)) grouped.set(label, { plural, items: [] });
            grouped.get(label).items.push({ id: other.id, text: other.name, relation: relation ?? null, where: hint?.(other) ?? null });
        }
        // Each connection is an item of its own, so a placard can offer to go to it; a long list shows
        // its first few and says how many more there are
        const connections = [...grouped].map(([label, { plural, items }]) => {
            const shown = items.slice(0, most);
            if (items.length > most) shown.push({ text: `and ${items.length - most} more`, more: true });
            return {
                title: items.length > 1 ? plural : label,
                items: shown,
                text: items.map(item => {
                    const note = [item.relation, item.where].filter(Boolean).join(', ');
                    return note ? `${item.text} (${note})` : item.text;
                }).join(', ')
            };
        });
        const era = entity.era && entity.kind !== 'event' ? [{ title: 'Era', text: entity.era }] : [];
        return {
            label: `${this.label(entity.kind)} · ${this.title}`,
            title: entity.name,
            meta: entity.epithet ?? entity.summary ?? '',
            body: entity.description ?? '',
            entries: [...facts, ...era, ...connections]
        };
    }
}
