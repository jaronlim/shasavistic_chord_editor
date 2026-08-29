export let settingsInputTypes = {
    "number": "number",
    "text": "text",
    "bool": "checkbox",
    "color": "color",
}

export let settingsInfo = {

    "octaveScale": {
        "name": "Octave Scale",
        "desc": "The vertical pixel distance of one octave in the viewport",
        "type": "number",
        "min": 50,
        "max": 250,
        "default": 120,
    },
    "axes": {
        "name": "Axes",
        "desc": "The basis vectors of the dimensional axes",
        "type": "array",
        "sub-type": "array",
        "len": 8,
        "default": [
            [0],
            [1],
            [-1, 1],
            [-2, 0, 1],
            [-2, 0, 0, 1],
            [-2, 0, 0, 0, 1],
            [-2, 0, 0, 0, 0, 1],
            [-2, 0, 0, 0, 0, 0, 1],
        ]
    },
    "chordsBgColor": {
        "name": "Viewport Background",
        "desc": "The background color of the chord diagram viewport",
        "type": "color",
        "default": "#676681" 
    },
    "axisColors": {
        "name": "Axis Colors",
        "desc": "The colors to use for each axis",
        "type": "array",
        "sub-type": "color",
        "len": 8,
        "default": [
            "#ffffff",
            "#aaaaaa",
            "#f27992",
            "#6cd985",
            "#b598ee",
            "#ffc247",
            "#b5b500",
            "#ed9877"
        ]
    },
    "hotkeys": {
        "name": "Hotkeys",
        "desc": "Key commands",
        "type": "json",
        "default": {
            "selectDimension": ["0", "1", "2", "3", "4", "5", "6", "7"],

            "selectAscent": "a",
            "selectDescent": "d",
        }
    },
    "previewPitchOpacity": {
        "name": "Preview Pitch Opacity",
        "desc": "Opacity of the ghost interval that appears before pitch input",
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5,
    },

    // PITCH/INTERVAL-BAR SETTINGS
    "pitchLineWidth": {
        "name": "Pitch Line Width",
        "desc": "The width of the horizontal pitch lines in the viewport",
        "type": "number",
        "min": 1,
        "max": 8,
        "default": 2,
    },
    "pitchLineColor": {
        "name": "Pitch Line Color",
        "desc": "The color of horizontal pitch lines in chords",
        "type": "color",
        "default": "#ffffff",
    },
    "pitchLineSelectedWidth": {
        "name": "Selected Pitch Line Width",
        "desc": "The width of the currently-hovered pitch line within a chord",
        "type": "number",
        "min": 1,
        "max": 8,
        "default": 4,
    },
    "pitchLineSelectedColor": {
        "name": "Selected Pitch Line Color",
        "desc": "The color of the currently-hovered pitch line within a chord",
        "type": "color",
        "default": "#ffffff",
    },
    "intervalBarWidth": {
        "name": "Interval Bar Width",
        "desc": "The width of colored interval bars within each chord",
        "type": "number",
        "min": 1,
        "max": 16,
        "default": 8
    },

    // KEY AREA SETTINGS
    "tonicLineWidth":  {
        "name": "Tonic Line Width",
        "desc": "The width of the tonic line in the background ruler",
        "type": "number",
        "min": 1,
        "max": 8,
        "default": 2
    },
    "keyAreaLineWidth": {
        "name": "Ruler Line Width",
        "desc": "The width of the lines in the background ruler",
        "type": "number",
        "min": 1,
        "max": 8,
        "default": 2
    },
    "tonicLineOpacity": {
        "name": "Tonic Line Opacity",
        "desc": "The opacity of the tonic line in the background ruler",
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.5
    },
    "primaryLineOpacity": {
        "name": "Primary Axis Ruler Line Opacity",
        "desc": "The opacity of the primary axis lines on the background ruler",
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.4
    },
    "secondaryLineOpacity": {
        "name": "Secondary Axis Ruler Line Opacity",
        "desc": "The opacity of the secondary axis lines on the background ruler",
        "type": "number",
        "min": 0,
        "max": 1,
        "default": 0.3,
    },
    "leftPadding": {
        "name": "Left Viewport Padding",
        "desc": "The extra space to the left of the viewport",
        "type": "number",
        "min": 0,
        "max": 200,
        "default": 50
    },
    "rightPadding": {
        "name": "Right Viewport Padding",
        "desc": "The extra space to the right of the viewport",
        "type": "number",
        "min": 0,
        "max": 200,
        "default": 50
    },

    "finalSectionRightBuffer": {
        "name": "Final Right Buffer",
        "desc": "The extra space in the viewport beyond the final chord (allows scrolling past the last chord)",
        "type": "number",
        "min": 0,
        "max": 5000,
        "default": 500
    },
    "autoScrollToNewChord": {
        "name": "Auto Scroll to New Chord",
        "desc": "Automatically scroll the viewport to the right when a new chord is input",
        "type": "bool",
        "default": true
    },

    // CHORD RENDERING SETTINGS
    "chordWidth": {
        "name": "Chord Width",
        "desc": "Horizontal size of each chord",
        "type": "number",
        "min": 5, 
        "max": 200,
        "default": 70
    },
    "chordSpacing": {
        "name": "Chord Spacing",
        "desc": "Horizontal space between each chord",
        "type": "number",
        "min": 5,
        "max": 200,
        "default": 45
    }
}

export let settings = {

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

    "chordsBgColor": "#676681",

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
        "selectDimension": ["0", "1", "2", "3", "4", "5", "6", "7"],
        "selectPitchEditor": "`",

        "selectAscent": "a",
        "selectDescent": "d",
        "switchDirection": "q",
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

    "finalSectionRightBuffer": 500,
    "autoScrollToNewChord": true,

    // CHORD RENDERING SETTINGS
    "chordWidth": 70,
    "chordSpacing": 75,

    // TODO: add a setting to automatically use blue pitch lines for chord extensions

    // TODO: add setting to show/hide scroll bar
}