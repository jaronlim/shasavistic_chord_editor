const viewport = document.getElementById("viewport");
const viewportContainer = document.getElementById("viewport-container");

const keyAreasViewportGroup = document.getElementById("keyAreas");

const PRIMES = [2, 3, 5, 7, 11, 13, 17];
const C_0 = 16.3516 //hz

let selectedDimension = 2;
let selectedDirection = 1;

/** @type {Pitch|null} */
let selectedPitch = null; // Hovered over / highlighted pitch

let viewportX = 0;
let viewportY = 0;
let viewportWidth = 0;
let viewportHeight = 0;

const viewportPaddingX = 50;

viewport.style.backgroundColor = "#676681";

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

    "hotkeys": {
        "selectDimension": ["`", "1", "2", "3", "4", "5", "6", "7"],

        "selectAscent": "a",
        "selectDescent": "d",
    },

    "previewPitchOpacity": 0.5,

    // PITCH/INTERVAL-BAR SETTINGS
    "pitchLineWidth": 2,
    "pitchLineColor": "white",
    "pitchLineSelectedWidth": 4,
    "pitchLineSelectedColor": "white",
    "intervalBarWidth": 8,

    // KEY AREA SETTINGS
    "tonicLineWidth":  2,
    "keyAreaLineWidth": 2,
    "tonicLineOpacity": 0.5,
    "primaryLineOpacity": 0.4,
    "secondaryLineOpacity": 0.3,
    "leftPadding": 50,
    "rightPadding": 50,

    "finalSectionRightBuffer": viewportContainer.clientWidth - 170,
    "autoScrollToNewChord": true,

    // CHORD RENDERING SETTINGS
    "chordWidth": 70,
    "chordSpacing": 75,

    // TODO: add a setting to automatically use blue pitch lines for chord extensions

    // TODO: add setting to show/hide scroll bar
}

class Project {
    constructor(title="untitled", description="") {
        this.meta = {
            "title": title,
            "description": description,
        }
        this.referenceFreq = 261.63;
        this.sections = [new Section(0, new KeyArea(2, 3, 261.63))];
    }

    fitInWindow() {
        settings.finalSectionRightBuffer = viewportContainer.clientWidth - 170; // TODO: find solution that doesn't involve changing settings in background
        this.updateViewport();
    }

    addSection(section) {
        this.sections[this.sections.length - 1].isFinalSection = false;
        section.isFinalSection = true;
        this.sections.push(section);
    }

    insertSection(section, index) {
        this.sections.splice(index, 0, section);
    }

    // Return the Section that currently occupies the given x position
    getSectionAt(x) {
        if (x < 0) return null;
        let sum;
        for (let section of this.sections) {
            sum += section.getWidth();
            if (x < sum) return section;
        }
        return this.sections[this.sections.length - 1];
    }

    updateViewport() {
        let x = 0;
        for (let section of this.sections) {
            section.addToViewport(x);
            x += section.getWidth();
        }
        refitSvgContent();
    }
}

class Section {
    /** Create a new Section in the editor, usually containing a key and some chords
     * @param {KeyArea | null} keyArea 
     * @param {Array<Chord>} chords 
     */
    constructor(startX, keyArea=null, chords=[], isFinalSection=true) {
        this.leftPadding = settings.leftPadding;
        this.rightPadding = settings.rightPadding;
        this.keyArea = keyArea;
        this.chords = chords;
        this.startX = startX;
        this.isFinalSection = isFinalSection;
        this.isFocused = true; // TODO: toggle this when the focused section changes
    }

    setStartX(newX) {
        startX = newX;
    }

    // Get the total width of the section, not including right-side buffer space for adding chords.
    getWidth() {
        let sum = 0;
        for (let chord of this.chords) {
            sum += chord.getWidth() + settings.chordSpacing;
        }
        return sum + this.leftPadding + this.rightPadding;
    }

    refitContent() {
        this.addKeyAreaToViewport(this.startX);
        refitSvgContent();
    }

    setKeyArea(keyArea) {
        this.keyArea = keyArea;
    }

    addChord(relativeFreq, root=[0]) {
        let chord = new Chord(relativeFreq, this, root);
        this.chords.push(chord);
        this.refitContent();
    }

    insertChord(index, relativeFreq, root=[0]) {
        let chord = new Chord(relativeFreq, this, root);
        this.chords.splice(index, 0, chord);
        this.refitContent();
    }
    
    findNearestChordIndex(x) {
        let index = (x - this.startX - Math.max((viewportContainer.offsetWidth - viewportWidth ) / 2, 0) - this.leftPadding + (settings.chordSpacing / 2)) / (settings.chordWidth + settings.chordSpacing);
        if (index > this.chords.length) {
            return this.chords.length;
        }
        return Math.max(0, Math.floor(index));
    }

    addKeyAreaToViewport(startX) {
        const viewportHeight = viewportContainer.offsetHeight;
        const tonicY = this.keyArea.getTonicY();
        const tonicFreq = intervalToRatio(this.keyArea.tonic) * this.keyArea.relativeFreq;
        let maxY = tonicY;
        let minY = tonicY;
        for (let chord of this.chords) {
            let chordReferenceFreq = chord.relativeFreq;
            let chordMaxY = chord.getMinPitch().getRelativeY(chordReferenceFreq);
            let chordMinY = chord.getMaxPitch().getRelativeY(chordReferenceFreq);
            maxY = Math.max(maxY, chordMaxY);
            minY = Math.min(minY, chordMinY);                
        }
        maxY += viewportHeight / 2;
        minY -= viewportHeight / 2;

        let width = this.getWidth() + (this.isFocused ? settings.chordWidth : 0);
        if (this.isFinalSection) {
            width += settings.finalSectionRightBuffer;
        }
        
        if (this.keyArea) {
            this.keyArea.addToViewport(startX, startX + width, minY, maxY);
        }
    }

