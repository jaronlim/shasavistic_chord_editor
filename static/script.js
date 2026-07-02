const viewport = document.getElementById("viewport");
const viewportContainer = document.getElementById("viewport-container");
const containerHeight = viewportContainer.offsetHeight;

const pitchAxisScale = 1;

const PRIMES = [2, 3, 5, 7, 11, 13, 17];
const C_0 = 16.3516 //hz

let selectedDimension = 2;
let selectedDirection = 1;

let selectedPitch = null; // Hovered over / highlighted pitch

let viewportX = 0;
let viewportY = 0;

const viewportPaddingX = 50;

viewport.style.backgroundColor = "#676681";

const PITCH_LINE_LEN = 70;

let settings = {
    
    "octaveScale": 120, // TODO: change default ctrl+scroll behavior to zoom

    "axes": [
        [0],
        [1],
        [-1, 1],
        [-2, 0, 1],
        [-2, 0, 0, 1],
        [-2, 0, 0, 0, 1],
        [-2, 0, 0, 0, 0, 1],
        [-2, 0, 0, 0, 0, 0, 1],
    ],

    "axisColors": [
        "#ffffff",
        "#aaaaaa",
        "#f27992",
        "#6cd985",
        "#b598ee",
        "#ffc247",
        "#b5b500",
        "#ed9877"
    ],

    "previewPitchOpacity": 0.5,

    // PITCH/INTERVAL-BAR SETTINGS
    "pitchLineWidth": 2,
    "pitchLineColor": "white",
    "pitchLineSelectedWidth": 4,
    "pitchLineSelectedColor": "#fbff00",

    // KEY AREA SETTINGS
    "tonicLineWidth":  2,
    "keyAreaLineWidth": 2,
    "tonicLineOpacity": 0.5,
    "primaryLineOpacity": 0.4,
    "secondaryLineOpacity": 0.3,

    // TODO: add a setting to automatically use blue pitch lines for chord extensions

    // TODO: add setting to show/hide scroll bar
}

class KeyArea {
    constructor(name, primaryAxis, secondaryAxis, tonicFrequency, hasTonic=true) {

        // TODO: allow multiple primary axes and secondary axes
        // TODO: allow descending secondary axes
        this.name = name;
        this.primaryAxis = primaryAxis;
        this.secondaryAxis = secondaryAxis;
        this.tonicFreq = tonicFrequency;
        this.hasTonic = hasTonic;
    }

    // Return the transformed vector of the nearest line to the y coordinate
    getNearestLineVector(y) {
        const tonicY = Math.log2(this.tonicFreq/C_0) * settings.octaveScale * -1;
        const deltaY = y + viewportY - tonicY; // The parameter y position relative to tonic
        const primaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.primaryAxis])) * settings.octaveScale;
        const secondaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.secondaryAxis])) * settings.octaveScale;
        const closestPrimaryDist = deltaY / primaryIntervalHeight;
        const closestSecondaryDist = (deltaY + secondaryIntervalHeight) / primaryIntervalHeight;
        let closestPrimary = -1 * Math.round(closestPrimaryDist);
        let closestSecondary = -1 * Math.round(closestSecondaryDist);
        let normalizedP = Math.abs(closestPrimaryDist) % 1;
        let normalizedS = Math.abs(closestSecondaryDist) % 1;
        // TODO: increase efficiency of creation of closestPitch
        let closestPitch = [];
        if ((1 - normalizedP) * normalizedP <= (1 - normalizedS) * normalizedS) {
            for (let _ = 0; _ < this.primaryAxis; _++) {
                closestPitch.push(0);
            }
            closestPitch.push(closestPrimary);
        } else {
            for (let _ = 0; _ <= Math.max(this.primaryAxis, this.secondaryAxis); _++) {
                closestPitch.push(0);
            }
            closestPitch[this.primaryAxis] = closestSecondary;
            closestPitch[this.secondaryAxis] = 1;
        }
        // console.log(`viewportY:${viewportY}\ny:${y}\ntonicY:${tonicY}\ndeltaY:${deltaY}`);
        // console.log(closestPitch);
        return closestPitch;
    }

    addToViewport(minX=0, maxX=2000) {
        // Tonic
        const tonicY = Math.log2(this.tonicFreq/C_0) * settings.octaveScale * -1;
        addLine(minX, maxX, tonicY, tonicY, "white", settings.tonicLineOpacity, settings.tonicLineWidth, `keyArea ${name}`);
        // Interval Heights
        let primaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.primaryAxis])) * settings.octaveScale;
        let secondaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.secondaryAxis])) * settings.octaveScale;
        // Primary Below
        let thisY = tonicY + primaryIntervalHeight;
        while (thisY < tonicY + containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY += primaryIntervalHeight;
        }
        // Primary Above
        thisY = tonicY - primaryIntervalHeight;
        while (thisY > tonicY - containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY -= primaryIntervalHeight;
        }
        // Secondary Below
        thisY = tonicY + primaryIntervalHeight - secondaryIntervalHeight;
        while (thisY < tonicY + containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.secondaryAxis], settings.secondaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY += primaryIntervalHeight;
        }
        // Secondary Above
        thisY = tonicY - secondaryIntervalHeight;
        while (thisY > tonicY - containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.secondaryAxis], settings.secondaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY -= primaryIntervalHeight;
        }
    }
}

