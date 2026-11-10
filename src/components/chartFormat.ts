const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 4 });
const months = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export const compactValue = (value: number) => compact.format(value);
export const exactValue = (value: number) => number.format(value);
export const rupees = (value: number) => `Rs. ${exactValue(value)}`;

export function monthLabel(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? months.format(new Date(`${value}-01T00:00:00Z`))
    : value;
}

export function shortLabel(value: string, max = 20) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