    addToViewport(startX) {
        // Add KeyArea
        this.addKeyAreaToViewport(startX)

        // Add Chords
        let x = startX + settings.leftPadding;
        for (let chord of this.chords) {
            chord.addToViewport(x);
            x += chord.width;
        }
    }
}

class KeyArea {
    /** Creates a new key area to serve as the background ruler for pitches to sit on
     * @param {string} name 
     * @param {number} primaryAxis 
     * @param {number} secondaryAxis 
     * @param {number} relativeFreq 
     * @param {Array<number> | null} tonic 
     */
    constructor(primaryAxis, secondaryAxis, relativeFreq, transformedTonic=[0]) {
        // TODO: allow multiple primary axes and secondary axes
        // TODO: allow descending secondary axes
        this.primaryAxis = primaryAxis;
        this.secondaryAxis = secondaryAxis;
        this.relativeFreq = relativeFreq;
        this.tonic = transformedTonic;
        this.htmlElements = [];
        this.minX;
        this.maxX;
        this.uid = newUniqueId();
    }

    // Return the viewport y coordinate of the tonic
    getTonicY() {
        return Math.log2(intervalToRatio(this.tonic) * this.relativeFreq / C_0) * settings.octaveScale * -1;
    }

    // Add a Chord object to the KeyArea's chord list
    addChord(chord) {
        this.chordList.push(chord);
    }

    // Insert a Chord object into the KeyArea's chord list at a given position
    insertChord(chord, index) {
        this.chordList.splice(index, 0, chord);
    }

    // Set all lines' x1 and x2 attributes to the new values
    redefineXBounds(x1, x2) {
        this.minX = x1;
        this.maxX = x2;
        for (let el of this.htmlElements) {
            el.setAttribute("x1", x1);
            el.setAttribute("x2", x2);
        }
    }

    // Return the transformed vector of the nearest line to the y coordinate
    getNearestLineVector(y) {
        const tonicY = this.getTonicY();
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
        return closestPitch;
    }

