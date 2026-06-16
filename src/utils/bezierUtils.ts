export interface BezierPoints {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

const A = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
const B = (a1: number, a2: number) => 3 * a2 - 6 * a1;
const C = (a1: number) => 3 * a1;

function calcBezier(t: number, a1: number, a2: number) {
  return ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
}

function getSlope(t: number, a1: number, a2: number) {
  return 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
}

function binarySubdivide(x: number, a: number, b: number, p1x: number, p2x: number) {
  let currentX: number;
  let currentT: number;
  let i = 0;
  do {
    currentT = a + (b - a) / 2;
    currentX = calcBezier(currentT, p1x, p2x) - x;
    if (currentX > 0) b = currentT;
    else a = currentT;
  } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
  return currentT;
}

function newtonRaphsonIterate(x: number, guessT: number, p1x: number, p2x: number) {
  for (let i = 0; i < 4; i++) {
    const currentSlope = getSlope(guessT, p1x, p2x);
    if (currentSlope === 0) return guessT;
    const currentX = calcBezier(guessT, p1x, p2x) - x;
    guessT -= currentX / currentSlope;
  }
  return guessT;
}

export function cubicBezier(x: number, points: BezierPoints): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  const { p1x, p1y, p2x, p2y } = points;
  if (p1x === p1y && p2x === p2y) return x;
  let t: number;
  if (Math.abs(p1x - p1y) < 0.001 && Math.abs(p2x - p2y) < 0.001) {
    t = x;
  } else {
    const slope0 = getSlope(0, p1x, p2x);
    const slope1 = getSlope(1, p1x, p2x);
    if (slope0 >= 0.001 && slope1 >= 0.001) {
      t = newtonRaphsonIterate(x, x, p1x, p2x);
    } else {
      t = binarySubdivide(x, 0, 1, p1x, p2x);
    }
  }
  return calcBezier(t, p1y, p2y);
}

export const presetEasings: Record<string, BezierPoints & { name: string }> = {
  linear: { name: 'linear', p1x: 0, p1y: 0, p2x: 1, p2y: 1 },
  ease: { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 },
  'ease-in': { name: 'ease-in', p1x: 0.42, p1y: 0, p2x: 1, p2y: 1 },
  'ease-out': { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
  'ease-in-out': { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
};

export function bezierToCss(points: BezierPoints): string {
  return `cubic-bezier(${points.p1x.toFixed(2)}, ${points.p1y.toFixed(2)}, ${points.p2x.toFixed(2)}, ${points.p2y.toFixed(2)})`;
}
