const viewport = document.getElementById("viewport");
const containerHeight = document.getElementById("viewport-container").offsetHeight;

const pitchAxisScale = 1;

const PRIMES = [2, 3, 5, 7, 11, 13, 17];
const C_0 = 16.3516 //hz

var selectedDimension = 2;
var selectedDirection = 1;

var viewportX = 0;
var viewportY = 0;

viewport.style.backgroundColor = "#676681";

var settings = {
    
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


    "pitchLineWidth": 2,

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
    constructor(name, primaryAxis, secondaryAxis, tonicPitch, hasTonic=true) {

        // TODO: allow multiple primary axes and secondary axes
        this.name = name;
        this.primaryAxis = primaryAxis;
        this.secondaryAxis = secondaryAxis;
        this.tonic = tonicPitch;
        this.hasTonic = hasTonic;
    }

    addToViewport(minX=0, maxX=2000) {
        // Tonic
        var tonicY = Math.log2(this.tonic/C_0) * settings.octaveScale * -1;
        tonicY = Math.round(tonicY * 100) / 100
        addLine(minX, maxX, tonicY, tonicY, "white", settings.tonicLineOpacity, settings.tonicLineWidth, `keyArea ${name}`);
        // Interval Heights
        var primaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.primaryAxis])) * settings.octaveScale;
        var secondaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.secondaryAxis])) * settings.octaveScale;
        // Primary Below
        var thisY = tonicY + primaryIntervalHeight;
        while (thisY < tonicY + containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY += primaryIntervalHeight;
        }
        // Primary Above
        var thisY = tonicY - primaryIntervalHeight;
        while (thisY > tonicY - containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY -= primaryIntervalHeight;
        }
        // Secondary Below
        var thisY = tonicY + primaryIntervalHeight - secondaryIntervalHeight;
        while (thisY < tonicY + containerHeight / 2) {
            addLine(minX, maxX, thisY, thisY, settings.axisColors[this.secondaryAxis], settings.secondaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.name}`);
            thisY += primaryIntervalHeight;
        }
        // Secondary Above
        var thisY = tonicY - secondaryIntervalHeight;
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
    }


    static intervalsEqual(a, b) {
        for (var i = 0; i < Math.max(a.length, b.length); i++) {
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

    addToViewport(x, referenceFreq) {
        const PITCH_LINE_LEN = 70

        // Add pitch line
        var thisY = Math.log2(referenceFreq * this.getRatio() / C_0) * settings.octaveScale * -1;
        addPitchLine(x, x+PITCH_LINE_LEN, thisY, "white", 1, settings.pitchLineWidth, "pitchLine chord");

        // Add interval bars
        for (var dim of this.childDims) {
            addAscentBar(Math.abs(dim), x, x+PITCH_LINE_LEN, thisY, Math.sign(dim) === -1);
        }
    }
}

class Chord {
    constructor(relativeFreq) {
        this.relativeFreq = relativeFreq;
        var basePitch = new Pitch(this);
        this.pitches = [basePitch];
    }
    
    /**
     * Returns the Pitch if the chord contains a Pitch with the given vector, or null otherwise
     * @param {Array<number>} pitchVector 
     * @returns {Pitch}
     */
    getPitch(pitchVector) {
        for (var p of this.pitches) {
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
        var parent = this.getPitch(fromVector);
        if (!parent) {
            console.warn(`Tried to add a pitch to a parent that didn't exist!\nAttempted parent: [${fromVector}]`);
            console.log(this.pitches);
            return;
        }

        // Check that new pitch doesn't already exist
        var newPitchVector = [...parent.transformedVector];
        while (newPitchVector.length <= Math.abs(dim)) {
            newPitchVector.push(0);
        }
        newPitchVector[Math.abs(dim)] += Math.sign(dim);
        if (this.getPitch(newPitchVector)) return;

        // Add pitch
        var child = new Pitch(this, newPitchVector, parent);
        parent.associateChild(child, dim);
        this.pitches.push(child);
    }

    /**
     * Returns the pitch in the chord nearest to the given y coordinate in the svg.
     * @param {number} y 
     */
    findNearestPitch(y) {
        var minDistance = Infinity;
        var closestPitch = null;
        for (var p of this.pitches) {
            var pitchY = Math.log2(this.relativeFreq * p.getRatio() / C_0) * settings.octaveScale * -1;
            if (Math.abs(pitchY - y - viewportY) < minDistance) {
                minDistance = Math.abs(pitchY - y - viewportY);
                closestPitch = p;
            }
        }
        return closestPitch;
    }

    addToViewport(x) {
        for (var p of this.pitches) {
            p.addToViewport(x, this.relativeFreq);
        }
    }

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
            selectedDirection = arg[2] === "a"? 1:-1;
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
    var product = 1;
    for (var i = 0; i < arr.length; i++) {
        product *= PRIMES[i] ** arr[i];
    }
    return product;
}

