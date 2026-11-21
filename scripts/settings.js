const STORAGE_KEY = 'shasavistic-chord-editor:settings:v1';

export const DIMENSION_LABELS = ['0D', '1D', '2D', '3D', '4D', '5D', '6D', '7D'];
export const PRIME_LABELS = ['2', '3', '5', '7', '11', '13', '17'];

const AXES = [
    [0],
    [1],
    [-1, 1],
    [-2, 0, 1],
    [-2, 0, 0, 1],
    [-2, 0, 0, 0, 1],
    [-2, 0, 0, 0, 0, 1],
    [-2, 0, 0, 0, 0, 0, 1],
];

const AXIS_COLORS = [
    '#ffffff',
    '#aaaaaa',
    '#f27992',
    '#6cd985',
    '#b598ee',
    '#ffc247',
    '#b5b500',
    '#ed9877',
];

const SELECT_DIMENSION_HOTKEYS = ['0', '1', '2', '3', '4', '5', '6', '7'];

function field(group, path, label, type, value, options = {}) {
    return { group, path, label, type, default: value, ...options };
}

function axisFields() {
    return DIMENSION_LABELS.flatMap((label, dim) => PRIME_LABELS.map((prime, index) => field(
        'Axes',
        `axes.${dim}.${index}`,
        `${label} · p${prime}`,
        'number',
        AXES[dim][index] ?? 0,
        { min: -9, max: 9, step: 1, effect: 'defs', digitsOnly: true }
    )));
}

function arrayField(group, path, labels, type, values, options = {}) {
    return labels.map((label, i) => field(group, `${path}.${i}`, label, type, values[i], options));
}

