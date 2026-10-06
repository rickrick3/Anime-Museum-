// The Shadow Ninja exhibition, as the lobby shows it. An original world: no characters, names,
// symbols or artwork from any existing series.

export default {
    id: 'shadow-ninja',
    order: 1,
    title: 'Shadow Ninja',
    tagline: 'A hidden village at dusk, beneath the mountain pines',
    description: [
        'Step into a valley closed in by mountains and forest, where a clan of shadow warriors once trained in silence.',
        'Walk its paths at dusk, from the village square to the training ground and up the temple steps, and find the five exhibits that tell its story.'
    ],
    status: 'open',
    accent: '#ffb36b',
    ambience: 'forest-dusk',
    exhibits: 5,
    // What its doorway shows (see src/scenery/portalSurface.js)
    preview: {
        style: 'mountains',
        sky: ['#1b1838', '#e8895a'],
        far: '#4a3352',
        near: '#16121e',
        celestial: { x: 0.68, y: 0.62, size: 0.06, color: '#fff0d8' }
    }
};
