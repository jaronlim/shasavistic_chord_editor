import { MAX_DIMENSION } from './utils.js';
import { settings } from './settings.js'
import { drawChord, drawSection, rawToSvgCoords, svgYToFreq } from './renderer.js';
import { activeProject, Section, Chord, Pitch } from './chord.js';

export let inputSelections = {
    /** @type {'interval'|'pitch'} */
    inputMode: 'interval',
    dim: 2,
    dir: 1
}

/**
 * @type {{x:number,y:number,section:Section|null,chord:Chord|null,newChord:boolean,nearestPitchMonzo:Array<number>|undefined,pitch:Pitch|null,nearestRulerLine:{monzo:Array<number>|undefined,octaveDistance:number|undefined}|undefined}}
 * */
let hoverInfo;
let prevHoverInfo;
let previewChord;

export function handleMouseMove(offsetX, offsetY) {
    const coords = rawToSvgCoords(offsetX, offsetY);
    prevHoverInfo = hoverInfo;
    hoverInfo = getInfoAtPosition(coords.x, coords.y);

    refreshPreview(coords.x, coords.y, hoverInfo);
}

export function handleMouseClick(offsetX=undefined, offsetY=undefined) {
    const coords = rawToSvgCoords(offsetX, offsetY);
    const info = offsetX === undefined || offsetY === undefined ? hoverInfo : getInfoAtPosition(coords.x, coords.y)

    refreshPreview(coords.x, coords.y, info);
    switch(inputSelections.inputMode) {
        case 'interval':
            inputInterval(info);
            break;
        case 'pitch':
            inputEditPitch(info);
            break;
    }
}

/**
 * @param {{x:number,y:number,section:Section|null,chord:Chord|null,newChord:boolean,nearestPitchMonzo:Array<number>|undefined,pitch:Pitch|null,nearestRulerLine:{monzo:Array<number>|undefined,octaveDistance:number|undefined}|undefined}} info
 */
function inputInterval(info) {
    // if (info.beyondChords) {
    //     const chord = new Chord(info.nearestRulerLine.monzo);
    //     if (inputSelections.dim !== 0) {
    //         chord.inputInterval(chord.rootMonzo, inputSelections.dim, inputSelections.dir === 1);
    //     }
    //     info.section.addChord(chord);
    // } else 
    if (info.chord) {
        info.chord.acceptPreviewElements();
    }
    else {
        const chord = new Chord(info.nearestRulerLine.monzo);
        info.section.addChord(chord);
        chord.inputInterval(chord.rootMonzo, inputSelections.dim, inputSelections.dir === 1);
    }
    drawSection(info.section);
}

function inputEditPitch(info) {

}

export function handleKeyPress(key) {
    const hotkeys = settings.hotkeys;
    
    for (let i = 0; i < hotkeys.selectDimension.length; i++) {
        if (key === hotkeys.selectDimension[i]) {
            setSelectedDim(i);
            if (hoverInfo) refreshPreview(hoverInfo.x, hoverInfo.y);
            return;
        }
    }

    if (key === hotkeys.selectAscent) {
        setSelectedDir(1);
        if (hoverInfo) refreshPreview(hoverInfo.x, hoverInfo.y);
    }

    if (key === hotkeys.selectDescent) {
        setSelectedDir(-1);
        if (hoverInfo) refreshPreview(hoverInfo.x, hoverInfo.y);
    }

    if (key === hotkeys.switchDirection) {
        setSelectedDir(inputSelections.dir * -1);
        if (hoverInfo) refreshPreview(hoverInfo.x, hoverInfo.y);
    }

    if (key === hotkeys.selectPitchEditor) {
        setInputMode('pitch');
    }
}

/**
 * @param {'pitch'|'interval'} mode
 */
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

/**
 * @param {number} svgX
 * @param {number} svgY
 */
function getInfoAtPosition(svgX, svgY) {
    let info = {
        x: svgX,
        y: svgY,
        /** @type {Section | null} */
        section: null,
        /** @type {Chord | null} */
        chord: null,
        /** @type {boolean | null} */
        beyondChords: false,
        /** @type {Array<number> | undefined} */
        nearestPitchMonzo: undefined,
        /** @type {Pitch | null} */
        pitch: null,
        /** @type {{monzo: number[], octaveDistance: number} | undefined} */
        nearestRulerLine: undefined,
    };

    if (!svgX || !svgY) return info;

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
        info.beyondChords = true;
    }

    // pitch (not preview)
    let positionRatio = svgYToFreq(svgY) / info.section.keyArea.referenceFreq;
    if (info.chord) {
        info.nearestPitchMonzo = Infinity;
        for (let pitch of info.chord.pitches) {
            if (pitch.previewType !== 0) continue;
            let pitchRatio = pitch.getRatio();
            if (Math.abs(Math.log2(pitchRatio) - Math.log2(positionRatio)) < info.nearestPitchMonzo) {
                info.nearestPitchMonzo = Math.abs(pitchRatio - positionRatio);
                info.pitch = pitch;
            }
        }
    }   
    info.nearestRulerLine = info.section.keyArea.closestMonzoFromRatio(positionRatio);

    return info;
}

/**
 * Delete preview pitches and intervals and set new ones (if applicable).
 * @param {number} svgX
 * @param {number} svgY
 * @param {{x:number,y:number,section:Section|null,chord:Chord|null,newChord:boolean,nearestPitchMonzo:Array<number>|undefined,pitch:Pitch|null,nearestRulerLine:{monzo:Array<number>|undefined,octaveDistance:number|undefined}|undefined}} knownInfo
 */
export function refreshPreview(svgX=undefined, svgY=undefined, knownInfo=undefined) {
    const info = knownInfo ? knownInfo : getInfoAtPosition(svgX, svgY);
    if (previewChord) {
        previewChord.rejectPreviewElements();
        drawChord(previewChord);
        previewChord = null;
    } 
    
    if (info.chord) {
        previewChord = info.chord;
        switch (inputSelections.inputMode) {
            case 'interval':
                info.chord.setPreviewInterval(info.pitch.monzo, inputSelections.dim, inputSelections.dir === 1);
                break;
            case 'pitch':
                
                break;  
        }
        drawChord(info.chord);
    }
    if (info.beyondChords) {
        
    } else {
    }
}