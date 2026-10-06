// placard.js - The museum's label for what you are looking at: a small glass panel that appears
// beside the exhibit itself, joined to it by a fine line, and stays with it as you move and look
// around. It fades while the exhibit is out of view and is put away once you walk off.
// On narrow screens it rests at the bottom of the view instead. Styles: #placard in index.html.
//
// show(content, { point, range }): content { label, title, meta, body (string or [paragraphs]),
// entries ([{ title, text }, or { title, items: [{ text, note, key }] }]), links ([{ key, go }]),
// footer, accent (CSS colour) }; point: where in the world it belongs (Vector3); range: metres the
// visitor can walk from it before it is put away.
//
// An item with a key is something the visitor can be taken to: its number shows beside it, and
// pressing that number (while canFollow() says the visitor is free to go) follows its link.
import * as THREE from 'three';

const MARGIN = 24; // Pixels kept clear at the edges of the view
const GAP = 64; // Pixels between the exhibit and the panel
const NARROW = 720; // Below this width the panel rests at the bottom

export class Placard {
    // canFollow(): whether a link may be followed now (the visitor is in the world, not mid-journey)
    constructor(element, camera, { canFollow = () => true } = {}) {
        this.element = element;
        this.camera = camera;
        this.canFollow = canFollow;
        this.links = [];
        this.panel = element.querySelector('.placard-panel');
        this.line = element.querySelector('.placard-line');
        this.dot = element.querySelector('.placard-dot');
        this.fields = {
            label: element.querySelector('.placard-label'),
            title: element.querySelector('.placard-title'),
            meta: element.querySelector('.placard-meta'),
            body: element.querySelector('.placard-body'),
            entries: element.querySelector('.placard-entries'),
            footer: element.querySelector('.placard-footer')
        };
        this.point = new THREE.Vector3();
        this.projected = new THREE.Vector3();
        this.toPoint = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.position = { x: 0, y: 0, ready: false };
        this.showing = false;
        this.range = 6;
        this.owner = null;

        // The number keys follow the placard's links
        document.addEventListener('keydown', event => {
            if (!this.showing || !this.links.length || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
            const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
            if (!match || !this.canFollow()) return;
            const link = this.links.find(item => item.key === Number(match[1]));
            if (!link) return;
            this.hide(true);
            Promise.resolve(link.go()).catch(error => console.error('Could not follow the link', error));
        });
    }

    // owner: whoever asked (an exhibit), so it can ask again without the panel flickering
    show(content, { point, range = 6, owner = null }) {
        const { fields } = this;
        fields.label.textContent = content.label ?? '';
        fields.title.textContent = content.title ?? '';
        fields.meta.textContent = content.meta ?? '';
        fields.meta.hidden = !content.meta;
        fields.body.replaceChildren(...[content.body ?? []].flat().map(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            return paragraph;
        }));
        fields.entries.replaceChildren(...(content.entries ?? []).map(entry => {
            const item = document.createElement('li');
            const title = document.createElement('strong');
            title.textContent = entry.title;
            item.append(title, document.createTextNode(' '));
            if (!entry.items) {
                item.append(document.createTextNode(entry.text ?? ''));
                return item;
            }
            // A place every item of the line shares is said once, at its end
            const places = new Set(entry.items.filter(part => !part.more).map(part => part.where ?? null));
            const shared = places.size === 1 && entry.items.length > 1 ? [...places][0] : null;
            entry.items.forEach((part, i) => {
                if (i > 0) item.append(document.createTextNode(', '));
                const span = document.createElement('span');
                span.className = part.key ? 'placard-link' : 'placard-item';
                if (part.key) {
                    const key = document.createElement('kbd');
                    key.textContent = part.key;
                    span.append(key);
                    if (part.travel) span.classList.add('travel');
                }
                span.append(document.createTextNode(part.text));
                const said = part.note ?? [part.relation, shared ? null : part.where].filter(Boolean).join(', ');
                if (said) {
                    const note = document.createElement('em');
                    note.textContent = ` (${said})`;
                    span.append(note);
                }
                if (part.more) span.className = 'placard-more';
                item.append(span);
            });
            if (shared) {
                const note = document.createElement('em');
                note.textContent = ` (${shared})`;
                item.append(note);
            }
            return item;
        }));
        this.links = content.links ?? [];
        fields.entries.hidden = !content.entries?.length;
        fields.footer.textContent = content.footer ?? '';
        fields.footer.hidden = !content.footer;
        this.element.style.setProperty('--placard-accent', content.accent ?? '#9fe8ff');

        if (this.owner !== owner || !this.showing) this.position.ready = false; // Appear in place, don't slide over
        this.owner = owner;
        this.point.copy(point);
        this.range = range;
        this.showing = true;
        this.element.classList.add('open');
        this.element.classList.remove('away');
        this.size = { width: this.panel.offsetWidth, height: this.panel.offsetHeight };
    }

    // immediately: no fade (e.g. when stepping through a doorway)
    hide(immediately = false) {
        if (!this.showing) return;
        this.showing = false;
        this.owner = null;
        this.links = [];
        this.element.classList.toggle('instant', immediately);
        this.element.classList.remove('open', 'away');
        if (immediately) requestAnimationFrame(() => this.element.classList.remove('instant'));
    }

    // playerPosition: where the visitor stands (Vector3)
    update(delta, playerPosition) {
        if (!this.showing) return;
        const { camera, point } = this;
        if (Math.hypot(point.x - playerPosition.x, point.z - playerPosition.z) > this.range) {
            this.hide();
            return;
        }

        // Where the exhibit is on the screen, and whether it is in view at all
        camera.getWorldDirection(this.forward);
        const inFront = this.toPoint.subVectors(point, camera.position).dot(this.forward) > 0.2;
        const projected = this.projected.copy(point).project(camera);
        const width = window.innerWidth, height = window.innerHeight;
        const ax = (projected.x + 1) / 2 * width;
        const ay = (1 - projected.y) / 2 * height;
        const inView = inFront && ax > -width * 0.1 && ax < width * 1.1 && ay > -height * 0.1 && ay < height * 1.1;
        this.element.classList.toggle('away', !inView);

        const narrow = width < NARROW;
        this.element.classList.toggle('docked', narrow);
        if (narrow || !inView) return;

        // Beside the exhibit, on whichever side has room, kept inside the view
        const { width: pw, height: ph } = this.size;
        let px = ax + GAP;
        if (px + pw > width - MARGIN) px = ax - GAP - pw;
        px = THREE.MathUtils.clamp(px, MARGIN, width - MARGIN - pw);
        const py = THREE.MathUtils.clamp(ay - ph * 0.4, MARGIN, height - MARGIN - ph);

        // Ease toward it, so the head's small movements don't shake the text
        const position = this.position;
        if (!position.ready) {
            position.x = px;
            position.y = py;
            position.ready = true;
        } else {
            const follow = 1 - Math.exp(-delta * 12);
            position.x += (px - position.x) * follow;
            position.y += (py - position.y) * follow;
        }
        this.panel.style.transform = `translate(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px)`;
        this.dot.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`;

        // The fine line from the exhibit to the nearer edge of the panel
        const edgeX = position.x > ax ? position.x : position.x + pw;
        const edgeY = THREE.MathUtils.clamp(ay, position.y + 18, position.y + ph - 18);
        const length = Math.hypot(edgeX - ax, edgeY - ay);
        const angle = Math.atan2(edgeY - ay, edgeX - ax);
        this.line.style.width = `${length.toFixed(1)}px`;
        this.line.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px) rotate(${angle.toFixed(4)}rad)`;
    }
}
