import { activeProject } from './chord.js';
import * as control from './control.js';
import { build1dAscentSymbol } from './defs.js';
import { refitSvgContent, viewport, viewportContainer } from './renderer.js';
import { settings } from './settings.js';

export function initializeUi() {
    addViewportMouseListeners();
    addKeyPressListener();
    addWindowResizeListener();
    addMenuButtonClickListeners();
    addSaveLoadClickListeners();

    build1dAscentSymbol();
}

function addViewportMouseListeners() {
    viewport.addEventListener('mousemove', (event) => {
        control.handleMouseMove(event.offsetX + settings.horizPadding, event.offsetY - settings.vertPadding);
    });
    viewport.addEventListener('click', (event) => {
        control.handleMouseClick(event.offsetX + settings.horizPadding, event.offsetY - settings.vertPadding);
    });
    viewport.addEventListener('mouseleave', (event) => {
        control.refreshPreview();
    });
}

function addKeyPressListener() {
    document.addEventListener('keypress', (event) => {
        control.handleKeyPress(event.key);
    });
}

function addWindowResizeListener() {
    window.addEventListener('resize', (event) => {
        settings.finalSectionRightBuffer = viewportContainer.clientWidth - settings.chordWidth - settings.leftPadding - settings.rightPadding;
        activeProject.sections[activeProject.sections.length - 1].refitKeyArea();
        refitSvgContent();
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
        control.handleVolumeButtonClick();
    });
}

function addSaveLoadClickListeners() {
    document.getElementById('save-a').addEventListener('click', async () => {
        await control.saveProjectAsFile(activeProject);
    });

    document.getElementById('load-a').addEventListener('click', async () => {
        control.loadProjectFromFile();
    });
}