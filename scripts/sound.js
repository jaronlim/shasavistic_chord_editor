import { Chord } from "./chord";
import { monzoToFreq } from "./utils";

const vol = new Tone.Volume(0).toDestination();
const synth = new Tone.PolySynth(Tone.Synth).connect(vol);

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
