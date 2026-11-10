import type { ReactNode } from 'react';

export default function RankedBars({ rows, label }: {
  rows: { id?: string; name: string; value: number; detail: ReactNode }[];
  label: string;
}) {
  const scale = Math.max(1, ...rows.map(row => Math.abs(row.value)));
  const signed = rows.some(row => row.value < 0);
  return (
    <ol aria-label={label} className="mt-4 space-y-3">
      {rows.map((row, index) => (
        <li key={row.id ?? index}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
            <span className="break-words font-medium text-slate-800">{row.name}</span>
            <span className="text-xs tabular-nums text-slate-700">{row.detail}</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
            {signed && <span className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />}
            <div
              className={`absolute inset-y-0 rounded-full ${row.value < 0 ? 'bg-amber-700' : 'bg-royal'}`}
              style={{
                width: `${Math.abs(row.value) / scale * (signed ? 50 : 100)}%`,
                ...(row.value < 0 ? { right: '50%' } : { left: signed ? '50%' : 0 })
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
