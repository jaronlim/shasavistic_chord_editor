import { drawKeyArea } from './renderer.js';
import { settings } from './settings.js';
import { monzoToRatio, MAX_DIMENSION, monzoToFreq, newUID, addArrays, scaleMonzo, addMonzos, monzosEqual, addDimToMonzo } from './utils.js';

/** @type {Project} */
export let activeProject;

export let deletedUids = [];

export class Project {
    /**
     * @param {string} title 
     * @param {string} desc 
     */
    constructor(title='untitled', desc='') {
        this.meta = {
            title: title,
            desc: desc
        }

        /** @type {Array<Section>} */
        this.sections = [];

        activeProject = this;
    }

    setTitle(title) {
        this.meta.title = title;
    }

    setDescription(desc) {
        this.meta.desc = desc;
    }

    addSection(section) {
        this.sections.push(section);
    }

    insertSection(section, index) {
        this.sections.splice(index, 0, section);
    }
}

export class Section {
    /**
     * @param {KeyArea} keyArea 
     */
    constructor(keyArea) {
        this.keyArea = keyArea;
        /** @type {Array<Chord>} */
        this.chords = [];
    }

    addChord(chord) {
        this.chords.push(chord);
    }

    removeChord(chord) {
        for (let i = 0; i < this.chords.length; i++) {
            const c = this.chords[i];
            if (c === chord) {
                this.chords.splice(i, 1);
                return;
            }
        }
    }

    insertChord(chord, index) {
        this.chords.splice(index, 0, chord);
    }

    getWidth() {
        let width = settings.leftPadding + settings.rightPadding;
        for (let chord of this.chords) {
            width += chord.getWidth();
            width += settings.chordSpacing;
        }
        return width;
    }

    refitKeyArea(useRightBuffer=true) {
        drawKeyArea(this.keyArea, useRightBuffer);
    }
}

export class KeyArea {
    /**
     * @param {number} referenceFreq 
     * @param {Array<number>} primaryAxes 
     * @param {Array<number>} secondaryAxes 
     * @param {Array<number>} tonicMonzo 
     */
    constructor(referenceFreq, primaryAxes=[2], secondaryAxes=[3], tonicMonzo=[0]) {
        this.uid = newUID();

        this.referenceFreq = referenceFreq;
        this.tonicMonzo = tonicMonzo;

        this.primaryAxes = primaryAxes;
        this.secondaryAxes = secondaryAxes;
    }

    getParents() {
        for (let section of activeProject.sections) {
            if (section.keyArea === this) {
                return {
                    project: activeProject,
                    section: section
                }
            }
        }
    }

    closestMonzoFromRatio(ratio) {
        console.assert(ratio > 0, `Cannot search for monzo with non-positive ratio (${ratio})`);
        
        // all distances in this function are log-space (octave is always equal)
        let targetPosition = Math.log2(ratio);

        let closestDistance = Infinity;
        let closestMonzo;
        
        for (let primaryAxis of this.primaryAxes) {
            const primaryAxisMonzo = settings.axes[primaryAxis];
            const primaryLength = Math.log2(monzoToRatio(primaryAxisMonzo));

            const closestPrimaryCount = Math.round(targetPosition / primaryLength);
            const closestPrimaryMonzo = scaleMonzo(primaryAxisMonzo, closestPrimaryCount);

            const primaryDistance = Math.abs(Math.log2(monzoToRatio(closestPrimaryMonzo)) - targetPosition);

            if (primaryDistance < closestDistance) {
                closestDistance = primaryDistance;
                closestMonzo = closestPrimaryMonzo;
            }

            for (let secondaryAxis of this.secondaryAxes) {
                const secondaryAxisMonzo = settings.axes[secondaryAxis];
                const secondaryLength = Math.log2(monzoToRatio(secondaryAxisMonzo));

                const closestSecondaryCount = Math.round((targetPosition - secondaryLength) / primaryLength);
                const closestSecondaryMonzo = addMonzos(scaleMonzo(primaryAxisMonzo, closestSecondaryCount), secondaryAxisMonzo);
                
                const secondaryDistance = Math.abs(Math.log2(monzoToRatio(closestSecondaryMonzo)) - targetPosition);
                
                if (secondaryDistance < closestDistance) {
                    closestDistance = secondaryDistance;
                    closestMonzo = closestSecondaryMonzo;
                }
                
            }
        }
        return {
            monzo: closestMonzo,
            octaveDistance: closestDistance
        }
    }
}

