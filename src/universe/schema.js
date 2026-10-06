// schema.js - The shapes a universe's data takes, for any series. A content pack is plain data in
// these shapes (src/content/exhibitions/<id>/universe.js); the engine reads it and never asks which
// series it is. Every entity has an `id` unique within its universe; fields that point at other
// entities hold an id or a list of ids (see kinds.js for which fields are followed both ways).
//
// normalize() fills in the few names that may be spelled two ways (a LegendaryMoment's `title` and
// `environment` are its `name` and `scene`); validate() lists what a pack is missing, as warnings.

/**
 * @typedef {object} Universe
 * @property {string} id
 * @property {string} title
 * @property {string} [tagline]
 * @property {string|string[]} [description]
 * @property {Object<string,string>} [vocabulary]   the series' own words for its kinds ({ vehicle: 'Ship' })
 * @property {string} entry                          the scene a visitor arrives in from the museum
 * @property {Object<string,SceneSummary>} scenes    the places that can be walked into, each loaded on demand
 * @property {string[]} [timeline]                   event ids in the order they happened
 * @property {WorldMap} [map]                        how its world chart is drawn
 * @property {Character[]} [characters]
 * @property {Crew[]} [crews]
 * @property {Faction[]} [factions]
 * @property {Ship[]} [ships]                        (or `vehicles`)
 * @property {Location[]} [locations]
 * @property {Artifact[]} [artifacts]
 * @property {Event[]} [events]
 * @property {LegendaryMoment[]} [moments]           (or `legendaryMoments`)
 *
 * @typedef {object} SceneSummary
 * @property {string} title
 * @property {string} [tagline]
 * @property {'gallery'|'location'|'vehicle'|'moment'} kind
 * @property {string} [accent]
 * @property {() => Promise<object>} load           import('./scenes/<id>.js')
 *
 * @typedef {object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} [epithet]
 * @property {string|string[]} [description]
 * @property {{label: string, value: string}[]} [facts]   e.g. Role, Bounty, Rank
 * @property {string} [role]                         shown as a fact
 * @property {string} [affiliation]                  a faction
 * @property {string} [crew]                         a crew
 * @property {string} [origin]                       a location
 * @property {string[]} [locations]
 * @property {string[]} [events]
 * @property {string[]} [moments]
 * @property {Relationship[]} [relationships]
 * @property {object} [figure]                       how the character is drawn (see src/scenery/mannequin.js)
 *
 * @typedef {object} Relationship
 * @property {string} with                           another character
 * @property {string} as                             what they are to this character ('grandfather')
 * @property {string} [inverse]                      what this character is to them ('grandson')
 *
 * @typedef {object} Crew
 * @property {string} id
 * @property {string} name
 * @property {string} captain                        a character
 * @property {string[]} members                      characters
 * @property {string} [ship]                         a vehicle
 * @property {string|string[]} [territory]           locations
 * @property {string} [faction]                      the larger power it belongs to
 * @property {string[]} [locations]
 * @property {string[]} [events]
 * @property {object} [emblem]                       its flag (see emblemTexture in src/scenery/textures.js)
 *
 * @typedef {object} Faction
 * @property {string} id
 * @property {string} name
 * @property {string} [leader]
 * @property {string[]} [members]                    characters
 * @property {string[]} [crews]
 * @property {string[]} [locations]
 * @property {object} [emblem]
 *
 * @typedef {object} Ship                            (kind 'vehicle')
 * @property {string} id
 * @property {string} name
 * @property {string} [crew]
 * @property {string} [faction]
 * @property {string} [builder]
 * @property {string} [home]                         a location
 * @property {object} [model]                        how it is drawn (see src/scenery/ship.js)
 *
 * @typedef {object} Location
 * @property {string} id
 * @property {string} name
 * @property {[number, number]} [chart]              its place on the world chart, -1..1 across
 * @property {string} [scene]                        a scene id, if it can be entered
 * @property {string} [region]
 *
 * @typedef {object} Event
 * @property {string} id
 * @property {string} name
 * @property {string} [era]
 * @property {string} [location]
 * @property {string[]} [characters]
 * @property {string[]} [crews]
 * @property {string} [moment]                       the legendary moment it became, if any
 *
 * @typedef {object} LegendaryMoment
 * @property {string} id
 * @property {string} title                          (or `name`)
 * @property {string} universe                       the universe's id
 * @property {string} location
 * @property {string} era
 * @property {string|string[]} description
 * @property {string} environment                    the scene it is walked into (or `scene`)
 * @property {string[]} participants                 characters
 * @property {string[]} relatedEvents
 *
 * @typedef {object} WorldMap
 * @property {string} [title]
 * @property {string} [travel]                       the word for going to a charted place ('Travel')
 * @property {string} [locked]                       the word for a place that can't be entered yet
 * @property {MapFeature[]} [features]               bands, rings and labels drawn on the chart
 *
 * @typedef {object} MapFeature
 * @property {'band'|'label'} type
 * @property {[number, number]} [from]
 * @property {[number, number]} [to]
 * @property {number} [width]
 * @property {[number, number]} [at]
 * @property {string} [text]
 * @property {string} [color]
 */

// What each kind needs to be useful, and what it is worth having
const REQUIRED = {
    character: ['name'],
    crew: ['name', 'captain', 'members'],
    faction: ['name'],
    vehicle: ['name'],
    location: ['name'],
    artifact: ['name'],
    event: ['name'],
    moment: ['name', 'location', 'scene']
};
const RECOMMENDED = {
    character: ['epithet', 'description'],
    crew: ['ship', 'description'],
    event: ['era', 'description'],
    moment: ['era', 'description', 'participants', 'relatedEvents']
};

// An entity as the engine reads it: the same data, with alternative spellings filled in
export function normalize(kind, item) {
    const entity = { ...item, kind };
    entity.name ??= item.title;
    if (kind === 'moment') entity.scene ??= item.environment;
    if (item.role && !(item.facts ?? []).some(fact => fact.label === 'Role')) {
        entity.facts = [{ label: 'Role', value: item.role }, ...(item.facts ?? [])];
    }
    return entity;
}

// What a pack is missing, as a list of sentences (empty when it is complete)
export function validate(universe) {
    const problems = [];
    for (const entity of universe.entities.values()) {
        for (const field of REQUIRED[entity.kind] ?? []) {
            const value = entity[field];
            if (value == null || (Array.isArray(value) && !value.length)) problems.push(`${entity.kind} "${entity.id}" has no ${field}`);
        }
        if (entity.kind === 'moment' && entity.universe && entity.universe !== universe.id) {
            problems.push(`moment "${entity.id}" says it belongs to "${entity.universe}", not "${universe.id}"`);
        }
        for (const relation of entity.relationships ?? []) {
            if (!universe.get(relation.with)) problems.push(`"${entity.id}" is related to "${relation.with}", which isn't in "${universe.id}"`);
        }
    }
    if (!universe.scenes[universe.entry]) problems.push(`its entry scene "${universe.entry}" doesn't exist`);
    return problems;
}

// The fields worth filling in that a pack left out (for a content author, not shown to visitors)
export function suggestions(universe) {
    const notes = [];
    for (const entity of universe.entities.values()) {
        const missing = (RECOMMENDED[entity.kind] ?? []).filter(field => entity[field] == null);
        if (missing.length) notes.push(`${entity.kind} "${entity.id}" could have: ${missing.join(', ')}`);
    }
    return notes;
}
