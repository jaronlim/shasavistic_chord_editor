import { buildAxesGrid } from './axes-settings-ui.js';
import { recomputeFinalSectionRightBuffer } from './control.js';
import { build1dAscentSymbol } from './defs.js';
import { refitSvgContent, reloadViewport } from './renderer.js';
import { getSettingValue, resetProjectSettings, resetSettings, saveSettings, setSettingValue, settingFields } from './settings.js';

const controllers = {
    number: {
        create(descriptor) {
            const input = document.createElement('input');
            input.type = 'number';
            if (descriptor.min !== undefined) input.min = descriptor.min;
            if (descriptor.max !== undefined) input.max = descriptor.max;
            if (descriptor.step !== undefined) input.step = descriptor.step;
            return input;
        },
        read(input) {
            return input.value === '' ? NaN : input.value;
        },
        write(input, value) {
            input.value = value;
        },
    },
    color: {
        create() {
            const input = document.createElement('input');
            input.type = 'color';
            return input;
        },
        read(input) {
            return input.value;
        },
        write(input, value) {
            input.value = value;
        },
    },
    boolean: {
        create() {
            const input = document.createElement('input');
            input.type = 'checkbox';
            return input;
        },
        read(input) {
            return input.checked;
        },
        write(input, value) {
            input.checked = value;
        },
    },
    text: {
        create(descriptor) {
            const input = document.createElement('input');
            input.type = 'text';
            if (descriptor.maxLength) input.maxLength = descriptor.maxLength;
            return input;
        },
        read(input) {
            return input.value.toLowerCase();
        },
        write(input, value) {
            input.value = value;
        },
    },
};

const bindings = [];
const pendingEffects = new Set();
let effectFrame = null;

function isValidInput(descriptor, input) {
    return !descriptor.digitsOnly || /^[0-9-]+$/.test(input.value);
}

function commit(descriptor, input, controller, writeBack = false) {
    if (!isValidInput(descriptor, input)) {
        if (writeBack) controller.write(input, getSettingValue(descriptor));
        return;
    }
    const value = setSettingValue(descriptor, controller.read(input, descriptor));
    if (writeBack) controller.write(input, value);
    if (descriptor.scope !== 'project') saveSettings();
    syncInputs(input);
    scheduleEffect(descriptor.effect);
}

function bindInput(input, descriptor) {
    const controller = controllers[descriptor.type];
    input.addEventListener('input', () => commit(descriptor, input, controller));
    input.addEventListener('change', () => commit(descriptor, input, controller, true));
}

export function syncInputs(except = null) {
    for (const { input, descriptor } of bindings) {
        if (input === except) continue;
        controllers[descriptor.type].write(input, getSettingValue(descriptor));
    }
}

function scheduleEffect(effect) {
    if (effect === 'redraw' && pendingEffects.has('defs')) return;
    if (effect === 'defs') pendingEffects.delete('redraw');
    pendingEffects.add(effect);
    if (effectFrame !== null) return;
    effectFrame = requestAnimationFrame(() => {
        effectFrame = null;
        const effects = [...pendingEffects];
        pendingEffects.clear();
        for (const queued of effects) applyEffect(queued);
    });
}

function applyEffect(effect) {
    switch (effect) {
        case 'redraw':
            recomputeFinalSectionRightBuffer();
            reloadViewport();
            break;
        case 'defs':
            build1dAscentSymbol();
            recomputeFinalSectionRightBuffer();
            reloadViewport();
            break;
        case 'refit':
            refitSvgContent();
            break;
    }
}

function buildGroupHeader(group) {
    const row = document.createElement('tr');
    const header = document.createElement('th');
    header.colSpan = 2;
    header.className = 'settings-group-header';
    header.textContent = group;
    row.appendChild(header);
    return row;
}

export function createSettingInput(descriptor) {
    const input = controllers[descriptor.type].create(descriptor);
    input.id = `setting-${descriptor.path.replace(/\./g, '-')}`;
    bindings.push({ input, descriptor });
    bindInput(input, descriptor);
    return input;
}

function buildFieldRow(descriptor, tbody) {
    const row = document.createElement('tr');
    if (/\.\d+(?:\.|$)/.test(descriptor.path)) row.classList.add('settings-array-row');

    const keyCell = document.createElement('td');
    keyCell.className = 'settings-key-column';
    keyCell.textContent = descriptor.label;

    const valueCell = document.createElement('td');
    valueCell.appendChild(createSettingInput(descriptor));

    row.append(keyCell, valueCell);
    tbody.appendChild(row);
}

function buildResetButton(getActiveSection) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'reset-settings-button';
    button.addEventListener('click', () => {
        if (getActiveSection() === 'project') resetProjectSettings();
        else resetSettings();
        syncInputs();
        scheduleEffect('defs');
    });
    return button;
}

function buildSettingsPanel(id, labelledBy, content) {
    const panel = document.createElement('section');
    panel.id = id;
    panel.className = 'settings-tab-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', labelledBy);
    panel.appendChild(content);
    return panel;
}

function buildTabs(onSelect) {
    const definitions = [
        { key: 'global', id: 'settings-global-tab', label: 'Global settings', panelId: 'settings-global-panel' },
        { key: 'project', id: 'settings-project-tab', label: 'Project settings', panelId: 'settings-project-panel' },
    ];

    const tabList = document.createElement('div');
    tabList.id = 'settings-tabs';
    tabList.className = 'settings-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Settings sections');

    const tabs = definitions.map((definition, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.id = definition.id;
        tab.className = 'settings-tab';
        tab.textContent = definition.label;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', definition.panelId);
        tab.tabIndex = -1;
        tab.addEventListener('click', () => selectTab(index));
        tabList.appendChild(tab);
        return tab;
    });

    function selectTab(index, focus = false) {
        tabs.forEach((tab, tabIndex) => {
            const selected = tabIndex === index;
            tab.classList.toggle('selected-button', selected);
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        onSelect(definitions[index].key);
        if (focus) tabs[index].focus();
    }

    tabList.addEventListener('keydown', (event) => {
        const currentIndex = tabs.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;

        event.preventDefault();
        selectTab(nextIndex, true);
    });

    selectTab(0);
    return tabList;
}

export function initializeSettingsUi() {
    const popover = document.getElementById('settings-popover');
    const table = document.createElement('table');
    table.id = 'settings-table';

    const groups = new Map();
    for (const descriptor of settingFields) {
        let tbody = groups.get(descriptor.group);
        if (!tbody) {
            tbody = document.createElement('tbody');
            tbody.appendChild(buildGroupHeader(descriptor.group));
            groups.set(descriptor.group, tbody);
            table.appendChild(tbody);
        }
        buildFieldRow(descriptor, tbody);
    }

    const globalPanel = buildSettingsPanel('settings-global-panel', 'settings-global-tab', table);
    const projectPanel = buildSettingsPanel('settings-project-panel', 'settings-project-tab', buildAxesGrid(createSettingInput));

    let activeSection = 'global';
    const resetButton = buildResetButton(() => activeSection);
    const tabList = buildTabs((section) => {
        activeSection = section;
        globalPanel.hidden = section !== 'global';
        projectPanel.hidden = section !== 'project';
        resetButton.textContent = section === 'project' ? 'Reset project settings' : 'Reset global settings';
    });

    popover.replaceChildren(tabList, globalPanel, projectPanel, resetButton);
    syncInputs();
}
