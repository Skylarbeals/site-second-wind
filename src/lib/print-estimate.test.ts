import { describe, expect, it } from 'vitest';
import { calcPrinterRunningCost, parseElegooEstimate } from './print-estimate';

describe('printer-running cost', () => {
  it('charges $5 for one hour of printer operation', () => {
    expect(calcPrinterRunningCost(3600)).toBe(5);
    expect(calcPrinterRunningCost(7200)).toBe(10);
  });
  it('prorates partial hours instead of rounding up to whole hours', () => {
    expect(calcPrinterRunningCost(5400)).toBe(7.5);
    expect(calcPrinterRunningCost(900)).toBe(1.25);
  });
  it('rejects invalid durations', () => {
    expect(() => calcPrinterRunningCost(-1)).toThrow();
    expect(() => calcPrinterRunningCost(NaN)).toThrow();
  });
});
describe('Elegoo sliced-file estimates', () => {
  it('uses total filament and total estimated time including preparation', () => {
    expect(parseElegooEstimate('; total filament used [g] = 84.21\n; model printing time: 1h 20m; total estimated time: 1h 30m 10s')).toEqual({ grams: 85, seconds: 5410 });
  });
  it('adds multiple filament weights and reads normal-mode time', () => {
    expect(parseElegooEstimate('; filament used [g] = 20.1, 10.2\n; estimated printing time (normal mode) = 2h 5m')).toEqual({ grams: 31, seconds: 7500 });
  });
  it('never invents time or filament for an unsliced or incomplete file', () => {
    expect(() => parseElegooEstimate('solid part\nendsolid part')).toThrow();
    expect(() => parseElegooEstimate('; total filament used [g] = 20')).toThrow();
  });
});