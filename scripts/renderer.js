import { Project, Section, KeyArea, Chord, Pitch, IntervalBar, activeProject, deletedUids } from './chord.js';
import { monzoToFreq, monzoToRatio } from './utils.js';
import { settings } from './settings.js';

export const viewport = document.getElementById('viewport');
export const viewportContainer = document.getElementById('viewport-container');
const keyAreasViewportGroup = document.getElementById('keyAreas');

let viewportX = 0;
let viewportY = 0;

export function refitSvgContent() {
    const oldViewportY = viewportY;
    const oldScrollTop = viewportContainer.scrollTop;
    const bbox = viewport.getBBox();
    viewportX = bbox.x;
    viewportY = bbox.y;
    let viewportWidth = bbox.width;
    let viewportHeight = Math.max(bbox.height, viewportContainer.clientHeight);
    viewport.setAttribute('viewBox', `${bbox.x - settings.horizPadding} ${viewportY - settings.vertPadding} ${bbox.width + settings.horizPadding * 2} ${viewportHeight + settings.vertPadding * 2}`);
    viewport.setAttribute('width', bbox.width + settings.horizPadding * 2);
    viewport.setAttribute('height', viewportHeight);
    viewportContainer.scrollTop = oldScrollTop + oldViewportY - viewportY;
    // mouseY += oldViewportY - viewportY;
}

/**
 * @param {Section} section
 */
export function drawSection(section) {
    removeStrayElements();
    let thisX = 0;
    for (let s of activeProject.sections) {
        if (s === section) {
            break;
        }
        thisX += s.getWidth();
    }

    for (let c of section.chords) {
        drawChord(c);
    }
}

/**
 * @param {KeyArea} keyArea
 */
