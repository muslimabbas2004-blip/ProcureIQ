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
  Layers,
  Reply,
  Plus,
  X
} from 'lucide-react';
import { ask, getAssistantStatus } from '../services/aiService';
import type { AiAnswer } from '../types';
import { useAuth } from '../context/Auth';
import AnswerVisualization from './AnswerVisualization';

type M = { role: 'u' | 'a'; text: string; ans?: AiAnswer; replyTo?: string };
type Conversation = { id: string; title: string; updated: number; messages: M[] };
type SavedChats = { chats: Conversation[]; memory: boolean };
const makeChat = (): Conversation => ({ id: crypto.randomUUID(), title: 'New conversation', updated: Date.now(), messages: [] });
const storageKey = (email: string) => 'procureiq.chats.v1.' + email.toLowerCase();
const readChats = (email: string): SavedChats => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(email)) || 'null');
    if (value && Array.isArray(value.chats)) return { chats: value.chats.filter((c: any) => c && typeof c.id === 'string' && Array.isArray(c.messages)).slice(0, 30), memory: value.memory !== false };
  } catch { /* A fresh conversation remains available if stored data is invalid. */ }
  return { chats: [], memory: true };
};
const meaningfulWords = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter(w => !['what','which','show','about','from','with','have','that','this','their','please','could','compare','price','prices','supplier','suppliers','vendor','vendors','items','item','total','data'].includes(w)) ?? []);
function relevantHistory(question: string, chats: Conversation[], currentId: string): string[] {
  const words = meaningfulWords(question);
  if (!words.size) return [];
  return chats.filter(c => c.id !== currentId).flatMap(c => c.messages.filter(m => m.role === 'u').map(m => ({ text: m.text, updated: c.updated, score: [...meaningfulWords(m.text)].filter(w => words.has(w)).length })))
    .filter(m => m.score >= 1).sort((a, b) => b.score - a.score || b.updated - a.updated).slice(0, 3).map(m => m.text.slice(0, 1000));
}

const S = [
  'Compare the prices of Steel Rod 12mm across vendors',
  'Show our monthly procurement expenditure and growth',
  'Who are our highest-spending suppliers and their share?',
  'Identify potential procurement savings across our materials',
  'Which materials have increased in price?',
  'Tell me about Lahore Cement Traders'
];

