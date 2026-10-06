// The people of the One Piece hall. Plain data: who they are, where they belong, how they are related,
// and how the museum shows them. Names and story facts are the series' own (see ../README.md: their use
// needs the project owner's legal decision); every description is written for this museum, and every
// figure is an original faceless mannequin told apart only by build, costume, colours and what it
// carries (see src/scenery/mannequin.js). No official likeness, artwork or model is used.
//
// figure: { build, height, stance, arms, hold, swords, coat, shorts, hat, hair, extras, palette }
// bounty: as printed on the museum's own poster layout (see ./universe.js for the currency mark)

const MARINE_COAT = { coat: '#f1efe8', trim: '#c8c2b4' };

export const characters = [
    // ---- The Roger Pirates ----
    {
        id: 'gol-d-roger',
        name: 'Gol D. Roger',
        epithet: 'The King of the Pirates',
        role: 'Captain',
        bounty: '5,564,800,000',
        description: [
            'The only captain ever to sail the whole Grand Line and set foot on its last island. Whatever he found there, he laughed at it.',
            'He was executed in the town where he was born. His last words, about a treasure left for anyone bold enough to find it, sent a generation to sea.'
        ],
        crew: 'roger-pirates',
        origin: 'loguetown',
        locations: ['laugh-tale', 'god-valley'],
        relationships: [
            { with: 'monkey-d-garp', as: 'rival', inverse: 'rival' },
            { with: 'edward-newgate', as: 'rival', inverse: 'rival' },
            { with: 'portgas-d-ace', as: 'son', inverse: 'father' }
        ],
        figure: {
            build: 'broad', coat: 'long', hat: 'bicorne', hair: 'short', swords: 1,
            arms: { right: 'point', left: 'hip' },
            palette: { coat: '#9c1f1c', trim: '#d9b25a', shirt: '#e9e2d2', pants: '#2a2c34', hat: '#1e1c1f', band: '#d9b25a', hair: '#2a1d16' }
        }
    },
    {
        id: 'silvers-rayleigh',
        name: 'Silvers Rayleigh',
        epithet: 'The Dark King',
        role: 'First mate',
        description: [
            'Roger\'s right hand, and the steadiest blade on the Oro Jackson. After the crew scattered he settled on the Sabaody Archipelago as a ship-coater, and kept his past to himself.',
            'While a young captain\'s crew spent two years apart, he taught him to use the strength he already had.'
        ],
        crew: 'roger-pirates',
        locations: ['sabaody'],
        relationships: [
            { with: 'gol-d-roger', as: 'his captain', inverse: 'first mate' },
            { with: 'monkey-d-luffy', as: 'student', inverse: 'teacher' }
        ],
        figure: {
            build: 'slim', height: 1.06, coat: 'cape', hair: 'long', extras: ['glasses'], swords: 1,
            arms: { right: 'hip', left: 'rest' },
            palette: { coat: '#d9d4c6', shirt: '#4a4a52', pants: '#3a3a40', hair: '#e8e4da', metal: '#c8c8c8' }
        }
    },
    {
        id: 'scopper-gaban',
        name: 'Scopper Gaban',
        epithet: 'Senior hand of the Oro Jackson',
        role: 'Combatant',
        description: 'One of the strongest of Roger\'s crew, who fought beside his captain and first mate in their hardest battles. He carried an axe in one hand and stood his ground with it.',
        crew: 'roger-pirates',
        figure: {
            build: 'broad', coat: 'short', hair: 'long',
            arms: { right: 'shoulder', left: 'rest' }, hold: { right: 'axe' },
            palette: { coat: '#4a3a2a', shirt: '#c9bfa8', pants: '#2b2f38', hair: '#1a1714' }
        }
    },
    {
        id: 'crocus',
        name: 'Crocus',
        epithet: 'Ship\'s doctor of the Oro Jackson',
        role: 'Doctor',
        description: 'The doctor who kept a dying captain alive long enough to finish his voyage. Long afterward he kept the lighthouse at the foot of Reverse Mountain, where every crew entering the Grand Line passes.',
        crew: 'roger-pirates',
        locations: ['reverse-mountain'],
        figure: {
            build: 'slim', coat: 'long', hair: 'none',
            arms: { right: 'behind', left: 'behind' },
            palette: { coat: '#e9e6dc', trim: '#9ab0c0', shirt: '#7a8fa0', pants: '#3a3a40' }
        }
    },
    {
        id: 'kozuki-oden',
        name: 'Kozuki Oden',
        epithet: 'Samurai of Wano',
        role: 'Swordsman',
        description: [
            'A samurai from Wano who could not bear to stay inside its borders. He sailed first with Whitebeard and then with Roger, all the way to the last island.',
            'He came home to find his country under Kaido\'s rule, and gave his life trying to free it.'
        ],
        crew: 'roger-pirates',
        origin: 'wano',
        relationships: [
            { with: 'edward-newgate', as: 'first captain' },
            { with: 'kaido', as: 'enemy', inverse: 'enemy' }
        ],
        figure: {
            build: 'broad', height: 1.1, coat: 'robe', hair: 'tied',
            arms: { right: 'raised', left: 'forward-low' }, hold: { right: 'sword', left: 'sword' },
            palette: { coat: '#2f3b5a', trim: '#c9a04a', sash: '#c9a04a', shirt: '#2f3b5a', pants: '#2f3b5a', hair: '#1a1714' }
        }
    },
    {
        id: 'buggy',
        name: 'Buggy',
        epithet: 'Buggy the Clown',
        role: 'Captain; once an apprentice on the Oro Jackson',
        bounty: '3,189,000,000',
        description: 'A cabin boy on Roger\'s ship alongside Shanks, who grew up to lead his own crew, broke out of the great prison with Luffy, and through a run of luck and bluster ended up counted among the Four Emperors.',
        crew: 'roger-pirates',
        affiliation: 'four-emperors',
        relationships: [{ with: 'shanks', as: 'old shipmate', inverse: 'old shipmate' }],
        figure: {
            build: 'average', coat: 'long', hat: 'tricorne', hair: 'tied',
            palette: { coat: '#4a6aa8', trim: '#e8c56a', hat: '#4a6aa8', hair: '#4a7ab8', shirt: '#e9e2d2' }
        }
    },

    // ---- The Straw Hat Pirates ----
    {
        id: 'monkey-d-luffy',
        name: 'Monkey D. Luffy',
        epithet: 'Straw Hat',
        role: 'Captain',
        bounty: '3,000,000,000',
        description: [
            'A boy from Foosha Village whose body stretches like rubber, who put to sea at seventeen to become King of the Pirates.',
            'He wears the straw hat a pirate left in his keeping, and means to give it back once he has become a great one himself.'
        ],
        crew: 'straw-hat-pirates',
        affiliation: 'four-emperors',
        origin: 'foosha-village',
        locations: ['alabasta', 'enies-lobby', 'impel-down', 'marineford', 'wano'],
        relationships: [
            { with: 'monkey-d-garp', as: 'grandfather', inverse: 'grandson' },
            { with: 'portgas-d-ace', as: 'sworn brother', inverse: 'sworn brother' },
            { with: 'shanks', as: 'gave him his straw hat', inverse: 'left his hat with him' }
        ],
        moments: ['summit-war'],
        figure: {
            build: 'average', coat: 'vest', shorts: true, hat: 'straw', hair: 'short', stance: 'wide',
            arms: { right: 'fist-forward', left: 'hip' }, extras: ['sash'],
            palette: { coat: '#b8231c', trim: '#b8231c', pants: '#2f4f8a', boots: '#6b4a2a', hat: '#e3c46a', band: '#a8231b', hair: '#141210', sash: '#d9b84a' }
        }
    },
    {
        id: 'roronoa-zoro',
        name: 'Roronoa Zoro',
        epithet: 'Pirate Hunter',
        role: 'Swordsman',
        bounty: '1,111,000,000',
        description: 'A swordsman who fights with three blades, one of them in his teeth, and who has sworn to become the greatest in the world. He was the first to join Luffy, and has never once found his way anywhere on his own.',
        crew: 'straw-hat-pirates',
        origin: 'east-blue',
        figure: {
            build: 'broad', coat: 'none', hair: 'short', swords: 3, extras: ['sash'],
            arms: { right: 'crossed', left: 'crossed' },
            palette: { shirt: '#e9e6dc', pants: '#1e1e22', sash: '#3d7a3a', hair: '#4f8a4a', boots: '#1e1e22' }
        }
    },
    {
        id: 'nami',
        name: 'Nami',
        epithet: 'Cat Burglar',
        role: 'Navigator',
        bounty: '366,000,000',
        description: 'A navigator who can read the weather of the Grand Line before it happens, and draws her charts as she goes: her dream is to map the whole world. She fights with a staff that makes weather of its own.',
        crew: 'straw-hat-pirates',
        origin: 'east-blue',
        figure: {
            build: 'slim', coat: 'none', hair: 'long', sleeves: 'short',
            arms: { right: 'staff', left: 'hip' }, hold: { right: 'staff' },
            palette: { shirt: '#5f9fd0', pants: '#2f4f8a', hair: '#e07a2a', metal: '#3a6ab0', trim: '#e8c56a' }
        }
    },
    {
        id: 'usopp',
        name: 'Usopp',
        epithet: 'God Usopp',
        role: 'Sniper',
        bounty: '500,000,000',
        description: 'A teller of tall tales from a village in the East Blue, who wants to become a brave warrior of the sea. He never misses with his slingshot, and he was given the crew\'s first ship by a friend at home.',
        crew: 'straw-hat-pirates',
        origin: 'east-blue',
        figure: {
            build: 'slim', coat: 'none', hat: 'bandana', hair: 'short', extras: ['goggles', 'belt'],
            arms: { right: 'point', left: 'rest' }, hold: { right: 'slingshot' },
            palette: { shirt: '#c9b48a', pants: '#6a4a2a', hat: '#4a6a3a', band: '#d9b84a', hair: '#141210', wood: '#7a5232' }
        }
    },
    {
        id: 'sanji',
        name: 'Sanji',
        epithet: 'Black Leg',
        role: 'Cook',
        bounty: '1,032,000,000',
        description: 'A cook who learned his trade on a floating restaurant and fights only with his feet, to keep his hands for cooking. He looks for the legendary sea where every kind of fish in the world can be caught.',
        crew: 'straw-hat-pirates',
        origin: 'north-blue',
        figure: {
            build: 'slim', height: 1.04, coat: 'suit', hair: 'swept',
            arms: { right: 'pocket', left: 'pocket' },
            palette: { coat: '#1c1c22', shirt: '#4a6a9a', pants: '#1c1c22', hair: '#e8cf6a', boots: '#151518' }
        }
    },
    {
        id: 'tony-tony-chopper',
        name: 'Tony Tony Chopper',
        epithet: 'Cotton Candy Lover',
        role: 'Doctor',
        bounty: '1,000',
        description: 'A reindeer who ate a fruit that let him think and talk like a person, and became a doctor so that no one would die of an illness he could have cured. Praise him and he will insist it doesn\'t make him happy at all, dancing as he says it.',
        crew: 'straw-hat-pirates',
        figure: {
            build: 'small', height: 1.1, coat: 'none', shorts: true, hat: 'top', hair: 'none', extras: ['antlers'],
            arms: { right: 'wave', left: 'rest' },
            palette: { skin: '#7a5232', shirt: '#7a5232', pants: '#c86a3a', hat: '#e889a8', band: '#2a3a8a', wood: '#c9a77a', boots: '#3a2a1e' }
        }
    },
    {
        id: 'nico-robin',
        name: 'Nico Robin',
        epithet: 'Devil Child',
        role: 'Archaeologist',
        bounty: '930,000,000',
        description: 'The last scholar of an island burned for studying the forbidden history of the world. She can read the ancient stones no one else can, and joined a crew that went to war to keep her.',
        crew: 'straw-hat-pirates',
        origin: 'west-blue',
        locations: ['enies-lobby'],
        figure: {
            build: 'slim', height: 1.06, coat: 'long', hair: 'long',
            arms: { right: 'crossed', left: 'crossed' },
            palette: { coat: '#3a2a4a', trim: '#6a5a8a', shirt: '#2a2a32', pants: '#2a2a32', hair: '#141218' }
        }
    },
    {
        id: 'franky',
        name: 'Franky',
        epithet: 'Iron Man',
        role: 'Shipwright',
        bounty: '394,000,000',
        description: 'A shipwright from Water 7 who rebuilt his own body with machinery, and built the crew\'s second ship from the wood of a treasure tree. He means to see the ship he made sail to the end of the world.',
        crew: 'straw-hat-pirates',
        origin: 'water-7',
        figure: {
            build: 'broad', height: 1.08, coat: 'vest', shorts: true, hair: 'crest', extras: ['forearms', 'glasses'],
            arms: { right: 'fist-up', left: 'hip' },
            palette: { coat: '#e8743a', trim: '#e8743a', pants: '#2a4a8a', hair: '#3a8ad8', skin: '#c9a080', metal: '#1c1c22', boots: '#3a2a1e' }
        }
    },
    {
        id: 'brook',
        name: 'Brook',
        epithet: 'Soul King',
        role: 'Musician',
        bounty: '383,000,000',
        description: 'A musician who died at sea and came back as a skeleton, and drifted alone in the fog for fifty years on a ghost ship. He keeps a promise to an old friend: to sail around the world and come back to it.',
        crew: 'straw-hat-pirates',
        origin: 'west-blue',
        figure: {
            build: 'slim', height: 1.22, coat: 'suit', hat: 'top', hair: 'afro',
            arms: { right: 'rest', left: 'behind' }, hold: { right: 'cane' },
            palette: { skin: '#e8e2d2', coat: '#16161a', shirt: '#c9c2b0', pants: '#16161a', hat: '#16161a', band: '#c9a04a', hair: '#141210', wood: '#2a2a2e' }
        }
    },
    {
        id: 'jinbe',
        name: 'Jinbe',
        epithet: 'Knight of the Sea',
        role: 'Helmsman',
        bounty: '1,100,000,000',
        description: 'A whale shark fish-man and a master of fish-man karate, once a Warlord of the Sea. He stood beside Luffy at Marineford, carried him out of the war alive, and later joined his crew at the helm.',
        crew: 'straw-hat-pirates',
        origin: 'fish-man-island',
        locations: ['marineford', 'impel-down'],
        relationships: [{ with: 'edward-newgate', as: 'friend and protector of his island' }],
        moments: ['summit-war'],
        figure: {
            build: 'heavy', height: 1.16, coat: 'robe', hair: 'tied',
            arms: { right: 'crossed', left: 'crossed' },
            palette: { skin: '#5f86a8', coat: '#c86a2a', trim: '#2a3a5a', sash: '#2a3a5a', shirt: '#c86a2a', pants: '#2a3a5a', hair: '#141210' }
        }
    },

    // ---- The Whitebeard Pirates ----
    {
        id: 'edward-newgate',
        name: 'Edward Newgate',
        epithet: 'Whitebeard',
        role: 'Captain',
        bounty: '5,046,000,000',
        description: [
            'Called the strongest man in the world, with a power that could crack the air and shake the sea. Of all the treasure in the world he wanted only a family, and called every member of his crew his son.',
            'He sailed his whole fleet into Marineford to bring one of them home, and died there on his feet.'
        ],
        crew: 'whitebeard-pirates',
        affiliation: 'four-emperors',
        territory: 'fish-man-island',
        relationships: [
            { with: 'portgas-d-ace', as: 'son by choice', inverse: 'father by choice' },
            { with: 'marco', as: 'son by choice', inverse: 'father by choice' }
        ],
        moments: ['summit-war'],
        figure: {
            build: 'heavy', height: 1.85, coat: 'cape', bare: true, hat: 'bandana', hair: 'short', extras: ['sash'],
            arms: { right: 'polearm', left: 'hip' }, hold: { right: 'polearm' },
            palette: { coat: '#efece4', skin: '#c9b090', pants: '#3a4a6a', sash: '#2a2a32', hat: '#1d1d1f', hair: '#e8e4da', wood: '#3a2a1e', metal: '#d8dce0' }
        }
    },
    {
        id: 'marco',
        name: 'Marco',
        epithet: 'Marco the Phoenix',
        role: 'Commander of the 1st division',
        bounty: '1,374,000,000',
        description: 'Whitebeard\'s first division commander, who can become a phoenix of blue fire that heals as it burns. After his captain\'s death he went home to the island Whitebeard was born on and became its doctor.',
        crew: 'whitebeard-pirates',
        figure: {
            build: 'slim', coat: 'vest', hair: 'crest', extras: ['sash'],
            arms: { right: 'raised', left: 'hip' }, hold: { right: 'flame' },
            palette: { coat: '#6a4a8a', trim: '#6a4a8a', pants: '#3a3a44', sash: '#3a6ab0', hair: '#e8cf6a', glow: '#3ab8ff' }
        }
    },
    {
        id: 'portgas-d-ace',
        name: 'Portgas D. Ace',
        epithet: 'Fire Fist',
        role: 'Commander of the 2nd division',
        bounty: '550,000,000',
        description: [
            'A man made of fire, raised with Luffy as a brother in the mountains above Foosha Village. He hated whose son he was, and found the father he wanted in Whitebeard.',
            'Captured by the Navy and sentenced to die, he became the reason for the greatest war of the age.'
        ],
        crew: 'whitebeard-pirates',
        locations: ['foosha-village', 'impel-down', 'marineford'],
        moments: ['summit-war'],
        relationships: [{ with: 'marshall-d-teach', as: 'the man he hunted', inverse: 'his hunter' }],
        figure: {
            build: 'average', coat: 'none', bare: true, shorts: true, hat: 'cowboy', hair: 'short', extras: ['belt'],
            arms: { right: 'fist-up', left: 'hip' }, hold: { right: 'flame' },
            palette: { skin: '#d6b08a', pants: '#1c1c22', boots: '#1c1c22', hat: '#e07a2a', band: '#b8231c', hair: '#141210', glow: '#ff8a2a' }
        }
    },
    {
        id: 'jozu',
        name: 'Jozu',
        epithet: 'Diamond Jozu',
        role: 'Commander of the 3rd division',
        description: 'A giant of a man who can turn his body to diamond. At Marineford he threw an iceberg at an admiral.',
        crew: 'whitebeard-pirates',
        figure: {
            build: 'heavy', height: 1.3, coat: 'short', hair: 'none',
            arms: { right: 'crossed', left: 'crossed' },
            palette: { skin: '#b8d4e8', coat: '#5a4a3a', trim: '#5a4a3a', shirt: '#b8d4e8', pants: '#3a3a40' }
        }
    },
    {
        id: 'vista',
        name: 'Vista',
        epithet: 'Flower Sword',
        role: 'Commander of the 5th division',
        description: 'A swordsman with a blade in each hand and roses falling where he fights. At Marineford he crossed swords with the world\'s greatest swordsman and held him.',
        crew: 'whitebeard-pirates',
        figure: {
            build: 'average', coat: 'long', hat: 'top', hair: 'short',
            arms: { right: 'forward-low', left: 'forward-low' }, hold: { right: 'sabre', left: 'sabre' },
            palette: { coat: '#6a2a3a', trim: '#c9a04a', hat: '#1c1c22', band: '#c9a04a', pants: '#2a2a32', hair: '#141210' }
        }
    },

    // ---- The Emperors ----
    {
        id: 'shanks',
        name: 'Shanks',
        epithet: 'Red Hair',
        role: 'Captain',
        bounty: '4,048,900,000',
        description: [
            'A cabin boy on Roger\'s ship who became one of the Four Emperors. He gave his left arm to save a boy from a sea king, and left the boy his straw hat.',
            'He ended the war at Marineford by sailing into the middle of it and saying it was over.'
        ],
        crew: 'red-hair-pirates',
        affiliation: 'four-emperors',
        locations: ['foosha-village', 'marineford'],
        moments: ['summit-war'],
        figure: {
            build: 'average', coat: 'cape', hair: 'short', swords: 1,
            arms: { right: 'hip', left: 'none' },
            palette: { coat: '#1c1c22', shirt: '#e9e2d2', pants: '#5a4a3a', hair: '#b8261c', boots: '#2a1d16' }
        }
    },
    {
        id: 'kaido',
        name: 'Kaido',
        epithet: 'King of the Beasts',
        role: 'Captain',
        bounty: '4,611,100,000',
        description: 'Called the strongest creature in the world, a man who could become a dragon and who could not be killed, though many tried. For twenty years he ruled the country of Wano from his island fortress, until a straw hat brought him down.',
        crew: 'beasts-pirates',
        affiliation: 'four-emperors',
        territory: 'wano',
        figure: {
            build: 'heavy', height: 2.0, coat: 'cape', bare: true, hair: 'long', extras: ['horns', 'sash'],
            arms: { right: 'shoulder', left: 'hip' }, hold: { right: 'club' },
            palette: { coat: '#4a3a5a', skin: '#c9a080', pants: '#6a5a4a', sash: '#c9a04a', hair: '#141210', trim: '#e8e2d2', metal: '#3a3a3e' }
        }
    },
    {
        id: 'charlotte-linlin',
        name: 'Charlotte Linlin',
        epithet: 'Big Mom',
        role: 'Captain',
        bounty: '4,388,000,000',
        description: 'The ruler of an archipelago of sweets in the New World, who can take a soul from anyone afraid of her and give it to the things around her. She dreams of a country where every race lives at one table.',
        crew: 'big-mom-pirates',
        affiliation: 'four-emperors',
        territory: 'whole-cake-island',
        figure: {
            build: 'heavy', height: 1.9, coat: 'dress', hat: 'bicorne', hair: 'long',
            arms: { right: 'raised', left: 'hip' },
            palette: { coat: '#d86a8a', trim: '#f2e8e8', hat: '#3a2a2e', hair: '#e8899a', skin: '#e0c0a8' }
        }
    },
    {
        id: 'marshall-d-teach',
        name: 'Marshall D. Teach',
        epithet: 'Blackbeard',
        role: 'Captain',
        bounty: '3,996,000,000',
        description: 'He served under Whitebeard for years waiting for one fruit, killed a crewmate to take it, and handed Ace to the Navy. At the end of the war he took Whitebeard\'s power for his own, and in time his place among the Emperors.',
        crew: 'blackbeard-pirates',
        affiliation: 'four-emperors',
        moments: ['summit-war'],
        figure: {
            build: 'heavy', height: 1.12, coat: 'long', hat: 'bandana', hair: 'short',
            arms: { right: 'point', left: 'rest' }, hold: { right: 'pistol' },
            palette: { coat: '#1a1a1e', trim: '#4a3a5a', shirt: '#e9e2d2', pants: '#3a3a40', hat: '#6a1e1e', hair: '#141210' }
        }
    },
    {
        id: 'rocks-d-xebec',
        name: 'Rocks D. Xebec',
        epithet: 'Captain of the Rocks Pirates',
        role: 'Captain',
        description: 'The captain of a crew of monsters who could not stand one another, among them three future Emperors. His ambition to rule the world ended at God Valley, against a pirate and a marine fighting together.',
        crew: 'rocks-pirates',
        locations: ['god-valley']
    },

    // ---- The Marines ----
    {
        id: 'monkey-d-garp',
        name: 'Monkey D. Garp',
        epithet: 'The Hero of the Marines',
        role: 'Vice admiral',
        description: [
            'A marine who refused promotion again and again so that he could stay at sea and keep punching pirates. He chased Roger for years, and fought beside him once.',
            'He raised his grandson Luffy, and Ace too, hoping both would become marines. Neither did.'
        ],
        affiliation: 'marines',
        origin: 'foosha-village',
        locations: ['god-valley', 'marineford'],
        relationships: [
            { with: 'portgas-d-ace', as: 'raised him', inverse: 'raised by him' },
            { with: 'coby', as: 'student', inverse: 'teacher' }
        ],
        moments: ['summit-war'],
        figure: {
            build: 'broad', height: 1.08, coat: 'cape', hair: 'short', extras: ['epaulettes'],
            arms: { right: 'fist-up', left: 'hip' },
            palette: { ...MARINE_COAT, shirt: '#3a4a6a', pants: '#2a2f3e', hair: '#d8d8d4' }
        }
    },
    {
        id: 'sengoku',
        name: 'Sengoku',
        epithet: 'The Buddha',
        role: 'Fleet admiral',
        description: 'The fleet admiral who commanded the Navy\'s defence of Marineford and planned the execution that started the war. He stepped down when it was over.',
        affiliation: 'marines',
        locations: ['marineford'],
        moments: ['summit-war'],
        relationships: [{ with: 'monkey-d-garp', as: 'old comrade', inverse: 'old comrade' }],
        figure: {
            build: 'broad', height: 1.12, coat: 'cape', hair: 'afro', extras: ['glasses', 'epaulettes'],
            arms: { right: 'behind', left: 'behind' },
            palette: { ...MARINE_COAT, shirt: '#2a2f3e', pants: '#2a2f3e', hair: '#5a5a5e', trim: '#d9b25a' }
        }
    },
    {
        id: 'sakazuki',
        name: 'Sakazuki',
        epithet: 'Akainu',
        role: 'Admiral, later fleet admiral',
        description: 'The hardest of the admirals, whose justice leaves nothing standing, and whose fists are magma. At Marineford he struck down Ace; after the war he took command of the whole Navy.',
        affiliation: 'marines',
        locations: ['marineford'],
        moments: ['summit-war'],
        figure: {
            build: 'broad', height: 1.12, coat: 'cape', hat: 'cap', hair: 'short',
            arms: { right: 'fist-forward', left: 'rest' }, hold: { right: 'flame' },
            palette: { ...MARINE_COAT, shirt: '#8a1e1e', pants: '#8a1e1e', hat: '#efece4', band: '#1e2f55', hair: '#141210', glow: '#ff3a12' }
        }
    },
    {
        id: 'kuzan',
        name: 'Kuzan',
        epithet: 'Aokiji',
        role: 'Admiral',
        description: 'The admiral of ice, who froze the bay of Marineford and the tidal waves breaking over it. After the war he left the Navy rather than serve under the man who took command of it.',
        affiliation: 'marines',
        locations: ['marineford'],
        moments: ['summit-war'],
        figure: {
            build: 'slim', height: 1.14, coat: 'cape', hair: 'short',
            arms: { right: 'raised', left: 'pocket' }, hold: { right: 'flame' },
            palette: { ...MARINE_COAT, shirt: '#3a6aa8', pants: '#e9e6dc', hair: '#141210', glow: '#9fe8ff' }
        }
    },
    {
        id: 'borsalino',
        name: 'Borsalino',
        epithet: 'Kizaru',
        role: 'Admiral',
        description: 'The admiral of light, who moves at its speed and fires it from his fingertips, and who never seems to be taking anything quite seriously.',
        affiliation: 'marines',
        locations: ['marineford', 'sabaody'],
        moments: ['summit-war'],
        figure: {
            build: 'slim', height: 1.12, coat: 'cape', hair: 'short', extras: ['glasses'],
            arms: { right: 'point', left: 'pocket' }, hold: { right: 'flame' },
            palette: { ...MARINE_COAT, shirt: '#e0c040', pants: '#e0c040', hair: '#2a221c', glow: '#fff2a0', metal: '#1c1c22' }
        }
    },
    {
        id: 'smoker',
        name: 'Smoker',
        epithet: 'The White Hunter',
        role: 'Commodore, later vice admiral',
        description: 'A marine made of smoke who first met Luffy in Loguetown and has chased him across the Grand Line since, by his own rules rather than anyone else\'s.',
        affiliation: 'marines',
        locations: ['loguetown', 'alabasta', 'marineford'],
        figure: {
            build: 'broad', coat: 'long', hair: 'short', extras: ['collar'],
            arms: { right: 'polearm', left: 'pocket' }, hold: { right: 'jitte' },
            palette: { coat: '#e6e2d8', trim: '#c9c2b0', shirt: '#2a2a2e', pants: '#3a3a44', hair: '#e8e4da', metal: '#5a5a62' }
        }
    },
    {
        id: 'coby',
        name: 'Coby',
        epithet: 'Hero of Rocky Port',
        role: 'Captain, later rear admiral',
        description: 'Once a frightened cabin boy on a pirate ship, set free by Luffy on his first day at sea, who joined the Navy to become an admiral. At Marineford he stepped in front of an admiral and begged for the war to stop.',
        affiliation: 'marines',
        locations: ['marineford'],
        moments: ['summit-war'],
        relationships: [{ with: 'monkey-d-luffy', as: 'friend', inverse: 'friend' }],
        figure: {
            build: 'slim', coat: 'none', hat: 'cap', hair: 'short',
            arms: { right: 'salute', left: 'rest' },
            palette: { shirt: '#efece4', pants: '#1e2f55', hat: '#efece4', band: '#1e2f55', hair: '#e889a8' }
        }
    }
];