/** 0D-indexed, shasavistic interval vector to pitch ratio */
function getTransformedInterval(arr) {
    var product = 1;
    for (var i = 0; i < arr.length; i++) {
        product *= getPureInterval(settings.axes[i]) ** arr[i];
    }
    return product;
}

function refitSvgContent() {
    const bbox = viewport.getBBox();
    const padding = 0;
    viewportX = bbox.x;
    viewportY = bbox.y;
    viewport.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
    viewport.setAttribute("width", bbox.width + padding * 2);
    viewport.setAttribute("height", bbox.height + padding * 2);
}

function addLine(x1, x2, y1, y2, color, opacity=1, width=settings.keyAreaLineWidth, classes="") {
    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
    var line = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    line.setAttribute("points", `${x1-width/2},${y1} ${x1+width/2},${y1} ${x2+width/2},${y2} ${x2-width/2},${y2}`);
    line.setAttribute("stroke-width", 0)
    line.setAttribute("fill", color);
    line.setAttribute("opacity", opacity);
    line.setAttribute("class", classes);
    return viewport.appendChild(line);
}

function addCurveLine(x, deform, y1, y2, color, opacity=1, width=8, classes="") {
    var line = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
function addAscentBar(dim, x1, x2, startY, descending=false) {
    const height = Math.log2(getPureInterval(settings.axes[dim])) * settings.octaveScale;
    const defaultWidth = 8;
    var startX = (dim == 3 || dim == 5 || dim == 7)? x2:x1;
    if (descending) {
        startY += height;
    }
    switch (dim) {
        case 1:
            const arrowSize = 14;
            addLine(x1, x1, startY-arrowSize, startY-height, settings.axisColors[dim], 1, 4, "ascentLine");
            var overshoot = Math.SQRT2 * 4/4; // sqrt2 times 1/4 of the width of the lines to create the arrow
            addLine(x1-arrowSize, x1+overshoot, startY, startY-arrowSize-overshoot, "white", 1, 4, "ascentLine");
            addLine(x1+arrowSize, x1-overshoot, startY, startY-arrowSize-overshoot, "white", 1, 4, "ascentLine");
            break;
        case 2:
            addLine(x1, x1, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
            break;
        case 3:
            addLine(x2, x2, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
            break;
        case 4:
            addRhombusLine(x1, x2, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
            break;
        case 5:
            addRhombusLine(x2, x1, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
            break;
        case 6:
            addCurveLine(x1, -8, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
            break;
        case 7:
            addCurveLine(x2, 8, startY, startY-height, settings.axisColors[dim], 1, defaultWidth, "ascentLine");
    }
}

function addPitchLine(x1, x2, y, color="white", opacity=1, width=settings.pitchLineWidth, classes="pitchLine") {
    addLine(x1, x2, y, y, color, opacity, width, classes);
}

document.querySelector("#viewport").addEventListener("click", (event) => {
    var rect = event.target.getBoundingClientRect();
    // var x = event.clientX - rect.left;
    // var y = event.clientY - rect.top;
    console.log(`Mouse at (${event.offsetX}, ${event.offsetY})`);
    console.log(myChord.findNearestPitch(event.offsetY));
});

let cMajor = new KeyArea("my_key", 2, 3, 261.63);
cMajor.addToViewport();
let myChord = new Chord(261.63);
myChord.addPitch([0], 2);
// myChord.addPitch([0, 1], -3);
myChord.addPitch([0], 5);
myChord.addPitch([0], -5);
// myChord.addPitch([0, 0, 0, 0, 1], 5);
// myChord.addPitch([0, 0, 0, 0, 2], 5);
// myChord.addPitch([0, 0, 0, 0, -1], -5);
// myChord.addPitch([0, 0, 0, 0, -2], -5);

myChord.addToViewport(50);
refitSvgContent();
