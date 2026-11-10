import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { compactValue, exactValue, monthLabel, rupees, shortLabel } from '../components/chartFormat';

type Table = { title: string; head: string[]; rows: (string | number)[][] };
type ChartType = 'bar' | 'line' | 'area' | 'pie';
const colors = ['#176b60', '#bb9863', '#6b9e87', '#6b8494', '#b47b6c', '#8a82a9', '#c2ac78', '#4d8279'];
const currency = /^(?:Rs\.?|PKR)\s*(-?\d+(?:,\d{3})*(?:\.\d+)?)$/i;
const percent = /^(-?\d+(?:,\d{3})*(?:\.\d+)?)\s*%$/;

function numericValue(cell: string | number | undefined) {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : undefined;
  const match = cell?.trim().match(currency) ?? cell?.trim().match(percent);
  const value = match ? Number(match[1].replace(/,/g, '')) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

function heading(name: string) {
  return name.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase());
}

export function chartColumns(table: Table) {
  return table.head.map((name, index) => ({ name: heading(name), index }))
    .filter(({ index }) => table.rows.some(row => numericValue(row[index]) !== undefined));
}
export function chartData(table: Table, label: number, value: number) {
  return table.rows.flatMap(row => {
    const numeric = numericValue(row[value]);
    return numeric === undefined ? [] : [{ name: String(row[label] ?? '').trim() || 'Unlabeled', value: numeric }];
  });
}

const isPeriod = (name: string) => /^(month|year|date|quarter)$/i.test(name.trim());

