import { Chord } from "./chord.js";
import { monzoToFreq } from "./utils.js";

const vol = new Tone.Volume(0).toDestination();
const synth = new Tone.PolySynth(Tone.Synth).connect(vol);

let volume = 30;

export function setVolume(v) {
    vol.volume.value = v;
}

/**
 * @param {Chord} chord 
 * @param {boolean} stopCurrent 
 */
export function soundChord(chord, stopCurrent=true) {
    if (stopCurrent) {
        synth.releaseAll();
    }

    for (let pitch of chord.pitches) {
        if (pitch.isSounding) {
            makeSound(pitch.getFrequency())
        }
    }
}

function makeSound(freq) {
    synth.triggerAttackRelease(freq, "2n");
}