export function drawKeyArea(keyArea) {
    removeStrayElements();
    const parents = keyArea.getParents();
    const parentProject = parents.project;
    const parentSection = parents.section;

    if (!keyArea) {
        console.error(`Failed to draw Key Area. keyArea=${keyArea}`);
        return;
    }

    // Get tonic screen-Y position and vertical rendering bounds

    const tonicY = freqToSvgY(monzoToFreq(keyArea.tonicMonzo, keyArea.referenceFreq))

    let maxY = tonicY;
    let minY = tonicY;
    for (let chord of parentSection.chords) {
        let chordMaxY = freqToSvgY(chord.getMinPitch().getFrequency({section:parentSection}));
        let chordMinY = freqToSvgY(chord.getMaxPitch().getFrequency({section:parentSection}));
        maxY = Math.max(maxY, chordMaxY);
        minY = Math.min(minY, chordMinY);
    }
    maxY += viewportContainer.offsetHeight / 2;
    minY -= viewportContainer.offsetHeight / 2;

    // Get horizontal rendering bounds

    let width = parentSection.getWidth() + settings.chordWidth + settings.finalSectionRightBuffer;

    let minX = 0;
    for (let section of parentProject.sections) {
        if (section == parentSection) break;
        minX += section.getWidth();
    }
    let maxX = minX + width;

    // Draw keyArea

    // - Delete existing lines

    const elements = keyAreasViewportGroup.getElementsByClassName(keyArea.uid);
    Array.prototype.forEach.call(elements, (el) => {
        el.remove();
    });

    // - Draw tonic

    if (tonicY > minY && tonicY < maxY) {
        keyAreasViewportGroup.appendChild(addLine(minX, maxX, tonicY, tonicY, settings.axisColors[0], settings.tonicLineOpacity, settings.tonicLineWidth, `${keyArea.uid}`));
    } else {
        console.error(`The tonic can't be outside the rendered bounds!\ntonicY=${tonicY}\nminY=${minY}\nmaxY=${maxY}`);
        return;
    }

    // - Draw axes

    for (let primaryAxis of keyArea.primaryAxes) {
        primaryAxis = Math.abs(primaryAxis);
        let primaryIntervalHeight = Math.log2(monzoToRatio(settings.axes[primaryAxis])) * settings.octaveScale;
        // below
        let thisY = tonicY + primaryIntervalHeight;
        while (thisY < maxY) {
            keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[primaryAxis], settings.primaryLineOpacity, settings.keyAreaLineWidth, keyArea.uid));
            thisY += primaryIntervalHeight;
        }
        // above
        thisY = tonicY - primaryIntervalHeight;
        while (thisY > minY) {
            keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[primaryAxis], settings.primaryLineOpacity, settings.keyAreaLineWidth, keyArea.uid));
            thisY -= primaryIntervalHeight;
        }

        // secondary
        for (let secondaryAxis of keyArea.secondaryAxes) {
            secondaryAxis = Math.abs(secondaryAxis);
            if (secondaryAxis === primaryAxis) continue;
            let secondaryIntervalHeight = Math.log2(monzoToRatio(settings.axes[secondaryAxis])) * settings.octaveScale;

            // below
            thisY = tonicY + primaryIntervalHeight - secondaryIntervalHeight;
            while (thisY < maxY) {
                keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[secondaryAxis], settings.secondaryLineOpacity, settings.keyAreaLineWidth, keyArea.uid));
                thisY += primaryIntervalHeight;
            }
            // above
            thisY = tonicY - primaryIntervalHeight - secondaryIntervalHeight;
            while (thisY > minY) {
                keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[secondaryAxis], settings.secondaryLineOpacity, settings.keyAreaLineWidth, keyArea.uid));
                thisY -= primaryIntervalHeight;
            }
        }
    }
    // secondary on tonic (not to be redrawn for each primary axis)
    for (let secondaryAxis of keyArea.secondaryAxes) {
        let secondaryIntervalHeight = Math.log2(monzoToRatio(settings.axes[secondaryAxis])) * settings.octaveScale;
        let thisY = tonicY - secondaryIntervalHeight;
        keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[secondaryAxis], settings.secondaryLineOpacity, settings.keyAreaLineWidth, keyArea.uid));
    }

    // Invisible line for maintaining vertical sizing and scroll
    keyAreasViewportGroup.appendChild(addLine(minX, minX, tonicY - viewportContainer.offsetHeight/2, tonicY + viewportContainer.offsetHeight/2, 'pink', 0, 1, keyArea.uid));

    refitSvgContent();
}

/**
 * @param {Chord} chord
 */
export function drawChord(chord, knownX=undefined) {
    removeStrayElements();
    removeClassFromViewport(chord.uid);

    const parents = chord.getParents();
    const parentProject = parents.project;
    const parentSection = parents.section;

    let thisX;

    if (knownX) {
        thisX = knownX;
    } else {
        thisX = settings.leftPadding;
        for (let section of parents.project.sections) {
            if (section === parentSection) {
                break;
            } else {
                thisX += section.getWidth();
            }
        }
        for (let prevChords of parents.section.chords) {
            if (prevChords === chord) {
                break;
            } else {
                thisX += chord.getWidth() + settings.chordSpacing;
            }
        }
    }

    for (let pitch of chord.pitches) {
        const frequency = pitch.getFrequency(parents);
        const pitchY = freqToSvgY(frequency);

        addPitchLine(thisX, thisX + settings.chordWidth, pitchY, settings.pitchLineColor, 1, settings.pitchLineWidth, chord.uid);
    }

    for (let bar of chord.bars) {
    drawIntervalBar(bar, thisX, {}, 1, chord.uid);
    }
}

/**
 * @param {IntervalBar} bar
 * @param {number} x
 * @param {{section:Section}} knownParents
 */
function drawIntervalBar(bar, x, knownParents={section:undefined}, opacity=1, classes='') {
    const parentSection = knownParents.section ? knownParents.section : bar.getParents().section;
    addBar(bar.dim, x, x + settings.chordWidth, freqToSvgY(monzoToFreq(bar.baseMonzo, parentSection.keyArea.referenceFreq)), bar.isAscending, opacity, classes);
}

