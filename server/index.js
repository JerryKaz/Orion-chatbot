import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3001;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const API_KEY = process.env.GEMINI_API_KEY;

const MAX_HISTORY = 30; // messages sent to the model per request
const MAX_MESSAGE_CHARS = 4000;
const BOT_NAME = 'Ama';

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

// Protects your free-tier quota from a single user hammering the endpoint.
const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a minute and try again.' },
});

function systemPrompt(timeZone) {
  let now;
  try {
    now = new Date().toLocaleString('en-GB', { timeZone, dateStyle: 'full', timeStyle: 'short' });
  } catch {
    now = new Date().toUTCString();
    timeZone = 'UTC';
  }
  return [
    `You are ${BOT_NAME}, a warm, concise and helpful assistant inside a chat app.`,
    `The user's current date and time is ${now} (${timeZone}).`,
    'Keep answers short and scannable unless the user asks for detail.',
    'Use Markdown for lists, tables and code (always label code blocks with the language).',
    "If you don't know something or it needs live data you don't have, say so plainly instead of guessing.",
  ].join('\n');
}

/** Validates and normalises the client payload. Returns { error } or { contents, timeZone }. */
function parseBody(body) {
  const { messages, timeZone } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: '`messages` must be a non-empty array.' };
  }
  const recent = messages.slice(-MAX_HISTORY);
  const contents = [];
  for (const m of recent) {
    if (!m || typeof m.text !== 'string' || !['user', 'model'].includes(m.role)) {
      return { error: 'Each message needs a `role` of "user" or "model" and a `text` string.' };
    }
    const text = m.text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (text) contents.push({ role: m.role, parts: [{ text }] });
  }
  // Gemini expects the conversation to start with the user and end with the user.
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length || contents.at(-1).role !== 'user') {
    return { error: 'The last message must be from the user.' };
  }
  return { contents, timeZone: typeof timeZone === 'string' ? timeZone : 'UTC' };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: Boolean(ai), model: ai ? MODEL : null });
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'AI is not configured. Add GEMINI_API_KEY to your .env file.' });
  }
  const parsed = parseBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  // Stop paying for tokens if the user hits "Stop" or closes the tab.
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  // Server-Sent Events: one `data:` line per chunk.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: parsed.contents,
      config: {
        systemInstruction: systemPrompt(parsed.timeZone),
        abortSignal: controller.signal,
      },
    });
    for await (const chunk of stream) {
      if (chunk.text) send({ text: chunk.text });
    }
    send({ done: true });
  } catch (err) {
    if (controller.signal.aborted) return; // client went away; nothing to report
    console.error('[chat] Gemini error:', err?.status ?? '', err?.message ?? err);
    const status = err?.status;
    const message =
      status === 429 ? 'The AI is busy right now (rate limit reached). Please try again in a moment.'
      : status === 401 || status === 403 ? 'The AI key is invalid or not allowed. Check GEMINI_API_KEY.'
      : status === 404 ? `The model "${MODEL}" was not found. Check GEMINI_MODEL in your .env file.`
      : 'Something went wrong while generating a reply. Please try again.';
    send({ error: message });
  } finally {
    res.end();
  }
});

// After `npm run build`, this server also serves the React app (one deploy, no CORS).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`API server on http://localhost:${PORT}`);
  console.log(ai ? `AI enabled (model: ${MODEL})` : 'AI disabled: set GEMINI_API_KEY in .env — the app will use offline skills.');
});
