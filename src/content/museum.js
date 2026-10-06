// museum.js - The museum's own words and arrangement: its name, the texts on its walls, its guide,
// and which side of the rotunda each exhibition's gallery takes. Plain data; the lobby builds from it.

export default {
    title: 'Virtual Anime Museum',
    subtitle: 'Worlds you can walk into',

    // Shown once, as you first step in
    welcomeLine: 'Welcome to the Virtual Anime Museum. Walk on into the rotunda: every doorway there opens onto another world.',

    // On the wall of the entrance hall
    welcomeWall: {
        title: 'Worlds you can walk into',
        lines: [
            'Every doorway in the rotunda opens onto a world.',
            'Step through, wander, and look closely:',
            'the things on show will answer you.'
        ]
    },

    // On the rotunda's quiet sides, above the benches
    walls: {
        southwest: {
            title: 'About the museum',
            lines: [
                'A museum of worlds, built in the open.',
                'Each exhibition is a world you walk into;',
                'more will join it as they are made.'
            ]
        },
        southeast: {
            title: 'How to visit',
            lines: [
                'Look at something and press E to examine it.',
                'Hold Shift to hurry; Esc pauses your visit.',
                'Every world has a doorway back to this hall.'
            ]
        }
    },

    // Which side of the rotunda each gallery takes (others take the next free side)
    galleries: [
        { exhibition: 'one-piece', side: 'north' },
        { exhibition: 'shadow-ninja', side: 'west' },
        { exhibition: 'soul-reapers', side: 'east' }
    ],

    // The guide in the entrance hall
    guide: {
        title: 'Museum Guide',
        meta: 'The rotunda and its galleries',
        description: 'The galleries open off the rotunda ahead. Follow the lines of light in the floor to their doorways.'
    }
};