function AssistantMark({ animated = false }: { animated?: boolean }) {
  return <span className={`assistant-mark ${animated ? 'assistant-mark-working' : ''}`} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 5 32.5 12.5v15L20 35 7.5 27.5v-15L20 5Z" stroke="currentColor" strokeWidth="1.5"/><path d="M20 12v16M12 20h16M14.4 14.4l11.2 11.2M25.6 14.4 14.4 25.6" stroke="currentColor" strokeWidth="1.1" opacity=".7"/><circle cx="20" cy="20" r="3.5" fill="currentColor"/></svg></span>;
}

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
  const { user } = useAuth();
  const email = user?.email ?? '';
  const [initial] = useState(() => readChats(email));
  const [chats, setChats] = useState<Conversation[]>(() => initial.chats.length ? initial.chats : [makeChat()]);
  const [activeId, setActiveId] = useState(() => initial.chats[0]?.id ?? '');
  const [memory, setMemory] = useState(initial.memory);
  const [storageError, setStorageError] = useState('');
  const [replyIndex, setReplyIndex] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const active = chats.find(c => c.id === activeId) ?? chats[0];
  const msgs = active.messages;
  const setM = (change: (previous: M[]) => M[]) => setChats(previous => previous.map(c => {
    if (c.id !== active.id) return c;
    const messages = change(c.messages);
    return { ...c, messages, updated: Date.now(), title: messages.find(m => m.role === 'u')?.text.slice(0, 55) || 'New conversation' };
  }));
  useEffect(() => {
    try { localStorage.setItem(storageKey(email), JSON.stringify({ chats: chats.slice(0, 30), memory })); setStorageError(''); }
    catch { setStorageError('Chat history could not be saved on this device.'); }
  }, [chats, memory, email]);
  const newChat = () => { if (chats.length >= 30) { setStorageError('You have 30 conversations. Delete one before starting another.'); return; } const c = makeChat(); setChats(previous => [c, ...previous]); setActiveId(c.id); setReplyIndex(null); setQ(''); };
  const deleteChat = () => {
    const remaining = chats.filter(c => c.id !== active.id);
    const next = remaining.length ? remaining : [makeChat()];
    setChats(next); setActiveId(next[0].id); setReplyIndex(null); setQ('');
  };
  const [q, setQ] = useState('');
  const [busy, setB] = useState(false);
  const [status, setStatus] = useState('Checking connection');
  const [suggestions, setSuggestions] = useState(S);
  useEffect(() => {
    getAssistantStatus().then(s => { setStatus(s.configured ? 'AI provider configured' : 'Built-in data queries'); setSuggestions(s.examples); }).catch(() => setStatus('Server unavailable'));
  }, []);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  const send = async (t: string) => {
    if (!t.trim() || busy) return;
    const userText = t.trim();
    setQ('');
    const targetIndex = replyIndex;
    const context = targetIndex === null ? msgs : msgs.slice(0, targetIndex + 1);
    const target = targetIndex === null ? undefined : msgs[targetIndex];
    setReplyIndex(null);
    setM(prev => [...prev, { role: 'u', text: userText, ...(target ? { replyTo: target.text.slice(0, 180) } : {}) }]);
    setB(true);
    try {
      const remembered = memory ? relevantHistory(userText, chats, active.id) : [];
      const history = [...remembered, ...context.filter(m => m.role === 'u').slice(-6).map(m => m.text)];
      if (target) history.push('Referenced assistant reply: ' + target.text.slice(0, 1000));
      const previousPlan = target ? target.ans?.plan : [...context].reverse().find(m => m.ans?.plan)?.ans?.plan;
      const a = await ask(userText, history, previousPlan);
      setM(prev => [...prev, { role: 'a', text: a.text, ans: a }]);
    } catch (err) {
      console.error('AI assistant error:', err);
      setM(prev => [
        ...prev,
        {
          role: 'a',
          text: 'The query could not be completed. Check the server connection and try again.',
          ans: {
            text: 'The query could not be completed. Check the server connection and try again.',
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
    <div className="assistant-layout assistant-modern max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="assistant-modern-header">
        <div className="assistant-identity"><AssistantMark /><div><strong>ProcureIQ <span>Assistant</span></strong><p>Your procurement intelligence workspace</p></div></div>
        <span className="assistant-status"><span />{status}</span>
      </div>

      <div className="chat-history-controls">
        <label htmlFor="chat-history">Conversation</label>
        <select id="chat-history" value={active.id} disabled={busy} onChange={e => { setActiveId(e.target.value); setReplyIndex(null); setQ(''); }}>
          {chats.map(c => <option value={c.id} key={c.id}>{c.title}</option>)}
        </select>
        <button type="button" className="btn2" disabled={busy} onClick={newChat}><Plus size={15} /> New</button>
        <button type="button" className="btn2" disabled={busy} onClick={deleteChat} aria-label="Delete current conversation" title="Delete current conversation"><Trash2 size={15} /></button>
      </div>
<details className="assistant-memory-details"><summary>Conversation settings <span>{memory ? 'Memory on' : 'Memory off'}</span></summary><div className="chat-memory-controls"><label><input type="checkbox" checked={memory} onChange={e => setMemory(e.target.checked)} /> Use relevant past questions as context</label><span>Saved on this browser. Relevant questions may be sent to the AI provider; responses always use current data.</span></div></details>
      {storageError && <p role="alert" className="text-sm text-rose-700">{storageError}</p>}
      <div className="assistant-thread flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {!msgs.length && (
          <div className="assistant-welcome">
            <div className="assistant-welcome-content">
            <div className="assistant-aurora" aria-hidden="true"><span/><span/><span/></div>
            <AssistantMark />
            <span className="assistant-welcome-label"><span className="welcome-live-dot" /> YOUR PROCUREMENT WORKSPACE</span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Good questions. <em>Better decisions.</em>
            </h1>
            <p className="text-mute text-sm mt-2 max-w-xl mx-auto">
              Meet your procurement copilot. Ask about your data and discover the insight behind every purchase.
            </p>
            </div><div className="assistant-discovery-strip" aria-hidden="true"><span>SUPPLIERS <b>↗</b></span><span>PRICES <b>↗</b></span><span>SPEND <b>↗</b></span><span>OPPORTUNITIES <b>↗</b></span></div><div className="assistant-prompts-heading"><span>NEED A STARTING POINT?</span><span>CHOOSE A QUESTION</span></div>
            <div className="assistant-suggestions">
              {suggestions.map((s, index) => (
                <button
                  key={s}
                  className="assistant-suggestion"
                  onClick={() => send(s)}
                >
                  <span className="assistant-prompt-number" aria-hidden="true">{String(index + 1).padStart(2, '0')} / EXPLORE</span><span className="assistant-prompt-text">{s}</span><span className="assistant-suggestion-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) =>
          m.role === 'u' ? (
            <div
              key={i}
              className="assistant-user-message"
            >
              {m.replyTo && <div className="chat-reply-reference">Replying to: {m.replyTo}</div>}
              {m.text}
            </div>
          ) : (
            <div key={i} className="assistant-answer space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs text-slate-500">
                <AssistantMark />
                <span className="font-bold text-slate-700">ProcureIQ Copilot</span>
                <span className="text-[10px] text-slate-400">• {m.ans?.mode === 'ai' ? 'AI-planned data query' : 'Built-in data query'}</span>
              </div>

              <FormattedText text={m.text} />
              {!!m.ans?.plan && <button type="button" disabled={busy} className="chat-reply-button" onClick={() => { setReplyIndex(i); input.current?.focus(); }}><Reply size={14} /> Reply to this answer</button>}
              {m.ans?.warnings?.map(w => <p key={w} className="text-xs text-amber-800 bg-amber-50 rounded p-2">{w}</p>)}

              {(m.ans?.tables ?? (m.ans?.table ? [{ ...m.ans.table, title: 'Results' }] : [])).map((table, tableIndex) => (
                <div key={tableIndex} className="overflow-x-auto border rounded-xl shadow-xs">
                  <div className="p-2 font-semibold text-sm">{table.title}</div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {table.head.map(h => (
                          <th key={h} className="p-2.5 text-left font-semibold text-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {table.rows.map((r, j) => (
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
                  <AnswerVisualization table={table} question={msgs.slice(0, i).reverse().find(message => message.role === 'u')?.text ?? ''} />
                </div>
              ))}

              {!m.ans?.tables?.length && m.ans?.chart && m.ans.chart.data && m.ans.chart.data.length > 0 && (
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
                        <Bar dataKey="value" fill="#176b60" radius={[4, 4, 0, 0]} />
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
                          stroke="#176b60"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#176b60' }}
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
          <div className="assistant-thinking" role="status" aria-live="polite">
            <AssistantMark animated />
            <div><strong>Working on your question<span className="thinking-dots"><i>.</i><i>.</i><i>.</i></span></strong><p>Looking through your procurement data</p></div>
          </div>
        )}
        <div ref={end} />
      </div>

      {replyIndex !== null && msgs[replyIndex] && <div className="chat-reply-preview"><span>Replying to: {msgs[replyIndex].text.slice(0, 120)}</span><button type="button" onClick={() => setReplyIndex(null)} aria-label="Cancel reply"><X size={16} /></button></div>}
      <form
        className="assistant-form assistant-composer flex gap-2 pt-3"
        onSubmit={e => {
          e.preventDefault();
          send(q);
        }}
      >
        <input
          className="flex-1 min-w-0 border rounded-xl p-3 text-sm focus:outline-none focus:border-royal bg-white shadow-xs"
          aria-label="Ask a procurement question"
          placeholder="Ask anything about your procurement data…"
          ref={input}
          maxLength={4000}
          value={q}
          disabled={busy}
          onChange={e => setQ(e.target.value)}
        />
        <button className="btn flex items-center gap-1.5" type="submit" disabled={busy || !q.trim()}>
          <Send size={16} />
          <span className="assistant-send-label">Ask</span>
        </button>
      </form>
    </div>
  );
}