export class Chord {
    /**
     * @param {number} referenceFreq 
     * @param {Array<number>} rootMonzo 
     */
    constructor(rootMonzo=null) {
        this.rootMonzo = rootMonzo ? [...rootMonzo] : null;
        this.pitches = rootMonzo ? [new Pitch([...rootMonzo])] : [];
        /** @type {Array<IntervalBar>} */
        this.bars = [];
        this.uid = newUID();
    }

    /**
     * Search through all chords in sections within activeProject to find this chord; return the parents or null if none
     */
    getParents() {
        for (let section of activeProject.sections) {
            for (let chord of section.chords) {
                if (chord === this) {
                    return {
                        project: activeProject,
                        section: section
                    }
                }
            }
        }
        return null;
    }

    /**
     * Get the Pitch of this chord associated with the given monzo
     * @param {Array<number>} monzo
     * @returns The Pitch object within this chord corresponding to the given monzo, or null if none
     */
    getPitchFromMonzo(monzo) {
        for (let pitch of this.pitches) {
            if (monzosEqual(pitch.monzo, monzo)) return pitch;
        }
        return null;
    }

    /**
     * Get the IntervalBar of this chord with the given monzo endpoints.
     * @param {Array<number>} monzo1
     * @param {Array<number>} monzo2
     * @returns The IntervalBar object with the given monzo endpoints
     */
    getBarFromMonzos(monzo1, monzo2) {
        for (let bar of this.bars) {
            if (bar.monzoOnEndpoint(monzo1) && bar.monzoOnEndpoint(monzo2)) {
                return bar;
            }
        }
        return null;
    }

    /**
     * Get the highest Pitch in the Chord by ratio, ignoring octave transposition
     * @returns The highest Pitch in the Chord
     */
    getMaxPitch() {
        if (this.pitches.length === 0) return null;

        let maxPitch = this.pitches[0];
        for (let pitch of this.pitches) {
            if (pitch.previewType === 0 && pitch.getRatio() > maxPitch.getRatio()) {
                maxPitch = pitch;
            }
        }
        return maxPitch;
    }

    /**
     * Get the lowest Pitch in the Chord by ratio, ignoring octave transposition
     * @returns The lowest Pitch in the Chord
     */
    getMinPitch() {
        if (this.pitches.length === 0) return null;

        let minPitch = this.pitches[0];
        for (let pitch of this.pitches) {
            if (pitch.previewType === 0 && pitch.getRatio() < minPitch.getRatio()) {
                minPitch = pitch;
            }
        }
        return minPitch;
    }

    /**
     * Add the given interval to the chord starting at the pitch at fromMonzo
     * @param {Array<number>} fromMonzo
     * @param {number} dim 
     * @param {boolean} isAscending 
     */
    inputInterval(fromMonzo, dim, isAscending) {
        console.assert(dim >= 0 && dim <= MAX_DIMENSION, `Dimension (${dim}) out of bounds.`);

        // Check that parent exists
        const parent = this.getPitchFromMonzo(fromMonzo);
        if (!parent) {
            console.warn(`Tried to add a pitch to a parent that didn't exist!\nAttempted parent: [${fromMonzo}]`);
            return;
        }

        // If selected dimension is 0 delete the pitch and return
        if (dim === 0) {
            this.removePitch(parent);
            this.deleteSelfIfEmpty();
            return;
        }

        // Input interval
        const  newPitchMonzo = addDimToMonzo(fromMonzo, dim, isAscending);
        const existingPitch = this.getPitchFromMonzo(newPitchMonzo);

        if (existingPitch) {
            const existingBar = this.getBarFromMonzos(existingPitch.monzo, fromMonzo);

            if (existingBar) {
                this.removeBar(existingBar);
                this.deleteSelfIfEmpty();
            } else {
                this.addBar(fromMonzo, dim, isAscending);
            }
            return;
        } else {
            this.addPitch(newPitchMonzo);
            this.addBar(fromMonzo, dim, isAscending);
        }
    }

    /**
     * Add the proposed input to the chord as preview elements
     * @param {Array<number>} fromMonzo
     * @param {number} dim
     * @param {boolean} isAscending
     */
    setPreviewInterval(fromMonzo, dim, isAscending) {
        this.rejectPreviewElements();

        console.assert(dim >= 0 && dim <= MAX_DIMENSION, `Dimension (${dim}) out of bounds.`);
        
        // Check that parent exists
        const existingParent = this.getPitchFromMonzo(fromMonzo);
        const parent = existingParent ? existingParent : this.addPitch(fromMonzo);
        if (!existingParent) {
            parent.previewType = 1;
        }
        
        if (dim === 0) {
            const connectedBars = parent.getBars({chord:this});
            for (let bar of connectedBars) {
                bar.previewType = -1;
            }
            return;
        }

        // Input interval
        const newPitchMonzo = addDimToMonzo(fromMonzo, dim, isAscending);
        const existingPitch = this.getPitchFromMonzo(newPitchMonzo);
        
        if (existingPitch) {
            const existingBar = this.getBarFromMonzos(existingPitch.monzo, fromMonzo);
            if (existingBar) {
                existingBar.previewType = -1;
            } else {
                this.addBar(fromMonzo, dim, isAscending).previewType = 1;
            }
            return;
        } else {
            this.addPitch(newPitchMonzo).previewType = 1;
            this.addBar(fromMonzo, dim, isAscending).previewType = 1;
        }
    }