export function freqToSvgY(frequency) {
    return Math.log2(frequency) * settings.octaveScale * -1;
}

export function svgYToFreq(svgY) {
    return 2 ** (svgY / settings.octaveScale * -1)
}

function addBar(dim, x1, x2, startY, isAscending=true, opacity=1, classes='intervalBar') {
    const height = Math.log2(monzoToRatio(settings.axes[dim])) * settings.octaveScale;
    const defaultWidth = settings.intervalBarWidth;
    const halfPitchWidth = settings.pitchLineWidth / 2;
    if (!isAscending) {
        startY += height;
    }
    switch (Number(dim)) {
        case 1:
            let bar = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            bar.setAttribute('href', '#1d-bar-ascent-symbol');
            bar.setAttribute('x', x1);
            bar.setAttribute('y', startY - Math.log2(monzoToRatio(settings.axes[1])) * settings.octaveScale);
            bar.setAttribute('height', Math.log2(monzoToRatio(settings.axes[1])) * settings.octaveScale);
            bar.setAttribute('opacity', opacity);
            bar.setAttribute('class', classes);
            return viewport.appendChild(bar);
        case 2:
            return addLine(x1, x1, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 3:
            return addLine(x2, x2, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 4:
            return addRhombusLine(x1, x2, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 5:
            return addRhombusLine(x2, x1, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 6:
            return addCurveLine(x1, -8, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 7:
            return addCurveLine(x2, 8, startY + halfPitchWidth, startY-height - halfPitchWidth, settings.axisColors[dim], opacity, defaultWidth, classes);
        default:
            return null;
    }
}

function addPitchLine(x1, x2, y, color=settings.pitchLineColor, opacity=1, width=settings.pitchLineWidth, classes='pitchLine') {
    return addLine(x1, x2, y, y, color, opacity, width, classes);
}

function addLine(x1, x2, y1, y2, color, opacity=1, width=settings.keyAreaLineWidth, classes='') {
    let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('x2', x2);
    line.setAttribute('y1', y1);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('opacity', opacity);
    line.setAttribute('stroke-width', width);
    line.setAttribute('class', classes)
    return viewport.appendChild(line);
}

function addRhombusLine(x1, x2, y1, y2, color, opacity=1, width=8, classes='') {
    let line = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    line.setAttribute('points', `${x1-width/2},${y1} ${x1+width/2},${y1} ${x2+width/2},${y2} ${x2-width/2},${y2}`);
    line.setAttribute('stroke-width', 0)
    line.setAttribute('fill', color);
    line.setAttribute('opacity', opacity);
    line.setAttribute('class', classes);
    return viewport.appendChild(line);
}

function addCurveLine(x, deform, y1, y2, color, opacity=1, width=8, classes='') {
    let line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', `
        M ${x-width/2} ${y1}
        l ${width} 0
        Q ${x+deform*Math.sqrt(Math.abs(y2-y1))/3+width/2} ${(y1+y2)/2} ${x+width/2} ${y2}
        l ${-width} 0
        Q ${x+deform*Math.sqrt(Math.abs(y2-y1))/3-width/2} ${(y1+y2)/2} ${x-width/2} ${y1}
    `);
    line.setAttribute('stroke-width', 0);
    line.setAttribute('fill', color);
    line.setAttribute('opacity', opacity);
    line.setAttribute('class', classes);
    return viewport.appendChild(line);
}

export function rawToSvgCoords(offsetX, offsetY) {
    return {
        x: offsetX + viewportX,
        y: offsetY + viewportY
    }
}

function removeClassFromViewport(className) {
    const elements = Array.from(viewport.getElementsByClassName(className));
    elements.forEach((el) => { el.remove(); });
}

function removeStrayElements() {
    for (let className of deletedUids) {
        removeClassFromViewport(className);
    }
}