    // Set this KeyArea's ruler lines in the viewport, in the "keyAreas" <g>
    addToViewport(minX, maxX, minY, maxY) {
        this.minX = minX;
        this.maxX = maxX;
        // Delete existing lines
        this.htmlElements.forEach(el => {
            el.remove();
        });
        this.htmlElements = [];

        // Tonic
        const tonicY = this.getTonicY();
        if (tonicY > minY && tonicY < maxY) {
            this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, maxX, tonicY, tonicY, "white", settings.tonicLineOpacity, settings.tonicLineWidth, `keyArea ${this.uid}`)));
        } else {
            console.error(`The tonic can't be outside of the rendered bounds!\ntonicY=${tonicY}\nminY=${minY}\nmaxY=${maxY}`);
            return -1;
        }
        
        // Interval Heights
        let primaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.primaryAxis])) * settings.octaveScale;
        let secondaryIntervalHeight = Math.log2(getPureInterval(settings.axes[this.secondaryAxis])) * settings.octaveScale;

        // Primary Below
        let thisY = tonicY + primaryIntervalHeight;
        while (thisY < maxY) {
            this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.uid}`)));
            thisY += primaryIntervalHeight;
        }

        // Primary Above
        thisY = tonicY - primaryIntervalHeight;
        while (thisY > minY) {
            this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[this.primaryAxis], settings.primaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.uid}`)));
            thisY -= primaryIntervalHeight;
        }

        // Secondary Below
        thisY = tonicY + primaryIntervalHeight - secondaryIntervalHeight;
        while (thisY < maxY) {
            this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[this.secondaryAxis], settings.secondaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.uid}`)));
            thisY += primaryIntervalHeight;
        }

        // Secondary Above
        thisY = tonicY - secondaryIntervalHeight;
        while (thisY > minY) {
            this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, maxX, thisY, thisY, settings.axisColors[this.secondaryAxis], settings.secondaryLineOpacity, settings.pitchLineWidth, `keyArea ${this.uid}`)));
            thisY -= primaryIntervalHeight;
        }

        // Ensure correct vertical sizing for centering and scroll
        this.htmlElements.push(keyAreasViewportGroup.appendChild(addLine(minX, minX, tonicY - viewportContainer.offsetHeight/2, tonicY + viewportContainer.offsetHeight/2, "pink", 0, 1, `keyArea ${this.uid} scrollHelper`)));

        return 0;
    }
}

class Pitch {
    /** Creates a new relative Pitch. Absolute pitch is not stored.
     * @param {Chord} parentChord The Chord this Pitch belongs to
     * @param {Array<number>} transformedVector Pitch coordinate using octave-scaled basis vectors
     * @param {Pitch} relativePitch The Pitch that this one should reference as its parent
     */
    constructor(parentChord=null, transformedVector=[0], isRoot=false) {
        this.parentChord = parentChord;
        this.isRoot = isRoot;
        this.isSelected = false;
        this.isSounding = true;
        this.lowOpacity = false;
        this.transformedVector = transformedVector;
        this.htmlPitchElement = null;
        this.intervalBars = [];
        this.leftOffset = 0;
        this.rightOffset = 0;
        this.sortRank = -1;
        this.viewportX;
        this.kin = 0;
        for (let num of transformedVector) {
            this.kin += Math.abs(num);
        }
    }

    sortBarsByDim() {
        while (true) {
            let somethingChanged = false;
            for (let i = 0; i < this.intervalBars.length - 1; i++) {
                if (this.intervalBars[i].dim > this.intervalBars[i+1].dim) {
                    let buf = this.intervalBars[i];
                    this.intervalBars[i] = this.intervalBars[i+1];
                    this.intervalBars[i+1] = buf;
                    somethingChanged = true;
                } 
            }
            if (somethingChanged === false) {
                return;
            }
        }
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

    getRatio() {
        return intervalToRatio(this.transformedVector);
    }

    getFrequency() {
        return this.parentChord.relativeFreq * this.getRatio();
    }

    getRelativeY(referenceFreq) {
        return Math.log2(referenceFreq * this.getRatio() / C_0) * settings.octaveScale * -1;
    }

    relateBar(bar) {
        this.intervalBars.push(bar);
    }

    redrawParentChord() {
        this.parentChord.addToViewport(this.parentChord.viewportX);
    }

    // TODO: use parameter x instead of global mouseX
    updateSettings() {
        const centerX = this.viewportX + (settings.chordWidth + this.rightOffset + this.leftOffset) / 2;
        if (mouseX < centerX) {
            this.isSounding = !this.isSounding;
        } else {
            this.lowOpacity = !this.lowOpacity;
        }
        this.isSelected = false;
        
    }

    addToViewport(x, referenceFreq) {
        this.viewportX = x;
        let thisY = this.getRelativeY(referenceFreq);
        if (this.isSelected) {
            if (selectedDimension === 0) {
                let centerX = x + (settings.chordWidth + this.rightOffset + this.leftOffset) / 2;
                let leftHalf = addPitchLine(x + this.leftOffset, centerX, thisY, settings.pitchLineColor, 1, settings.pitchLineWidth, "pitchLine chord " + this.parentChord.uid);
                let rightHalf = addPitchLine(centerX, x + settings.chordWidth + this.rightOffset, thisY, settings.pitchLineColor, 1, settings.pitchLineWidth, "pitchLine chord " + this.parentChord.uid);

                // TODO: use setting for stroke-dasharray
                if (this.isSounding) {
                    leftHalf.setAttribute("stroke-dasharray", "5, 5");
                } else {
                    rightHalf.setAttribute("stroke-dasharray", "5, 5");
                }
                if (this.lowOpacity) {
                    leftHalf.setAttribute("opacity", 0.5);
                } else {
                    rightHalf.setAttribute("opacity", 0.5);
                }

                let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                group.appendChild(leftHalf);
                group.appendChild(rightHalf);
                group.setAttribute("class", "selectedPitchOptions " + this.parentChord.uid);
                viewport.appendChild(group);
                this.htmlPitchElement = group;
            } else {
                this.htmlPitchElement = addPitchLine(x + this.leftOffset, x + settings.chordWidth + this.rightOffset, thisY, settings.pitchLineColor, 1, settings.pitchLineSelectedWidth, "pitchLine selected chord " + this.parentChord.uid);
            }
        } else {
            this.htmlPitchElement = addPitchLine(x + this.leftOffset, x + settings.chordWidth + this.rightOffset, thisY, settings.pitchLineColor, 1, settings.pitchLineWidth, "pitchLine chord " + this.parentChord.uid);
            if (!this.isSounding) {
                this.htmlPitchElement.setAttribute("stroke-dasharray", "5, 5");
            }
            if (this.lowOpacity) {
                this.htmlPitchElement.setAttribute("opacity", 0.5);
            }
        }
    }
}

class IntervalBar {
    constructor(parentChord, pitchAbove, pitchBelow, dim) {
        this.pitchAbove = pitchAbove;
        this.pitchBelow = pitchBelow;
        this.dim = Math.abs(dim);
        this.parentChord = parentChord;
        this.htmlBarElement = null;
        this.leftOffset = 0;
        this.rightOffset = 0;
        this.sortRank = -1;
    }

    // return true if the parameter pitch is between (not equal) to the interval's bounding pitches
    encompassesPitch(p) {
        let pRatio = p.getRatio();
        let minRatio = this.pitchBelow.getRatio();
        let maxRatio = this.pitchAbove.getRatio();
        return minRatio < pRatio && pRatio < maxRatio;
    }

    hasPitch(p) {
        return Pitch.intervalsEqual(p.transformedVector, this.pitchAbove.transformedVector) || Pitch.intervalsEqual(p.transformedVector, this.pitchBelow.transformedVector);
    }

    addToViewport(x, referenceFreq) {
        let thisY = Math.log2(referenceFreq * this.pitchBelow.getRatio() / C_0) * settings.octaveScale * -1;
        this.htmlBarElement = addIntervalBar(Math.abs(this.dim), x + this.leftOffset, x + settings.chordWidth + this.rightOffset, thisY, 1, false, "intervalBar " + this.parentChord.uid);
    }
}

class Chord {
    constructor(relativeFreq, parentSection=null, root=[0]) {
        this.relativeFreq = relativeFreq;
        this.parentSection = parentSection;
        this.rootPitch = new Pitch(this, root, true);
        this.pitches = [this.rootPitch];
        if (this.parentSection) { this.parentSection.refitContent(); }
        /** @type {Array<IntervalBar>} */
        this.intervalBars = [];
        this.width = settings.chordWidth;
        this.uid = newUniqueId();
        this.viewportX;
    }

    /** @returns {number} */
    getWidth() { return this.width; }

    // Return the highest pitch in the chord
    getMaxPitch() {
        let maxPitch = null;
        let maxRatio = -Infinity;
        for (let pitch of this.pitches) {
            if (pitch.getRatio() > maxRatio) {
                maxPitch = pitch;
                maxRatio = pitch.getRatio();
            }
        }
        return maxPitch;
    }

    // Return the lowest pitch in the chord
    getMinPitch() {
        let minPitch = null;
        let minRatio = Infinity;
        for (let pitch of this.pitches) {
            if (pitch.getRatio() < minRatio) {
                minPitch = pitch;
                minRatio = pitch.getRatio();
            }
        }
        return minPitch
    }
    
    /** Returns the Pitch if the chord contains a Pitch with the given vector, or null otherwise
     * @param {Array<number>} pitchVector 
     * @returns {Pitch}
     */
    getPitch(pitchVector) {
        for (let p of this.pitches) {
            if (Pitch.intervalsEqual(p.transformedVector, pitchVector)) return p;
        }
        return null;
    }

    getIntervalBar(pitch1, pitch2) {
        for (b of this.intervalBars) {
            if ((Pitch.intervalsEqual(b.pitchAbove, pitch1) && Pitch.intervalsEqual(b.pitchBelow, pitch2))
            || (Pitch.intervalsEqual(b.pitchBelow, pitch1) && Pitch.intervalsEqual(b.pitchAbove, pitch2))) {
                return b;
            }
        }
        return null;
    }

    // Forcefully remove a Pitch and any associated interval bars
    removePitch(pitch) {
        // Remove bars
        for (let i = 0; i < this.intervalBars.length; i++) {
            let bar = this.intervalBars[i];
            if (bar.hasPitch(pitch)) {
                this.intervalBars.splice(i, 1);
                i--;
            }
        }
        // Remove pitch
        for (let i = 0; i < this.pitches.length; i++) {
            if (this.pitches[i] === pitch) {
                this.pitches[i].htmlPitchElement.remove();
                this.pitches.splice(i, 1);
                break;
            }
        }

        // Delete chord if empty
        if (this.pitches.length === 0) {
            this.deleteSelf();
            return 1;
        }
        return 0;
    }

    // Add standalone interval bar (you must add pitch separately)
    addIntervalBar(dim, parent, child) {
        let bar;
        if (dim < 0) {
            bar = new IntervalBar(this, parent, child, dim);
        } else {
            bar = new IntervalBar(this, child, parent, dim);
        }
        this.intervalBars.push(bar);
        parent.relateBar(bar);
        child.relateBar(bar);
    }

    // Remove an interval bar including its terminal pitch(es) if they have no other connecting intervals
    removeIntervalBar(bar, i) {
        let existingBar = bar;
        // Remove bar from pitches
        for (let j in bar.pitchAbove.intervalBars) {
            if (bar.pitchAbove.intervalBars[j] === bar) {
                bar.pitchAbove.intervalBars.splice(j, 1);
            }
        }
        for (let j in bar.pitchBelow.intervalBars) {
            if (bar.pitchBelow.intervalBars[j] === bar) {
                bar.pitchBelow.intervalBars.splice(j, 1);
            }
        }
        // Remove bar from chord
        if(existingBar.htmlBarElement) {existingBar.htmlBarElement.remove();}
        this.intervalBars.splice(i, 1);

        // Remove pitches if orphaned
        let pitchAboveOrphaned = true;
        let pitchBelowOrphaned = true;
        for (let b of this.intervalBars) {
            if (b.hasPitch(existingBar.pitchAbove)) {
                pitchAboveOrphaned = false;
            }
            if (b.hasPitch(existingBar.pitchBelow)) {
                pitchBelowOrphaned = false;
            }
        }
        if (pitchAboveOrphaned || pitchBelowOrphaned) {
            for (let j = 0; j < this.pitches.length; j++) {
                if (pitchAboveOrphaned && this.pitches[j] == existingBar.pitchAbove) {
                    existingBar.pitchAbove.htmlPitchElement.remove();
                    this.pitches.splice(j, 1);
                    j--;
                } else if (pitchBelowOrphaned && this.pitches[j] == existingBar.pitchBelow) {
                    existingBar.pitchBelow.htmlPitchElement.remove();
                    this.pitches.splice(j, 1);
                    j--;
                }
            }
            
            // Delete chord if empty
            if (this.pitches.length === 0) {
                this.deleteSelf();
                return 1;
            }
        }
    }

    /**
     * Add or remove an interval from the chord, relative to an existing pitch
     * @param {Array<number>} fromVector The relative pitch on which to stack the new interval (val: starts at prime 2)
     * @param {number} dim 
     */
    inputInterval(fromVector, dim) {
        fromVector.unshift(0);
        // Check that parent exists
        let parent = this.getPitch(fromVector);
        if (!parent) {
            console.warn(`Tried to add a pitch to a parent that didn't exist!\nAttempted parent: [${fromVector}]`); return;
        }

        // Check that new pitch doesn't already exist
        let newPitchVector = [...parent.transformedVector];
        while (newPitchVector.length <= Math.abs(dim)) {
            newPitchVector.push(0);
        }
        newPitchVector[Math.abs(dim)] += Math.sign(dim);
        let existingPitch = this.getPitch(newPitchVector)
        if (existingPitch) {
            // In the case of 0D, remove pitch and all associated interval bars
            if (dim === 0) {
                return this.removePitch(parent);
            }

            // Check if the interval bar already exists
            let existingBar = null;
            let i = 0;
            while (i < this.intervalBars.length) {
                let b = this.intervalBars[i];
                if (b.hasPitch(parent) && b.hasPitch(existingPitch)) {
                    existingBar = b;
                    break;
                }
                i++;
            }
            if (existingBar) {
                return this.removeIntervalBar(existingBar, i);
            } else {
                this.addIntervalBar(dim, parent, existingPitch);
            }
            return 0;
        } else {
            // Add pitch and interval bar
            let child = new Pitch(this, newPitchVector);
            this.pitches.push(child);
            this.addIntervalBar(dim, parent, child);
            this.parentSection.refitContent();
            return 0;
        }
    }

    deleteSelf() {
        for (let i = 0; i < this.parentSection.chords.length; i++) {
            if (this.parentSection.chords[i].uid === this.uid) {
                this.parentSection.chords.splice(i, 1);
                this.parentSection.refitContent();
                return;
            }
        }
    }

    inputIntervalRawY(y, dim) {
        let pitch = this.findNearestPitch(y);
        if (dim === 0) {
            pitch.updateSettings();
        } else {
            this.inputInterval(pitch.transformedVector.slice(1), dim);
        }
    }

    /**
     * Returns the pitch in the chord nearest to the given y coordinate in the svg.
     * @param {number} y 
     */
    findNearestPitch(y, nullDistance=30) {
        let minDistance = Infinity;
        let closestPitch = null;
        for (let p of this.pitches) {
            let pitchY = Math.log2(this.relativeFreq * p.getRatio() / C_0) * settings.octaveScale * -1;
            if (Math.abs(pitchY - y - viewportY) < minDistance) {
                minDistance = Math.abs(pitchY - y - viewportY);
                closestPitch = p;
            }
        }
        if (minDistance > nullDistance) return null;
        return closestPitch;
    }

    /** Return the list of interval bars stacked immediately on top or below the given one.
     * @param {IntervalBar} bar
     * @param {boolean} ascending
     */
    getBarStack(bar, calledFrom=null) {
        let stackedBarList = [...bar.pitchAbove.intervalBars, ...bar.pitchBelow.intervalBars];
        let result = [bar];
        for (let stackedBar of stackedBarList) {
            if (stackedBar === bar) continue;
            if (stackedBar === calledFrom) continue;
            if (stackedBar.dim !== bar.dim) continue;
            result = [...result, ...this.getBarStack(stackedBar, bar)];
        }
        return result;
    }

    // Sort the chord's pitch list for element untangling
    sortPitches() {
        // const sortBy = (a, b) => { return a.kin < b.kin; }

        // // TODO: use a real sorting algorithm
        // for (let i = 0; i < this.pitches.length; i++) {
        //     for (let j = i + 1; j < this.pitches.length; j++) {
        //         if (sortBy(this.pitches[j], this.pitches[i])) {
        //             let buf = this.pitches[i];
        //             this.pitches[i] = this.pitches[j];
        //             this.pitches[j] = buf;
        //         }
        //     }
        // }
        let sorted = [];
        let hasBeenSorted = (p) => {
            for (let already of sorted) {
                if (already === p) return true;
            }
            return false;
        };
        let active = [this.rootPitch];
        let count = 0;
        while (active.length !== 0) {
            let pitch = active[0];
            if (!hasBeenSorted(pitch)) {
                pitch.sortBarsByDim();
                pitch.sortRank = count;
                count++;
                sorted.push(pitch);
                for (let connectedBar of pitch.intervalBars) {
                    if (connectedBar.dim === 2 || connectedBar.dim === 3) {
                        let stack = this.getBarStack(connectedBar);
                        for (let bar of stack) {
                            active.push(bar.pitchAbove);
                            active.push(bar.pitchBelow);
                            bar.sortRank = count;
                            count++;
                        }
                    } else {
                        active.push(connectedBar.pitchAbove);
                        active.push(connectedBar.pitchBelow);
                    }
                }
            }
            active.shift();
            if (active.length === 0 && this.pitches.length !== sorted.length) {
                for (let pitch of this.pitches) {
                    if (!hasBeenSorted(pitch)) {
                        active.push(pitch);
                        break;
                    }
                }
            }
        }
        if (active.length === 0 && this.pitches.length !== sorted.length) {
            console.error("sort pitches failed");
            return;
        }
        this.pitches = sorted;
    }

    // Move html components to reduce collisions
    untangleElements() {
        const offsetDistance = settings.intervalBarWidth * 1.4;
        this.sortPitches();

        for (let pitch of this.pitches) {
            let leftBars = [];
            let rightBars = [];
            for (let bar of this.intervalBars) {
                if (bar.encompassesPitch(pitch)) {
                    if (bar.dim === 2) {
                        leftBars.push(bar);
                    } else if (bar.dim == 3) {
                        rightBars.push(bar);
                    }
                    // TODO: add dim 4 and 5 if the pitch is sufficiently close to an endpoint of the bar (bar is close to one side or the other)
                }
            }

            let leftOffsetCount = 0;
            let rightOffsetCount = 0;
            for (let bar of leftBars) {
                let barRank = Math.min(bar.pitchAbove.sortRank, bar.pitchBelow.sortRank);
                if (barRank < pitch.sortRank) {
                    leftOffsetCount++;
                }
            }
            for (let bar of rightBars) {
                let barRank = Math.min(bar.pitchAbove.sortRank, bar.pitchBelow.sortRank);
                if (barRank < pitch.sortRank) {
                    rightOffsetCount++;
                }
            }

            let leftOffset = leftOffsetCount * offsetDistance;
            let rightOffset = rightOffsetCount * offsetDistance * -1;
            // for (let bar of pitch.intervalBars) {
            //     leftOffset = Math.max(leftOffset);
            //     rightOffset = Math.max(rightOffset);
            // }
            for (let bar of pitch.intervalBars) {
                bar.leftOffset = leftOffset;
                bar.rightOffset = rightOffset;
            }
            pitch.leftOffset = leftOffset;
            pitch.rightOffset = rightOffset;
        }
        for (let bar of this.intervalBars) {
            if (bar.dim === 2 || bar.dim === 3) {
                bar.leftOffset = Math.max(bar.pitchAbove.leftOffset, bar.pitchBelow.leftOffset);
                bar.rightOffset = Math.min(bar.pitchAbove.rightOffset, bar.pitchBelow.rightOffset);
            }
            if (bar.dim === 4) {
                bar.leftOffset = bar.pitchBelow.leftOffset;
                bar.rightOffset = bar.pitchAbove.rightOffset;
            }
            if (bar.dim === 5) {
                bar.leftOffset = bar.pitchAbove.leftOffset;
                bar.rightOffset = bar.pitchBelow.rightOffset;
            }

            if (bar.dim === 2 || bar.dim === 5 || bar.dim === 6) {
                bar.pitchAbove.leftOffset = bar.leftOffset;
            }
            if (bar.dim === 2 || bar.dim === 4 || bar.dim === 6) {
                bar.pitchBelow.leftOffset = bar.leftOffset;
            }
            if (bar.dim === 3 || bar.dim === 4 || bar.dim === 7) {
                bar.pitchAbove.rightOffset = bar.rightOffset;
            }
            if (bar.dim === 3 || bar.dim === 5 || bar.dim === 7) {
                bar.pitchBelow.rightOffset = bar.rightOffset;
            }
        }
    }

    addToViewport(x) {
        this.viewportX = x;
        this.untangleElements();
        // TODO: Reduce unnecessary operations
        document.querySelectorAll("." + this.uid).forEach(el => {
            el.remove();
        });
        for (let p of this.pitches) {
            p.addToViewport(x, this.relativeFreq);
        }
        for (let b of this.intervalBars) {
            b.addToViewport(x, this.relativeFreq);
        }
    }
}

