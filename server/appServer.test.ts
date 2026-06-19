// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  createNarrativeWithOpenRouter,
  parseActivityWithOpenRouter,
  validateActivityPayload,
  validateHistoryPayload,
} from './openRouterProxy.mjs';
import { isAllowedOrigin, setSecurityHeaders } from './appServer.mjs';

describe('secure AI proxy', () => {
  it('keeps the provider key server-side and returns only validated data', async () => {
    const providerFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: '{"activity":"drove","category":"transport","quantity":10,"unit":"km","confidence":0.95}',
          },
        }],
      }),
    });

    const payload = await parseActivityWithOpenRouter(
      { apiKey: 'server-secret-key', fetchImpl: providerFetch },
      'I drove 10km',
    );

    expect(payload).toEqual({
      activity: 'drove',
      category: 'transport',
      quantity: 10,
      unit: 'km',
      confidence: 0.95,
    });
    const providerRequest = providerFetch.mock.calls[0]?.[1] as RequestInit;
    expect(providerRequest.headers).toMatchObject({
      Authorization: 'Bearer server-secret-key',
    });
    expect(JSON.stringify(payload)).not.toContain('server-secret-key');
  });

  it('fails safely when the server credential is missing', async () => {
    await expect(parseActivityWithOpenRouter(
      { apiKey: '', fetchImpl: vi.fn() },
      'I drove 10km',
    )).rejects.toMatchObject({
      status: 503,
      message: 'AI service is not configured',
    });
  });

  it('validates activity and bounded narrative payloads', async () => {
    expect(validateActivityPayload({ text: ' drive ' })).toBe('drive');
    expect(() => validateActivityPayload({ text: 'x'.repeat(501) })).toThrow('too long');

    const history = Array.from({ length: 11 }, () => ({
      activity: 'drive',
      category: 'transport',
      quantity: 1,
      unit: 'km',
      co2_kg: 0.19,
    }));
    expect(() => validateHistoryPayload({ history })).toThrow('limited to 10');

    const providerFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'If you had cycled, you would have saved 2 kg' } }],
      }),
    });
    await expect(createNarrativeWithOpenRouter(
      { apiKey: 'secret', fetchImpl: providerFetch },
      history.slice(0, 10),
    )).resolves.toContain('cycled');
  });

  it('rejects foreign browser origins and applies security headers', () => {
    expect(isAllowedOrigin(
      { headers: { origin: 'https://attacker.example', host: 'ecotrack.example' } },
      new Set(),
    )).toBe(false);
    expect(isAllowedOrigin(
      { headers: { origin: 'https://ecotrack.example', host: 'ecotrack.example', 'x-forwarded-proto': 'https' } },
      new Set(),
    )).toBe(true);

    const headers = new Map<string, string>();
    setSecurityHeaders({
      setHeader: (name: string, value: string) => headers.set(name, value),
    });
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Permissions-Policy')).toContain('camera=()');
  });
});