function requestedType(question: string, chronological: boolean): ChartType {
  if (/\b(pie|donut|doughnut)\b/i.test(question)) return 'pie';
  if (/\barea\b/i.test(question)) return 'area';
  if (/\bbar\b/i.test(question)) return 'bar';
  return chronological || /\bline\b/i.test(question) ? 'line' : 'bar';
}
export default function AnswerVisualization({ table, question, initiallyOpen = false }: { table: Table; question: string; initiallyOpen?: boolean }) {
  const numeric = useMemo(() => chartColumns(table), [table]);
  const period = table.head.findIndex(isPeriod);
  const [enabled, setEnabled] = useState(() => initiallyOpen || /\b(chart|graph|plot|visuali[sz]e|visuali[sz]ation|pie|bar chart|line chart)\b/i.test(question));
  const [type, setType] = useState<ChartType>(() => requestedType(question, period >= 0));
  const [label, setLabel] = useState(() => period >= 0 ? period : Math.max(0, table.head.findIndex((_, i) => !numeric.some(n => n.index === i))));
  const [value, setValue] = useState(() => {
    const preferred = /savings/i.test(question) ? /savings/i
      : /spend|expenditure/i.test(question) ? /spend|amount/i
      : /price/i.test(question) ? /price/i : null;
    return numeric.find(column => column.index !== label && preferred?.test(column.name))?.index
      ?? numeric.find(column => column.index !== label)?.index ?? numeric[0]?.index ?? 0;
  });
  const data = useMemo(() => chartData(table, label, value), [table, label, value]);
  const chronological = isPeriod(table.head[label] ?? '');
  const metric = heading(table.head[value] ?? '');
  const category = heading(table.head[label] ?? '');
  const cells = table.rows.map(row => row[value]).filter((cell): cell is string => typeof cell === 'string');
  const isMoney = cells.some(cell => currency.test(cell.trim()))
    || (/\b(spend|amount|price|savings|line total|cost)\b/i.test(metric) && !/\b(index|volatility|share|rate|ratio)\b/i.test(metric));
  const isPercent = cells.some(cell => percent.test(cell.trim())) || /\(%\)|\b(percent|pct)\b/i.test(metric);
  const format = isPercent ? (n: number) => `${exactValue(n)}%` : isMoney ? rupees : exactValue;
  const tickValue = (n: number) => isPercent ? `${compactValue(n)}%` : compactValue(n);
  const available = chronological ? [...data].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) : data;
  const shown = chronological ? available.slice(-20) : available.slice(0, 20);
  const pieInvalid = type === 'pie' && (shown.some(d => d.value < 0) || !shown.some(d => d.value > 0)
    || new Set(shown.map(d => d.name)).size !== shown.length || data.length > shown.length || shown.length > 8
    || isPercent || /\b(avg|average|mean|median|unit price|lowest|highest|rate|index|ratio|volatility|min|max)\b/i.test(metric));
  const horizontal = type === 'bar' && !chronological;
  const tooltip = <Tooltip labelFormatter={monthLabel} formatter={(n: number) => [format(n), metric]} />;
  if (!numeric.length || table.rows.length < 2) return null;

  return (
    <section className="answer-visualization" aria-label={`Visualize ${table.title}`}>
      <div className="visualization-heading">
        <div><strong>Visualize this result</strong><p>Compare categories with bars or use a line for changes over time.</p></div>
        <button className="btn2" type="button" aria-expanded={enabled} onClick={() => setEnabled(v => !v)}>{enabled ? 'Hide chart' : 'Create chart'}</button>
      </div>
      {enabled && <>
        <div className="visualization-controls">
          <label>Chart type<select value={type} onChange={e => setType(e.target.value as ChartType)}><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie</option></select></label>
          <label>Group by<select value={label} onChange={e => setLabel(Number(e.target.value))}>{table.head.map((h, i) => <option key={i} value={i}>{heading(h)}</option>)}</select></label>
          <label>Measure<select value={value} onChange={e => setValue(Number(e.target.value))}>{numeric.map(n => <option key={n.index} value={n.index}>{n.name}</option>)}</select></label>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-800">{metric} by {category}{isMoney && !isPercent ? ' (PKR)' : ''}</h3>
        <p className="visualization-note">
          {shown.length < data.length ? `Showing the ${chronological ? 'latest' : 'first'} ${shown.length} of ${data.length} rows.` : `Showing ${shown.length} of ${table.rows.length} result rows.`}
          {' '}Missing values are excluded. Repeated labels represent separate rows.
        </p>
        {shown.length < 2 ? <p role="status" className="visualization-note">Select a measure with at least two values to compare.</p>
          : pieInvalid ? <p role="status" className="visualization-note">Use pie for up to eight distinct categories that add up to a total. For prices, averages, percentages, or negative values, choose bars or a line.</p>
          : <div className="visualization-chart" style={horizontal ? { height: Math.max(170, shown.length * 31 + 42) } : undefined}
              role="img" aria-label={`${type} chart of ${metric} by ${category}`}>
            <ResponsiveContainer width="100%" height="100%">
              {type === 'pie' ? (
                <PieChart>
                  <Pie data={shown} dataKey="value" nameKey="name" outerRadius="68%">
                    {shown.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(n: number, name: string) => [format(n), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              ) : type === 'line' ? (
                <LineChart data={shown} margin={{ right: 12 }}>
                  <CartesianGrid stroke="#e5ece6" vertical={false} />
                  <XAxis dataKey="name" tickFormatter={name => shortLabel(monthLabel(name), 13)} tick={{ fontSize: 11 }} minTickGap={14} />
                  <YAxis width={48} tickFormatter={tickValue} tick={{ fontSize: 11 }} />
                  {tooltip}
                  <Line dataKey="value" name={metric} stroke="#176b60" strokeWidth={2} dot={shown.length <= 12} />
                </LineChart>
              ) : type === 'area' ? (
                <AreaChart data={shown} margin={{ right: 12 }}>
                  <CartesianGrid stroke="#e5ece6" vertical={false} />
                  <XAxis dataKey="name" tickFormatter={name => shortLabel(monthLabel(name), 13)} tick={{ fontSize: 11 }} minTickGap={14} />
                  <YAxis width={48} tickFormatter={tickValue} tick={{ fontSize: 11 }} />
                  {tooltip}
                  <Area dataKey="value" name={metric} stroke="#176b60" fill="#b7ddc8" />
                </AreaChart>
              ) : (
                <BarChart data={shown} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ right: 12 }}>
                  <CartesianGrid stroke="#e5ece6" horizontal={horizontal ? false : undefined} vertical={horizontal ? undefined : false} />
                  {horizontal ? <XAxis type="number" tickFormatter={tickValue} tick={{ fontSize: 11 }} />
                    : <XAxis dataKey="name" tickFormatter={monthLabel} tick={{ fontSize: 11 }} minTickGap={14} />}
                  {horizontal ? <YAxis type="category" dataKey="name" width={104} interval={0} tickFormatter={name => shortLabel(name, 16)} tick={{ fontSize: 11 }} />
                    : <YAxis width={48} tickFormatter={tickValue} tick={{ fontSize: 11 }} />}
                  {tooltip}
                  <Bar dataKey="value" name={metric} fill="#176b60" maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>}
      </>}
    </section>
  );
}
