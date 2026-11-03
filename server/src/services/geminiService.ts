import https from 'https';
import { AiAnswer } from '../types/index.js';
import { store } from '../db/store.js';

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42SXZwemN1eTVmSXc3ZXRZTWU4UDQ0R2lRT3dFUGFqUmtUS09vQ3Ntc0h6MVE=';
export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  Buffer.from(DEFAULT_KEY_B64, 'base64').toString('ascii');

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview'
];

interface RawGeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function callGeminiHttp(model: string, payloadString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadString)
        },
        timeout: 15000
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(body) as RawGeminiResponse;
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                resolve(text);
              } else {
                reject(new Error('Empty text part in Gemini response'));
              }
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 150)}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Gemini request timeout on ${model}`));
    });

    req.on('error', reject);
    req.write(payloadString);
    req.end();
  });
}

function buildDatabaseContext(query: string, currentStore: typeof store): string {
  const kpis = currentStore.getKPIs();
  const topVendors = currentStore.getVendorSpend().slice(0, 8);
  const itemStats = currentStore.getItemStats();
  const savings = currentStore.getSavings().slice(0, 8);
  const recentPOs = [...currentStore.pos]
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .slice(0, 8);

  const qLower = query.toLowerCase();

  // Check if query is about a specific item
  const matchedItem = currentStore.findItemByQuery(query);
  let itemDetail = '';
  if (matchedItem) {
    const vendorPrices = currentStore.getItemByVendor(matchedItem.itemId);
    const trend = currentStore.getItemTrend(matchedItem.itemId);
    itemDetail = `\nSPECIFIC ITEM IN FOCUS:
Item: ${matchedItem.itemName} (${matchedItem.category}) [ID: ${matchedItem.itemId}]
Vendor Prices: ${vendorPrices.map((v: { name: string; avg: number; min: number; max: number; n: number }) => `${v.name}: avg Rs ${Math.round(v.avg)} (min Rs ${v.min}, max Rs ${v.max}, ${v.n} orders)`).join(' | ')}
Monthly Trend: ${trend.map((t: { name: string; value: number }) => `${t.name}: Rs ${t.value}`).join(', ')}`;
  }

  // Check if query is about a specific vendor
  const matchedVendor = currentStore.findVendorByQuery(query);
  let vendorDetail = '';
  if (matchedVendor) {
    const prof = currentStore.getVendorProfile(matchedVendor.vendorId);
    const vPOs = currentStore.pos
      .filter(p => p.vendorId === matchedVendor.vendorId)
      .slice(0, 5);
    vendorDetail = `\nSPECIFIC VENDOR IN FOCUS:
Vendor: ${matchedVendor.vendorName} [ID: ${matchedVendor.vendorId}]
Status: ${matchedVendor.status} | Address: ${matchedVendor.address} | Contact: ${matchedVendor.contactPerson} (${matchedVendor.phone})
Spend: Rs ${prof.spend.toLocaleString()} | Orders: ${prof.orders} | Unique Items: ${prof.variety}
Price Index: ${prof.idx.toFixed(2)}x market average
Recent Orders: ${vPOs.map(p => `${p.poId} (${p.orderDate}): Rs ${p.totalAmount.toLocaleString()} [${p.status}]`).join(' | ')}`;
  }

  return `LIVE PROCUREMENT SYSTEM CONTEXT:
Summary:
- Total Procurement Spend: Rs ${kpis.spend.toLocaleString()}
- Total Purchase Orders: ${kpis.orders}
- Active Suppliers: ${kpis.vendors}
- Total Addressable Cost Savings: Rs ${kpis.savings.toLocaleString()}

Top Suppliers by Expenditure:
${topVendors.map((v, i) => `${i + 1}. ${v.name}: Rs ${v.value.toLocaleString()} (${v.share.toFixed(1)}% share, ${v.orders} POs)`).join('\n')}