    /**
     * Set the root pitch
     * @param {Array<number>} rootMonzo
     */
    setRootMonzo(rootMonzo) {
        this.rootMonzo = [...rootMonzo];
        if (this.getPitchFromMonzo(rootMonzo) === null) {
            this.addPitch(new Pitch(rootMonzo));
        }
    }

    /**
     * Create a new Pitch with the given monzo to add to the Chord
     * @param {Array<number>} monzo
     * @returns The created Pitch
     */
    addPitch(monzo) {
        let pitch = new Pitch(monzo);
        this.pitches.push(pitch);
        return pitch;
    }

    /**
     * Create an IntervalBar with the given base monzo, dimension, and direction to add to the Chord
     * @param {Array<number>} fromMonzo
     * @param {number} dim
     * @param {boolean} isAscending
     * @returns The created bar
     */
    addBar(fromMonzo, dim, isAscending) {
        let bar = new IntervalBar(fromMonzo, dim, isAscending);
        this.bars.push(bar);
        return bar;
    }

    /**
     * Remove a pitch and any associated bars
     * @param {Pitch} pitch
     */
    removePitch(pitch) {
        for (let i = 0; i < this.bars.length; i++) {
            let b = this.bars[i];
            if (b.monzoOnEndpoint(pitch.monzo)) {
                this.bars.splice(i, 1);
                i--;
            }
        }

        for (let i = 0; i < this.pitches.length; i++) {
            let p = this.pitches[i];
            if (monzosEqual(p.monzo, pitch.monzo)) {
                this.pitches.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Remove an IntervalBar from the chord, and remove terminal pitches if left orphaned
     * @param {IntervalBar} bar
     */
    removeBar(bar) {
        for (let i = 0; i < this.bars.length; i++) {
            let b = this.bars[i];
            if (monzosEqual(b.getTopMonzo(), bar.getTopMonzo()) && monzosEqual(b.getBottomMonzo(), bar.getBottomMonzo())) {
                this.bars.splice(i, 1);
                break;
            }
        }
        
        // Remove pitches if orphaned
        let pitchAboveHasBars = false;
        let pitchBelowHasBars = false;
        for (let b of this.bars) {
            if (b.monzoOnEndpoint(bar.getTopMonzo())) {
                pitchAboveHasBars = true;
            }
            if (b.monzoOnEndpoint(bar.getBottomMonzo())) {
                pitchBelowHasBars = true;
            }
        }
        if (!pitchAboveHasBars) {
            const topPitch = this.getPitchFromMonzo(bar.getTopMonzo());
            if (topPitch) this.removePitch(topPitch);
        }
        if (!pitchBelowHasBars) {
            const bottomPitch = this.getPitchFromMonzo(bar.getBottomMonzo());
            if (bottomPitch) this.removePitch(bottomPitch);
        }
    }

    /**
     * Set previewType=1 pitches to previewType=0 and delete previewType=-1 pitches
     */
    acceptPreviewElements() {
        for (let pitch of [...this.pitches]) {
            if (pitch.previewType === 0) continue;
            if (pitch.previewType === 1) {
                pitch.previewType = 0;
            } else if (pitch.previewType === -1) {
                // remove bar will remove the pitch as well
            }
        }
        for (let bar of [...this.bars]) {
            if (bar.previewType === 0) continue;
            if (bar.previewType === 1) {
                bar.previewType = 0;
            } else if (bar.previewType === -1) {
                this.removeBar(bar);
            }
        }

        this.deleteSelfIfEmpty();
    }

    /**
     * Set previewType=-1 pitches to previewType=0 and delete previewType=1 pitches
     */
    rejectPreviewElements() {
        for (let bar of [...this.bars]) {
            if (bar.previewType === 1) {
                this.removeBar(bar);
            } else if (bar.previewType === -1) {
                bar.previewType = 0;
            }
        }
        for (let pitch of [...this.pitches]) {
            if (pitch.previewType === 1) {
                this.removePitch(pitch);
            } else if (pitch.previewType === -1) {
                pitch.previewType = 0;
            }
            if (pitch.showEditingOptions) {
                pitch.showEditingOptions = false;
            }
        }
    }

    deleteSelf(knownParents={section:undefined}) {
        deletedUids.push(this.uid);
        const parentSection = knownParents.section ? knownParents.section : this.getParents().section;
        parentSection.removeChord(this);
    }

    deleteSelfIfEmpty(knownParents={section:undefined}) {
        if (this.pitches.length === 0 && settings.deleteEmptyChord) {
            this.deleteSelf(knownParents);
        }
    }

    getWidth() {
        return settings.chordWidth;
    }
}

export class Pitch {
    /**
     * @param {Array<number>} monzo
     */
    constructor(monzo=[0]) {
        this.monzo = monzo;
        this.soundingOctaveDisplacement = 0;

        this.isHovered = false;
        this.isDashed = false;
        this.isLowOpacity = false;
        this.isSounding = true;

        this.previewType = 0; // 0=none; 1=preview_add; -1=preview_del
        this.showEditingOptions = false;

        this.leftOffset = 0;
        this.rightOffset = 0;
    }

    getParents() {
        for (let section of activeProject.sections) {
            for (let chord of section.chords) {
                for (let pitch of chord.pitches) {
                    if (pitch === this) {
                        return {
                            project: activeProject,
                            section: section,
                            chord: chord
                        }
                    }
                }
            }
        }
        return null;
    }

    getBars(knownParents={chord:undefined}) {
        const parentChord = knownParents.chord ? knownParents.chord : this.getParents().chord;
        let bars = [];

        for (let bar of parentChord.bars) {
            if (bar.monzoOnEndpoint(this.monzo)) {
                bars.push(bar);
            }
        }
        return bars;
    }

    getRatio() {
        return monzoToRatio(this.monzo);
    }

    getFrequency(knownParents={section:undefined}) {
        const parentSection = knownParents.section ? knownParents.section : this.getParents().section;

        let referenceFreq = parentSection.keyArea.referenceFreq;
        return monzoToFreq(this.monzo, referenceFreq);
    }
}

export class IntervalBar {
    /**
     * @param {Array<number>} baseMonzo 
     * @param {number} dim 1-7
     * @param {boolean} isAscending 
     */
    constructor(baseMonzo, dim, isAscending=true) {
        console.assert(dim >= 1 && dim <= MAX_DIMENSION, `Failed to create IntervalBar with dimension=${dim}`);
        this.baseMonzo = baseMonzo;
        this.dim = dim;
        this.isAscending = isAscending;

        this.isLowOpacity = false;

        this.previewType = 0; // 0=none; 1=preview_add; 2=preview_del

        this.leftOffset = 0;
        this.rightOffset = 0;
    }

    getParents() {
        for (let section of activeProject.sections) {
            for (let chord of section.chords) {
                for (let bar of chord.bars) {
                    if (bar === this) {
                        return {
                            project: activeProject,
                            section: section,
                            chord: chord
                        }
                    }
                }
            }
        }
        return null;
    }

    getTopMonzo() {
        if (this.isAscending) {
            let topMonzo = addMonzos(this.baseMonzo, settings.axes[this.dim]);
            return topMonzo;
        } else {
            return [...this.baseMonzo];
        }
    }

    getTopPitch(knownParents={chord:undefined}) {
        const parentChord = knownParents.chord ? knownParents.chord : this.getParents().chord;
        return parentChord.getPitchFromMonzo(this.getTopMonzo());
    }

    getBottomPitch(knownParents={chord:undefined}) {
        const parentChord = knownParents.chord ? knownParents.chord : this.getParents().chord;
        return parentChord.getPitchFromMonzo(this.getBottomMonzo());
    }

    getBottomMonzo() {
        if (this.isAscending) {
            return [...this.baseMonzo];
        } else {
            let bottomMonzo = addMonzos(this.baseMonzo, scaleMonzo(settings.axes[this.dim], -1));
            return bottomMonzo;
        }
    }

    encompassesPitch(pitch) {
        let pitchRatio = pitch.getRatio();
        let maxRatio = monzoToRatio(this.getTopMonzo());
        let minRatio = monzoToRatio(this.getBottomMonzo());
        return minRatio < pitchRatio && pitchRatio < maxRatio;
    }

    monzoOnEndpoint(monzo) {
        return monzosEqual(monzo, this.getTopMonzo()) || monzosEqual(monzo, this.getBottomMonzo());
    }
}
