import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const MAX_INPUT_CHARS = 400;
export const MAX_REQUESTS_PER_WINDOW = 5;
export const RATE_LIMIT_WINDOW_MS = 10_000;
const MAX_HISTORY_MESSAGES = 16;

const SYSTEM_INSTRUCTION = `You are WaveAI, an intelligent assistant built into StockWave —
an inventory and operations management system. You ONLY answer questions related to:
inventory management, stock levels, restock suggestions, product tracking,
warehouse operations, sales trends, supply chain, and POS operations.
If the user asks about anything outside of these topics, politely decline and remind
them you are an inventory/ops assistant only. Never answer off-topic questions.
Keep responses concise and practical.`;

// ── Model fallback chain (ordered by RPD quota, highest last as safety net) ──
// gemini-3.1-flash-lite  → 500 RPD, 15 RPM  (best free quota)
// gemini-2.5-flash       → 20 RPD,  5 RPM
// gemini-3-flash         → 20 RPD,  5 RPM
// gemini-2.5-flash-lite  → 20 RPD, 10 RPM
// gemma-3-27b            → 14.4K RPD, 30 RPM (highest RPD, good fallback)
// gemma-3-12b            → 14.4K RPD, 30 RPM
// gemma-3-4b             → 14.4K RPD, 30 RPM (last resort)
const MODELS = [
  "gemini-3.1-flash-lite",   // 500 RPD — best daily quota for chat
  "gemini-2.5-flash",        // 20 RPD
  "gemini-3-flash",          // 20 RPD
  "gemini-2.5-flash-lite",   // 20 RPD
  "gemma-3-27b-it",          // 14,400 RPD — massive free quota
  "gemma-3-12b-it",          // 14,400 RPD
  "gemma-3-4b-it",           // 14,400 RPD — last resort
];

// ── Inventory keyword filter (client-side guard) ──────────────────
const INVENTORY_KEYWORDS = [
  "stock", "inventory", "product", "products", "item", "items", "goods",
  "merchandise", "catalog", "listing", "listings", "sku", "barcode",
  "restock", "reorder", "replenish", "add", "remove", "update", "check",
  "list", "show", "what do i have", "what are my", "what is my",
  "how many", "how much", "tell me", "give me",
  "low stock", "out of stock", "available", "quantity", "units", "count",
  "level", "alert", "running low", "remaining",
  "sales", "trend", "report", "movement", "inbound", "outbound",
  "warehouse", "supply", "shipment", "order", "category", "categories",
  "dock", "pick", "track", "pos", "checkout", "purchase", "receipt",
  "transaction", "price", "cost", "value", "worth",
  "supplier", "vendor", "delivery", "expired", "damage", "loss",
];

export function isInventoryRelated(text) {
  const lower = text.toLowerCase();
  return INVENTORY_KEYWORDS.some((kw) => lower.includes(kw));
}

let history = [];
let requestTimestamps = [];

function normalizeInput(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRateLimited() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) return true;
  requestTimestamps.push(now);
  return false;
}

function looksLikeSqlAttack(text) {
  const lower = text.toLowerCase();
  const isDefensiveIntent = /(prevent|secure|sanitize|validate|avoid|protect|mitigate)/.test(lower);

  // Guard obvious SQLi payload patterns while allowing defensive/security questions.
  const suspicious = [
    /\bunion\s+select\b/i,
    /\bor\s+1\s*=\s*1\b/i,
    /\b(drop|truncate|alter)\s+table\b/i,
    /\binformation_schema\b/i,
    /\bexec\s*\(/i,
    /\bxp_cmdshell\b/i,
    /--|\/\*|\*\//,
    /;\s*(drop|delete|update|insert|select)\b/i,
    /\bsleep\s*\(/i,
  ].some((rx) => rx.test(lower));

  return suspicious && !isDefensiveIntent;
}

export function resetChat() {
  history = [];
  requestTimestamps = [];
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export async function askWaveAI(userMessage) {
  const cleanedMessage = normalizeInput(userMessage);

  if (!cleanedMessage) {
    return "Please enter a question so I can help.";
  }

  if (cleanedMessage.length > MAX_INPUT_CHARS) {
    return `⚠️ Please keep your message under ${MAX_INPUT_CHARS} characters.`;
  }

  if (isRateLimited()) {
    return "⏱️ Too many requests too quickly. Please wait a few seconds and try again.";
  }

  if (looksLikeSqlAttack(cleanedMessage)) {
    return "⚠️ Potentially malicious SQL input detected. Please ask a safe inventory or operations question.";
  }

  if (!isInventoryRelated(cleanedMessage)) {
    return "⚠️ I can only help with inventory and operations topics — things like stock levels, restocking, product tracking, sales trends, and warehouse ops. Please ask something related to those areas!";
  }

  history.push({ role: "user", parts: [{ text: cleanedMessage }] });
  if (history.length > MAX_HISTORY_MESSAGES) {
    history = history.slice(-MAX_HISTORY_MESSAGES);
  }

  for (let m = 0; m < MODELS.length; m++) {
    const model = MODELS[m];
    try {
      console.log(`WaveAI: trying model "${model}"...`);
      const response = await ai.models.generateContent({
        model,
        contents: history,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });

      const reply = response.text;
      history.push({ role: "model", parts: [{ text: reply }] });
      if (history.length > MAX_HISTORY_MESSAGES) {
        history = history.slice(-MAX_HISTORY_MESSAGES);
      }
      console.log(`WaveAI: success with model "${model}"`);
      return reply;

    } catch (err) {
      const status = err?.status || 0;
      const msg = err?.message || "";
      const shouldFallback =
        msg.includes("429") || status === 429 ||
        msg.includes("503") || status === 503 ||
        msg.includes("404") || status === 404;

      console.warn(`WaveAI: "${model}" failed — ${msg.slice(0, 120)}`);

      if (shouldFallback && m < MODELS.length - 1) {
        await sleep(800);
        continue;
      }

      // All models exhausted
      history.pop();
      return "⏳ All AI models are currently at capacity. Please wait a moment and try again.";
    }
  }
}