Top Strategic Items by Spend:
${itemStats.slice(0, 8).map(i => `- ${i.itemName} (${i.category}): Total spend Rs ${i.spend.toLocaleString()} (qty: ${i.qty.toLocaleString()}), avg unit price Rs ${Math.round(i.avg)}, price range Rs ${i.min} - Rs ${i.max} across ${i.vendors} suppliers`).join('\n')}

Top Cost Savings Opportunities:
${savings.map(s => `- ${s.item}: Potential savings of Rs ${s.est.toLocaleString()} by shifting volume to best-rate supplier ${s.best} (avg Rs ${Math.round(s.bestAvg)})`).join('\n')}

Recent Purchase Orders:
${recentPOs.map(p => `- ${p.poId}: ${currentStore.getVendorName(p.vendorId)} | ${p.orderDate} | Rs ${p.totalAmount.toLocaleString()} | Status: ${p.status}`).join('\n')}
${itemDetail}
${vendorDetail}`;
}

export async function askGemini(
  question: string,
  history: string[] = [],
  currentStore: typeof store
): Promise<AiAnswer> {
  const context = buildDatabaseContext(question, currentStore);

  const systemInstruction = `You are ProcureIQ AI, the executive procurement intelligence copilot for enterprise supply chain leadership.
Your task is to answer the user's procurement inquiries with rigorous, data-driven analysis using the provided LIVE PROCUREMENT SYSTEM CONTEXT.

Always return a single, valid JSON object matching this TypeScript interface:
{
  "text": "Executive-level, clear and detailed natural language answer with facts, figures, and strategic recommendations.",
  "table": {
    "head": ["Column 1", "Column 2", ...],
    "rows": [["val 1", "val 2", ...], ...]
  }, // Include whenever comparing multiple suppliers, items, orders, or price tiers
  "chart": {
    "type": "bar" | "line",
    "data": [{ "name": "Label", "value": 12345 }]
  }, // Include whenever numerical comparison (bar) or timeline / price trends (line) are valuable
  "followups": ["Question 1", "Question 2", "Question 3"], // 2-3 logical next questions the procurement manager should ask
  "sources": ["Source 1", "Source 2"] // Citations of dataset tables or PO records
}

Guidelines:
- Currency: Pakistani Rupees (PKR / Rs.). Format monetary figures nicely in text and tables (e.g. Rs. 1,250,000). Keep chart values as raw numbers.
- If the question is a greeting or general capability question, introduce your capabilities and guide the user on questions they can ask.
- If asked about savings, calculate the exact potential and suggest concrete negotiation tactics.
- If asked about suppliers, highlight market share, reliability, and price competitiveness.
- If asked about items, benchmark suppliers and flag price spread variance.
- Output ONLY valid JSON without markdown wrapping.`;

  const conversation = history.length > 0
    ? `Recent Conversation Context:\n${history.slice(-4).map((h, i) => `User Q${i + 1}: ${h}`).join('\n')}\n\n`
    : '';

  const promptText = `${systemInstruction}\n\n${context}\n\n${conversation}USER QUESTION: ${question}`;

  const payload = JSON.stringify({
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
  });

  // Model failover sequence
  for (const model of CANDIDATE_MODELS) {
    try {
      const responseText = await callGeminiHttp(model, payload);
      // Clean potential markdown blocks
      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson) as AiAnswer;

      if (parsed && typeof parsed.text === 'string') {
        return {
          text: parsed.text,
          table: parsed.table,
          chart: parsed.chart,
          followups: parsed.followups || [
            'Who are our highest-spending suppliers?',
            'Identify potential procurement savings',
            'Compare the prices of Steel Rod 12mm across vendors'
          ],
          sources: parsed.sources || ['ProcureIQ ERP Database', `Gemini AI (${model})`]
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini API] Model ${model} failed, attempting next fallback: ${msg}`);
    }
  }

  // Graceful fallback to built-in store heuristic response if all API models fail
  console.warn('[Gemini API] All Gemini models exhausted or unreachable. Using database fallback answer.');
  return currentStore.answerChat(question, history);
}
