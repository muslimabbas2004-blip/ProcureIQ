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
  ArrowUp,
  ArrowUpRight,
  Trash2,
  MessageSquare,
  SlidersHorizontal,
  Reply,
  Plus,
  X
} from 'lucide-react';
import { ask, getAssistantStatus } from '../services/aiService';
import type { AiAnswer } from '../types';
import { useAuth } from '../context/Auth';
import { BrandMark } from '../components/Brand';
import { compactValue, exactValue, monthLabel, rupees } from '../components/chartFormat';
import AssistantResult from './AssistantResult';
import './Assistant.css';
import { greetingReply } from '../../server/src/services/assistantGreeting';

type M = { role: 'u' | 'a'; text: string; ans?: AiAnswer; replyTo?: string };
type Conversation = { id: string; title: string; updated: number; messages: M[] };
type SavedChats = { chats: Conversation[]; memory: boolean };
const makeChat = (): Conversation => ({ id: crypto.randomUUID(), title: 'New conversation', updated: Date.now(), messages: [] });
const storageKey = (email: string) => 'procureiq.chats.v1.' + email.toLowerCase();
const legacySetupNotice = 'Built-in query mode. Configure a server AI provider for flexible natural-language questions.';
function repairSavedGreetings(chat: Conversation): Conversation {
  const messages = chat.messages.map((message, index) => {
    const previous = chat.messages[index - 1];
    if (previous?.role !== 'u' || typeof previous.text !== 'string' || message?.role !== 'a'
      || (!message.ans?.tables?.length && !message.ans?.table && !message.ans?.chart)) return message;

    const greeting = greetingReply(previous.text);
    if (!greeting) return message;
    return {
      ...message,
      text: greeting,
      ans: { text: greeting, mode: 'conversation' as const, sources: [], followups: message.ans?.followups ?? [] }
    };
  });
  return { ...chat, messages };
}
const readChats = (email: string): SavedChats => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(email)) || 'null');
    if (value && Array.isArray(value.chats)) return { chats: value.chats.filter((c: any) => c && typeof c.id === 'string' && Array.isArray(c.messages)).slice(0, 30).map(repairSavedGreetings), memory: value.memory !== false };
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
    getAssistantStatus().then(s => {
      setStatus(s.provider === 'ollama' ? 'Local Ollama configured' : s.configured ? 'AI provider configured' : 'Built-in data queries');
      setSuggestions(s.examples);
    }).catch(() => setStatus('Server unavailable'));
  }, []);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!msgs.length && !busy) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    end.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'nearest' });
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
    <div className="assistant-layout assistant-modern">
      <header className="assistant-modern-header">
        <div className="assistant-identity">
          <BrandMark className="assistant-mark" />
          <div>
            <h1>ProcureIQ Assistant</h1>
            <p>Procurement intelligence</p>
          </div>
        </div>
        <span className="assistant-status" data-unavailable={status === 'Server unavailable'} role="status">
          <span />{status}
        </span>
      </header>

      <div className="assistant-toolbar">
        <div className="chat-history-controls">
          <label htmlFor="chat-history" className="sr-only">Conversation</label>
          <MessageSquare size={16} aria-hidden="true" className="assistant-history-icon" />
          <select id="chat-history" value={active.id} disabled={busy} onChange={e => { setActiveId(e.target.value); setReplyIndex(null); setQ(''); }}>
            {chats.map(c => <option value={c.id} key={c.id}>{c.title}</option>)}
          </select>
          <button type="button" className="btn2" disabled={busy} onClick={newChat} aria-label="New conversation">
            <Plus size={16} /> <span>New chat</span>
          </button>
          <button type="button" className="btn2" disabled={busy} onClick={deleteChat} aria-label="Delete current conversation" title="Delete current conversation">
            <Trash2 size={15} />
          </button>
        </div>
        <details className="assistant-memory-details">
          <summary><SlidersHorizontal size={15} aria-hidden="true" /> Settings <span>{memory ? 'Memory on' : 'Memory off'}</span></summary>
          <div className="chat-memory-controls">
            <label><input type="checkbox" checked={memory} onChange={e => setMemory(e.target.checked)} /> Use relevant past questions as context</label>
            <span>Saved on this browser. Relevant questions may be sent to the AI provider. Responses use current data.</span>
          </div>
        </details>
      </div>
      {storageError && <p role="alert" className="text-sm text-rose-700">{storageError}</p>}
      <div className="assistant-thread space-y-4">
        {!msgs.length && (
          <div className="assistant-welcome">
            <div className="assistant-welcome-content">
              <div className="assistant-welcome-copy">
                <span className="assistant-welcome-label"><Sparkles size={15} aria-hidden="true" /> Explore your procurement data</span>
                <h2>What would you<br className="assistant-hero-break" />{' '}like to know?</h2>
                <p>Compare suppliers, track spending, and find savings opportunities in your purchasing data.</p>
              </div>
              <svg className="assistant-hero-art" viewBox="0 0 260 190" fill="none" aria-hidden="true">
                <ellipse cx="135" cy="96" rx="115" ry="62" transform="rotate(-24 135 96)" stroke="currentColor" opacity=".35" />
                <ellipse cx="135" cy="96" rx="115" ry="62" transform="rotate(24 135 96)" stroke="currentColor" opacity=".24" />
                <circle cx="135" cy="96" r="67" stroke="currentColor" strokeDasharray="2 6" opacity=".55" />
                <circle cx="135" cy="96" r="46" fill="#205f50" stroke="currentColor" strokeOpacity=".5" />
                <path d="M112 118h46M116 110V96h9v14m6 0V84h9v26m6 0V73h9v37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="55" cy="65" r="5" fill="#e4c58f" />
                <circle cx="219" cy="57" r="5" fill="currentColor" />
                <circle cx="211" cy="139" r="4" fill="currentColor" />
                <path d="M81 139v14m-7-7h14M183 31v12m-6-6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="assistant-prompts-heading">Suggested questions</h3>
            <div className="assistant-suggestions">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  className="assistant-suggestion"
                  onClick={() => send(s)}
                >
                  <MessageSquare size={16} aria-hidden="true" className="assistant-prompt-icon" />
                  <span>{s}</span>
                  <ArrowUpRight size={17} aria-hidden="true" className="assistant-suggestion-arrow" />
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
                <BrandMark className="assistant-mark" />
                <span className="font-bold text-slate-700">ProcureIQ Copilot</span>
                {m.ans?.mode && m.ans.mode !== 'conversation' && <span className="text-[10px] text-slate-500">• {m.ans.mode === 'ai' ? 'AI-planned data query' : 'Direct data query'}</span>}
              </div>

              {(!m.ans?.tables?.length || !m.ans.plan) && <FormattedText text={m.text} />}

              {(m.ans?.tables?.length ? m.ans.tables : m.ans?.table ? [{ ...m.ans.table, title: 'Results' }] : []).map((table, tableIndex) => (
                <AssistantResult
                  key={tableIndex}
                  table={table}
                  question={msgs.slice(0, i).reverse().find(message => message.role === 'u')?.text ?? ''}
                  initiallyOpen={Boolean(!m.ans?.tables?.length && m.ans?.chart)}
                />
              ))}
              {m.ans?.plan && m.ans.tables?.some(table => !table.details) ? (
                <details className="assistant-answer-meta">
                  <summary>Original summary</summary>
                  <FormattedText text={m.text} />
                </details>
              ) : null}

              {!m.ans?.tables?.length && !m.ans?.table && m.ans?.chart?.data.length ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    {m.ans.chart.data.every(point => monthLabel(point.name) !== point.name)
                      ? m.ans.chart.type === 'line' ? 'Monthly average unit price (PKR)' : 'Monthly purchase order spend (PKR)'
                      : 'Result by category'}
                  </h3>
                  <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    {m.ans.chart.type === 'bar' ? (
                      <BarChart data={m.ans.chart.data}>
                        <XAxis dataKey="name" tickFormatter={monthLabel} minTickGap={14} fontSize={11} stroke="#64748B" />
                        <YAxis width={48} tickFormatter={compactValue} fontSize={11} stroke="#64748B" />
                        <Tooltip
                          labelFormatter={monthLabel}
                          formatter={(value: number, _name, item) => monthLabel(item.payload.name) !== item.payload.name
                            ? [rupees(value), 'Spend'] : [exactValue(value), 'Value']}
                          contentStyle={{
                            backgroundColor: '#1E293B',
                            color: '#fff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="value" fill="#176b60" radius={[4, 4, 0, 0]} maxBarSize={42} />
                      </BarChart>
                    ) : (
                      <LineChart data={m.ans.chart.data}>
                        <XAxis dataKey="name" tickFormatter={monthLabel} minTickGap={14} fontSize={11} stroke="#64748B" />
                        <YAxis width={48} tickFormatter={compactValue} fontSize={11} stroke="#64748B" />
                        <Tooltip
                          labelFormatter={monthLabel}
                          formatter={(value: number, _name, item) => monthLabel(item.payload.name) !== item.payload.name
                            ? [rupees(value), 'Average unit price'] : [exactValue(value), 'Value']}
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
                </div>
              ) : null}

              {m.ans?.warnings?.filter(w => w !== legacySetupNotice).map(w => (
                <p key={w} className="text-xs text-amber-800 bg-amber-50 rounded p-2">{w}</p>
              ))}

              {(!!m.ans?.sources?.length || !!m.ans?.plan) && (
                <div className="assistant-answer-actions">
                  {!!m.ans?.plan && <button type="button" disabled={busy} className="chat-reply-button" onClick={() => { setReplyIndex(i); input.current?.focus(); }}><Reply size={14} /> Reply to this answer</button>}
                  {!!m.ans?.sources?.length && <details className="assistant-answer-meta">
                    <summary>Data sources ({m.ans.sources.length})</summary>
                    <ul>{m.ans.sources.map((source, index) => <li key={index}>{source}</li>)}</ul>
                  </details>}
                </div>
              )}

              {m.ans?.followups && m.ans.followups.length > 0 && (
                <div className="assistant-answer-followups">
                  <h3>Suggested follow-ups</h3>
                  <div className="flex flex-wrap gap-1.5">
                  {m.ans.followups.map(f => (
                    <button
                      key={f}
                      type="button"
                      disabled={busy}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-royal hover:text-white text-slate-700 transition-colors border border-slate-200"
                      onClick={() => send(f)}
                    >
                      {f}
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {busy && (
          <div className="assistant-thinking" role="status" aria-live="polite">
            <BrandMark className="assistant-mark" />
            <div><strong>Working on your question<span className="thinking-dots"><i>.</i><i>.</i><i>.</i></span></strong><p>Looking through your procurement data</p></div>
          </div>
        )}
        <div ref={end} />
      </div>

      {replyIndex !== null && msgs[replyIndex] && <div className="chat-reply-preview"><span>Replying to: {msgs[replyIndex].text.slice(0, 120)}</span><button type="button" onClick={() => setReplyIndex(null)} aria-label="Cancel reply"><X size={16} /></button></div>}
      <form
        className="assistant-form assistant-composer"
        onSubmit={e => {
          e.preventDefault();
          send(q);
        }}
      >
        <input
          aria-label="Ask a procurement question"
          placeholder="Ask anything about your procurement data…"
          ref={input}
          maxLength={4000}
          value={q}
          disabled={busy}
          onChange={e => setQ(e.target.value)}
        />
        <button className="btn" type="submit" aria-label="Send question" disabled={busy || !q.trim()}>
          <span className="assistant-send-label">Ask</span>
          <ArrowUp size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

