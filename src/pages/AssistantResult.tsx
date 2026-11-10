import type { AssistantTable } from '../types';
import { exactValue } from '../components/chartFormat';
import AnswerVisualization from './AnswerVisualization';

const titles: Record<string, string> = {
  items: 'Items and materials',
  vendors: 'Suppliers',
  orders: 'Purchase orders',
  lines: 'Purchase order lines',
  historical: 'Historical purchases',
  quotations: 'Supplier quotations',
  datasets: 'Imported datasets',
  savings: 'Estimated savings',
  priceChanges: 'Price changes'
};

const operators = { eq: 'is', ne: 'is different from', contains: 'contains', in: 'is one of', gt: 'is above', gte: 'is at least', lt: 'is below', lte: 'is at most' };

function label(value: string) {
  const text = value.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\bid\b/gi, 'ID');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const displayValue = (value: string | number) => typeof value === 'number' ? exactValue(value) : value;

export default function AssistantResult({ table, question, initiallyOpen }: {
  table: AssistantTable;
  question: string;
  initiallyOpen: boolean;
}) {
  const title = Object.prototype.hasOwnProperty.call(titles, table.title) ? titles[table.title] : label(table.title);
  const { details, rows } = table;
  const headings = table.head.map(column => details?.metricLabels?.[column] ?? label(column));
  const metricCards = rows.length === 1 && (details?.aggregate ?? table.head.every(column => /^(record|item|vendor|supplier|order)count$/i.test(column)));
  const noMatches = details?.matched === 0;
  const noRows = rows.length === 0;

  return (
    <section className="assistant-result" aria-label={title}>
      <div className="assistant-result-heading">
        <h3>{title}</h3>
        {details && <p>{exactValue(details.matched)} matching {details.matched === 1 ? 'record' : 'records'}
          {!metricCards && !noRows && <> · Showing {exactValue(rows.length)} of {exactValue(details.total)} {details.total === 1 ? 'result' : 'results'}</>}
        </p>}
      </div>
      {(noMatches || noRows) && <p className="assistant-result-empty">
        {noMatches || !details ? 'No matching data in the imported records.' : 'No rows on this page. Try asking for the first results.'}
      </p>}
      {metricCards ? (
        <dl className="assistant-result-metrics">
          {headings.map((heading, i) => <div key={i}><dt>{heading}</dt><dd>{displayValue(rows[0][i])}</dd></div>)}
        </dl>
      ) : !noRows && (
        <>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${title} table`}>
            <table className="w-full text-sm">
              <thead>
                <tr>{headings.map((heading, i) => <th key={i} scope="col">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => <tr key={i}>{row.map((cell, j) => (
                  <td key={j} className={typeof cell === 'number' ? 'tabular-nums' : undefined}>{displayValue(cell)}</td>
                ))}</tr>)}
              </tbody>
            </table>
          </div>
          <AnswerVisualization table={{ ...table, title, head: headings }} question={question} initiallyOpen={initiallyOpen} />
        </>
      )}
      {details && (details.notes.length > 0 || details.filters.length > 0) && (
        <details className="assistant-result-details">
          <summary>Query details{details.filters.length > 0 && ` · ${details.filters.length} ${details.filters.length === 1 ? 'filter' : 'filters'}`}</summary>
          {details.notes.map(note => <p key={note}>{note}</p>)}
          {details.filters.length > 0 && <ul>
            {details.filters.map(({ field, op, value }, i) => (
              <li key={i}><strong>{label(field)}</strong> {operators[op]} {Array.isArray(value) ? value.map(displayValue).join(', ') : displayValue(value)}</li>
            ))}
          </ul>}
        </details>
      )}
    </section>
  );
}
