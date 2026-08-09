const synth = new Tone.PolySynth(Tone.Synth).toDestination();

/** @param {Pitch} pitch */
function soundPitch(pitch) {
    makeSound(pitch.getFrequency());
}

/** @param {Chord} chord */
function soundChord(chord) {
    for (let p of chord.pitches) {
        soundPitch(p);
    }
}

function makeSound(freq, wave="saw", a=0.1, d=4, s=0, r=0) {
    synth.triggerAttackRelease(freq, "2n");
}

document.addEventListener("keypress", (e) => {
    if (e.key === " ") {
        makeSound(Math.random()*660 + 220);
    }
});