class Pitch {
    /**
     * Creates a new relative Pitch. Absolute pitch is not stored.
     * @param {Chord} parentChord The Chord this Pitch belongs to
     * @param {Array<number>} transformedVector Pitch coordinate using octave-scaled basis vectors
     * @param {Pitch} relativePitch The Pitch that this one should reference as its parent
     */
    constructor(parentChord=null, transformedVector=[0], relativePitch=null) {
        this.parentChord = parentChord;
        this.transformedVector = transformedVector;
        if (relativePitch===null) {
            this.parentPitches = [];
        } else {
            this.parentPitches = [relativePitch];
        }
        this.childPitches = [];
        this.childDims = [];
        this.htmlPitchElement = null;
        this.htmlIntervalBarElements = [];
    }


    static intervalsEqual(a, b) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            if (i >= a.length) {
                if (b[i] != 0) return false;
                continue;
            }
            if (i >= b.length) {
                if (a[i] != 0) return false;
                continue;
            }
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    associateChild(child, dim) {
        this.childPitches.push(child);
        this.childDims.push(dim);
    }

    getRatio() {
        return getTransformedInterval(this.transformedVector);
    }

    getFrequency() {
        return this.parentChord.relativeFreq * this.getRatio();
    }

    addToViewport(x, referenceFreq) {

        // Add pitch line
        let thisY = Math.log2(referenceFreq * this.getRatio() / C_0) * settings.octaveScale * -1;
        this.htmlPitchElement = addPitchLine(x, x+PITCH_LINE_LEN, thisY, settings.pitchLineColor, 1, settings.pitchLineWidth, "pitchLine chord " + this.parentChord.uid);

        // Add interval bars
        for (let dim of this.childDims) {
            this.htmlIntervalBarElements.push(addAscentBar(Math.abs(dim), x, x+PITCH_LINE_LEN, thisY, 1, Math.sign(dim) === -1, "ascentBar " + this.parentChord.uid));
        }
    }
}

class Chord {
    constructor(relativeFreq, root=[0]) {
        this.relativeFreq = relativeFreq;
        let basePitch = new Pitch(this, root);
        this.pitches = [basePitch];
        this.uid = "chord-" + newUniqueId();
    }
    
    /**
     * Returns the Pitch if the chord contains a Pitch with the given vector, or null otherwise
     * @param {Array<number>} pitchVector 
     * @returns {Pitch}
     */
    getPitch(pitchVector) {
        for (let p of this.pitches) {
            if (Pitch.intervalsEqual(p.transformedVector, pitchVector)) return p;
        }
        return null;
    }

