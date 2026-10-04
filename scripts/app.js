import { settings } from './settings.js';
import { initializeUi } from './input.js';
import { KeyArea, Project, Section } from './chord.js';
import { drawKeyArea, viewportContainer } from './renderer.js';

function initializeApp() {
    initializeUi();
    let project = new Project();
    project.addSection(new Section(new KeyArea(261.63, [2], [4])));
    settings.finalSectionRightBuffer = viewportContainer.clientWidth - settings.chordWidth - settings.leftPadding - settings.rightPadding;
    drawKeyArea(project.sections[0].keyArea);
}

initializeApp();