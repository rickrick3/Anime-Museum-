# The player, interactions and the environment

These three systems are shared by both pages: the museum (`index.html`, `src/main.js`) and the
desert parable (`mirage.html`, `src/mirage/main.js`). None of them knows what world it is in.

In the dev server each page exposes its systems in the browser console: `museumApp` on the
museum (`museumApp.museum`, `.player`, `.interaction`, `.environment`, `.soundscape`) and `mirage`
on the desert. Adding `?debug` to either URL shows what the gaze rests on and what is near. None
of this is in a production build.

## Files

```text
src/player/
  playerController.js  The player: input, and the order its parts update in each frame
  pointerLock.js       Pointer Lock API (Esc releases, click locks again)
  firstPersonCamera.js Mouse look: the body turns (yaw), the head tilts (pitch, clamped)
  movement.js          Movement and sand physics: climbing, sliding, sinking, wading, jumping, collisions
  movementState.js     idle / walking / sprinting / sliding / jumping / falling / landing, with change events
  breathing.js         One uneven breath, quicker after hurrying, shared by the head and hands
  headBob.js           The head's motion: gait, breathing when still, a nod on landing
  gait.js              Natural head motion while walking (step rhythm, sway, roll)
  spring.js            Critically damped spring used by the head and hands
  hands.js             First-person hands: rest pose and procedural motion
  handModel.js         The low-poly hand and linen sleeve
  guide.js             A few steps taken for the visitor: up a gangplank, through a door
src/interactions/
  interaction.js       Noticing things: focus state machine, E to interact, events, context
  gaze.js              What the crosshair rests on: centre ray plus a little tolerance, registered things only
  occlusion.js         Whether something solid (a trunk, a rock, a dune) hides it from view
  bounds.js            Bounding spheres that follow moving things cheaply
  interactable.js      The contract every interactable thing follows (createInteractable)
  interactionRegistry.js  The things that can be interacted with
  focusHighlight.js    The gentle edge light on what is in focus (never touches its materials)
  interactionPrompt.js The "E  Examine" prompt and the crosshair's focused ring
  interactionDebug.js  Dev only (?debug): what the gaze rests on
  testInteractables.js Dev only: a test stone and flower near the desert's start
src/environment/
  environment.js       The world noticing the player: proximity, footsteps, landings, touches, events
  reactive.js          The contract for things that respond to the player (createReactive)
  responses.js         How they move: Sway (plants), Tip (stones); springs that always settle
  vegetation.js        The desert's shrubs and the oasis flowers as reactive plants
  sandResponse.js      The sand under the feet: footprints, grains and dust for steps, landings, slides
  particles.js         Pooled dust puffs, pollen and dry bits, one draw call
  spatialGrid.js       Reactive things sorted into cells, so only nearby ones are looked at
  environmentSounds.js Rustle, stone and sand sounds made in the browser, played from the events
```

## The player

`PlayerController` owns the player's parts and updates them in order each frame: the body
moves (`Movement`), its state is worked out once (`MovementState`), then the breath, head and
hands follow from that state. Other systems read the player only through the controller:
`player.position`, `player.state.current`, `player.slide`, the `step` and `land` events
(`player.addEventListener('step', ({ step }) => ...)`, also the `onStep` / `onLand` hooks), and
`player.state.addEventListener('change', ...)` or `player.pointerLock.addEventListener('lock' | 'unlock', ...)`.

The hands are children of the camera on their own layer (`VIEW_MODEL_LAYER`), drawn in a
second pass after clearing depth, so they never sink into the world. The world's lights are
enabled on that layer too; a light added later needs `light.layers.enable(VIEW_MODEL_LAYER)`
to light the hands.

In the dev server, `museumApp.player.state.current` (or `mirage.player.state.current`) shows the
movement state.

## Interactions

Things become interactable by registering them; the interaction system never knows what
they are, it only calls their own hooks:

```js
const stone = player.interaction.register({
    id: 'old-stone',              // for code and debugging, never shown
    object: stoneMesh,            // the Object3D the gaze can rest on
    prompt: 'Examine',            // shown under the crosshair
    onFocus(context) {},          // optional
    onBlur(context) {},           // optional
    interact(context) {           // E; may return a promise for a longer interaction
        console.log(context.distance, context.movementState);
    }
});
player.interaction.unregister(stone);
```

`context` has `player`, `camera`, `scene`, `hands`, `interaction`, `target`, `distance`,
`point`, `eye`, `position`, `direction` and `movementState`. Other options: `maxDistance`,
`repeatable` (holding E repeats), `cooldown` (seconds before E works on it again, default 0.25),
`highlight` (default on), `enabled`, and `dynamic: true` for things that move (their bounds then
follow them each frame, cheaply; a static thing that was moved can call `updateBounds()`).

The gaze tests only registered things, within `INTERACTION_DISTANCE` (3 m, set in each page's
`main.js`) of the eye, and only while the pointer is locked. Something solid in the way hides
what is behind it. In the desert those are the world's solids (palm trunks, the old tree, larger
rocks; `world.solids`) and the dunes. In the museum each space adds its own solids
(`src/museum/space.js`). `player.interaction.occlusion.enabled = false` switches that off, and
`occlusion.addBlocker(object)` adds more. Listen with `player.interaction.addEventListener(type, ...)`
for `focus`, `blur`, `targetchange`, `interact` and `interactend` (each with `interactable`);
`player.interaction.target` and `.state` (`none`, `focused`, `interacting`) say where things stand.

In the museum you rarely register anything by hand: exhibits, doors and doorways described in an
exhibition's data are registered by the space they stand in.

## The environment

Things that respond to the player's presence register with the environment; nothing in the
player knows about them. The desert's shrubs and the oasis flowers are registered this way
(`registerVegetation`, called from `src/mirage/main.js`): they lean away when you come near,
shiver at your steps and landings, and settle back.

```js
import { Sway } from './environment/responses.js';

const bush = environment.registerReactive({
    id: 'bush',
    object: bushMesh,
    reactionRadius: 1,             // metres: "near" for enter / leave
    response: new Sway(bushMesh),  // how it moves (or Tip, for something heavy)
    sound: 'rustle',               // for the audio hooks
    onProximity(context) {},       // optional: onLeaveProximity, onStepNearby, onLandNearby
});
environment.unregisterReactive(bush);
```

An interactable can take the same options (`response`, `reactionRadius`, `onProximity`, ...,
plus `interactStrength` for how much E moves it): the environment picks it up while it is
registered. The environment's events are the hooks for sound and anything later: `playerenter`,
`playerleave`, `stepnearby`, `landnearby`, `react` (something moved: `cause` is `proximity`,
`step`, `land` or `interact`) and `sand` (sand disturbed). In `?quality=low` there are fewer
particles, they fade sooner, and pollen and dry bits are left out.