let idsInUse = [];
function newUniqueId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let id;
    do {
        id = chars[Math.round(Math.random()*25)]; // do not begin with a number
        for (let i = 0; i < 5; i++) {
            id += chars[Math.round(Math.random()*35)];
        }
    } while (idsInUse.includes(id));
    idsInUse.push(id);
    return id;
}

function menuSelect(buttonType, arg="") {
    switch (buttonType) {
        case "dim":
            selectedDimension = arg;
            document.querySelectorAll(".axis-button").forEach((el) => {
                el.classList.remove("selected-button");
            });
            document.querySelector(`#button-${arg}d`).classList.add("selected-button");
            break;
        case "dir":
            selectedDirection = arg;
            document.querySelectorAll(".direction-button").forEach((el) => {
                el.classList.remove("selected-button");
            });
            document.querySelector(`#button-${arg === 1? "ascent" : "descent"}`).classList.add("selected-button");
            break;
        case "settings":
            populateSettingsElement();
            break;
        default:
            console.warn("Failed to update a menu button!");
            break;
    }
}

function populateSettingsElement() {
    let popover = document.getElementById("settings-popover");
    popover.innerHTML = "<div style=\"padding:8px; background-color: lightcoral\"><strong>Warning! Some settings are currently broken and could ruin your project!</strong></div>";
    let table = document.createElement("table");
    table.setAttribute("id", "settings-table");

    for (let key in settings) {
        let row = document.createElement("tr");
        row.setAttribute("id", "settings-" + key);
        row.setAttribute("class", "settings-entry");
        
        let inputField = document.createElement("input");
        inputField.setAttribute("settings-key", key);
        switch (settingsMetaInfo[key].type) {
            case "text":
                inputField.setAttribute("type", "text");
                break;
            case "number":
                inputField.setAttribute("type", "number");
                inputField.setAttribute("step", 0.01);
                break;
            case "bool":
                inputField.setAttribute("type", "checkbox");
                break;
            case "array":
                inputField.setAttribute("type", "hidden");
                break;
            case "json":
                inputField.setAttribute("type", "hidden");
                break;
            default:
                inputField.setAttribute("type", "hidden");
                console.warn(`Found settings value of an unknown type!\n${settings[key]} of type ${typeof settings[key]}`);
        }
        inputField.value = settings[key];
        inputField.setAttribute("type", settingsInputTypes[settingsMetaInfo[key].type])
        row.innerHTML = `<td class="settings-key-column">${settingsMetaInfo[key].name}</td><td class="settings-input-column"></td>`;
        row.getElementsByClassName("settings-input-column")[0].appendChild(inputField);
        table.appendChild(row)

        inputField.addEventListener("focusout", settingsChanged);
        inputField.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.target.blur();
            }
        })
    }
    popover.appendChild(table);
}

