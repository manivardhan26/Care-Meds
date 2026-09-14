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

  // Normalize comparison to calendar day boundaries
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const expiryMidnight = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);
  
  const diffMillis = expiryMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(diffMillis / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      state: 'EXPIRED',
      message: 'This medicine has expired. Please do not consume it.',
      daysRemaining,
      isAlert: true,
    };
  }

  if (daysRemaining === 0) {
    return {
      state: 'EXPIRING_SOON',
      message: 'Warning: Expires today! Plan a refill immediately.',
      daysRemaining: 0,
      isAlert: true,
    };
  }

  if (daysRemaining === 1) {
    return {
      state: 'EXPIRING_SOON',
      message: 'Warning: Expires tomorrow. Plan a refill.',
      daysRemaining: 1,
      isAlert: true,
    };
  }

  if (daysRemaining <= 30) {
    return {
      state: 'EXPIRING_SOON',
      message: `Warning: Expires soon in ${daysRemaining} days. Plan a refill.`,
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

  // Try DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1], 10);
    const second = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);

    let day = first;
    let month = second - 1;

    // Disambiguate if one part is > 12
    if (first > 12 && second <= 12) {
      day = first;
      month = second - 1;
    } else if (second > 12 && first <= 12) {
      month = first - 1;
      day = second;
    }

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
