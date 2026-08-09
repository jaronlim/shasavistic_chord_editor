const synth = new Tone.PolySynth(Tone.Synth).toDestination();

/** @param {Pitch} pitch */
function soundPitch(pitch) {
    makeSound(pitch.getFrequency());
}

/** @param {Chord} chord */
function soundChord(chord) {
    for (let p of chord.pitches) {
        if (p.isSounding) {
            soundPitch(p);
        }
    }
}

function makeSound(freq, wave="saw", a=0.1, d=4, s=0, r=0) {
    synth.triggerAttackRelease(freq, "2n");
}

document.addEventListener("keypress", (e) => {
    if (e.key === " ") {
        e.preventDefault();
        let section = project.getSectionAt(mouseX);
        let keyArea = section.keyArea;
        let chord = section.chords[section.findNearestChordIndex(mouseX)];
        soundChord(chord);
    }
});

