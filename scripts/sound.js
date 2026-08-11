const volumeButton = document.getElementById("volume-button");

const vol = new Tone.Volume(0).toDestination();
const synth = new Tone.PolySynth(Tone.Synth).connect(vol);

let volumeSetting = 2;


function setVolume(v) {
    vol.volume.value = v;
}

function nextVolume() {
    switch (volumeSetting) {
        case 2:
            vol.volume.value = -Infinity;
            volumeButton.firstElementChild.setAttribute("src", "images/volume-0.png");
            volumeSetting = 0;
            break;
        case 1:
            vol.volume.value = 0;
            volumeButton.firstElementChild.setAttribute("src", "images/volume-2.png");
            volumeSetting = 2;
            break;
        case 0:
            vol.volume.value = -18;
            volumeButton.firstElementChild.setAttribute("src", "images/volume-1.png");
            volumeSetting = 1;
            break;
        default:
            vol.volume.value = -Infinity;
            volumeButton.firstElementChild.setAttribute("src", "images/volume-0.png");
            volumeSetting = 0;
            break;
    }
}

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

