import { recomputeFinalSectionRightBuffer } from './control.js';
import { build1dAscentSymbol } from './defs.js';
import { refitSvgContent, reloadViewport } from './renderer.js';
import { getSetting, resetSettings, saveSettings, setSetting, settingFields } from './settings.js';

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

function commit(descriptor, input, controller, writeBack = false) {
    const value = setSetting(descriptor.path, controller.read(input, descriptor));
    if (writeBack) controller.write(input, value);
    saveSettings();
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
        controllers[descriptor.type].write(input, getSetting(descriptor.path));
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

function buildFieldRow(descriptor, tbody) {
    const row = document.createElement('tr');
    if (/\.\d+(?:\.|$)/.test(descriptor.path)) row.classList.add('settings-array-row');

    const keyCell = document.createElement('td');
    keyCell.className = 'settings-key-column';
    keyCell.textContent = descriptor.label;

    const valueCell = document.createElement('td');
    const input = controllers[descriptor.type].create(descriptor);
    input.id = `setting-${descriptor.path.replace(/\./g, '-')}`;
    valueCell.appendChild(input);

    row.append(keyCell, valueCell);
    tbody.appendChild(row);

    bindings.push({ input, descriptor });
    bindInput(input, descriptor);
}

function buildResetButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'reset-settings-button';
    button.textContent = 'Reset to defaults';
    button.addEventListener('click', () => {
        resetSettings();
        syncInputs();
        scheduleEffect('defs');
    });
    return button;
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

    popover.replaceChildren(table, buildResetButton());
    syncInputs();
}
