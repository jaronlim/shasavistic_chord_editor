import { monzoToRatio } from "./utils.js";
import { settings } from "./settings.js"

export function build1dAscentSymbol() {
    const defs = viewport.querySelector("defs");
    const height = Math.log2(monzoToRatio(settings.axes[1])) * settings.octaveScale;
    const arrowSize = 10;
    const arrowStrokeWidth = 2;
    const barWidth = 4;
    const overshoot = Math.SQRT2 * arrowStrokeWidth/4;
    let symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
    symbol.setAttribute("id", "1d-bar-ascent-symbol");
    symbol.setAttribute("viewBox", `${- arrowSize - overshoot} ${-height} ${2 * (arrowSize + overshoot)} ${height}`);
    symbol.setAttribute("preserveAspectRatio", "xMinYMin");
    let bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bar.setAttribute("x1", 0);
    bar.setAttribute("x2", 0);
    bar.setAttribute("y1", -arrowSize);
    bar.setAttribute("y2", -height);
    bar.setAttribute("stroke", settings.axisColors[1]);
    bar.setAttribute("stroke-width", barWidth);
    symbol.appendChild(bar);
    let arrowL = document.createElementNS("http://www.w3.org/2000/svg", "line");
    arrowL.setAttribute("x1", -arrowSize);
    arrowL.setAttribute("x2", overshoot);
    arrowL.setAttribute("y1", 0);
    arrowL.setAttribute("y2", -arrowSize-overshoot);
    arrowL.setAttribute("stroke", "white");
    arrowL.setAttribute("stroke-width", arrowStrokeWidth);
    symbol.appendChild(arrowL);
    let arrowR = document.createElementNS("http://www.w3.org/2000/svg", "line");
    arrowR.setAttribute("x1", arrowSize);
    arrowR.setAttribute("x2", -overshoot);
    arrowR.setAttribute("y1", 0);
    arrowR.setAttribute("y2", -arrowSize-overshoot);
    arrowR.setAttribute("stroke", "white");
    arrowR.setAttribute("stroke-width", arrowStrokeWidth);
    symbol.appendChild(arrowR);
    defs.appendChild(symbol);
}