function settingsChanged(event) {
    let key = event.target.getAttribute("settings-key")
    let rawValue = event.target.value;
    let meta = settingsMetaInfo[key];
    if (!meta) { console.error("Failed to update settings."); return; }
    switch (meta.type) {
        case "number":
            if (rawValue < meta.min || rawValue > meta.max) {
                // TODO: show error tooltip
                break;
            }
            settings[key] = rawValue;
            break;
        case "color":
            settings[key] = rawValue;
            break;
        case "text":
            settings[key] = rawValue;
            break;
    }
    project.updateViewport();
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
function intervalToRatio(arr) {
    let product = 1;
    for (let i = 0; i < arr.length; i++) {
        product *= getPureInterval(settings.axes[i]) ** arr[i];
    }
    return product;
}

let oldViewportY; // stores previous viewport Y position to help calculate new y coordinates on refit (also used in mouseClickInput)
const vertPadding = 5;
const horizPadding = 0;
function refitSvgContent() {
    // TODO: fix slightly broken bounds when bbox height < viewport height (ie no chords exist, only keyArea)
    // TODO: smoothly scroll back to the allowed area if the viewport bounds shrink
    const bbox = viewport.getBBox();
    viewportX = bbox.x;
    // viewportY = Math.min(bbox.y, bbox.y + (viewport.clientHeight - bbox.height));
    viewportY = bbox.y;
    viewportWidth = bbox.width;
    viewportHeight = Math.max(bbox.height, viewportContainer.clientHeight);
    if (viewportHeight + vertPadding * 2 < viewportContainer.clientHeight) {
        viewportY -= (viewportContainer.clientHeight - viewportHeight - vertPadding * 2) / 2;
    }
    viewport.setAttribute("viewBox", `${bbox.x - horizPadding} ${viewportY - vertPadding} ${bbox.width + horizPadding * 2} ${viewportHeight + vertPadding * 2}`);
    viewport.setAttribute("width", bbox.width + horizPadding * 2);
    viewport.setAttribute("height", viewportHeight);
    if (oldViewportY) {
        viewportContainer.scrollTop += oldViewportY - viewportY;
    } else {
        viewportContainer.scrollTop = ((viewportHeight + vertPadding * 2) - viewportContainer.clientHeight) / 2; // Initialize scroll to center
    }
    oldViewportY = viewportY;
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

let last1dSymbolOctaveScale = settings.octaveScale;
build1dAsentSymbol();
function build1dAsentSymbol() {
    const defs = viewport.querySelector("defs");
    const height = Math.log2(getPureInterval(settings.axes[1])) * settings.octaveScale;
    const arrowSize = 10;
    const arrowStrokeWidth = 2;
    const barWidth = 4;
    const overshoot = Math.SQRT2 * arrowStrokeWidth/4;
    let symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    symbol.setAttribute("id", "1d-bar-ascent-symbol");
    symbol.setAttribute("viewBox", `${- arrowSize - overshoot} ${-height} ${2 * (arrowSize + overshoot)} ${height}`);
    symbol.setAttribute("preserveAspectRatio", "xMinYMin");
    let bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bar.setAttribute("x1", 0);
    bar.setAttribute("x2", 0);
    bar.setAttribute("y1", -arrowSize);
    bar.setAttribute("y2", -height);
    bar.setAttribute("stroke", settings.axisColors[1]);
    bar.setAttribute("stroke-width", barWidth);
    symbol.appendChild(bar);
    let arrowL = document.createElementNS("http://www.w3.org/2000/svg", "line");
    arrowL.setAttribute("x1", -arrowSize);
    arrowL.setAttribute("x2", overshoot);
    arrowL.setAttribute("y1", 0);
    arrowL.setAttribute("y2", -arrowSize-overshoot);
    arrowL.setAttribute("stroke", "white");
    arrowL.setAttribute("stroke-width", arrowStrokeWidth);
    symbol.appendChild(arrowL);
    let arrowR = document.createElementNS("http://www.w3.org/2000/svg", "line");
    arrowR.setAttribute("x1", arrowSize);
    arrowR.setAttribute("x2", -overshoot);
    arrowR.setAttribute("y1", 0);
    arrowR.setAttribute("y2", -arrowSize-overshoot);
    arrowR.setAttribute("stroke", "white");
    arrowR.setAttribute("stroke-width", arrowStrokeWidth);
    symbol.appendChild(arrowR);
    defs.appendChild(symbol);
}

/**
 * Add a colored interval bar
 * @param {number} dim
 * @param {number} startX 
 * @param {number} startY 
 * @param {boolean} descending 
 */
function addIntervalBar(dim, x1, x2, startY, opacity=1, descending=false, classes="intervalBar") {
    const height = Math.log2(getPureInterval(settings.axes[dim])) * settings.octaveScale;
    const defaultWidth = settings.intervalBarWidth;
    const halfPitchWidth = settings.pitchLineWidth / 2;
    let startX = (dim == 3 || dim == 5 || dim == 7)? x2:x1;
    if (descending) {
        startY += height;
    }
    switch (dim) {
        case 1:
            let bar = document.createElementNS("http://www.w3.org/2000/svg", "use");
            bar.setAttribute("href", "#1d-bar-ascent-symbol");
            bar.setAttribute("x", x1);
            bar.setAttribute("y", startY - Math.log2(getPureInterval(settings.axes[1])) * settings.octaveScale);
            bar.setAttribute("height", Math.log2(getPureInterval(settings.axes[1])) * settings.octaveScale);
            bar.setAttribute("opacity", opacity);
            bar.setAttribute("class", classes);
            return viewport.appendChild(bar);
            break;
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

function addPitchLine(x1, x2, y, color=settings.pitchLineColor, opacity=1, width=settings.pitchLineWidth, classes="pitchLine") {
    return addLine(x1, x2, y, y, color, opacity, width, classes);
}

let previewPitch = null;
let previewPitchElement = null;
let previewBasePitchElement = null;
let previewIntervalBarElement = null;

function setPreviewPitch(x, y) {
    let section = project.getSectionAt(x);
    let keyArea = section.keyArea;

    if (previewPitchElement !== null) {
        previewPitchElement.remove();
        if (previewIntervalBarElement) {previewIntervalBarElement.remove();}
        previewBasePitchElement.remove();
        previewPitch = null;
        previewIntervalBar = null;
    }
    let chordIndex = section.findNearestChordIndex(x);
    if (chordIndex === section.chords.length) {
        let previewPitchVector = [0];
        while (previewPitchVector.length <= Math.abs(selectedDimension)) {
            previewPitchVector.push(0);
        }
        previewPitchVector[Math.abs(selectedDimension)] += selectedDirection;
        previewPitch = new Pitch(null, previewPitchVector);
        
        let nearestLineVector = keyArea.getNearestLineVector(y);
        let referenceFreq = 261.63 * intervalToRatio(nearestLineVector);

        let baseY = Math.log2(referenceFreq / C_0) * settings.octaveScale * -1;
        let thisY = Math.log2(referenceFreq * previewPitch.getRatio() / C_0) * settings.octaveScale * -1;
        let thisX = (settings.chordWidth + settings.chordSpacing) * chordIndex + viewportPaddingX;
        previewPitchElement = addPitchLine(thisX, thisX + settings.chordWidth, thisY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch");
        previewBasePitchElement = addPitchLine(thisX, thisX + settings.chordWidth, baseY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch")

        // Add interval bar
        previewIntervalBarElement = addIntervalBar(Math.abs(selectedDimension), thisX, thisX + settings.chordWidth, thisY, settings.previewPitchOpacity, selectedDirection === 1, "intervalBar preview-pitch");
    } else {
        let chord = section.chords[chordIndex];
        let nearestPitch = chord.findNearestPitch(y);
        if (!nearestPitch) return;
        let previewPitchVector = [...nearestPitch.transformedVector];
        while (previewPitchVector.length <= Math.abs(selectedDimension)) {
            previewPitchVector.push(0);
        }
        previewPitchVector[Math.abs(selectedDimension)] += selectedDirection;
        previewPitch = new Pitch(null, previewPitchVector);
        let referenceFreq = chord.relativeFreq;

        // Add pitch line
        let thisY = Math.log2(referenceFreq * previewPitch.getRatio() / C_0) * settings.octaveScale * -1;
        let thisX = (settings.chordWidth + settings.chordSpacing) * chordIndex + viewportPaddingX;
        previewPitchElement = addPitchLine(thisX, thisX + settings.chordWidth, thisY, settings.pitchLineColor, settings.previewPitchOpacity, settings.pitchLineWidth, "pitchLine chord preview-pitch");

        // Add interval bar
        previewIntervalBarElement = addIntervalBar(Math.abs(selectedDimension), thisX, thisX + settings.chordWidth, thisY, settings.previewPitchOpacity, selectedDirection === 1, "intervalBar preview-pitch");
    }
}

function setSelectedPitch(x, y) {
    let section = project.getSectionAt(x);
    let keyArea = section.keyArea;
    let previouslySelectedPitch = selectedPitch;

    if (selectedPitch) {
        selectedPitch.isSelected = false;
        selectedPitch.htmlPitchElement.setAttribute("stroke", settings.pitchLineColor);
        selectedPitch.htmlPitchElement.setAttribute("stroke-width", settings.pitchLineWidth);
        selectedPitch.redrawParentChord();
    }

    let chordIndex = section.findNearestChordIndex(x);
    if (chordIndex === section.chords.length) {
        if (previouslySelectedPitch) {
            previouslySelectedPitch.redrawParentChord();
        }
    } else {
        let chord = section.chords[chordIndex];
        selectedPitch = chord.findNearestPitch(y);
        if (selectedPitch) {
            selectedPitch.isSelected = true;
            document.querySelectorAll("." + selectedPitch.parentChord.uid + ".pitchLine").forEach((el) => {
                el.setAttribute("stroke", settings.pitchLineColor);
                el.setAttribute("stroke-width", settings.pitchLineWidth);
            });
            selectedPitch.redrawParentChord();
        }
    }
}

function mouseClickInput(x, y) {
    let saveOldViewportY = oldViewportY;
    let section = project.getSectionAt(x);
    let keyArea = section.keyArea;

    let chordIndex = section.findNearestChordIndex(x);
    let newChord = false;
    if (chordIndex === section.chords.length) {
        section.addChord(261.63 * intervalToRatio(keyArea.getNearestLineVector(y)));
        newChord = true;
    }
    if (!(selectedDimension === 0 && newChord)) {
        section.chords[chordIndex].inputIntervalRawY(y, selectedDimension * selectedDirection);
    }
    if (newChord) {
        section.chords[chordIndex].addToViewport(chordIndex * (settings.chordWidth + settings.chordSpacing) + viewportPaddingX);
    } else {
        while (chordIndex < section.chords.length) {
            section.chords[chordIndex].addToViewport(chordIndex * (settings.chordWidth + settings.chordSpacing) + viewportPaddingX);
            chordIndex++;
        }
    }
    let deltaViewportY = oldViewportY - saveOldViewportY;
    if (selectedDimension !== 0 || newChord) {
        setPreviewPitch(x, y - deltaViewportY);
    }
    setSelectedPitch(x, y - deltaViewportY);
}

let mouseX = 0;
let mouseY = 0;

const cancelInputRadius = 35;
let cancelMouseInput = false;
viewport.addEventListener("mousemove", (event) => {
    mouseX = event.offsetX;
    mouseY = event.offsetY;
    if (mouseIsDown && (mouseDownX - mouseX) ** 2 + (mouseDownY - mouseY) **2 > cancelInputRadius **2) {
        if (selectedPitch) {
            selectedPitch.htmlPitchElement.setAttribute("stroke", settings.pitchLineColor);
            selectedPitch.htmlPitchElement.setAttribute("stroke-width", settings.pitchLineWidth);
        }
        if (previewPitch !== null) {
            cancelMouseInput = true;
            previewPitchElement.remove();
            if (previewIntervalBarElement) {previewIntervalBarElement.remove();}
            previewBasePitchElement.remove();
            previewPitch = null;
        }
    }
    if (!cancelMouseInput && !mouseIsDown) {
        setSelectedPitch(mouseX - horizPadding, mouseY - vertPadding);
        if (selectedDimension === 0) {
            
        } else {
            setPreviewPitch(mouseX - horizPadding, mouseY - vertPadding);
        }
    }
});

viewportContainer.addEventListener("mouseleave", (event) => {
    if (selectedPitch) {
        selectedPitch.isSelected = false;
        selectedPitch.redrawParentChord();
        selectedPitch = null;
    }

    if (previewPitch !== null) {
        previewPitchElement.remove();
        if (previewIntervalBarElement) {previewIntervalBarElement.remove();}
        previewBasePitchElement.remove();
        previewPitch = null;
    }
});

let mouseDownX;
let mouseDownY;
let mouseIsDown = false;
viewport.addEventListener("mousedown", (event) => {
    if (event.button == 0) {
        mouseDownX = event.offsetX;
        mouseDownY = event.offsetY;
        mouseIsDown = true;
    }
});

viewport.addEventListener("mouseup", (event) => {
    mouseIsDown = false;
    if (cancelMouseInput) {
        cancelMouseInput = false;
        return;
    }
    cancelMouseInput = false;
    if (event.button == 0) {
        mouseClickInput(mouseDownX - horizPadding, mouseDownY - vertPadding);
    }
});

document.addEventListener("keypress", (event) => {
    let needsPreviewPitchRedraw = false;
    if (settings.hotkeys.selectDimension.includes(event.key)) {
        menuSelect("dim", settings.hotkeys.selectDimension.indexOf(event.key));
        needsPreviewPitchRedraw = true;
    }

    if (event.key === settings.hotkeys.selectAscent) { menuSelect("dir", 1); needsPreviewPitchRedraw = true; }
    if (event.key === settings.hotkeys.selectDescent) { menuSelect("dir", -1); needsPreviewPitchRedraw = true; }

    if (needsPreviewPitchRedraw) {
        setSelectedPitch(mouseX, mouseY);
        setPreviewPitch(mouseX, mouseY);
    }
});

window.addEventListener("resize", (event) => {
    project.fitInWindow();
});


let project = new Project();
project.updateViewport();

refitSvgContent();
