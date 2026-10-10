import { Project, Section, KeyArea, Chord, Pitch, IntervalBar, activeProject, deletedUids } from './chord.js';
import { addDimToMonzo, monzoToFreq, monzoToRatio } from './utils.js';
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
    viewport.setAttribute('height', viewportHeight + settings.vertPadding * 2);
    viewportContainer.scrollTop = oldScrollTop + oldViewportY - viewportY;
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
export function drawKeyArea(keyArea, useRightBuffer=true) {
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
        const chordMaxY = chord.pitches.length > 0
            ? freqToSvgY(chord.getMinPitch().getFrequency({section:parentSection}))
            : freqToSvgY(parentSection.keyArea.referenceFreq);
        const chordMinY = chord.pitches.length > 0
            ? freqToSvgY(chord.getMaxPitch().getFrequency({section:parentSection}))
            : freqToSvgY(parentSection.keyArea.referenceFreq);
        maxY = Math.max(maxY, chordMaxY);
        minY = Math.min(minY, chordMinY);
    }
    maxY += viewportContainer.offsetHeight / 2;
    minY -= viewportContainer.offsetHeight / 2;

    // Get horizontal rendering bounds

    let width = parentSection.getWidth() + settings.chordWidth + (useRightBuffer ? settings.finalSectionRightBuffer : 0);

    let minX = 0;
    for (let section of parentProject.sections) {
        if (section == parentSection) break;
        minX += section.getWidth();
    }
    let maxX = minX + width;

    // Draw keyArea

    // - Delete existing lines

    removeClassFromViewport(keyArea.uid);

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
export function untangleChordForRulerView(chord) {

    const offsetDistance = settings.intervalBarWidth * 1.4;

    let barStacksLeft = [];
    let barStacksRight = [];
    let otherBars = [];
    let barsDone = [];

    for (let bar of chord.bars) {
        if (barsDone.includes(bar)) continue;

        if (bar.dim !== 2 && bar.dim !== 3) {
            otherBars.push([monzoToRatio(bar.getBottomMonzo()), monzoToRatio(bar.getTopMonzo)]);;
            continue;
        }
        
        let stack = getBarStack(chord, bar);
        let minRatio = Infinity;
        let maxRatio = -Infinity;
        for (let stackedBar of stack) {
            barsDone.push(stackedBar);
            if (monzoToRatio(stackedBar.getTopMonzo()) > maxRatio) {
                maxRatio = monzoToRatio(stackedBar.getTopMonzo());
            }
            if (monzoToRatio(stackedBar.getBottomMonzo()) < minRatio) {
                minRatio = monzoToRatio(stackedBar.getBottomMonzo());
            }
        }
        const isLeftBar = (b) => b.dim === 2;
        const isRightBar = (b) => b.dim === 3;
        if (isLeftBar(bar)) {
            barStacksLeft.push({
                min: minRatio,
                max: maxRatio,
                bars: stack,
                offset: 0
            });
        } else if (isRightBar(bar)) {
            barStacksRight.push({
                min: minRatio,
                max: maxRatio,
                bars: stack,
                offset: 0
            });
        }
    }

    // -- Untangle
    let stablePitchesLeft = new Set();
    let stablePitchesRight = new Set();
    let stableStacksLeft = [];
    let stableStacksRight = [];

    // untangle left stacks (2D)
    for (let stack of barStacksLeft) {
        for (let stable of stableStacksLeft) {
            if ((stack.min > stable.min && stack.min < stable.max) || (stable.min > stack.min && stable.min < stack.max)) {
                // the stacks intersect
                stack.offset = stable.offset + 1;
            }
        }
        stableStacksLeft.push(stack);
        for (let bar of stack.bars) {
            bar.leftOffset = stack.offset * offsetDistance;
            bar.getBottomPitch({chord:chord}).leftOffset = stack.offset * offsetDistance;
            bar.getTopPitch({chord:chord}).leftOffset = stack.offset * offsetDistance;
            stablePitchesLeft.add(bar.getBottomPitch({chord:chord}));
            stablePitchesLeft.add(bar.getTopPitch({chord:chord}));
        }
    }

    // untangle right stacks (3D)
    for (let stack of barStacksRight) {
        for (let stable of stableStacksRight) {
            if ((stack.min > stable.min && stack.min < stable.max) || (stable.min > stack.min && stable.min < stack.max)) {
                // the stacks intersect
                stack.offset = stable.offset + 1;
            }
        }
        stableStacksRight.push(stack);
        for (let bar of stack.bars) {
            bar.rightOffset = stack.offset * offsetDistance * -1;
            bar.getBottomPitch({chord:chord}).rightOffset = stack.offset * offsetDistance * -1;
            bar.getTopPitch({chord:chord}).rightOffset = stack.offset * offsetDistance * -1;
            stablePitchesRight.add(bar.getBottomPitch({chord:chord}));
            stablePitchesRight.add(bar.getTopPitch({chord:chord}));
        }
    }

    // untangle parts of pitches not connected to bar stack
    for (let pitch of chord.pitches) {
        if (!stablePitchesLeft.has(pitch)) {
            let leftOffset = 0;
            for (let stack of barStacksLeft) {
                if (pitch.getRatio() > stack.min && pitch.getRatio() < stack.max) {
                    leftOffset = Math.max(leftOffset, stack.bars[0].leftOffset + offsetDistance);
                }
            }
            pitch.leftOffset = leftOffset;
        }
        if (!stablePitchesRight.has(pitch)) {
            let rightOffset = 0;
            for (let stack of barStacksRight) {
                if (pitch.getRatio() > stack.min && pitch.getRatio() < stack.max) {
                    rightOffset = Math.min(rightOffset, stack.bars[0].rightOffset - offsetDistance);
                }
            }
            pitch.rightOffset = rightOffset;
        }
    }

    // fix bars to now-set pitches
    for (let bar of chord.bars) {
        const topPitch = bar.getTopPitch({chord:chord});
        const bottomPitch = bar.getBottomPitch({chord:chord});
        if (bar.dim === 4) {
            bar.leftOffset = bottomPitch ? bottomPitch.leftOffset : 0;
            bar.rightOffset = topPitch ? topPitch.rightOffset : 0;
        }
        if (bar.dim === 5) {
            bar.leftOffset = topPitch ? topPitch.leftOffset : 0;
            bar.rightOffset = bottomPitch ? bottomPitch.rightOffset : 0;
        }
        // TODO: handle 6D and 7D
    }
}

