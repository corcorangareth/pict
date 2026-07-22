// Days until a date, counted in whole calendar days (local). BUILD.md §9:
// the countdown is typography, so this returns just the number + unit.
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function dayLabel(days: number): string {
  return days === 1 ? "day" : "days";
}
