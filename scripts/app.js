import { resetProject } from './control.js';
import { initializeUi } from './input.js';
import { loadSettings } from './settings.js';
import { initializeSettingsUi } from './settings-ui.js';

function initializeApp() {
    loadSettings();
    initializeUi();
    resetProject(false);
    initializeSettingsUi();
}

initializeApp();
