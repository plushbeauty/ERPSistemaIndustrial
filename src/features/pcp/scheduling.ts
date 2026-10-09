export type ProgramEstimateInput = {
  start: string;
  quantity: number;
  cycleSeconds: number;
  activeCavities: number;
  efficiencyPercent: number;
  setupMinutes: number;
  shiftsPerDay: number;
  hoursPerShift: number;
};

/**
 * Forecasts a production run from the process cycle, active cavities,
 * efficiency, setup, and configured productive hours per day.
 *
 * The current persisted model has no shift calendar, holidays, breaks,
 * or downtime calendar. The result is therefore an estimate over calendar
 * days, not a finite-capacity commitment.
 */
export function estimateProgramEnd(input: ProgramEstimateInput): string | null {
  const {
    start,
    quantity,
    cycleSeconds,
    activeCavities,
    efficiencyPercent,
    setupMinutes,
    shiftsPerDay,
    hoursPerShift,
  } = input;

  if (!start || !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(cycleSeconds) || cycleSeconds <= 0) return null;

  const cavities = Math.max(1, activeCavities);
  const efficiency = Math.min(100, Math.max(1, efficiencyPercent)) / 100;
  const dailyCapacity = Math.max(1, shiftsPerDay) * Math.max(0.5, hoursPerShift);
  const runHours = quantity * cycleSeconds / cavities / 3600 / efficiency;
  const totalHours = Math.max(0, setupMinutes) / 60 + runHours;
  if (!Number.isFinite(totalHours) || dailyCapacity <= 0) return null;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;

  const capacityDays = Math.floor(totalHours / dailyCapacity);
  const remainingHours = totalHours - capacityDays * dailyCapacity;
  const elapsedHours = remainingHours === 0 && totalHours > 0
    ? Math.max(0, capacityDays - 1) * 24 + dailyCapacity
    : capacityDays * 24 + remainingHours;
  const endDate = new Date(startDate.getTime() + elapsedHours * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
}

/**
 * Returns the remaining target of GOOD units.
 * `produced` is the total quantity found and `rejected` is included in it,
 * so rejected pieces must not count toward the good production target.
 * Example: target 5,000; found 4,500; rejected 500 => 1,000 good units remain.
 */
export function getProgramRemaining(planned: number, produced: number, rejected: number): number {
  const found = Math.max(0, Number(produced || 0));
  const scrap = Math.min(found, Math.max(0, Number(rejected || 0)));
  const good = Math.max(0, found - scrap);
  return Math.max(0, Number(planned || 0) - good);
}
