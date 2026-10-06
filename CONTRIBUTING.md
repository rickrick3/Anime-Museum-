# Contributing

Thank you for wanting to help build the museum. This page covers how to get set up, what makes
a change easy to accept, and the rules about content.

## Ways to help

- **Report a bug or propose an idea** in an issue.
- **Add or improve an exhibition.** Original worlds are especially welcome. See
  [docs/exhibitions.md](docs/exhibitions.md).
- **Add scenery pieces and exhibit models** to the catalogue (`src/scenery/`).
- **Work on the engine**: performance, accessibility, touch controls, anything on the
  [roadmap](ROADMAP.md).

For anything larger than a small fix, open an issue first so the approach can be agreed before
you spend time on it.

## Getting set up

You need Node.js 18, 20, or 22 and later.

```bash
git clone <your fork's URL>
cd <the folder it creates>
npm install
npm run dev
```

The museum is at `http://localhost:5173/` and the desert parable at
`http://localhost:5173/mirage.html`. In the dev server, `museumApp` (or `mirage`) in the browser
console gives you the running systems, and `?debug` shows what the gaze rests on.

## Before you open a pull request

There is no test suite or linter yet. The checks are the build and your own walk through what
you changed.

- `npm run build` finishes without errors.
- You have walked through the change in the browser, and the console is clean.
- If you touched shared code (`src/player/`, `src/interactions/`, `src/environment/`,
  `src/render.js`, `src/audio.js`, `src/footsteps.js`, `src/story.js`), you have checked both
  pages: the museum and `mirage.html`.
- It still works with `?quality=low`.
- The pull request does one thing, says what changed and how you checked it, and includes a
  screenshot or short clip if the change is visible.

## Content rules

These protect the project and everyone who contributes to it. A pull request that breaks one
cannot be merged.

1. **No ripped, official or fan-made assets.** No models, textures, logos, flags or jolly rogers,
   map art, screenshots, music, voice clips or character likenesses from any series. What the
   museum shows is original: built from primitives, painted on a canvas, or synthesized.
2. **The engine stays series-free.** Code in `src/universe/`, `src/museum/`, `src/scenery/`,
   `src/player/`, `src/interactions/` and `src/environment/` never names a series, a character or
   a place. Those names live only as data inside a content pack
   (`src/content/exhibitions/<id>/`), so a pack can be removed or replaced without touching the
   engine.
3. **Write the words yourself.** Descriptions are written for the museum. Do not copy text from
   official material, wikis or fan sites.
4. **Third-party assets need a licence that allows redistribution.** If a model, font or sound is
   not your own work, open an issue before adding it, and record its source and licence in the
   pack's README and in the main README's credits.
5. **A pack that uses an existing series' names needs a legal note**, like the one in the
   [One Piece pack's README](src/content/exhibitions/one-piece/README.md). Whether the project
   ships such packs is the maintainers' decision, and that question is still open. Original
   worlds, like Shadow Ninja, raise no such question and are the easiest to accept.

## Code style

- Plain ES modules, built with Vite. No framework. The only runtime dependencies are `three` and
  `astronomy-engine`; please discuss before adding another.
- Four spaces, single quotes, semicolons. Match the file you are in.
- Every file starts with a comment that says what it is and how it fits in:
  `// placard.js - The museum's label for what you are looking at: ...`. Keep that up when you
  add a file. Other comments say why, not what.
- Content is plain data, so that it could come from JSON later. Keep logic in the engine.
- Build worlds when someone heads for them and free what they made on the GPU when they are left.
- Development-only code goes behind `import.meta.env.DEV` so it is left out of production builds.

## Commits and pull requests

Branch from `main`. Write a short subject line that says what the commit does
("Add the Soul Reapers world"); a `feat:` or `fix:` prefix is fine but not required.

## Licence of contributions

The project is released under the [MIT licence](LICENSE). By opening a pull request you agree
that your contribution is released under the same licence, and you confirm that it is your own
work or that you have the right to submit it.
