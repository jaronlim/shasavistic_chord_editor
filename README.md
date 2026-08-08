# Shasavistic Chord Editor

This is a web-based editor for creating and editing chord diagrams based on LΛMPLIGHT's Shasavistic music notation system and theory (see [Caftaphata](https://youtu.be/cMnuMjXeHrY)). It is still in early development but several features already make it stand out from other Shasavistic editors. Once a user gets their hand around the hotkeys, chord input is very quick. This is also the first editor to my knowledge to include automatic interval bar collision avoidance for all 2D–5D inputs.

## Instructions

On load, the application prompts for a primary and secondary axis to be used for the background ruler. Once the ruler is selected, the user can click the buttons in the right-hand menu to select an interval, then click the workspace to add the interval to the chord.

Intervals will be added to the closest background ruler line (for a new chord) or to the closest pitch in the selected chord. If an interval is input on top of an existing interval, the existing one will instead be deleted, along with connected pitches if they are left stray.

Pitch lines can be dashed and/or low opacity. To change the appearance of a pitch line, click the dashed line menu button. The left half of a pitch can be clicked to toggle dashed and the right half can be clicked to toggle low opacity (each half shows what the pitch would look like if clicked).

There are a number of hotkeys for menu selection:
- \[~] - edit pitches (dash and opacity)
- \[0] - add/remove standalone pitch
- \[1] - 1D (octave) input
- \[2] - 2D (perfect fifth) input
- \[3] - 3D (just major third) input
- \[4] - 4D (harmonic seventh) input
- \[5] - 5D (harmonic 11) input
- \[6] - 6D (harmonic 13) input
- \[7] - 7D (harmonic 17) input
- \[A] - switch input to ascending intervals
- \[D] - switch input to descending intervals
- \[Q] - switch direction of interval input

If a chord is fully deleted, future chords will shift back to not leave an empty gap. Pitch lines and interval bars will automatically shift to avoid colliding. The viewport will automatically expand vertically and horizontally to fit any music. My intent is that this editor is as easy to use as possible.

Link to the web app: https://jaronlim.github.io/shasavistic_chord_editor/