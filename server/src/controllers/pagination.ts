import { Request, Response } from 'express';

// Bounded responses, allowlisted sorting, and deterministic ID tie-breaking.
export function sendPage<T extends object>(req: Request, res: Response, rows: T[], fields: string[], id: string) {
  const integer = (value: unknown, fallback: number) => value === undefined ? fallback : Number(value);
  const page = integer(req.query.page, 1);
  const pageSize = integer(req.query.pageSize, 50);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    return res.status(400).json({ error: 'page must be positive; pageSize must be between 1 and 500.' });
  }
  const q = String(req.query.q ?? '').trim().toLowerCase().slice(0, 200);
  const sort = String(req.query.sort ?? id);
  if (!fields.includes(sort)) return res.status(400).json({ error: 'Unsupported sort field.' });
  const direction = req.query.direction === 'desc' ? -1 : 1;
  const value = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];
  const filtered = q ? rows.filter(row => fields.some(key => String(value(row, key) ?? '').toLowerCase().includes(q))) : [...rows];
  filtered.sort((a, b) => {
    const x = value(a, sort), y = value(b, sort);
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''));
    return cmp * direction || String(value(a, id)).localeCompare(String(value(b, id)));
  });
  const total = filtered.length;
  const current = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  return res.json({ data: filtered.slice((current - 1) * pageSize, current * pageSize), total, page: current, pageSize });
}
