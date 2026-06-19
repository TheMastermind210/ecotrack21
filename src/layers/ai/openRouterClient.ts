import { ACTIVITY_CATEGORIES, type ActivityCategory, type HistoryEntry } from '../../types';

export interface NLPParsedResult {
  activity: string;
  category: ActivityCategory;
  quantity: number;
  unit: string;
  confidence: number;
  clarification_needed?: boolean;
}

export function validateParsedResult(raw: unknown): NLPParsedResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI returned a non-object result');
  }

  const result = raw as Record<string, unknown>;
  if (!ACTIVITY_CATEGORIES.includes(result.category as ActivityCategory)) {
    throw new Error(`Invalid activity category: ${String(result.category)}`);
  }
  if (
    typeof result.quantity !== 'number' ||
    !Number.isFinite(result.quantity) ||
    result.quantity <= 0
  ) {
    throw new Error(`Invalid activity quantity: ${String(result.quantity)}`);
  }
  if (typeof result.activity !== 'string' || !result.activity.trim()) {
    throw new Error('Missing activity name');
  }
  if (typeof result.unit !== 'string' || !result.unit.trim()) {
    throw new Error('Missing activity unit');
  }
  if (
    typeof result.confidence !== 'number' ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new Error(`Invalid confidence score: ${String(result.confidence)}`);
  }
  if (
    result.clarification_needed !== undefined &&
    typeof result.clarification_needed !== 'boolean'
  ) {
    throw new Error('Invalid clarification flag');
  }

  return {
    activity: result.activity.trim(),
    category: result.category as ActivityCategory,
    quantity: result.quantity,
    unit: result.unit.trim(),
    confidence: result.confidence,
    ...(result.clarification_needed === undefined
      ? {}
      : { clarification_needed: result.clarification_needed }),
  };
}

async function requestApi<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = payload && typeof payload === 'object'
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(
      typeof message === 'string'
        ? message
        : `AI service request failed (${response.status})`,
    );
  }

  return response.json() as Promise<T>;
}

export async function parseActivityRequest(
  text: string,
  signal?: AbortSignal,
): Promise<NLPParsedResult> {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error('Activity text is required');
  if (normalizedText.length > 500) throw new Error('Activity text is too long');

  const payload = await requestApi<unknown>(
    '/api/parse-activity',
    { text: normalizedText },
    signal,
  );
  return validateParsedResult(payload);
}

export async function getNarrativeRequest(
  history: HistoryEntry[],
  signal?: AbortSignal,
): Promise<string> {
  const payload = await requestApi<unknown>(
    '/api/attribution',
    { history: history.slice(0, 10) },
    signal,
  );
  const narrative = payload && typeof payload === 'object'
    ? (payload as { narrative?: unknown }).narrative
    : null;
  if (typeof narrative !== 'string' || !narrative.trim()) {
    throw new Error('AI service returned an invalid narrative');
  }
  return narrative.trim();
}
