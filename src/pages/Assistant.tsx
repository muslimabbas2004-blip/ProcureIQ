import { useState, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Sparkles,
  Send,
  Trash2,
  Database,
  Building2,
  TrendingUp,
  DollarSign,
  Package,
  Layers
} from 'lucide-react';
import { ask } from '../services/aiService';
import type { AiAnswer } from '../types';

type M = { role: 'u' | 'a'; text: string; ans?: AiAnswer };

const S = [
  'Compare the prices of Steel Rod 12mm across vendors',
  'Show our monthly procurement expenditure and growth',
  'Who are our highest-spending suppliers and their share?',
  'Identify potential procurement savings across our materials',
  'Which materials have increased in price?',
  'Tell me about Lahore Cement Traders'
];

function FormattedText({ text }: { text: string }) {
  const paragraphs = text.split('\n');
  return (
    <div className="space-y-2 text-slate-800 leading-relaxed text-sm">
      {paragraphs.map((p, i) => {
        if (!p.trim()) return <div key={i} className="h-0.5" />;
        const isBullet = /^[-*•]\s+/.test(p.trim());
        const content = isBullet ? p.trim().replace(/^[-*•]\s+/, '') : p;

        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const formatted = parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-semibold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-teal font-bold">•</span>
              <span>{formatted}</span>
            </div>
          );
        }
        return <p key={i}>{formatted}</p>;
      })}
    </div>
  );
}

export default function Assistant() {
  const [msgs, setM] = useState<M[]>([]);
  const [q, setQ] = useState('');
  const [busy, setB] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (t: string) => {
    if (!t.trim() || busy) return;
    const userText = t.trim();
    setQ('');
    setM(prev => [...prev, { role: 'u', text: userText }]);
    setB(true);
    try {
      const history = msgs.filter(m => m.role === 'u').map(m => m.text);
      const a = await ask(userText, [...history, userText]);
      setM(prev => [...prev, { role: 'a', text: a.text, ans: a }]);
    } catch (err) {
      console.error('AI assistant error:', err);
      setM(prev => [
        ...prev,
        {
          role: 'a',
          text: 'An error occurred while processing your request. Please try again.',
          ans: {
            text: 'An error occurred while processing your request. Please try again.',
            sources: [],
            followups: [
              'Compare the prices of Steel Rod 12mm across vendors',
              'Show our monthly procurement expenditure'
            ]
          }
        }
      ]);
    } finally {
      setB(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Copilot Header Ribbon */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-900 via-navy to-indigo-950 text-white rounded-xl shadow-sm mb-3 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal/20 text-teal border border-teal/30">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              <span>ProcureIQ AI Intelligence Copilot</span>
            </div>
            <div className="text-[11px] text-slate-300">
              Real-time enterprise procurement reasoning & contract strategy
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Gemini AI Connected
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {!msgs.length && (
          <div className="text-center py-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              What would you like to know about your procurement operations?
            </h1>
            <p className="text-mute text-sm mt-2 max-w-xl mx-auto">
              Ask about suppliers, material prices, spend trends, price volatility, or cost optimization opportunities.
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5 mt-6 max-w-2xl mx-auto">
              {S.map(s => (
                <button
                  key={s}
                  className="card text-left text-xs sm:text-sm p-3 hover:border-royal hover:shadow-sm transition-all bg-gradient-to-br from-white to-slate-50/50"
                  onClick={() => send(s)}
                >
                  <span className="font-medium text-slate-800">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === 'u' ? (
            <div
              key={i}
              className="ml-auto max-w-[80%] bg-royal text-white rounded-2xl px-4 py-2.5 w-fit shadow-sm text-sm"
            >
              {m.text}
            </div>
          ) : (
            <div key={i} className="card space-y-3.5 border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs text-slate-500">
                <span className="p-1 rounded-md bg-teal/10 text-teal">
                  <Sparkles size={13} />
                </span>
                <span className="font-bold text-slate-700">ProcureIQ Copilot</span>
                <span className="text-[10px] text-slate-400">• Gemini AI Response</span>
              </div>

              <FormattedText text={m.text} />

              {m.ans?.table && (
                <div className="overflow-x-auto border rounded-xl shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {m.ans.table.head.map(h => (
                          <th key={h} className="p-2.5 text-left font-semibold text-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {m.ans.table.rows.map((r, j) => (
                        <tr key={j} className="hover:bg-slate-50/80">
                          {r.map((c, k) => (
                            <td key={k} className="p-2.5 text-slate-700">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {m.ans?.chart && m.ans.chart.data && m.ans.chart.data.length > 0 && (
                <div className="w-full h-60 pt-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                    {m.ans.chart.type === 'bar' ? (
                      <BarChart data={m.ans.chart.data}>
                        <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                        <YAxis fontSize={11} stroke="#94A3B8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E293B',
                            color: '#fff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="value" fill="#356AE6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={m.ans.chart.data}>
                        <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                        <YAxis domain={['auto', 'auto']} fontSize={11} stroke="#94A3B8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E293B',
                            color: '#fff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#12B8A6"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#12B8A6' }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}

              {m.ans?.sources && m.ans.sources.length > 0 && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-500">Citations:</span>
                  {m.ans.sources.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {m.ans?.followups && m.ans.followups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {m.ans.followups.map(f => (
                    <button
                      key={f}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-royal hover:text-white text-slate-700 transition-colors border border-slate-200"
                      onClick={() => send(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {busy && (
          <div className="card text-slate-500 text-xs sm:text-sm animate-pulse flex items-center gap-2.5 bg-slate-50 border border-slate-200">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal animate-ping" />
            <span>Reasoning with Gemini AI across enterprise procurement datasets…</span>
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        className="flex gap-2 pt-3"
        onSubmit={e => {
          e.preventDefault();
          send(q);
        }}
      >
        <input
          className="flex-1 border rounded-xl p-3 text-sm focus:outline-none focus:border-royal bg-white shadow-xs"
          placeholder="Ask about prices, suppliers, trends, savings, or materials…"
          value={q}
          disabled={busy}
          onChange={e => setQ(e.target.value)}
        />
        <button
          className="btn2 text-slate-600 hover:text-rose-600"
          type="button"
          title="Clear chat"
          disabled={busy || !msgs.length}
          onClick={() => setM([])}
        >
          <Trash2 size={16} />
        </button>
        <button className="btn flex items-center gap-1.5" type="submit" disabled={busy || !q.trim()}>
          <Send size={15} />
          Send
        </button>
      </form>
    </div>
  );
}

