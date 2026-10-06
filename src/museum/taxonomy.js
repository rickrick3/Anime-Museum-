// taxonomy.js - The museum's vocabulary. Nothing here belongs to any one story or series:
//
//   Museum      the building and everything in it (museum.js)
//   Gallery     the place in the lobby given to one exhibition: its doorway, title and plaque (gallery.js)
//   Exhibition  one world: its land, sky, light, sound and the exhibits in it (exhibition.js)
//   Exhibit     one thing on show in an exhibition, of one of the types below (exhibit.js)
//
// A type says what an exhibit is called on its placard, the word under the crosshair, how it answers
// when examined (a behaviour, see behaviors.js) and what that sounds like (a cue, see soundscape.js).
// Content may override any of these per exhibit.

export const EXHIBIT_TYPES = {
    artifact: { label: 'Artifact', prompt: 'Examine', behavior: 'lift', cue: 'chime' },
    weapon: { label: 'Weapon', prompt: 'Examine', behavior: 'lift', cue: 'metal' },
    character: { label: 'Character', prompt: 'Observe', behavior: 'illuminate', cue: 'resonance' },
    faction: { label: 'Faction', prompt: 'Examine', behavior: 'illuminate', cue: 'resonance' },
    crew: { label: 'Crew', prompt: 'Examine', behavior: 'illuminate', cue: 'resonance' },
    vehicle: { label: 'Vehicle', prompt: 'Examine', behavior: 'illuminate', cue: 'chime' },
    event: { label: 'Event', prompt: 'Read', behavior: 'illuminate', cue: 'chime' },
    moment: { label: 'Legendary Moment', prompt: 'Observe', behavior: 'illuminate', cue: 'resonance' },
    location: { label: 'Location', prompt: 'Observe', behavior: 'illuminate', cue: 'chime' },
    scene: { label: 'Scene Reconstruction', prompt: 'Observe', behavior: 'illuminate', cue: 'resonance' },
    diorama: { label: 'Diorama', prompt: 'Observe', behavior: 'reveal', cue: 'reveal' },
    timeline: { label: 'Timeline', prompt: 'Read', behavior: 'sequence', cue: 'tick' },
    lore: { label: 'Lore', prompt: 'Read', behavior: 'unfold', cue: 'paper' },
    map: { label: 'Map', prompt: 'Examine', behavior: 'reveal', cue: 'reveal' },
    guide: { label: 'Museum Guide', prompt: 'Read', behavior: 'reveal', cue: 'chime' }
};

export function exhibitType(name) {
    return EXHIBIT_TYPES[name] ?? EXHIBIT_TYPES.artifact;
}

// The words for the museum's own doorways
export const PROMPTS = {
    enter: 'Enter Exhibition',
    sealed: 'In Preparation',
    returnToMuseum: 'Return to Museum',
    travel: 'Travel',
    read: 'Read'
};

// What an exhibition's status means in the lobby
export const STATUS = {
    open: { label: 'Now Open', open: true },
    'in-preparation': { label: 'In Preparation', open: false }
};
