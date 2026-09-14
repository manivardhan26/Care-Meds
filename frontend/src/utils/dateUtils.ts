/**
 * Date utility functions that respect local device timezone.
 * Avoids timezone skew caused by toISOString() which produces UTC dates.
 */

export function getLocalTodayIso(): string {
  return formatDateToIso(new Date());
}

export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
