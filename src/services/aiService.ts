import type { AiAnswer } from '../types';
import { API, http } from './api';
import * as A from './analyticsService';
import { fmt } from './analyticsService';
import { vendors, items, pos } from '../data/mock';

const R = 'Source: PO records 2025-11 to 2026-10 (excludes Draft/Cancelled).';

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42SXZwemN1eTVmSXc3ZXRZTWU4UDQ0R2lRT3dFUGFqUmtUS09vQ3Ntc0h6MVE=';
export const GEMINI_API_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (typeof atob === 'function' ? atob(DEFAULT_KEY_B64) : '');

const CLIENT_CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview'
];

async function askGeminiDirect(q: string, history: string[] = []): Promise<AiAnswer | null> {
  const kpis = A.kpis();
  const topVendors = A.vendorSpend().slice(0, 8);
  const itemStats = A.itemStats();
  const savings = A.savings().slice(0, 8);

  const matchedItem = A.findItem(q);
  let itemDetail = '';
  if (matchedItem) {
    const vendorPrices = A.itemByVendor(matchedItem.itemId);
    const trend = A.itemTrend(matchedItem.itemId);
    itemDetail = `\nSPECIFIC ITEM IN FOCUS:
Item: ${matchedItem.itemName} (${matchedItem.category}) [ID: ${matchedItem.itemId}]
Vendor Prices: ${vendorPrices.map(v => `${v.name}: avg Rs ${Math.round(v.avg)} (min Rs ${v.min}, max Rs ${v.max}, ${v.n} orders)`).join(' | ')}
Monthly Trend: ${trend.map(t => `${t.name}: Rs ${t.value}`).join(', ')}`;
  }

  const context = `LIVE PROCUREMENT DATASET CONTEXT:
Summary:
- Total Spend: Rs ${kpis.spend.toLocaleString()}
- Total POs: ${kpis.orders}
- Active Vendors: ${kpis.vendors}
- Total Savings: Rs ${kpis.savings.toLocaleString()}

Top Suppliers:
${topVendors.map((v, i) => `${i + 1}. ${v.name}: Rs ${v.value.toLocaleString()} (${v.share.toFixed(1)}% share, ${v.orders} orders)`).join('\n')}

Key Materials:
${itemStats.slice(0, 8).map(i => `- ${i.itemName} (${i.category}): spend Rs ${i.spend.toLocaleString()}, avg Rs ${Math.round(i.avg)}, range Rs ${i.min} - Rs ${i.max}`).join('\n')}

Cost Savings Opportunities:
${savings.map(s => `- ${s.item}: potential savings of Rs ${s.est.toLocaleString()} with ${s.best}`).join('\n')}
${itemDetail}`;

  const systemInstruction = `You are ProcureIQ AI, the executive procurement intelligence copilot.
Always return ONLY valid JSON matching:
{
  "text": "Executive-level, clear and detailed natural language answer with facts, figures, and strategic recommendations.",
  "table": { "head": ["Col 1", "Col 2"], "rows": [["val 1", "val 2"]] },
  "chart": { "type": "bar" | "line", "data": [{ "name": "Item", "value": 12345 }] },
  "followups": ["Question 1", "Question 2"],
  "sources": ["Source 1", "Source 2"]
}
Currency: Pakistani Rupees (PKR / Rs.). Format monetary figures nicely in text/tables. Output raw numbers in chart data. Return ONLY JSON.`;

  const conversation = history.length > 0
    ? `Recent Conversation Context:\n${history.slice(-4).map((h, i) => `User Q${i + 1}: ${h}`).join('\n')}\n\n`
    : '';

  const promptText = `${systemInstruction}\n\n${context}\n\n${conversation}USER QUESTION: ${q}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  };

  for (const model of CLIENT_CANDIDATE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson) as AiAnswer;
      if (parsed && typeof parsed.text === 'string') {
        return {
          text: parsed.text,
          table: parsed.table,
          chart: parsed.chart,
          followups: parsed.followups,
          sources: parsed.sources || ['ProcureIQ Intelligence Database', `Google Gemini (${model})`]
        };
      }
    } catch (e) {
      console.warn(`[Client Gemini] ${model} attempt failed:`, e);
    }
  }
  return null;
}

export async function ask(q: string, history: string[] = []): Promise<AiAnswer> {
  if (!API.mock) {
    try {
      return await http<AiAnswer>('/api/chat/query', {
        method: 'POST',
        body: JSON.stringify({ question: q, history })
      });
    } catch (err) {
      console.warn('Backend AI query failed, attempting direct Gemini fallback:', err);
    }
  }

  // Direct client-side Gemini fallback
  try {
    const directAns = await askGeminiDirect(q, history);
    if (directAns) return directAns;
  } catch (err) {
    console.warn('Direct client Gemini call failed, using simulation:', err);
  }

  // Simulation mode
  await new Promise(r => setTimeout(r, 400));
  const s = q.toLowerCase().trim();

  // 1. GREETINGS & CAPABILITIES
  if (/^(hi|hello|hey|help|who are you|what can you do|how to use|commands|assist)/i.test(s) || s === 'hi' || s === 'hello') {
    return {
      text: `Hello! I am your ProcureIQ AI Procurement Assistant. I can analyze purchase orders, benchmark supplier rates, identify savings, and monitor inflation trends across your procurement dataset. Here are some questions you can ask me:`,
      table: {
        head: ['Capability', 'Example Query'],
        rows: [
          ['Supplier Price Benchmark', 'Compare prices of Steel Rod 12mm across vendors'],
          ['Historical Price Trends', 'Show the historical price trend of Cement'],
          ['Cost Reduction Opportunities', 'Identify potential procurement savings'],
          ['Top Suppliers', 'Who are our highest-spending suppliers?'],
          ['Spending Analytics', 'Show our monthly procurement expenditure'],
          ['Material Inflation', 'Which materials have increased in price?'],
          ['Recent Orders', 'Show recent purchase orders'],
          ['Supplier Profile', 'Tell me about Karachi Steel Mills']
        ]
      },
      sources: [R],
      followups: [
        'Compare the prices of Steel Rod 12mm across vendors',
        'Show our monthly procurement expenditure',
        'Identify potential procurement savings',
        'Who are our highest-spending suppliers?'
      ]
    };
  }

  // Resolve item or vendor
  let it = A.findItem(q);
  if (!it && /\b(it|that|this|the item|the material)\b/.test(s)) {
    it = A.findItem(history.slice().reverse().join(' '));
  }

  const findVendor = (query: string) => {
    const qlow = query.toLowerCase();
    const exact = vendors.find(v => qlow.includes(v.vendorName.toLowerCase()));
    if (exact) return exact;
    const words = qlow.split(/[^a-z0-9]+/i).filter(w => w.length >= 4 && !['vendor','vendors','supplier','suppliers','company'].includes(w));
    for (const w of words) {
      const match = vendors.find(v => v.vendorName.toLowerCase().includes(w));
      if (match) return match;
    }
    return undefined;
  };

  let ven = findVendor(q);
  if (!ven && /\b(they|them|that vendor|the supplier)\b/.test(s)) {
    ven = findVendor(history.slice().reverse().join(' '));
  }

  // 2. SPECIFIC VENDOR
  if (ven && !it) {
    const prof = A.vendorProfile(ven.vendorId);
    const vpos = pos.filter(p => p.vendorId === ven!.vendorId).sort((a,b) => b.orderDate.localeCompare(a.orderDate));
    const compPct = ((prof.idx - 1) * 100).toFixed(1);
    const compLabel = prof.idx <= 1 ? `${Math.abs(+compPct)}% below market avg` : `${compPct}% above market avg`;

    return {
      text: `${ven.vendorName} (${ven.status}): Total procurement spend is ${fmt(prof.spend)} across ${prof.orders} purchase orders (${prof.variety} unique items). Price competitiveness is ${compLabel}. Located in ${ven.address}. Contact: ${ven.contactPerson} (${ven.phone}).`,
      table: {
        head: ['Recent PO', 'Date', 'Total Amount', 'Status'],
        rows: vpos.slice(0, 5).map(p => [p.poId, p.orderDate, fmt(p.totalAmount), p.status])
      },
      chart: {
        type: 'bar',
        data: vpos.slice(0, 6).reverse().map(p => ({
          name: p.poId.replace('PO-2026-', 'PO-'),
          value: Math.round(p.totalAmount)
        }))
      },
      sources: [R, `Vendor ${ven.vendorId}`],
      followups: ['Who are our highest-spending suppliers?', 'Identify potential procurement savings']
    };
  }

  // 3. ITEM PRICE BENCHMARK / COMPARISON
  if (it && (/compar|lowest|cheapest|price|cost|rate|best vendor|who sells|how much|quote|supplier/i.test(s) || !/trend|history|historical/.test(s))) {
    if (!/trend|history|historical|over time/i.test(s) || /compar/i.test(s)) {
      const v = A.itemByVendor(it.itemId).sort((a, b) => a.avg - b.avg);
      if (v.length === 0) {
        return {
          text: `No active purchase order records found for ${it.itemName}.`,
          sources: [R],
          followups: ['Who are our highest-spending suppliers?']
        };
      }
      if (v.length === 1) {
        return {
          text: `${it.itemName}: Only ${v[0].name} supplied this item (average ${fmt(v[0].avg)} across ${v[0].n} orders); dataset has too little multi-vendor data to compare.`,
          table: {
            head: ['Vendor', 'Avg Price', 'Lowest', 'Highest', 'Orders'],
            rows: [[v[0].name, fmt(v[0].avg), fmt(v[0].min), fmt(v[0].max), v[0].n]]
          },
          sources: [R, `Item ${it.itemId}`],
          followups: [`Show price trend of ${it.itemName}`, 'Identify potential savings']
        };
      }
      const d = v[v.length - 1].avg - v[0].avg;
      const diffPct = ((d / v[0].avg) * 100).toFixed(1);
      return {
        text: `${it.itemName}: ${v[0].name} has the lowest average price (${fmt(v[0].avg)}); ${v[v.length - 1].name} is highest (${fmt(v[v.length - 1].avg)}). Difference: ${fmt(d)} (+${diffPct}%) per ${it.unitOfMeasurement}.`,
        table: {
          head: ['Vendor', 'Avg Price', 'Lowest', 'Highest', 'Orders'],
          rows: v.map(x => [x.name, fmt(x.avg), fmt(x.min), fmt(x.max), x.n])
        },
        chart: {
          type: 'bar',
          data: v.map(x => ({ name: x.name.split(' ')[0], value: Math.round(x.avg) }))
        },
        sources: [R, `Item ${it.itemId}`],
        followups: [`Show price trend of ${it.itemName}`, 'Identify potential savings']
      };
    }
  }

  // 4. ITEM PRICE TREND
  if (it && /trend|history|historical|over time|monthly price/i.test(s)) {
    const t = A.itemTrend(it.itemId);
    const v = t.map(x => x.value);
    if (v.length === 0) {
      return {
        text: `No monthly price trend data found for ${it.itemName}.`,
        sources: [R],
        followups: [`Compare prices of ${it.itemName}`]
      };
    }
    const pctChange = v.length > 1 ? (((v[v.length - 1] - v[0]) / v[0]) * 100).toFixed(1) : '0.0';
    return {
      text: `Monthly average price of ${it.itemName}: min ${fmt(Math.min(...v))}, max ${fmt(Math.max(...v))}, change ${pctChange}% from ${t[0]?.name ?? ''} to ${t[t.length - 1]?.name ?? ''}.`,
      chart: { type: 'line', data: t },
      sources: [R],
      followups: [`Compare prices of ${it.itemName}`]
    };
  }

  // 5. SAVINGS
  if (/saving|opportunit|reduce cost|discount|negotiat/i.test(s)) {
    const x = A.savings().slice(0, 6);
    const totalEst = x.reduce((a, b) => a + b.est, 0);
    return {
      text: `Estimated savings opportunity from shifting orders to the lowest vendor average across items with 2+ suppliers: ${fmt(
        totalEst
      )} across the top ${x.length} items.`,
      table: {
        head: ['Item', 'Best Vendor', 'Best Avg', 'Est. Savings'],
        rows: x.map(r => [r.item, r.best, fmt(r.bestAvg), fmt(r.est)])
      },
      sources: [R],
      followups: ['Which materials have increased in price?', 'Who are our highest-spending suppliers?']
    };
  }

  // 6. PRICE INCREASES / INFLATION
  if (/increas|rise|risen|surge|inflati|more expensive|up in price/i.test(s)) {
    const x = A.priceChanges().slice(0, 6);
    return {
      text: 'Items with the largest price rise (comparing first 2 vs last 2 months of data):',
      table: { head: ['Item', 'Change'], rows: x.map(r => [r.item, '+' + r.pct.toFixed(1) + '%']) },
      chart: {
        type: 'bar',
        data: x.map(r => ({ name: r.item.split(' ')[0], value: +r.pct.toFixed(1) }))
      },
      sources: [R],
      followups: ['Identify potential savings', 'Show our monthly spending']
    };
  }

  // 7. PURCHASE ORDERS
  if (/purchase order|po\b|recent order|latest order|pending order/i.test(s)) {
    const recent = [...pos].sort((a,b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 8);
    return {
      text: `We have ${pos.length} total purchase orders recorded. Here are the recent purchase orders:`,
      table: {
        head: ['PO #', 'Vendor', 'Date', 'Amount', 'Status'],
        rows: recent.map(p => [p.poId, A.vName(p.vendorId), p.orderDate, fmt(p.totalAmount), p.status])
      },
      sources: [R],
      followups: ['Who are our highest-spending suppliers?', 'Show our monthly procurement expenditure']
    };
  }

  // 8. ITEMS CATALOG
  if (/items|materials|products|what do we buy|catalog|categories/i.test(s)) {
    const stats = A.itemStats().sort((a,b) => b.spend - a.spend).slice(0, 8);
    const cats = A.categorySpend();
    return {
      text: `We procure ${items.length} materials across ${cats.length} categories. Here are our top materials by spend:`,
      table: {
        head: ['Item', 'Category', 'Avg Price', 'Total Spend', 'Suppliers'],
        rows: stats.map(i => [i.itemName, i.category, fmt(i.avg), fmt(i.spend), i.vendors])
      },
      chart: {
        type: 'bar',
        data: cats.map(c => ({ name: c.name.split(' ')[0], value: Math.round(c.value) }))
      },
      sources: [R],
      followups: ['Compare the prices of Steel Rod 12mm across vendors', 'Identify potential savings']
    };
  }

  // 9. VENDOR RANKINGS
  if (/vendor|supplier/i.test(s)) {
    const x = A.vendorSpend().slice(0, 10);
    return {
      text: `${x[0].name} leads overall procurement with ${fmt(x[0].value)} (${x[0].share.toFixed(1)}% of spend).`,
      table: {
        head: ['Vendor', 'Total Spend', 'Orders', 'Spend Share'],
        rows: x.map(r => [r.name, fmt(r.value), r.orders, r.share.toFixed(1) + '%'])
      },
      chart: {
        type: 'bar',
        data: x.map(r => ({ name: r.name.split(' ')[0], value: Math.round(r.value) }))
      },
      sources: [R],
      followups: ['Identify potential savings', 'Show our monthly procurement expenditure']
    };
  }

  // 10. SPEND & OVERVIEW
  if (/expenditure|spend|spending|monthly|total|budget|cost|summary|overview|kpis/i.test(s)) {
    const m = A.monthly();
    const l = m[m.length - 1],
      p = m[m.length - 2];
    const mom = p ? (((l.value - p.value) / p.value) * 100).toFixed(1) : '0';
    return {
      text: `Total procurement spend over the period is ${fmt(A.total())}. Latest month (${l.name}) was ${fmt(
        l.value
      )} (${+mom >= 0 ? '+' : ''}${mom}% vs ${p?.name ?? 'prior month'}).`,
      chart: { type: 'bar', data: m },
      sources: [R],
      followups: ['Who are our highest-spending suppliers?', 'Identify potential savings']
    };
  }

  return {
    text: `I could not locate specific records matching "${q}". You can ask about any item (e.g., "Steel Rod", "Cement", "Copper Wire"), vendor spending, monthly expenditure, or savings opportunities.`,
    sources: [R],
    followups: [
      'Compare the prices of Steel Rod 12mm across vendors',
      'Show our monthly procurement expenditure',
      'Identify potential procurement savings',
      'Who are our highest-spending suppliers?'
    ]
  };
}
