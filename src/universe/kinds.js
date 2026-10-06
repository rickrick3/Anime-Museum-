// kinds.js - What a universe is made of. Nothing here belongs to any one story or series:
//
//   AnimeUniverse
//    ├── characters     people, with an origin, an affiliation, a crew, the places and moments of their story
//    ├── crews          small bands under one captain or leader: a crew, a team, a squad, a party
//    ├── factions       larger powers that crews and people belong to: a navy, an empire, a clan, a guild
//    ├── vehicles       ships, trains, machines: some can be boarded and walked through (also `ships`)
//    ├── locations      places: some can be entered (they have a scene)
//    ├── artifacts      objects of the story
//    ├── events         what happened, in order (the timeline)
//    └── moments        legendary moments: an event made into a place to walk into (a scene)
//
// Each kind has the collection it is listed under in a universe's data (and other names it may be
// listed under), and a label (the universe's vocabulary can rename it: a vehicle may be a "Ship").
// An exhibit of an entity takes its kind as its exhibit type (see src/museum/taxonomy.js), which says
// how it answers when examined. The full schema of each kind is in schema.js.

export const KINDS = {
    character: { collection: 'characters', label: 'Character', plural: 'Characters' },
    crew: { collection: 'crews', label: 'Crew', plural: 'Crews' },
    faction: { collection: 'factions', label: 'Faction', plural: 'Factions' },
    vehicle: { collection: 'vehicles', also: ['ships'], label: 'Vehicle', plural: 'Vehicles' },
    location: { collection: 'locations', label: 'Location', plural: 'Locations' },
    artifact: { collection: 'artifacts', label: 'Artifact', plural: 'Artifacts' },
    event: { collection: 'events', label: 'Event', plural: 'Events' },
    moment: { collection: 'moments', also: ['legendaryMoments'], label: 'Legendary Moment', plural: 'Legendary Moments' }
};

// Fields that point at other entities (one id, or a list of ids), the kind they point at, and how
// the link reads on a placard: its own words (label), or the universe's word for what it leads to
// (vocab: a vehicle reads "Ship" in a universe of ships). A field not listed here is kept, not followed.
// Relationships between people are their own field (see schema.js): { with, as, inverse }.
export const REFERENCES = {
    origin: { kind: 'location', label: 'Origin' },
    home: { kind: 'location', label: 'Home port' },
    territory: { kind: 'location', label: 'Territory' },
    affiliation: { kind: 'faction', label: 'Affiliation' },
    leader: { kind: 'character', label: 'Leader' },
    captain: { kind: 'character', label: 'Captain' },
    members: { kind: 'character', label: 'Members' },
    participants: { kind: 'character', label: 'Participants' },
    owner: { kind: 'character', label: 'Belonged to' },
    owners: { kind: 'character', label: 'Passed through the hands of' },
    builder: { kind: 'character', label: 'Built by' },
    crew: { kind: 'crew', vocab: true },
    crews: { kind: 'crew', vocab: true },
    faction: { kind: 'faction', vocab: true },
    factions: { kind: 'faction', vocab: true },
    characters: { kind: 'character', vocab: true },
    vehicle: { kind: 'vehicle', vocab: true },
    vehicles: { kind: 'vehicle', vocab: true },
    ship: { kind: 'vehicle', vocab: true },
    ships: { kind: 'vehicle', vocab: true },
    location: { kind: 'location', vocab: true },
    locations: { kind: 'location', vocab: true },
    artifacts: { kind: 'artifact', vocab: true },
    event: { kind: 'event', vocab: true },
    events: { kind: 'event', vocab: true },
    relatedEvents: { kind: 'event', vocab: true },
    moment: { kind: 'moment', vocab: true },
    moments: { kind: 'moment', vocab: true }
};

// The order connections are listed in on a placard, by the kind of thing they lead to: who and what
// first (the first nine that can be reached get the number keys), then places and events
export const CONNECTION_ORDER = ['faction', 'crew', 'vehicle', 'character', 'moment', 'artifact', 'location', 'event'];
