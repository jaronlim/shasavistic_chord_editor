import { settings } from './settings.js';
import { initializeUi } from './input.js';
import { KeyArea, Project, Section } from './chord.js';
import { drawKeyArea, viewportContainer } from './renderer.js';
import { resetProject } from './control.js';

function initializeApp() {
    initializeUi();
    resetProject(false);
}

initializeApp();