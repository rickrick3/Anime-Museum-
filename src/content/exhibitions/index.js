// index.js - The museum's exhibitions. Each folder here is one exhibition:
//
//   <id>/summary.js      what the lobby shows: title, tagline, accent, preview, status (loaded at once)
//   <id>/exhibition.js   its world, once it can be visited (loaded only when someone walks in), or
//   <id>/universe.js     a whole universe: its characters, places, moments... and the scenes that can be
//                        walked into, each loaded only when someone goes there (see src/universe/)
//
// Adding a folder adds a gallery; nothing else needs to change. Content is plain data (no code), so
// it can come from anywhere later: these files, JSON, or a community's own exhibitions.

const summaries = import.meta.glob('./*/summary.js', { eager: true, import: 'default' });
const worlds = import.meta.glob(['./*/exhibition.js', './*/universe.js']);

export const exhibitions = Object.entries(summaries)
    .map(([path, summary]) => {
        const folder = path.replace(/summary\.js$/, '');
        return { ...summary, load: worlds[`${folder}exhibition.js`] ?? worlds[`${folder}universe.js`] ?? null };
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
