import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

type Table = { title: string; head: string[]; rows: (string | number)[][] };
type ChartType = 'bar' | 'line' | 'area' | 'pie';
const colors = ['#176b60', '#bb9863', '#6b9e87', '#6b8494', '#b47b6c', '#8a82a9', '#c2ac78', '#4d8279'];
export function chartColumns(table: Table) {
  return table.head.map((name, index) => ({ name, index })).filter(({ index }) => table.rows.some(row => typeof row[index] === 'number' && Number.isFinite(row[index])));
}
export function chartData(table: Table, label: number, value: number) {
  return table.rows.flatMap(row => typeof row[value] === 'number' && Number.isFinite(row[value]) ? [{ name: String(row[label] ?? ''), value: row[value] as number }] : []);
}
function requestedType(question: string): ChartType {
  return /\bpie\b|donut|doughnut/i.test(question) ? 'pie' : /\barea\b/i.test(question) ? 'area' : /\bline\b|trend/i.test(question) ? 'line' : 'bar';
}
export default function AnswerVisualization({ table, question }: { table: Table; question: string }) {
  const numeric = useMemo(() => chartColumns(table), [table]);
  const [enabled, setEnabled] = useState(() => /\b(chart|graph|plot|visuali[sz]e|visuali[sz]ation|pie|bar chart|line chart)\b/i.test(question));
  const [type, setType] = useState<ChartType>(() => requestedType(question));
  const [label, setLabel] = useState(() => Math.max(0, table.head.findIndex((_, i) => !numeric.some(n => n.index === i))));
  const [value, setValue] = useState(() => numeric[0]?.index ?? 0);
  const data = useMemo(() => chartData(table, label, value), [table, label, value]);
  const pieInvalid = type === 'pie' && (data.some(d => d.value < 0) || !data.some(d => d.value > 0));
  if (!numeric.length || table.rows.length < 2) return null;
  return <section className="answer-visualization" aria-label={`Visualize ${table.title}`}>
    <div className="visualization-heading"><div><strong>Visualize this result</strong><p>Choose a chart and the columns to display.</p></div><button className="btn2" type="button" aria-expanded={enabled} onClick={() => setEnabled(v => !v)}>{enabled ? 'Hide chart' : 'Create chart'}</button></div>
    {enabled && <>
      <div className="visualization-controls"><label>Chart type<select value={type} onChange={e => setType(e.target.value as ChartType)}><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie</option></select></label><label>Labels<select value={label} onChange={e => setLabel(Number(e.target.value))}>{table.head.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label><label>Values<select value={value} onChange={e => setValue(Number(e.target.value))}>{numeric.map(n => <option key={n.index} value={n.index}>{n.name}</option>)}</select></label></div>
      <p className="visualization-note">Showing {data.length} numeric {data.length === 1 ? 'row' : 'rows'} from the displayed result. Missing values are excluded; repeated labels remain separate.</p>
      {pieInvalid ? <p role="status" className="visualization-note">A pie chart needs non-negative values and at least one value above zero. Choose another chart or value.</p> : <div className="visualization-chart" role="img" aria-label={`${type} chart of ${table.head[value]} by ${table.head[label]} using ${data.length} displayed rows`}><ResponsiveContainer width="100%" height="100%">
        {type === 'pie' ? <PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius="75%">{data.map((_,i)=><Cell key={i} fill={colors[i % colors.length]}/>)}</Pie><Tooltip/><Legend /></PieChart> : type === 'line' ? <LineChart data={data} margin={{top:10,right:16,left:0,bottom:15}}><CartesianGrid stroke="#e5ece6" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={70} tick={{fontSize:10}}/><Tooltip/><Line dataKey="value" name={table.head[value]} stroke="#176b60" strokeWidth={2} dot={{r:3}} /></LineChart> : type === 'area' ? <AreaChart data={data} margin={{top:10,right:16,left:0,bottom:15}}><CartesianGrid stroke="#e5ece6" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={70} tick={{fontSize:10}}/><Tooltip/><Area dataKey="value" name={table.head[value]} stroke="#176b60" fill="#b7ddc8" /></AreaChart> : <BarChart data={data} margin={{top:10,right:16,left:0,bottom:15}}><CartesianGrid stroke="#e5ece6" strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis width={70} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" name={table.head[value]} fill="#176b60" radius={[4,4,0,0]}/></BarChart>}
      </ResponsiveContainer></div>}
    </>}
  </section>;
}
