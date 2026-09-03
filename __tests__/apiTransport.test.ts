import {
  createKormicApiFetch,
  normalizeKormicApiUrl,
} from '../src/services/apiTransport';

const KORMIC_API_BASE_URL = 'https://backend.kormic.ai/api';

class TestHeaders {
  private readonly values = new Map<string, string>();

  constructor(init?: HeadersInit) {
    if (!init) {
      return;
    }
    if (Array.isArray(init)) {
      init.forEach(([key, value]) => this.values.set(key.toLowerCase(), value));
      return;
    }
    if (typeof Headers !== 'undefined' && init instanceof Headers) {
      init.forEach((value, key) => this.values.set(key.toLowerCase(), value));
      return;
    }
    Object.entries(init).forEach(([key, value]) => this.values.set(key.toLowerCase(), String(value)));
  }

  get(name: string) {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

class TestResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: TestHeaders;

  constructor(
    private readonly bodyText: string,
    init: ResponseInit = {},
  ) {
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new TestHeaders(init.headers);
  }

  async text() {
    return this.bodyText;
  }

  async json() {
    return JSON.parse(this.bodyText) as unknown;
  }
}

const nativeResponse = globalThis.Response;

beforeAll(() => {
  if (typeof globalThis.Response === 'undefined') {
    Object.defineProperty(globalThis, 'Response', {
      configurable: true,
      writable: true,
      value: TestResponse as unknown as typeof Response,
    });
  }
});

afterAll(() => {
  if (nativeResponse) {
    Object.defineProperty(globalThis, 'Response', {
      configurable: true,
      writable: true,
      value: nativeResponse,
    });
  } else {
    Reflect.deleteProperty(globalThis, 'Response');
  }
});

describe('Kormic API transport', () => {
  it('adds the canonical api prefix when an environment base omits it', () => {
    expect(
      normalizeKormicApiUrl('https://backend.kormic.ai/claim/start/', KORMIC_API_BASE_URL),
    ).toBe('https://backend.kormic.ai/api/claim/start/');
    expect(
      normalizeKormicApiUrl('http://127.0.0.1:8030/profile/', 'http://127.0.0.1:8030'),
    ).toBe('http://127.0.0.1:8030/api/profile/');
  });

  it('keeps canonical URLs stable and removes a duplicated api segment', () => {
    expect(
      normalizeKormicApiUrl(
        'https://backend.kormic.ai/api/claim/verify/',
        KORMIC_API_BASE_URL,
      ),
    ).toBe('https://backend.kormic.ai/api/claim/verify/');
    expect(
      normalizeKormicApiUrl(
        'https://backend.kormic.ai/api/api/claim/confirm/',
        KORMIC_API_BASE_URL,
      ),
    ).toBe('https://backend.kormic.ai/api/claim/confirm/');
  });

  it('preserves query strings and fragments while normalizing relative paths', () => {
    expect(
      normalizeKormicApiUrl('/claim/start/?source=invite#token', KORMIC_API_BASE_URL),
    ).toBe('/api/claim/start/?source=invite#token');
  });

  it('does not rewrite an API-looking path on a third-party origin', () => {
    const thirdPartyUrl = 'https://github.com/profile/example';
    expect(normalizeKormicApiUrl(thirdPartyUrl, KORMIC_API_BASE_URL)).toBe(thirdPartyUrl);
  });

  it('passes JSON API responses through unchanged', async () => {
    const originalResponse = new Response(JSON.stringify({ masked_email: 'm•••••@example.edu' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchImplementation = jest.fn(async () => originalResponse);
    const guardedFetch = createKormicApiFetch(fetchImplementation, KORMIC_API_BASE_URL);

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
    const guardedFetch = createKormicApiFetch(fetchImplementation, KORMIC_API_BASE_URL);

    const response = await guardedFetch('https://backend.kormic.ai/api/claim/start/', {
      method: 'POST',
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(payload.error).toContain('non-JSON response');
    expect(payload.error).not.toContain('<html>');
  });

  it('treats an HTML 200 page from the Kormic origin as a gateway/configuration failure', async () => {
    const fetchImplementation = jest.fn(async () =>
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const guardedFetch = createKormicApiFetch(fetchImplementation, KORMIC_API_BASE_URL);

    const response = await guardedFetch('https://backend.kormic.ai/claim/start/');
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(payload.error).toContain('API address returned a web page');
    expect(payload.error).toContain('/api/claim/start/');
  });

  it('leaves third-party requests and HTML responses untouched', async () => {
    const originalResponse = new Response('<html><body>GitHub profile</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    const fetchImplementation = jest.fn(async () => originalResponse);
    const guardedFetch = createKormicApiFetch(fetchImplementation, KORMIC_API_BASE_URL);
    const thirdPartyUrl = 'https://github.com/profile/example';

    const response = await guardedFetch(thirdPartyUrl);

    expect(fetchImplementation).toHaveBeenCalledWith(thirdPartyUrl, undefined);
    expect(response).toBe(originalResponse);
  });
});
