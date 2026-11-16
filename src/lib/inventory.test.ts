import { describe, expect, it } from "vitest";
import { calcMaterialCost } from "./inventory";

describe("print order material cost", () => {
  it("charges grams used as a share of the roll price", () => {
    // 250 g from a $20, 1 kg roll
    expect(calcMaterialCost(250, 20, 1)).toBe(5);
  });

  it("uses the roll weight, not a per-kg price", () => {
    // 250 g from a $40, 2 kg roll
    expect(calcMaterialCost(250, 40, 2)).toBe(5);
    // 100 g from an $18, 0.5 kg roll
    expect(calcMaterialCost(100, 18, 0.5)).toBe(3.6);
  });

  it("treats legacy filament without a roll size as a 1 kg roll", () => {
    expect(calcMaterialCost(500, 18.5)).toBe(9.25);
  });
});

import { swatchColorFor } from './inventory';
describe('swatchColorFor', () => {
  it('matches the color word in a spool color name', () => { expect(swatchColorFor('Matte Black')).toBe('#111111'); });
  it('returns null for an unknown color name', () => { expect(swatchColorFor('Galaxy Sparkle')).toBeNull(); });
});
