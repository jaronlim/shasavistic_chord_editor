export const PRIMES = [2, 3, 5, 7, 11, 13, 17];

export const C_0 = 16.3516 //hz

export const MAX_DIMENSION = 7;

/**
 * Convert a pure monzo to a interval ratio
 * @param {Array<number>} monzo The interval's monzo
 * @returns The numeric ratio representing the interval
 */
export function monzoToRatio(monzo) {
    let product = 1;
    for (let i = 0; i < monzo.length; i++) {
        product *= PRIMES[i] ** monzo[i];
    }
    return product;
}

export function monzoToFreq(monzo, referenceFreq) {
    return referenceFreq * monzoToRatio(monzo);
}

let idsInUse = [];
export function newUID() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id;
    do {
        id = chars[Math.round(Math.random()*25)]; // do not begin with a number
        for (let i = 0; i < 5; i++) {
            id += chars[Math.round(Math.random()*35)];
        }
    } while (idsInUse.includes(id));
    idsInUse.push(id);
    return id;
}

/**
 * @param {Array} a
 * @param {Array} b
 */
function arraysEqual(a, b) {
    return (a.length === b.length && a.every((x, i) => x === b[i]));
}

/**
 * @param {Array} a
 * @param {Array} b
 */
export function monzosEqual(a, b) {
    let modifiedA = [...a];
    let modifiedB = [...b];
    while(modifiedA[modifiedA.length-1] === 0){ modifiedA.pop(); }
    while(modifiedB[modifiedB.length-1] === 0){ modifiedB.pop(); }
    return arraysEqual(modifiedA, modifiedB);
}

/**
 * @param {Array<number>} a
 * @param {Array<number>} b
 */
export function addArrays(a, b) {
    let sum = []
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (i >= a.length) {
            sum.push(b[i]);
        } else if (i >= b.length) {
            sum.push(a[i]);
        } else {
            sum.push(a[i] + b[i]);
        }
    }
    return sum;
}

/**
 * @param {Array<number>} arr
 * @param {number} s
 */
export function scaleMonzo(arr, s) {
    return arr.map((n) => n * s);
}

/**
 * @param {Array<number>} a
 * @param {Array<number>} b
 */
export function addMonzos(a, b) {
    return addArrays(a, b);
}