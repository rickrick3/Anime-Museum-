// What happened, in order; the things that were there; and the moment that can be walked into. Plain
// data. Eras are counted in years of the Great Pirate Era, which began with the Pirate King's execution.

export const events = [
    {
        id: 'god-valley-incident',
        name: 'The God Valley Incident',
        era: '38 years ago',
        description: 'On God Valley a pirate and a marine who had spent years trying to beat each other, Roger and Garp, fought side by side and brought down the Rocks Pirates. Afterward the island was erased from every chart.',
        location: 'god-valley',
        characters: ['gol-d-roger', 'monkey-d-garp', 'rocks-d-xebec', 'edward-newgate', 'charlotte-linlin', 'kaido'],
        crews: ['roger-pirates', 'rocks-pirates']
    },
    {
        id: 'reach-laugh-tale',
        name: 'The Last Island',
        era: 'The Age of Roger',
        description: 'The Roger Pirates became the first and only crew to reach the last island of the Grand Line. What they found there made their captain laugh; he named the island for it.',
        location: 'laugh-tale',
        characters: ['gol-d-roger', 'silvers-rayleigh', 'kozuki-oden', 'scopper-gaban', 'crocus'],
        crews: ['roger-pirates'],
        vehicle: 'oro-jackson'
    },
    {
        id: 'roger-crew-disbands',
        name: 'The Crew Disbands',
        era: 'The Age of Roger',
        description: 'With their voyage done and their captain ill, the Roger Pirates went their separate ways. A year later Roger was in the Navy\'s hands.',
        characters: ['gol-d-roger', 'silvers-rayleigh', 'shanks', 'buggy'],
        crews: ['roger-pirates']
    },
    {
        id: 'roger-execution',
        name: 'The Execution of the Pirate King',
        era: 'Great Pirate Era · Year 0',
        description: 'Gol D. Roger was executed in Loguetown, the town where he was born. Asked about his treasure, he told the crowd that all of it was out there to be found. The sea filled with pirates, and the Great Pirate Era began.',
        location: 'loguetown',
        characters: ['gol-d-roger'],
        crews: ['roger-pirates']
    },
    {
        id: 'luffy-receives-hat',
        name: 'A Straw Hat Kept in Trust',
        era: 'Great Pirate Era · Year 12',
        description: 'In Foosha Village, Shanks lost his left arm saving a boy from a sea king. When his crew sailed on, he left the boy his straw hat, to give back one day when he had become a fine pirate.',
        location: 'foosha-village',
        characters: ['shanks', 'monkey-d-luffy'],
        crews: ['red-hair-pirates']
    },
    {
        id: 'luffy-sets-sail',
        name: 'Luffy Sets Sail',
        era: 'Great Pirate Era · Year 22',
        description: 'At seventeen, Luffy left Foosha Village alone in a small boat, to find a crew and become King of the Pirates.',
        location: 'foosha-village',
        characters: ['monkey-d-luffy'],
        crews: ['straw-hat-pirates']
    },
    {
        id: 'alabasta-war',
        name: 'The Battle for Alabasta',
        era: 'Great Pirate Era · Year 22',
        description: 'The crew crossed the desert to stop a warlord who was driving a kingdom into civil war so he could take it. Luffy beat him on the third try.',
        location: 'alabasta',
        characters: ['monkey-d-luffy', 'roronoa-zoro', 'nami', 'usopp', 'sanji', 'tony-tony-chopper', 'nico-robin', 'smoker'],
        crews: ['straw-hat-pirates']
    },
    {
        id: 'enies-lobby-assault',
        name: 'The Assault on Enies Lobby',
        era: 'Great Pirate Era · Year 22',
        description: 'To take Robin back from the World Government, the crew burned its flag and attacked its island of justice. The Going Merry, too broken to sail, came for them one last time.',
        location: 'enies-lobby',
        characters: ['monkey-d-luffy', 'roronoa-zoro', 'nami', 'usopp', 'sanji', 'tony-tony-chopper', 'nico-robin', 'franky'],
        crews: ['straw-hat-pirates'],
        vehicle: 'going-merry'
    },
    {
        id: 'impel-down-break',
        name: 'The Breakout from Impel Down',
        era: 'Great Pirate Era · Year 22',
        description: 'Luffy broke into the great prison to rescue his brother, arrived too late, and broke out again with an army of escaped prisoners, bound for Marineford.',
        location: 'impel-down',
        characters: ['monkey-d-luffy', 'jinbe', 'buggy', 'portgas-d-ace'],
        crews: ['straw-hat-pirates']
    },
    {
        id: 'marineford-war',
        name: 'The Summit War of Marineford',
        era: 'Great Pirate Era · Year 22',
        description: [
            'The Navy gathered all its strength at its headquarters to execute Portgas D. Ace, and Whitebeard sailed his whole fleet into the bay to bring him home. Luffy fell into the battle from the sky.',
            'Ace was freed, and died protecting his brother. Whitebeard died standing. The war ended when Shanks arrived and said it was over.'
        ],
        location: 'marineford',
        characters: ['edward-newgate', 'portgas-d-ace', 'monkey-d-luffy', 'monkey-d-garp', 'sengoku', 'sakazuki', 'kuzan', 'borsalino', 'marco', 'jozu', 'vista', 'jinbe', 'marshall-d-teach', 'shanks', 'coby', 'smoker', 'buggy'],
        crews: ['whitebeard-pirates', 'red-hair-pirates', 'blackbeard-pirates'],
        faction: 'marines',
        moment: 'summit-war'
    },
    {
        id: 'sixteen-bells',
        name: 'Sixteen Strikes of the Bell',
        era: 'Great Pirate Era · Year 22',
        description: 'Weeks after the war, Luffy came back to Marineford, rang its great bell sixteen times and bowed his head in silence. The photographs carried a message on his arm, meant only for his crew: not yet, in two years.',
        location: 'marineford',
        characters: ['monkey-d-luffy', 'jinbe', 'silvers-rayleigh'],
        crews: ['straw-hat-pirates']
    },
    {
        id: 'sabaody-reunion',
        name: 'Reunion at Sabaody',
        era: 'Great Pirate Era · Year 24',
        description: 'Two years to the day, the crew came back together at the Sabaody Archipelago, each of them stronger, and sailed down under the Red Line into the New World.',
        location: 'sabaody',
        crews: ['straw-hat-pirates'],
        vehicle: 'thousand-sunny'
    },
    {
        id: 'raid-on-onigashima',
        name: 'The Raid on Onigashima',
        era: 'Great Pirate Era · Year 24',
        description: 'Allied with Wano\'s samurai, the crew stormed Kaido\'s island fortress on the night of a festival. Big Mom fell, Kaido fell, and Wano opened its borders. Luffy was named an Emperor.',
        location: 'wano',
        characters: ['monkey-d-luffy', 'roronoa-zoro', 'kaido', 'charlotte-linlin', 'jinbe'],
        crews: ['straw-hat-pirates', 'beasts-pirates', 'big-mom-pirates']
    }
];

