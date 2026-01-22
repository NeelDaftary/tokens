/**
 * Shared Module Contract for Demand Drivers
 * 
 * All demand drivers follow this contract:
 * - Time: Monthly steps t = 0..T-1, Horizon: T months
 * - Global inputs: P[t] (price), S_circ[t] (circulating supply), optional Users[t], FeesUSD[t], VolumeUSD[t]
 * - Standard outputs: buy_tokens[t], hold_tokens[t], spend_tokens[t], burn_tokens[t], sell_tokens[t], debug[t]
 */

export interface GlobalInputs {
  /** Token price series (constant, user path, or global price model) */
  P: number[]; // P[t] = price at month t
  
  /** Circulating supply series (from supply model) */
  S_circ: number[]; // S_circ[t] = circulating supply at month t
  
  /** Optional: Users series */
  Users?: number[]; // Users[t] = user count at month t
  
  /** Optional: Fees in USD series */
  FeesUSD?: number[]; // FeesUSD[t] = fees in USD at month t
  
  /** Optional: Volume in USD series */
  VolumeUSD?: number[]; // VolumeUSD[t] = volume in USD at month t
}

export interface DriverOutputs {
  /** Market buy pressure (tokens acquired from market) */
  buy_tokens: number[];
  
  /** Tokens held/locked/staked/collateralized (reduces liquid float) */
  hold_tokens: number[];
  
  /** Tokens spent for usage (velocity / transactional demand) */
  spend_tokens: number[];
  
  /** Tokens burned (permanent sink) */
  burn_tokens: number[];
  
  /** Tokens sold (sell pressure; e.g., emissions recipients selling) */
  sell_tokens: number[];
  
  /** Module-specific metrics (APY, tiers, caps, etc.) */
  debug: any[];
}

/**
 * Common helper: Saturating adoption curve
 * Captures "early growth, later hard to increase" pattern
 * 
 * @param x_max Maximum value to approach
 * @param k Growth rate (from preset: slow/medium/fast)
 * @param t Time step (month)
 * @returns x_target[t] = x_max * (1 - exp(-k * t))
 */
export function saturatingAdoptionCurve(
  x_max: number,
  k: number,
  t: number
): number {
  if (x_max <= 0) return 0;
  if (k <= 0) return x_max; // Instant adoption if k=0
  return x_max * (1 - Math.exp(-k * t));
}

/**
 * Get adoption speed constant k from preset
 */
export function getAdoptionSpeedK(preset: "slow" | "medium" | "fast"): number {
  switch (preset) {
    case "slow":
      return 0.3;
    case "medium":
      return 0.5;
    case "fast":
      return 0.8;
    default:
      return 0.5;
  }
}

/**
 * Linear interpolation helper
 */
export function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end;
}

/**
 * Create constant price series (for simple cases)
 */
export function createConstantPriceSeries(price: number, horizon: number): number[] {
  return Array(horizon + 1).fill(price);
}

/**
 * Create constant supply series (for simple cases)
 */
export function createConstantSupplySeries(supply: number, horizon: number): number[] {
  return Array(horizon + 1).fill(supply);
}
