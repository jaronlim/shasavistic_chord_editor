import { settings } from './settings.js';
import { monzoToRatio, MAX_DIMENSION, monzoToFreq, newUID, addArrays, scaleMonzo, addMonzos, monzosEqual } from './utils.js';

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
    constructor(rootMonzo=[0]) {
        this.rootMonzo = [...rootMonzo];
        this.pitches = [new Pitch([...rootMonzo])];
        /** @type {Array<IntervalBar>} */
        this.bars = [];
        this.uid = newUID();
    }

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

    getPitchFromMonzo(monzo) {
        for (let p of this.pitches) {
            if (monzosEqual(p.monzo, monzo)) return p;
        }
        return null;
    }

    getMaxPitch() {
        if (this.pitches.length === 0) return null;

        let maxPitch = this.pitches[0];
        for (let pitch of this.pitches) {
            if (pitch.getRatio() > maxPitch.getRatio()) {
                maxPitch = pitch;
            }
        }
        return maxPitch;
    }

    getMinPitch() {
        if (this.pitches.length === 0) return null;

        let minPitch = this.pitches[0];
        for (let pitch of this.pitches) {
            if (pitch.getRatio() < minPitch.getRatio()) {
                minPitch = pitch;
            }
        }
        return minPitch;
    }

    inputInterval(fromMonzo, dim, isAscending) {
        console.assert(dim >= 0 && dim <= MAX_DIMENSION, `Dimension (${dim}) out of bounds.`);

        // Check that parent exists
        let parent = this.getPitchFromMonzo(fromMonzo);
        if (!parent) {
            console.warn(`Tried to add a pitch to a parent that didn't exist!\nAttempted parent: [${fromVector}]`);
            return;
        }

        // If selected dimension is 0 delete the pitch and return
        if (dim === 0) {
            this.removePitch(parent);
            return;
        }

        // Check if the destination pitch exists
        let newPitchMonzo = addMonzos(fromMonzo, scaleMonzo(settings.axes[dim], isAscending ? 1 : -1));
        let existingPitch = this.getPitchFromMonzo(newPitchMonzo);

        if (existingPitch) {
            // Check if the interval bar exists
            let existingBar = null;
            for (let i = 0; i < this.bars.length; i++) {
                let bar = this.bars[i];
                if (bar.monzoOnEndpoint(existingPitch.monzo) && bar.monzoOnEndpoint(fromMonzo)) {
                    existingBar = bar;
                    break;
                }
            }
            if (existingBar) {
                this.removeBar(existingBar);
                if (this.pitches.length === 0 && settings.deleteEmptyChord) {
                    this.deleteSelf();
                }
            } else {
                this.addBar(fromMonzo, dim, isAscending);
            }
            return;
        } else {
            // Add pitch and interval bar
            let child = new Pitch(newPitchMonzo);
            this.pitches.push(child);
            this.addBar(fromMonzo, dim, isAscending);
        }
    }

    addBar(fromMonzo, dim, isAscending) {
        let bar = new IntervalBar(fromMonzo, dim, isAscending);
        this.bars.push(bar);
    }

    /**
     * Remove a pitch; remove the chord if empty according to settings.deleteEmptyChord
     * @param {Pitch} pitch
     */
    removePitch(pitch) {
        for (let i = 0; i < this.pitches.length; i++) {
            let p = this.pitches[i];
            if (monzosEqual(p.monzo, pitch.monzo)) {
                this.pitches.splice(i, 1);
                return;
            }
        }

        if (this.pitches.length === 0) {
            this.deleteSelf();
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
            this.removePitch(this.getPitchFromMonzo(bar.getTopMonzo()));
        }
        if (!pitchBelowHasBars) {
            this.removePitch(this.getPitchFromMonzo(bar.getBottomMonzo()));
        }
    }

    deleteSelf(knownParents={section:undefined}) {
        deletedUids.push(this.uid);
        const parentSection = knownParents.section ? knownParents.section : this.getParents().section;
        parentSection.removeChord(this);
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

    getRatio() {
        return monzoToRatio(this.monzo);
    }

    getFrequency(knownParents={section:null}) {
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
