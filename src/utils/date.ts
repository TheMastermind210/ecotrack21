const DAY_MS = 86_400_000;

export function getLocalDateKey(date: Date | string): string | null {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getIsoWeekKey(date: Date | string): string | null {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const localMidnightAsUtc = new Date(Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  ));
  const weekday = localMidnightAsUtc.getUTCDay() || 7;
  localMidnightAsUtc.setUTCDate(localMidnightAsUtc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(localMidnightAsUtc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((localMidnightAsUtc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7,
  );

  return `${localMidnightAsUtc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
