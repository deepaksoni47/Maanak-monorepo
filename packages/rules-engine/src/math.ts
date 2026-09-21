import { Decimal } from "decimal.js";

// Global precision setting for OIML R-76 metrological calculations
// 30 decimal places with standard commercial HALF_UP rounding
Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

export type DecimalValue = Decimal | string | number;

/**
 * Converts any numeric or decimal-like value into a Decimal instance.
 */
export function toDecimal(val: DecimalValue | null | undefined, defaultValue = "0"): Decimal {
  if (val === null || val === undefined) {
    return new Decimal(defaultValue);
  }
  if (val instanceof Decimal) {
    return val;
  }
  if (typeof val === "object" && val !== null && "isDecimal" in val) {
    return new Decimal((val as any).toString());
  }
  return new Decimal(val);
}

/**
 * Adds multiple numbers with arbitrary precision.
 */
export function add(first: DecimalValue, ...rest: DecimalValue[]): Decimal {
  let result = toDecimal(first);
  for (const item of rest) {
    result = result.plus(toDecimal(item));
  }
  return result;
}

/**
 * Subtracts b from a (a - b) with arbitrary precision.
 */
export function sub(a: DecimalValue, b: DecimalValue): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

/**
 * Multiplies multiple numbers with arbitrary precision.
 */
export function mul(first: DecimalValue, ...rest: DecimalValue[]): Decimal {
  let result = toDecimal(first);
  for (const item of rest) {
    result = result.times(toDecimal(item));
  }
  return result;
}

/**
 * Divides a by b (a / b) with arbitrary precision.
 * Throws Error if divisor is zero.
 */
export function div(a: DecimalValue, b: DecimalValue): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    throw new Error("Division by zero in metrological calculation");
  }
  return toDecimal(a).dividedBy(divisor);
}

/**
 * Returns absolute value of a number.
 */
export function abs(a: DecimalValue): Decimal {
  return toDecimal(a).abs();
}

/**
 * Returns negative of a number.
 */
export function neg(a: DecimalValue): Decimal {
  return toDecimal(a).negated();
}

/**
 * Returns the absolute difference between a and b (|a - b|).
 */
export function absDiff(a: DecimalValue, b: DecimalValue): Decimal {
  return toDecimal(a).minus(toDecimal(b)).abs();
}

/**
 * Returns the minimum of multiple numbers.
 */
export function min(first: DecimalValue, ...rest: DecimalValue[]): Decimal {
  let minimum = toDecimal(first);
  for (const item of rest) {
    const dec = toDecimal(item);
    if (dec.lt(minimum)) {
      minimum = dec;
    }
  }
  return minimum;
}

/**
 * Returns the maximum of multiple numbers.
 */
export function max(first: DecimalValue, ...rest: DecimalValue[]): Decimal {
  let maximum = toDecimal(first);
  for (const item of rest) {
    const dec = toDecimal(item);
    if (dec.gt(maximum)) {
      maximum = dec;
    }
  }
  return maximum;
}

/**
 * Strict equality comparison (a == b).
 */
export function eq(a: DecimalValue, b: DecimalValue): boolean {
  return toDecimal(a).equals(toDecimal(b));
}

/**
 * Strict less-than comparison (a < b).
 */
export function lt(a: DecimalValue, b: DecimalValue): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

/**
 * Strict less-than-or-equal comparison (a <= b).
 */
export function lte(a: DecimalValue, b: DecimalValue): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

/**
 * Strict greater-than comparison (a > b).
 */
export function gt(a: DecimalValue, b: DecimalValue): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

/**
 * Strict greater-than-or-equal comparison (a >= b).
 */
export function gte(a: DecimalValue, b: DecimalValue): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

/**
 * Formats a Decimal value as a fixed-point decimal string without scientific notation.
 */
export function toFixed(val: DecimalValue, decimalPlaces?: number): string {
  const dec = toDecimal(val);
  if (decimalPlaces !== undefined) {
    return dec.toFixed(decimalPlaces);
  }
  return dec.toFixed();
}

/**
 * Rounds a value to the nearest verification scale interval multiple.
 * e.g. roundToScale(100.003, 0.005) -> 100.005
 */
export function roundToScale(val: DecimalValue, scaleInterval: DecimalValue): Decimal {
  const dVal = toDecimal(val);
  const dScale = toDecimal(scaleInterval);
  if (dScale.isZero()) {
    return dVal;
  }
  const intervals = dVal.dividedBy(dScale).round();
  return intervals.times(dScale);
}

export { Decimal };