    /**
     * Add a pitch to the chord, relative to another pitch
     * @param {Array<number>} fromVector The relative pitch on which to stack the new interval (val: starts at prime 2)
     * @param {number} dim 
     */
    addPitch(fromVector, dim) {
        fromVector.unshift(0);
        // Check that parent exists
        let parent = this.getPitch(fromVector);
        if (!parent) {
            console.warn(`Tried to add a pitch to a parent that didn't exist!\nAttempted parent: [${fromVector}]`);
            return;
        }

        // Check that new pitch doesn't already exist
        let newPitchVector = [...parent.transformedVector];
        while (newPitchVector.length <= Math.abs(dim)) {
            newPitchVector.push(0);
        }
        newPitchVector[Math.abs(dim)] += Math.sign(dim);
        let existingPitch = this.getPitch(newPitchVector)
        if (existingPitch) {
            // Check if the input dim already exists to reach the existing pitch
            if (parent.childDims.includes(dim)) {
                // Remove the existing pitch if it 
                parent.childDims.filter((d) => {d !== dim;});
                for (let i = 0; i < parent.childDims.length; i++) {
                    if (parent.childDims[i] == dim) {
                        parent.childDims.splice(i, 1);
                        existingPitch.parentPitches.splice(existingPitch.parentPitches.indexOf(parent), 1);
                        break;
                    }
                }
                if (existingPitch.childDims.length == 0 && existingPitch.parentPitches.length == 0) {
                    for (let i = 0; i < this.pitches.length; i++) {
                        if (Pitch.intervalsEqual(this.pitches[i].transformedVector, existingPitch.transformedVector)) {
                            this.pitches.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                // Add the requested dimension
                parent.childDims.push(dim);
                existingPitch.parentPitches.push(parent);
            }
            return;
        }

        // Add pitch
        let child = new Pitch(this, newPitchVector, parent);
        parent.associateChild(child, dim);
        this.pitches.push(child);
    }

    inputInterval(y, dim) {
        let pitch = this.findNearestPitch(y);
        this.addPitch(pitch.transformedVector.slice(1), dim);
    }

    /**
     * Returns the pitch in the chord nearest to the given y coordinate in the svg.
     * @param {number} y 
     */
    findNearestPitch(y) {
        let minDistance = Infinity;
        let closestPitch = null;
        for (let p of this.pitches) {
            let pitchY = Math.log2(this.relativeFreq * p.getRatio() / C_0) * settings.octaveScale * -1;
            if (Math.abs(pitchY - y - viewportY) < minDistance) {
                minDistance = Math.abs(pitchY - y - viewportY);
                closestPitch = p;
            }
        }
        return closestPitch;
    }

    addToViewport(x) {
        // TODO: Reduce unnecessary operations
        document.querySelectorAll("." + this.uid).forEach(el => {
            el.remove();
        });
        for (let p of this.pitches) {
            p.addToViewport(x, this.relativeFreq);
        }
    }

}

let idsInUse = [];
function newUniqueId() {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    do {
        let id = "";
        for (let i = 0; i < 5; i++) {
            id += chars[Math.round(Math.random()*35)];
        }
    } while (idsInUse.includes(id));
    idsInUse.push(id);
    return id;
}

function menuSelect(arg) {
    switch (arg[0]) {
        case 'A':
            selectedDimension = arg[1];
            document.querySelectorAll(".axis-button").forEach((el) => {
                el.classList.remove("selected-button");
            });
            document.querySelector(`#button-${arg.slice(1)}`).classList.add("selected-button");
            break;
        case 'D':
            selectedDirection = arg[1] === "a"? 1:-1;
            document.querySelectorAll(".direction-button").forEach((el) => {
                el.classList.remove("selected-button");
            });
            document.querySelector(`#button-${arg.slice(1)}`).classList.add("selected-button");
            break;
        default:
            console.warn("Failed to update a menu button!");
            break;
    }
}

/** pure val to pitch ratio */
function getPureInterval(arr) {
    let product = 1;
    for (let i = 0; i < arr.length; i++) {
        product *= PRIMES[i] ** arr[i];
    }
    return product;
}

/** 0D-indexed, shasavistic interval vector to pitch ratio */
function getTransformedInterval(arr) {
    let product = 1;
    for (let i = 0; i < arr.length; i++) {
        product *= getPureInterval(settings.axes[i]) ** arr[i];
    }
    return product;
}

function refitSvgContent() {
    const bbox = viewport.getBBox();
    const padding = 0;
    viewportX = bbox.x;
    viewportY = bbox.y;
    if (bbox.height < viewport.clientHeight) {
        viewportY -= (viewport.clientHeight - bbox.height) / 2; // TODO: perform this fix agan whenever aspect ratio changes
    }
    viewport.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
    viewport.setAttribute("width", bbox.width + padding * 2);
    viewport.setAttribute("height", bbox.height + padding * 2);
}

function addLine(x1, x2, y1, y2, color, opacity=1, width=settings.keyAreaLineWidth, classes="") {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("x2", x2);
    line.setAttribute("y1", y1);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("opacity", opacity);
    line.setAttribute("stroke-width", width);
    line.setAttribute("class", classes)
    return viewport.appendChild(line);
}


function addRhombusLine(x1, x2, y1, y2, color, opacity=1, width=8, classes="") {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    line.setAttribute("points", `${x1-width/2},${y1} ${x1+width/2},${y1} ${x2+width/2},${y2} ${x2-width/2},${y2}`);
    line.setAttribute("stroke-width", 0)
    line.setAttribute("fill", color);
    line.setAttribute("opacity", opacity);
    line.setAttribute("class", classes);
    return viewport.appendChild(line);
}

function addCurveLine(x, deform, y1, y2, color, opacity=1, width=8, classes="") {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", `
        M ${x-width/2} ${y1}
        l ${width} 0
        Q ${x+deform*Math.sqrt(Math.abs(y2-y1))/3+width/2} ${(y1+y2)/2} ${x+width/2} ${y2}
        l ${-width} 0
        Q ${x+deform*Math.sqrt(Math.abs(y2-y1))/3-width/2} ${(y1+y2)/2} ${x-width/2} ${y1}
    `);
    line.setAttribute("stroke-width", 0);
    line.setAttribute("fill", color);
    line.setAttribute("opacity", opacity);
    line.setAttribute("class", classes);
    return viewport.appendChild(line);
}

/**
 * Add a colored interval bar
 * @param {number} dim
 * @param {number} startX 
 * @param {number} startY 
 * @param {boolean} descending 
 */
function addAscentBar(dim, x1, x2, startY, opacity=1, descending=false, classes="ascentBar") {
    const height = Math.log2(getPureInterval(settings.axes[dim])) * settings.octaveScale;
    const defaultWidth = 8;
    let startX = (dim == 3 || dim == 5 || dim == 7)? x2:x1;
    if (descending) {
        startY += height;
    }
    switch (dim) {
        case 1:
            // TODO: make this function return 1D interval bar element
            const arrowSize = 14;
            addLine(x1, x1, startY-arrowSize, startY-height, settings.axisColors[dim], 1, 4, classes);
            let overshoot = Math.SQRT2 * 4/4; // sqrt2 times 1/4 of the width of the lines to create the arrow
            addLine(x1-arrowSize, x1+overshoot, startY, startY-arrowSize-overshoot, "white", 1, 4, classes);
            addLine(x1+arrowSize, x1-overshoot, startY, startY-arrowSize-overshoot, "white", 1, 4, classes);
            break;
        case 2:
            return addLine(x1, x1, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 3:
            return addLine(x2, x2, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 4:
            return addRhombusLine(x1, x2, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 5:
            return addRhombusLine(x2, x1, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 6:
            return addCurveLine(x1, -8, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        case 7:
            return addCurveLine(x2, 8, startY, startY-height, settings.axisColors[dim], opacity, defaultWidth, classes);
        default:
            return null;
    }
}

function addPitchLine(x1, x2, y, color=settings.pitchLineColor, opacity=1, width=settings.pitchLineWidth, classes="pitchLine") {
    return addLine(x1, x2, y, y, color, opacity, width, classes);
}


let previewPitch = null;
let previewBasePitch = null;
let previewPitchElement = null;
let previewBasePitchElement = null;
let previewIntervalBarElement = null;

function setPreviewPitch(x, y) {
    if (previewPitchElement !== null) {
        previewPitchElement.remove();
        previewIntervalBarElement.remove();
        previewBasePitchElement.remove();
        previewPitch = null;
        previewBasePitch = null;
    }
    let chordIndex = findNearestChordIndex(x);
    if (chordIndex == chordList.length) {
        let previewPitchVector = [0];
        while (previewPitchVector.length <= Math.abs(selectedDimension)) {
            previewPitchVector.push(0);
        }
        previewPitchVector[Math.abs(selectedDimension)] += selectedDirection;
        previewPitch = new Pitch(null, previewPitchVector);

        let referenceFreq = 261.63 * getTransformedInterval(keyArea.getNearestLineVector(y));

        let baseY = Math.log2(referenceFreq / C_0) * settings.octaveScale * -1;
        let thisY = Math.log2(referenceFreq * previewPitch.getRatio() / C_0) * settings.octaveScale * -1;
        let thisX = (CHORD_WIDTH + CHORD_SPACING) * chordIndex + viewportPaddingX;
        previewPitchElement = addPitchLine(thisX, thisX+PITCH_LINE_LEN, thisY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch");
        previewBasePitchElement = addPitchLine(thisX, thisX+PITCH_LINE_LEN, baseY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch")

        // Add interval bar
        previewIntervalBarElement = addAscentBar(Math.abs(selectedDimension), thisX, thisX+PITCH_LINE_LEN, thisY, settings.previewPitchOpacity, selectedDirection === 1, "ascentBar preview-pitch");
    } else {
        let nearestPitch = chordList[chordIndex].findNearestPitch(y);
        let previewPitchVector = [...nearestPitch.transformedVector];
        while (previewPitchVector.length <= Math.abs(selectedDimension)) {
            previewPitchVector.push(0);
        }
        previewPitchVector[Math.abs(selectedDimension)] += selectedDirection;
        previewPitch = new Pitch(null, previewPitchVector, nearestPitch);
        let referenceFreq = chordList[chordIndex].relativeFreq;

        // Add pitch line
        let thisY = Math.log2(referenceFreq * previewPitch.getRatio() / C_0) * settings.octaveScale * -1;
        let thisX = (CHORD_WIDTH + CHORD_SPACING) * chordIndex + viewportPaddingX;
        previewPitchElement = addPitchLine(thisX, thisX+PITCH_LINE_LEN, thisY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch");

        // Add interval bar
        previewIntervalBarElement = addAscentBar(Math.abs(selectedDimension), thisX, thisX+PITCH_LINE_LEN, thisY, settings.previewPitchOpacity, selectedDirection === 1, "ascentBar preview-pitch");
    }
}

const CHORD_WIDTH = 50;
const CHORD_SPACING = 50;
function findNearestChordIndex(x) {
    let index = (x - viewportPaddingX) / (CHORD_WIDTH + CHORD_SPACING);
    if (index > chordList.length) {
        return chordList.length;
    }
    return Math.max(0, Math.floor(index));
}

viewport.addEventListener("mousemove", (event) => {
    // TODO: don't querySelectorAll to remove pitch line highlight (also in "mouseleave" event)
    document.querySelectorAll(".pitchLine").forEach((el) => {
        el.setAttribute("stroke", settings.pitchLineColor);
        el.setAttribute("stroke-width", settings.pitchLineWidth);
    });
    let chordIndex = findNearestChordIndex(event.offsetX);
    if (chordIndex === chordList.length) {

    } else {
        let chord = chordList[chordIndex];
        selectedPitch = chord.findNearestPitch(event.offsetY);
        if (selectedPitch) {
            document.querySelectorAll("." + selectedPitch.parentChord.uid + ".pitchLine").forEach((el) => {
                el.setAttribute("stroke", settings.pitchLineColor);
                el.setAttribute("stroke-width", settings.pitchLineWidth);
            });
            selectedPitch.htmlPitchElement.setAttribute("stroke", settings.pitchLineSelectedColor);
            selectedPitch.htmlPitchElement.setAttribute("stroke-width", settings.pitchLineSelectedWidth);
        }
    }

    setPreviewPitch(event.offsetX, event.offsetY);
});
viewportContainer.addEventListener("mouseleave", (event) => {
    document.querySelectorAll(".pitchLine").forEach((el) => {
        el.setAttribute("stroke", settings.pitchLineColor);
        el.setAttribute("stroke-width", settings.pitchLineWidth);
    });
    if (previewPitch !== null) {
        previewPitchElement.remove();
        previewIntervalBarElement.remove();
        previewPitch = null;
    }
})
viewport.addEventListener("click", (event) => {
    let chordIndex = findNearestChordIndex(event.offsetX);
    if (chordIndex === chordList.length) {

        chordList.push(new Chord(261.63 * getTransformedInterval(keyArea.getNearestLineVector(event.offsetY))));
    } else {
    }
    chordList[chordIndex].inputInterval(event.offsetY, selectedDimension * selectedDirection);
    chordList[chordIndex].addToViewport(chordIndex * (CHORD_WIDTH + CHORD_SPACING) + viewportPaddingX);
    
    // TODO: (re)select the nearest pitch
});

let keyArea = new KeyArea("my_key", 2, 4, 261.63);
let chordList = [];

keyArea.addToViewport();

refitSvgContent();
