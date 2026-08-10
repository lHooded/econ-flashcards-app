import type { CurveSpec, GraphCoordinate } from "./model";

export function curveYAt(curve: CurveSpec, x: number): number | undefined {
  for (let index = 1; index < curve.points.length; index += 1) {
    const left = curve.points[index - 1];
    const right = curve.points[index];
    if (x < left.x || x > right.x) continue;
    const share = (x - left.x) / (right.x - left.x);
    return left.y + share * (right.y - left.y);
  }
  return undefined;
}

export function isPointOnCurve(
  point: GraphCoordinate,
  curve: CurveSpec,
  tolerance = 1,
): boolean {
  const y = curveYAt(curve, point.x);
  return y !== undefined && Math.abs(y - point.y) <= tolerance;
}

export function isIncreasing(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value > values[index - 1]);
}

export function isDecreasing(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value < values[index - 1]);
}

export function hasDiminishingSlope(curve: CurveSpec): boolean {
  const slopes: number[] = [];
  for (let index = 1; index < curve.points.length; index += 1) {
    const left = curve.points[index - 1];
    const right = curve.points[index];
    slopes.push((right.y - left.y) / (right.x - left.x));
  }
  return slopes.every((slope, index) => index === 0 || slope < slopes[index - 1]);
}
