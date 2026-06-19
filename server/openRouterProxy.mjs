const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';
const CATEGORIES = new Set(['transport', 'food', 'energy', 'goods']);
const MAX_BODY_BYTES = 16_384;
const MAX_ACTIVITY_LENGTH = 500;
const MAX_HISTORY_ENTRIES = 10;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body is too large');
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

export function validateActivityPayload(value) {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'Activity payload is required');
  }

  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text) throw new HttpError(400, 'Activity text is required');
  if (text.length > MAX_ACTIVITY_LENGTH) {
    throw new HttpError(400, 'Activity text is too long');
  }
  return text;
}

function isHistoryEntry(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.activity === 'string' &&
    value.activity.trim().length > 0 &&
    CATEGORIES.has(value.category) &&
    typeof value.quantity === 'number' &&
    Number.isFinite(value.quantity) &&
    value.quantity >= 0 &&
    typeof value.unit === 'string' &&
    typeof value.co2_kg === 'number' &&
    Number.isFinite(value.co2_kg) &&
    value.co2_kg >= 0
  );
}

export function validateHistoryPayload(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.history)) {
    throw new HttpError(400, 'History payload is required');
  }
  if (value.history.length === 0) {
    throw new HttpError(400, 'History must contain at least one entry');
  }
  if (value.history.length > MAX_HISTORY_ENTRIES) {
    throw new HttpError(400, `History is limited to ${MAX_HISTORY_ENTRIES} entries`);
  }
  if (!value.history.every(isHistoryEntry)) {
    throw new HttpError(400, 'History contains an invalid entry');
  }

  return value.history.map(entry => ({
    activity: entry.activity.trim(),
    category: entry.category,
    quantity: entry.quantity,
    unit: entry.unit,
    co2_kg: entry.co2_kg,
  }));
}

function getProviderContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new HttpError(502, 'AI provider returned an invalid response');
  }
  return content.trim();
}

function validateParsedActivity(value) {
  if (!value || typeof value !== 'object') {
    throw new HttpError(502, 'AI provider returned an invalid activity');
  }
  if (!CATEGORIES.has(value.category)) {
    throw new HttpError(502, 'AI provider returned an invalid category');
  }
  if (
    typeof value.quantity !== 'number' ||
    !Number.isFinite(value.quantity) ||
    value.quantity <= 0
  ) {
    throw new HttpError(502, 'AI provider returned an invalid quantity');
  }
  if (typeof value.activity !== 'string' || !value.activity.trim()) {
    throw new HttpError(502, 'AI provider returned an invalid activity name');
  }
  if (typeof value.unit !== 'string' || !value.unit.trim()) {
    throw new HttpError(502, 'AI provider returned an invalid unit');
  }
  if (
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new HttpError(502, 'AI provider returned an invalid confidence score');
  }

  return {
    activity: value.activity.trim(),
    category: value.category,
    quantity: value.quantity,
    unit: value.unit.trim(),
    confidence: value.confidence,
    ...(typeof value.clarification_needed === 'boolean'
      ? { clarification_needed: value.clarification_needed }
      : {}),
  };
}

async function callOpenRouter({
  apiKey,
  fetchImpl,
  messages,
  model = DEFAULT_MODEL,
  timeoutMs = 15_000,
}) {
  if (!apiKey) throw new HttpError(503, 'AI service is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ecotrack.local',
        'X-Title': 'EcoTrack',
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(502, `AI provider request failed (${response.status})`);
    }
    return response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new HttpError(504, 'AI provider request timed out');
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'AI provider request failed');
  } finally {
    clearTimeout(timeout);
  }
}

export async function parseActivityWithOpenRouter(options, text) {
  const payload = await callOpenRouter({
    ...options,
    messages: [
      {
        role: 'system',
        content:
          'Strict NLP parser. Output raw JSON only. Schema: {"activity":"string","category":"transport"|"food"|"energy"|"goods","quantity":number,"unit":"string","confidence":number}. If confidence is below 0.7, include "clarification_needed":true.',
      },
      { role: 'user', content: text },
    ],
  });

  const content = getProviderContent(payload)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return validateParsedActivity(JSON.parse(content));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'AI provider returned malformed JSON');
  }
}

export async function createNarrativeWithOpenRouter(options, history) {
  const payload = await callOpenRouter({
    ...options,
    messages: [
      {
        role: 'system',
        content:
          'Identify the top emission source and output exactly one counterfactual insight: "If you had [alternative], you would have saved [X] kg".',
      },
      {
        role: 'user',
        content: `History data: ${JSON.stringify(history)}`,
      },
    ],
  });

  return getProviderContent(payload).slice(0, 500);
}