export const settingFields = [
    field('General', 'octaveScale', 'Octave scale', 'number', 120, { min: 20, max: 400, step: 1, effect: 'redraw' }),
    field('General', 'chordsBgColor', 'Chord background', 'color', '#676681', { effect: 'redraw' }),

    ...axisFields(),
    ...arrayField('Colors', 'axisColors', DIMENSION_LABELS, 'color', AXIS_COLORS, { effect: 'defs' }),

    ...arrayField('Hotkeys', 'hotkeys.selectDimension', DIMENSION_LABELS, 'text', SELECT_DIMENSION_HOTKEYS, { maxLength: 1, effect: 'none' }),
    field('Hotkeys', 'hotkeys.selectPitchEditor', 'Pitch editor', 'text', '`', { maxLength: 1, effect: 'none' }),
    field('Hotkeys', 'hotkeys.selectAscent', 'Ascent', 'text', 'a', { maxLength: 1, effect: 'none' }),
    field('Hotkeys', 'hotkeys.selectDescent', 'Descent', 'text', 'd', { maxLength: 1, effect: 'none' }),
    field('Hotkeys', 'hotkeys.switchDirection', 'Switch direction', 'text', 'q', { maxLength: 1, effect: 'none' }),

    field('Preview opacity', 'previewBarAddOpacity', 'Added bar', 'number', 0.5, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),
    field('Preview opacity', 'previewBarDelOpacity', 'Removed bar', 'number', 0.5, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),
    field('Preview opacity', 'barLowOpacity', 'Low-opacity bar', 'number', 0.5, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),

    field('Pitch and interval bars', 'pitchLineWidth', 'Pitch line width', 'number', 2, { min: 0.5, max: 20, step: 0.5, effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchLineColor', 'Pitch line color', 'color', '#ffffff', { effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchLineSelectedWidth', 'Selected pitch width', 'number', 4, { min: 0.5, max: 20, step: 0.5, effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchLineSelectedColor', 'Selected pitch color', 'color', '#ffffff', { effect: 'redraw' }),
    field('Pitch and interval bars', 'intervalBarWidth', 'Interval bar width', 'number', 8, { min: 1, max: 40, step: 1, effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchDashLength', 'Dash length', 'number', 5, { min: 1, max: 40, step: 1, effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchDashSpace', 'Dash space', 'number', 5, { min: 1, max: 40, step: 1, effect: 'redraw' }),
    field('Pitch and interval bars', 'pitchLowOpacity', 'Low-opacity pitch', 'number', 0.5, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),

    field('Key area', 'tonicLineWidth', 'Tonic line width', 'number', 2, { min: 0.5, max: 20, step: 0.5, effect: 'redraw' }),
    field('Key area', 'keyAreaLineWidth', 'Key area line width', 'number', 2, { min: 0.5, max: 20, step: 0.5, effect: 'redraw' }),
    field('Key area', 'tonicLineOpacity', 'Tonic line opacity', 'number', 0.5, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),
    field('Key area', 'primaryLineOpacity', 'Primary line opacity', 'number', 0.4, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),
    field('Key area', 'secondaryLineOpacity', 'Secondary line opacity', 'number', 0.3, { min: 0, max: 1, step: 0.05, effect: 'redraw' }),
    field('Key area', 'leftPadding', 'Left padding', 'number', 50, { min: 0, max: 500, step: 1, effect: 'redraw' }),
    field('Key area', 'rightPadding', 'Right padding', 'number', 51, { min: 0, max: 500, step: 1, effect: 'redraw' }),

    field('Navigation', 'autoScrollToNewChord', 'Auto-scroll to new chord', 'boolean', true, { effect: 'none' }),

    field('Chord rendering', 'chordWidth', 'Chord width', 'number', 70, { min: 10, max: 300, step: 1, effect: 'redraw' }),
    field('Chord rendering', 'chordSpacing', 'Chord spacing', 'number', 75, { min: 0, max: 300, step: 1, effect: 'redraw' }),

    field('Chord input', 'deleteEmptyChord', 'Delete empty chord', 'boolean', true, { effect: 'none' }),
    field('Chord input', 'nullInputDistance', 'Null input distance', 'number', 30, { min: 0, max: 200, step: 1, effect: 'none' }),

    field('Viewport', 'vertPadding', 'Vertical padding', 'number', 5, { min: 0, max: 100, step: 1, effect: 'refit' }),
    field('Viewport', 'horizPadding', 'Horizontal padding', 'number', 0, { min: 0, max: 100, step: 1, effect: 'refit' }),
];

const fieldsByPath = new Map(settingFields.map((descriptor) => [descriptor.path, descriptor]));

export const settings = {};

function getPath(target, path) {
    return path.split('.').reduce((value, part) => value?.[part], target);
}

function setPath(target, path, value) {
    const parts = path.split('.');
    let current = target;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined || current[parts[i]] === null) {
            current[parts[i]] = /^\d+$/.test(parts[i + 1]) ? [] : {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function coerceValue(rawValue, descriptor) {
    switch (descriptor.type) {
        case 'number': {
            const number = Number(rawValue);
            if (!Number.isFinite(number)) return getPath(settings, descriptor.path);
            const bounded = Math.min(descriptor.max ?? Infinity, Math.max(descriptor.min ?? -Infinity, number));
            if (!descriptor.step) return bounded;
            return Number((Math.round(bounded / descriptor.step) * descriptor.step).toFixed(6));
        }
        case 'boolean':
            return Boolean(rawValue);
        case 'color': {
            const color = String(rawValue).trim().toLowerCase();
            return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : getPath(settings, descriptor.path);
        }
        case 'text': {
            const text = String(rawValue ?? '');
            return descriptor.maxLength ? text.slice(0, descriptor.maxLength) : text;
        }
        default:
            return rawValue;
    }
}

export function setSetting(path, rawValue) {
    const descriptor = fieldsByPath.get(path);
    if (!descriptor) {
        if (getPath(settings, path) === undefined) return undefined;
        setPath(settings, path, rawValue);
        return rawValue;
    }
    const value = coerceValue(rawValue, descriptor);
    setPath(settings, path, value);
    return value;
}

export function getSetting(path) {
    return getPath(settings, path);
}

export function loadSettings() {
    let data;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) return;
        data = JSON.parse(stored);
    } catch (error) {
        console.warn('Could not load settings:', error);
        return;
    }
    if (data === null || typeof data !== 'object') return;
    for (const descriptor of settingFields) {
        if (Object.prototype.hasOwnProperty.call(data, descriptor.path)) {
            setSetting(descriptor.path, data[descriptor.path]);
        }
    }
}

export function saveSettings() {
    try {
        const data = {};
        for (const descriptor of settingFields) {
            data[descriptor.path] = getPath(settings, descriptor.path);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save settings:', error);
    }
}

export function resetSettings() {
    for (const key of Object.keys(settings)) delete settings[key];
    Object.assign(settings, structuredClone(initialSettings));
    saveSettings();
}

for (const descriptor of settingFields) {
    setPath(settings, descriptor.path, descriptor.default);
}
settings.finalSectionRightBuffer = 500;

const initialSettings = structuredClone(settings);
