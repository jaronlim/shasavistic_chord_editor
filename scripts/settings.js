export let settings = {

    octaveScale: 120, // TODO: change default ctrl+scroll behavior to zoom

    axes: [
        [0],
        [1],
        [-1, 1],
        [-2, 0, 1],
        [-2, 0, 0, 1],
        [-2, 0, 0, 0, 1],
        [-2, 0, 0, 0, 0, 1],
        [-2, 0, 0, 0, 0, 0, 1],
    ],

    chordsBgColor: '#676681',

    axisColors: [
        '#ffffff',
        '#aaaaaa',
        '#f27992',
        '#6cd985',
        '#b598ee',
        '#ffc247',
        '#b5b500',
        '#ed9877'
    ],

    hotkeys: {
        selectDimension: ['0', '1', '2', '3', '4', '5', '6', '7'],
        selectPitchEditor: '`',

        selectAscent: 'a',
        selectDescent: 'd',
        switchDirection: 'q',
    },

    // PREVIEW OPACITY
    previewBarAddOpacity: 0.5,
    previewBarDelOpacity: 0.5,
    barLowOpacity: 0.5,

    // PITCH/INTERVAL-BAR SETTINGS
    pitchLineWidth: 2,
    pitchLineColor: 'white',
    pitchLineSelectedWidth: 4,
    pitchLineSelectedColor: 'white',
    intervalBarWidth: 8,

    // KEY AREA SETTINGS
    tonicLineWidth:  2,
    keyAreaLineWidth: 2,
    tonicLineOpacity: 0.5,
    primaryLineOpacity: 0.4,
    secondaryLineOpacity: 0.3,
    leftPadding: 50,
    rightPadding: 51,

    finalSectionRightBuffer: 500,
    autoScrollToNewChord: true,

    // CHORD RENDERING SETTINGS
    chordWidth: 70,
    chordSpacing: 75,

    // CHORD INPUT SETTINGS
    deleteEmptyChord: true,
    nullInputDistance: 30,

    // VIEWPORT SETTINGS
    vertPadding: 5,
    horizPadding: 0,

    // TODO: add a setting to automatically use blue pitch lines for chord extensions

    // TODO: add setting to show/hide scroll bar
}