import * as control from './control.js';
import { viewport } from './renderer.js';

export function initializeUi() {
    addViewportMouseListeners();
    addKeyPressListener();
    addWindowResizeListener();
    addMenuButtonClickListeners();
    addSaveLoadClickListeners();
}

function addViewportMouseListeners() {
    viewport.addEventListener('mousemove', (event) => {
        control.handleMouseMove(event.offsetX, event.offsetY);
    });
    viewport.addEventListener('click', (event) => {
        control.handleMouseClick(event.offsetX, event.offsetY);
    });
}

function addKeyPressListener() {
    document.addEventListener('keypress', (event) => {
        control.handleKeyPress(event.key);
    });
}

function addWindowResizeListener() {
    window.addEventListener('resize', (event) => {

    });
}

function addMenuButtonClickListeners() {
    Array.prototype.forEach.call(document.getElementsByClassName('axis-button'), (el) => {
        el.addEventListener('click', () => {
            control.setSelectedDim(Number(el.getAttribute('dim')));
        })
    });

    document.getElementById('pitch-editor-button').addEventListener('click', () => {
        control.setInputMode('pitch');
    })

    document.getElementById('button-ascent').addEventListener('click', () => {
        control.setSelectedDir(1);
    });

    document.getElementById('button-descent').addEventListener('click', () => {
        control.setSelectedDir(-1);
    });

    document.getElementById('settings-button').addEventListener('click', () => {

    });

    document.getElementById('volume-button').addEventListener('click', () => {

    });
}

function addSaveLoadClickListeners() {
    document.getElementById('save-a').addEventListener('click', async () => {

    });

    document.getElementById('load-a').addEventListener('click', async () => {

    });
}