// The order of the hall's history, past to present
export const timeline = [
    'god-valley-incident', 'reach-laugh-tale', 'roger-crew-disbands', 'roger-execution', 'luffy-receives-hat', 'luffy-sets-sail',
    'alabasta-war', 'enies-lobby-assault', 'impel-down-break', 'marineford-war', 'sixteen-bells', 'sabaody-reunion', 'raid-on-onigashima'
];

export const artifacts = [
    {
        id: 'straw-hat',
        name: 'The Straw Hat',
        epithet: 'A plain straw hat with a red band',
        description: 'Worn by the Pirate King, given to his apprentice Shanks, and left by Shanks with a boy in Foosha Village. It is still waiting to be given back.',
        owners: ['gol-d-roger', 'shanks', 'monkey-d-luffy'],
        events: ['luffy-receives-hat']
    },
    {
        id: 'log-pose',
        name: 'The Log Pose',
        epithet: 'A compass for a sea without north',
        description: 'No ordinary compass works in the Grand Line. Its islands pull at one another, and a navigator wears this at the wrist: a needle in a glass globe that settles on the next island once it has learned the last one.',
        owners: ['nami'],
        locations: ['reverse-mountain']
    },
    {
        id: 'odens-journal',
        name: 'Kozuki Oden\'s Journal',
        epithet: 'Kept at sea, with Whitebeard and then with Roger',
        description: 'The samurai Kozuki Oden kept a journal of his years at sea, all the way to the last island. Here it lies open in the Oro Jackson\'s cabin; the words on its page are the museum\'s.',
        owner: 'kozuki-oden',
        vehicle: 'oro-jackson',
        events: ['reach-laugh-tale']
    },
    {
        id: 'execution-platform',
        name: 'The Execution Platform',
        epithet: 'Raised before the fortress for one prisoner',
        description: 'Built high on the plaza so the whole bay, and the whole world through the broadcast, could see. The war was fought to reach it.',
        location: 'marineford',
        events: ['marineford-war'],
        characters: ['portgas-d-ace', 'sengoku', 'monkey-d-garp']
    },
    {
        id: 'siege-walls',
        name: 'The Encircling Walls',
        epithet: 'Iron walls that rise from the quay',
        description: 'Sunk into the quay all around the bay, they rose at the height of the war to trap the pirate fleet in the bay, where cannons and admirals could reach it.',
        location: 'marineford',
        events: ['marineford-war']
    },
    {
        id: 'quake-scar',
        name: 'The Scar in the Plaza',
        epithet: 'Where the ground split',
        description: 'Whitebeard\'s power split the paving of the plaza, cutting through the Navy\'s ranks. The museum shows the old fortress with the scar still open, as the war left it.',
        location: 'marineford',
        events: ['marineford-war'],
        characters: ['edward-newgate']
    }
];

export const moments = [
    {
        id: 'summit-war',
        title: 'The Summit War of Marineford',
        universe: 'one-piece',
        location: 'marineford',
        era: 'Great Pirate Era · Year 22',
        epithet: 'The instant the war turned, held still',
        description: [
            'The bay frozen, the sky cracked, burning stones hanging over the ice, two armies caught mid-charge, and on the platform the prisoner they are fighting over.',
            'Walk through it while it is held still, and find the five echoes of how it went.'
        ],
        environment: 'marineford-war',
        participants: ['portgas-d-ace', 'edward-newgate', 'monkey-d-luffy', 'sakazuki', 'kuzan', 'monkey-d-garp', 'sengoku', 'shanks'],
        relatedEvents: ['marineford-war', 'impel-down-break', 'sixteen-bells'],
        event: 'marineford-war'
    }
];
