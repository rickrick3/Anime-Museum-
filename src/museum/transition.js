// transition.js - Stepping from one world into another: the view widens a little as if pulled
// forward, light of the world ahead floods in and fades to dark, the name of the place you are going
// appears, and then the new world fades in around you. Short: about two seconds in all.
// Styles: #transition in index.html.
//
//   await transition.out({ tint, label, title, tagline })   ...swap worlds while it is dark...
//   await transition.in()
//
// quick: a blink rather than a journey (stepping to another part of the same world): a third of the
// time, no name, no widening of the view.
import { spring } from '../player/spring.js';

const OUT = 0.75; // Seconds to dark
const IN = 1.0; // Seconds back to the world
const QUICK = 0.35; // A blink takes this share of the time
const PULL = 9; // Degrees the view widens

const wait = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000));

export class Transition {
    constructor(element, camera) {
        this.element = element;
        this.camera = camera;
        this.label = element.querySelector('.transition-label');
        this.title = element.querySelector('.transition-title');
        this.tagline = element.querySelector('.transition-tagline');
        this.baseFov = camera.fov;
        this.pull = { x: 0, v: 0 };
        this.pullGoal = 0;
        this.calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        element.style.setProperty('--out', `${OUT}s`);
        element.style.setProperty('--in', `${IN}s`);
    }

    // tint: the colour of the world ahead (CSS); label, title, tagline: what to show while dark
    async out({ tint = '#9fe8ff', label = '', title = '', tagline = '', quick = false } = {}) {
        this.label.textContent = quick ? '' : label;
        this.title.textContent = quick ? '' : title;
        this.tagline.textContent = quick ? '' : tagline;
        this.setSpeed(quick);
        this.element.style.setProperty('--tint', tint);
        this.element.classList.remove('leaving');
        this.element.classList.add('active');
        this.pullGoal = this.calm || quick ? 0 : 1;
        await wait(OUT * (quick ? QUICK : 1));
    }

    async in({ quick = false } = {}) {
        this.setSpeed(quick);
        this.pullGoal = 0;
        this.element.classList.add('leaving');
        this.element.classList.remove('active');
        await wait(IN * (quick ? QUICK : 1));
        this.element.classList.remove('leaving');
    }

    setSpeed(quick) {
        const k = quick ? QUICK : 1;
        this.element.style.setProperty('--out', `${OUT * k}s`);
        this.element.style.setProperty('--in', `${IN * k}s`);
    }

    update(delta) {
        const before = this.pull.x;
        spring(this.pull, this.pullGoal, this.pullGoal > 0 ? 0.35 : 0.25, delta);
        if (Math.abs(this.pull.x - before) < 1e-5) return;
        this.camera.fov = this.baseFov + PULL * this.pull.x;
        this.camera.updateProjectionMatrix();
    }
}
