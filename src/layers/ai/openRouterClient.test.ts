import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getNarrativeRequest,
  parseActivityRequest,
  validateParsedResult,
} from './openRouterClient';

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(payload),
});

describe('same-origin AI client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the proxy without sending an API key or authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      activity: 'drove',
      category: 'transport',
      quantity: 40,
      unit: 'km',
      confidence: 0.95,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseActivityRequest(' I drove 40km ')).resolves.toEqual({
      activity: 'drove',
      category: 'transport',
      quantity: 40,
      unit: 'km',
      confidence: 0.95,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/parse-activity',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'I drove 40km' }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).not.toHaveProperty('Authorization');
  });

  it.each([
    { activity: 'drive', category: 'invalid', quantity: 1, unit: 'km', confidence: 0.9 },
    { activity: 'drive', category: 'transport', quantity: 0, unit: 'km', confidence: 0.9 },
    { activity: 'drive', category: 'transport', quantity: 1, unit: '', confidence: 0.9 },
    { activity: 'drive', category: 'transport', quantity: 1, unit: 'km', confidence: 2 },
    { activity: 'drive', category: 'transport', quantity: 1, unit: 'km', confidence: 0.9, clarification_needed: 'yes' },
  ])('rejects invalid proxy schema values', (payload) => {
    expect(() => validateParsedResult(payload)).toThrow();
  });

  it('rejects empty and oversized input before making a network request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseActivityRequest('')).rejects.toThrow('required');
    await expect(parseActivityRequest('x'.repeat(501))).rejects.toThrow('too long');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses safe proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: 'AI service is not configured' }, false, 503),
      ),
    );

    await expect(parseActivityRequest('drive')).rejects.toThrow(
      'AI service is not configured',
    );
  });

  it('limits narrative history sent to the proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ narrative: 'If you had cycled, you would have saved 2 kg' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const history = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      date: '2026-06-20T00:00:00.000Z',
      activity: `activity-${index}`,
      category: 'transport' as const,
      quantity: 1,
      unit: 'km',
      co2_kg: 0.19,
    }));

    await expect(getNarrativeRequest(history)).resolves.toContain('cycled');
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as { history: typeof history };
    expect(body.history).toHaveLength(10);
    expect(body.history[9]?.activity).toBe('activity-9');
  });
});
