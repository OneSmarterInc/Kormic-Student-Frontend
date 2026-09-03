import {
  createKormicApiFetch,
  normalizeKormicApiUrl,
} from '../src/services/apiTransport';

describe('Kormic API transport', () => {
  it('adds the canonical api prefix when an environment base omits it', () => {
    expect(normalizeKormicApiUrl('https://backend.kormic.ai/claim/start/')).toBe(
      'https://backend.kormic.ai/api/claim/start/',
    );
    expect(normalizeKormicApiUrl('http://127.0.0.1:8030/profile/')).toBe(
      'http://127.0.0.1:8030/api/profile/',
    );
  });

  it('keeps canonical URLs stable and removes a duplicated api segment', () => {
    expect(normalizeKormicApiUrl('https://backend.kormic.ai/api/claim/verify/')).toBe(
      'https://backend.kormic.ai/api/claim/verify/',
    );
    expect(normalizeKormicApiUrl('https://backend.kormic.ai/api/api/claim/confirm/')).toBe(
      'https://backend.kormic.ai/api/claim/confirm/',
    );
  });

  it('preserves query strings and fragments while normalizing relative paths', () => {
    expect(normalizeKormicApiUrl('/claim/start/?source=invite#token')).toBe(
      '/api/claim/start/?source=invite#token',
    );
  });

  it('passes JSON API responses through unchanged', async () => {
    const originalResponse = new Response(JSON.stringify({ masked_email: 'm•••••@example.edu' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchImplementation = jest.fn(async () => originalResponse);
    const guardedFetch = createKormicApiFetch(fetchImplementation);

    const response = await guardedFetch('https://backend.kormic.ai/claim/start/', {
      method: 'POST',
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://backend.kormic.ai/api/claim/start/',
      { method: 'POST' },
    );
    expect(response).toBe(originalResponse);
  });

  it('converts an HTML API error into the JSON envelope expected by the app', async () => {
    const fetchImplementation = jest.fn(async () =>
      new Response('<html><body>Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
    const guardedFetch = createKormicApiFetch(fetchImplementation);

    const response = await guardedFetch('https://backend.kormic.ai/api/claim/start/', {
      method: 'POST',
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(payload.error).toContain('non-JSON response');
    expect(payload.error).not.toContain('<html>');
  });

  it('treats an HTML 200 page as a gateway/configuration failure', async () => {
    const fetchImplementation = jest.fn(async () =>
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const guardedFetch = createKormicApiFetch(fetchImplementation);

    const response = await guardedFetch('https://backend.kormic.ai/claim/start/');
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(payload.error).toContain('API address returned a web page');
    expect(payload.error).toContain('/api/claim/start/');
  });
});
