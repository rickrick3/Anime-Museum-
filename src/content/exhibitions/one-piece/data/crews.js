// The crews of the One Piece hall, and the larger powers they belong to. Plain data. Each crew's flag is
// one of the museum's own original emblems (see src/scenery/emblems.js), chosen per crew: no official
// jolly roger or navy mark is reproduced.

export const crews = [
    {
        id: 'roger-pirates',
        name: 'The Roger Pirates',
        epithet: 'The crew that reached the end of the Grand Line',
        description: [
            'The crew that sailed the whole of the Grand Line under Gol D. Roger and became the only ones ever to reach its last island.',
            'Soon after, Roger disbanded them. Two of their cabin boys grew up to be Emperors.'
        ],
        captain: 'gol-d-roger',
        members: ['gol-d-roger', 'silvers-rayleigh', 'scopper-gaban', 'crocus', 'kozuki-oden', 'shanks', 'buggy'],
        ship: 'oro-jackson',
        locations: ['laugh-tale', 'loguetown'],
        emblem: { motif: 'skull', crossed: 'swords', backing: 'none', field: '#121214', ink: '#efe8d8' }
    },
    {
        id: 'straw-hat-pirates',
        name: 'The Straw Hat Pirates',
        epithet: 'A crew of ten, each with a dream',
        description: [
            'A small crew gathered one by one across the seas: a swordsman, a navigator, a sniper, a cook, a doctor, an archaeologist, a shipwright, a musician and a helmsman, under a captain who wants to be the freest man on the sea.',
            'They have fought a warlord, the World Government and an Emperor, and their captain is now counted among the Emperors himself.'
        ],
        captain: 'monkey-d-luffy',
        members: ['monkey-d-luffy', 'roronoa-zoro', 'nami', 'usopp', 'sanji', 'tony-tony-chopper', 'nico-robin', 'franky', 'brook', 'jinbe'],
        ships: ['going-merry', 'thousand-sunny'],
        faction: 'four-emperors',
        home: 'east-blue',
        emblem: { motif: 'skull', crossed: 'bones', backing: 'ring', field: '#121214', ink: '#efe8d8', accent: '#d9b84a' }
    },
    {
        id: 'whitebeard-pirates',
        name: 'The Whitebeard Pirates',
        epithet: 'A family of sixteen divisions',
        description: 'The crew of the strongest man in the world, in sixteen divisions with a commander each, and a fleet of allied crews besides. Every one of them was a son to their captain, and an attack on one was an attack on all.',
        captain: 'edward-newgate',
        members: ['edward-newgate', 'marco', 'portgas-d-ace', 'jozu', 'vista', 'marshall-d-teach'],
        ship: 'moby-dick',
        faction: 'four-emperors',
        territory: 'fish-man-island',
        emblem: { motif: 'skull', crossed: 'bones', backing: 'cross', field: '#1b1626', ink: '#efe8d8', accent: '#8a7aa8' }
    },
    {
        id: 'red-hair-pirates',
        name: 'The Red Hair Pirates',
        epithet: 'An Emperor\'s crew, slow to fight and hard to stop',
        description: 'Shanks\'s crew: easy-going in a tavern, terrifying at sea. When they sailed into Marineford, the war ended.',
        captain: 'shanks',
        members: ['shanks'],
        ship: 'red-force',
        faction: 'four-emperors',
        emblem: { motif: 'skull', crossed: 'swords', backing: 'none', band: '#a8231b', field: '#121214', ink: '#efe8d8' }
    },
    {
        id: 'blackbeard-pirates',
        name: 'The Blackbeard Pirates',
        epithet: 'Ten titanic captains',
        description: 'Blackbeard\'s crew, gathered from among the worst prisoners of the great prison during the war, who rose to an Emperor\'s crew within two years.',
        captain: 'marshall-d-teach',
        members: ['marshall-d-teach'],
        faction: 'four-emperors',
        emblem: { motif: 'skull', crossed: 'bones', backing: 'star', field: '#0e0e10', ink: '#d8d0c0', accent: '#4a3a5a' }
    },
    {
        id: 'beasts-pirates',
        name: 'The Beasts Pirates',
        epithet: 'An army of beasts, ruling a closed country',
        description: 'Kaido\'s crew, which held the country of Wano in an iron grip from his island fortress until the raid that ended it.',
        captain: 'kaido',
        members: ['kaido'],
        faction: 'four-emperors',
        territory: 'wano',
        emblem: { motif: 'skull', crossed: 'axes', backing: 'sun', field: '#2a1e2e', ink: '#efe8d8', accent: '#8a5a2a' }
    },
    {
        id: 'big-mom-pirates',
        name: 'The Big Mom Pirates',
        epithet: 'A family crew of sweets and souls',
        description: 'Big Mom\'s crew, most of it her own children, ruling a nation of islands made of cake and candy.',
        captain: 'charlotte-linlin',
        members: ['charlotte-linlin'],
        faction: 'four-emperors',
        territory: 'whole-cake-island',
        emblem: { motif: 'skull', crossed: 'none', backing: 'star', field: '#2a1a26', ink: '#f2e8e8', accent: '#d86a8a' }
    },
    {
        id: 'rocks-pirates',
        name: 'The Rocks Pirates',
        epithet: 'The most dangerous crew of their age',
        description: 'A crew of rivals who fought each other as often as anyone else, held together only by their captain. Whitebeard, Big Mom and Kaido all sailed in it. It was destroyed at God Valley.',
        captain: 'rocks-d-xebec',
        members: ['rocks-d-xebec', 'edward-newgate', 'charlotte-linlin', 'kaido'],
        emblem: { motif: 'skull', crossed: 'axes', backing: 'none', field: '#16120e', ink: '#c9bfa8' }
    }
];

export const factions = [
    {
        id: 'marines',
        name: 'The Marines',
        epithet: 'The Navy of the World Government',
        description: [
            'The navy that keeps the World Government\'s order on every sea, from small coastal bases to the great fortress that was its headquarters.',
            'Each officer wears the coat of their rank over the shoulders, and each has their own idea of what justice means.'
        ],
        leader: 'sengoku',
        members: ['sengoku', 'monkey-d-garp', 'sakazuki', 'kuzan', 'borsalino', 'smoker', 'coby'],
        locations: ['marineford', 'impel-down'],
        emblem: { motif: 'anchor', field: '#f1efe8', ink: '#1e2f55', accent: '#3a6aa8' }
    },
    {
        id: 'four-emperors',
        name: 'The Four Emperors',
        epithet: 'The four pirates who rule the New World',
        description: [
            'Four pirate captains so strong that the seas of the New World are divided between them. At the time of the war at Marineford they were Whitebeard, Shanks, Kaido and Big Mom.',
            'Whitebeard\'s seat went to Blackbeard after the war; after the raid on Wano, Kaido\'s and Big Mom\'s went to Luffy and to Buggy.'
        ],
        members: ['edward-newgate', 'shanks', 'kaido', 'charlotte-linlin', 'marshall-d-teach', 'monkey-d-luffy', 'buggy'],
        crews: ['whitebeard-pirates', 'red-hair-pirates', 'beasts-pirates', 'big-mom-pirates', 'blackbeard-pirates', 'straw-hat-pirates'],
        locations: ['wano', 'whole-cake-island', 'fish-man-island'],
        emblem: { motif: 'skull', crossed: 'none', backing: 'star', field: '#16120e', ink: '#e8dcc0', accent: '#b8862a' }
    }
];
