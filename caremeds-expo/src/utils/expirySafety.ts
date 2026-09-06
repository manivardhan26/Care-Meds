import { ExpiryStatus } from '../types';

export function evaluateExpiry(expiryDateStr?: string | null): ExpiryStatus {
  if (!expiryDateStr || expiryDateStr.trim() === '') {
    return {
      state: 'UNKNOWN',
      message: 'Expiry date not set',
      isAlert: false,
    };
  }

  const trimmed = expiryDateStr.trim();
  const parsedDate = parseDate(trimmed);

  if (!parsedDate) {
    return {
      state: 'UNKNOWN',
      message: `Expires: ${trimmed}`,
      isAlert: false,
    };
  }

  // Set comparison to the end of the target day
  const expiryTime = new Date(parsedDate);
  expiryTime.setHours(23, 59, 59, 999);

  const now = new Date();
  const diffMillis = expiryTime.getTime() - now.getTime();
  const daysRemaining = Math.floor(diffMillis / (1000 * 60 * 60 * 24));

  if (diffMillis < 0) {
    return {
      state: 'EXPIRED',
      message: 'This medicine has expired. Please do not consume it.',
      daysRemaining,
      isAlert: true,
    };
  }

  if (daysRemaining <= 30) {
    const dayStr = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
    return {
      state: 'EXPIRING_SOON',
      message: `Warning: Expires soon in ${dayStr}. Plan a refill.`,
      daysRemaining,
      isAlert: true,
    };
  }

  return {
    state: 'SAFE',
    message: `Valid (Expires in ${daysRemaining} days)`,
    daysRemaining,
    isAlert: false,
  };
}

function parseDate(dateStr: string): Date | null {
  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }

  // Try MM/YYYY or MM-YYYY
  const myMatch = dateStr.match(/^(\d{1,2})[-/](\d{4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const year = parseInt(myMatch[2], 10);
    // Return last day of that month
    return new Date(year, month, 0);
  }

  // Try standard Date.parse
  const timestamp = Date.parse(dateStr);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
}