/**
 * @param {Chord} chord
 * @param {IntervalBar} bar
 */
function getBarStack(chord, bar, calledFrom=null) {
    const topPitch = chord.getPitchFromMonzo(bar.getTopMonzo());
    const bottomPitch = chord.getPitchFromMonzo(bar.getBottomMonzo());
    let stackedBarList = [...(topPitch ? topPitch.getBars({chord:chord}) : []), ...(bottomPitch ? bottomPitch.getBars({chord:chord}) : [])];
    let stack = [bar];
    for (let stackedBar of stackedBarList) {
        if (stackedBar === bar) continue;
        if (stackedBar === calledFrom) continue;
        if (stackedBar.dim !== bar.dim) continue;
        stack = [...stack, ...getBarStack(chord, stackedBar, bar)];
    }
    return stack;
}

export function getChordX(chord, knownParents=undefined) {
    const parents = knownParents ? knownParents : chord.getParents();
    const parentSection = parents.section;
    let thisX = settings.leftPadding;
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
    return thisX;
}


/**
 * @param {Chord} chord
 * @param {{section:Section}} knownParents
 */
export function drawChord(chord, knownX=undefined, knownParents=undefined) {
    removeStrayElements();
    removeClassFromViewport(chord.uid);

    untangleChordForRulerView(chord);

    const parents = knownParents ? knownParents : chord.getParents();
    if (!parents) return;
    const parentSection = parents.section;

    const thisX = knownX ? knownX : getChordX(chord);

    for (let pitch of chord.pitches) {
        const frequency = pitch.getFrequency(parents);
        const pitchY = freqToSvgY(frequency);

        drawPitch(pitch, thisX, {section:parentSection, chord:chord});
    }

    for (let bar of chord.bars) {
        drawIntervalBar(bar, thisX, {section:parentSection, chord:chord});
    }
}

/**
 * @param {IntervalBar} bar
 * @param {number} x
 * @param {{section:Section}} knownParents
 */
function drawIntervalBar(bar, x, knownParents={section:undefined}) {
    const parents = (knownParents.section === undefined && knownParents.chord === undefined) ? bar.getParents() : knownParents;
    const left = x + bar.leftOffset;
    const right = x + settings.chordWidth + bar.rightOffset;
    const svgY = freqToSvgY(monzoToFreq(bar.baseMonzo, parents.section.keyArea.referenceFreq));
    let opacity = 1;
    if (bar.previewType === 1) opacity *= settings.previewBarAddOpacity;
    if (bar.previewType === -1) opacity *= settings.previewBarDelOpacity;
    if (bar.isLowOpacity) opacity *= settings.barLowOpacity;
    addBar(bar.dim, left, right, svgY, bar.isAscending, opacity, parents.chord.uid);
}

/**
 * @param {Pitch} pitch
 * @param {number} x
 */
function drawPitch(pitch, x, knownParents={section:undefined, chord:undefined}) {
    const parents = (knownParents.section === undefined && knownParents.chord === undefined) ? pitch.getParents() : knownParents;
    const left = x + pitch.leftOffset;
    const right = x + settings.chordWidth + pitch.rightOffset;
    const frequency = pitch.getFrequency({section:parents.section});
    const svgY = freqToSvgY(frequency);

    if (pitch.showEditingOptions) {
        const center = (left + right) / 2;
        const leftHalf = addPitchLine(left, center, svgY, settings.pitchLineColor, 1, settings.pitchLineWidth, parents.chord.uid);
        const rightHalf = addPitchLine(center, right, svgY, settings.pitchLineColor, 1, settings.pitchLineWidth, parents.chord.uid);

        // TODO: use setting for stroke-dasharray and opacity
        if (pitch.isDashed) {
            leftHalf.setAttribute('stroke-dasharray', `${settings.pitchDashLength}, ${settings.pitchDashSpace}`);
        } else {
            rightHalf.setAttribute('stroke-dasharray', `${settings.pitchDashLength}, ${settings.pitchDashSpace}`);
        }

        if (pitch.isLowOpacity) {
            rightHalf.setAttribute('opacity', settings.pitchLowOpacity);
        } else {
            leftHalf.setAttribute('opacity', settings.pitchLowOpacity);
        }

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(rightHalf);
        group.appendChild(leftHalf);
        group.setAttribute('class', 'showPitchEditOptions ' + parents.chord.uid);
        viewport.appendChild(group);

    } else {
        const line = addPitchLine(left, right, svgY, settings.pitchLineColor, 1, settings.pitchLineWidth, parents.chord.uid);
        if (pitch.isLowOpacity) {
            line.setAttribute('opacity', settings.pitchLowOpacity);
        }
        if (pitch.isDashed) {
            line.setAttribute('stroke-dasharray', `${settings.pitchDashLength}, ${settings.pitchDashSpace}`);
        }
    }
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