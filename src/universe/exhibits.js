// exhibits.js - An exhibit standing for something of a universe: a scene says only which entity it
// shows ({ entity: 'mara-vell', model, at }), and the words come from the universe: its kind (in the
// universe's own vocabulary), its name and epithet, its story, and, worked out at the moment it is
// examined, what it is connected to, where those things can be found from here, and a key to press to
// go to each of them.
//
// entityExhibit(exhibit, universe, connections) -> an exhibit definition for createExhibit()
// (src/museum/exhibit.js); the exhibit's own fields win over the entity's.
export function entityExhibit(exhibit, universe, connections = null) {
    const entity = universe.get(exhibit.entity);
    if (!entity) throw new Error(`Exhibit "${exhibit.id}" shows "${exhibit.entity}", which "${universe.id}" doesn't have`);
    const placard = () => {
        const described = universe.describe(entity.id, { hint: other => connections?.hint(other) ?? null });
        // Something that only stands for an entity shown elsewhere (a poster of someone whose figure is
        // across the room) first offers the way to the thing itself
        if (exhibit.anchor === false && connections?.route(entity)) {
            described.entries.unshift({ title: 'Find', items: [{ id: entity.id, text: entity.name }] });
        }
        const content = connections ? connections.withLinks(described) : described;
        const linked = connections?.visibleFrom(entity.id) ?? 0;
        const elsewhere = content.entries?.some(entry => entry.items?.some(item => item.key && item.travel));
        const footer = content.links?.length ? `Press a number to go there${elsewhere ? ' · dashed: in another place' : ''}` : linked ? 'Threads of light lead to what it is connected to' : '';
        return {
            ...content,
            body: exhibit.description ?? content.body,
            footer: exhibit.footer ?? footer
        };
    };
    // The model is told which entity it shows, so it can take its look from the data (a figure's
    // costume, a crew's emblem, a ship's colours)
    const model = typeof exhibit.model === 'string' ? { name: exhibit.model } : exhibit.model;
    return {
        id: exhibit.id ?? entity.id,
        type: exhibit.type ?? entity.kind,
        label: universe.label(entity.kind),
        title: entity.name,
        meta: entity.epithet,
        ...exhibit,
        model: { ...model, params: { entity, ...model.params } },
        placard
    };
}
