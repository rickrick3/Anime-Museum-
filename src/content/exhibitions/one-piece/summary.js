// One Piece, as the lobby shows it. A universe (universe.js): a dock hall of its crews, navy, emperors,
// ships and history, the chart table that sails to Marineford, and the war held still there.
// Names belong to the series (see README.md); everything seen and heard is original.

export default {
    id: 'one-piece',
    order: 1,
    title: 'One Piece',
    tagline: 'The Great Pirate Era: a sea of pirates, a navy, and a treasure at the end of the world',
    description: [
        'A world almost all ocean, its pirates sailing for the treasure the Pirate King left at the end of the Grand Line.',
        'Meet its crews, its Marines and its Emperors in a dock hall open to the sea, board a pirate ship, then set sail for Marineford and walk into the war fought there.'
    ],
    status: 'open',
    accent: '#e8b04a',
    ambience: 'harbor-dusk',
    // What its doorway shows (see src/scenery/portalSurface.js)
    preview: {
        style: 'sea',
        sky: ['#22305e', '#ff9a52'],
        far: '#3a3e6a',
        near: '#0b1830',
        celestial: { x: 0.5, y: 0.34, size: 0.09, color: '#ffd59a' }
    }
};
