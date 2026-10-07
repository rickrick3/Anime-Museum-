// main.js - The Virtual Anime Museum. Sets up the renderer and the visitor (the first-person player:
// body, head, hands, gaze and interactions), the sound, the museum and its exhibitions, and runs
// the loop. What the museum contains is content (src/content/); how it is built is src/museum/.
//
//   App
//    ├── Player      src/player/ (movement, camera, hands) + src/interactions/ (gaze, focus, E)
//    ├── Museum      src/museum/ (lobby, galleries, exhibitions, exhibits, placards, transitions)
//    ├── Universe    src/universe/ (an anime universe as data: characters, factions, vehicles,
//    │               locations, artifacts, events, legendary moments; and what makes them places)
//    ├── World       src/scenery/ (ground, sky, light, effects, pieces) + src/environment/ (the
//    │               world answering the visitor) + src/soundscape.js, src/sounds/ and src/footsteps.js
//    └── Content     src/content/ (the museum's words, and one folder per exhibition or universe)
import * as THREE from 'three';
import { inject } from '@vercel/analytics';
import { PlayerController } from './player/playerController.js';
import { AmbientAudio } from './audio.js';
import { Footsteps } from './footsteps.js';
import { Renderer, getQuality } from './render.js';
import { InteractionPrompt } from './interactions/interactionPrompt.js';
import { Environment } from './environment/environment.js';
import { EnvironmentSounds } from './environment/environmentSounds.js';
import { StoryText } from './story.js';
import { Soundscape } from './soundscape.js';
import './sounds/maritime.js'; // The sea's ambiences and cues (a gallery's doorway lets them leak into the lobby)
import { Museum } from './museum/museum.js';
import { Placard } from './museum/placard.js';
import { Transition } from './museum/transition.js';
import museumContent from './content/museum.js';
import { exhibitions } from './content/exhibitions/index.js';

// Initialize Vercel Web Analytics
inject();

const INTERACTION_DISTANCE = 3; // Metres from the eye at which things can be examined
const parameters = new URLSearchParams(window.location.search);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1200);
scene.add(camera); // The first-person hands hang from it
const quality = getQuality();
const renderer = new Renderer(scene, camera, quality);

// The visitor stands nowhere until the museum opens and gives them a floor
const nowhere = { groundHeightAt: () => 0, bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, isFirmGround: () => true, surfaceAt: () => 'stone' };
const player = new PlayerController(camera, document.body, nowhere, { scene, interaction: { distance: INTERACTION_DISTANCE } });
renderer.addViewModel(player.hands.camera);

// Sound: steps on whatever the floor is, the small sounds of things answering, each world's ambience
const audio = new AmbientAudio();
const footsteps = new Footsteps(audio);
player.onStep = step => footsteps.step(step);
player.onLand = strength => footsteps.land(strength, player.surface);
const soundscape = new Soundscape(audio, camera);

// The world noticing the visitor (plants that lean away, rustle at your steps...)
const environment = new Environment({ player, world: { heightAt: () => 0, lightColor: target => target.set(0.6, 0.6, 0.65) }, scene, low: quality.low });
new EnvironmentSounds(audio, environment, camera);

// What is drawn over the view
const ui = {
    entrance: document.getElementById('entrance'),
    crosshair: document.getElementById('crosshair'),
    prompt: document.getElementById('interaction-prompt'),
    story: document.getElementById('story'),
    volume: document.getElementById('volume-slider')
};
new InteractionPrompt(player.interaction, { element: ui.prompt, crosshair: ui.crosshair });
const storyText = new StoryText(ui.story);
const placard = new Placard(document.getElementById('placard'), camera, {
    canFollow: () => player.isLocked && !museum.travelling // A placard's links: only while in the world, not mid-journey
});
const transition = new Transition(document.getElementById('transition'), camera);

const museum = new Museum({
    host: { scene, camera, renderer, player, interaction: player.interaction, environment, soundscape },
    services: { placard, transition, storyText },
    content: museumContent,
    quality
});
exhibitions.forEach(exhibition => museum.registerExhibition(exhibition));

// Opening: build the lobby, then wait for a click to step in (it locks the mouse and starts the sound)
let welcomed = false;
museum.open().then(() => {
    document.body.classList.add('ready');
}).catch(error => {
    console.error('The museum could not open', error);
    ui.entrance.querySelector('.entrance-action').textContent = 'The museum could not open. Please reload the page.';
});

document.addEventListener('click', event => {
    if (event.target.closest('.settings')) return; // The volume control can be used without grabbing the mouse
    if (!document.body.classList.contains('ready') || player.isLocked) return;
    player.lock();
    audio.start();
});

player.pointerLock.addEventListener('lock', () => {
    document.body.classList.add('locked');
    document.body.classList.remove('paused');
    if (!welcomed) {
        welcomed = true;
        setTimeout(() => storyText.show(museumContent.welcomeLine, 7), 1200);
    }
});
player.pointerLock.addEventListener('unlock', () => {
    document.body.classList.remove('locked');
    document.body.classList.add('paused');
});

audio.setUserVolume(Number(ui.volume.value));
ui.volume.addEventListener('input', () => audio.setUserVolume(Number(ui.volume.value)));

// Development only (left out of production builds): ?debug shows what the gaze rests on
let interactionDebug = null;
if (import.meta.env.DEV && parameters.has('debug')) {
    import('./interactions/interactionDebug.js').then(({ InteractionDebug }) => {
        interactionDebug = new InteractionDebug(player.interaction, environment);
    });
}

// The loop
const clock = new THREE.Clock();
renderer.renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1); // A paused tab doesn't make a huge jump
    const elapsed = clock.elapsedTime;
    player.update(delta);
    environment.update(delta);
    museum.update(delta, elapsed);
    soundscape.update(delta);
    storyText.update(delta);
    interactionDebug?.update(delta);
    renderer.render();
});

// Dev-only handle for the browser console (stripped from production builds), e.g.
// museumApp.museum.enterExhibition('<exhibition id>'), then museumApp.museum.visit('<scene id>')
if (import.meta.env.DEV) {
    window.museumApp = { museum, scene, camera, player, renderer: renderer.renderer, interaction: player.interaction, environment, soundscape };
}
