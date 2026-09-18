import { MAX_DIMENSION, monzoToRatio } from './utils.js';
import { settings } from './settings.js'
import { drawChord, drawSection, rawToSvgCoords, svgYToFreq, viewport, viewportContainer } from './renderer.js';
import { activeProject, Section, Chord, Pitch } from './chord.js';

export let inputSelections = {
    inputMode: 'interval',
    dim: 2,
    dir: 1
}

export function handleMouseMove(offsetX, offsetY) {
    const coords = rawToSvgCoords(offsetX, offsetY);
    const info = getInfoAtPosition(coords.x, coords.y);
    // TODO
}

export function handleMouseClick(offsetX, offsetY) {
    const coords = rawToSvgCoords(offsetX, offsetY);
    const info = getInfoAtPosition(coords.x, coords.y);

    if (info.newChord) {
        const chord = new Chord(info.nearestRulerLine.monzo);
        chord.inputInterval(chord.rootMonzo, inputSelections.dim, inputSelections.dir === 1);
        info.section.addChord(chord);
    } else if (info.chord) {
        info.chord.inputInterval(info.pitch.monzo, inputSelections.dim, inputSelections.dir === 1);
    }
    drawSection(info.section);
}

export function handleKeyPress(key) {
    const hotkeys = settings.hotkeys;
    
    for (let i = 0; i < hotkeys.selectDimension.length; i++) {
        if (key === hotkeys.selectDimension[i]) {
            setSelectedDim(i);
            return;
        }
    }

    if (key === hotkeys.selectAscent) {
        setSelectedDir(1);
    }

    if (key === hotkeys.selectDescent) {
        setSelectedDir(-1);
    }

    if (key === hotkeys.switchDirection) {
        setSelectedDir(inputSelections.dir * -1);
    }

    if (key === hotkeys.selectPitchEditor) {
        setInputMode('pitch');
    }
}

export function setInputMode(mode) {
    console.assert(mode === 'pitch' || mode === 'interval');
    inputSelections.inputMode = mode;
    const pitchEditButton = document.getElementById('pitch-editor-button');
    switch (mode) {
        case 'pitch':
            const dimButtons = document.querySelectorAll('.axis-button');
            dimButtons.forEach((el) => {
                el.classList.remove('selected-button');
            });
            pitchEditButton.classList.add('selected-button');
            break;
        case 'interval':
            pitchEditButton.classList.remove('selected-button');
            const newSelectedButton = document.getElementById(`button-${inputSelections.dim}d`);
            newSelectedButton.classList.add('selected-button');
            break;
    }
}

export function setSelectedDim(dim) {
    console.assert(0 <= dim && dim <= MAX_DIMENSION, `Invalid dim: ${dim}`);
    inputSelections.dim = dim;

    const dimButtons = document.querySelectorAll('.axis-button');
    dimButtons.forEach((el) => {
        el.classList.remove('selected-button');
        // todo: no need to 'for each' remove class selected-button
        // because there's only one.
    });
    const newSelectedButton = document.getElementById(`button-${dim}d`);
    newSelectedButton.classList.add('selected-button');

    setInputMode('interval');
}

export function setSelectedDir(dir) {
    console.assert(dir == -1 || dir == 1, `Invalid dir: ${dir}`);
    inputSelections.dir = dir;
    
    const ascentButton = document.getElementById('button-ascent');
    const descentButton = document.getElementById('button-descent');
    if (dir == 1) {
        ascentButton.classList.add('selected-button');
        descentButton.classList.remove('selected-button');
    } else {
        ascentButton.classList.remove('selected-button');
        descentButton.classList.add('selected-button');
    }
}

function getInfoAtPosition(svgX, svgY) {
    let info = {
        /** @type {Section | null} */
        section: null,
        /** @type {Chord | null} */
        chord: null,
        /** @type {boolean | null} */
        newChord: false,
        /** @type {Array<number> | undefined} */
        ratioToNearestPitch: undefined,
        /** @type {Pitch | null} */
        pitch: null,
        /** @type {{monzo: number[], octaveDistance: number} | undefined} */
        nearestRulerLine: undefined,
    };

    // section
    if (activeProject.sections.length === 0) {
        info.section = null;
        return info;
    }
    let runningWidth = 0;
    for (let section of activeProject.sections) {
        runningWidth += section.getWidth();
        if (runningWidth > svgX) {
            runningWidth -= section.getWidth();
            info.section = section;
            break;
        }
    }
    if (info.section === null) {
        info.section = activeProject.sections[activeProject.sections.length - 1];
        runningWidth -= activeProject.sections[activeProject.sections.length - 1].getWidth();
    }

    // chord
    for (let chord of info.section.chords) {
        runningWidth += chord.getWidth() + settings.chordSpacing;
        if (runningWidth > svgX) {
            runningWidth -= chord.getWidth();
            info.chord = chord;
            break;
        }
    }
    if (info.chord === null) {
        info.newChord = true;
    }

    // pitch
    let positionRatio = svgYToFreq(svgY) / info.section.keyArea.referenceFreq;
    if (info.chord) {
        info.ratioToNearestPitch = Infinity;
        for (let pitch of info.chord.pitches) {
            let pitchRatio = pitch.getRatio();
            if (Math.abs(Math.log2(pitchRatio) - Math.log2(positionRatio)) < info.ratioToNearestPitch) {
                info.ratioToNearestPitch = Math.abs(pitchRatio - positionRatio);
                info.pitch = pitch;
            }
        }
    } else {
        info.nearestRulerLine = info.section.keyArea.closestMonzoFromRatio(positionRatio);
    }

    return info;
}