type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type FetchImplementation = (input: FetchInput, init?: FetchInit) => Promise<Response>;

const API_ROUTE_PREFIXES = [
  '/auth/',
  '/claim/',
  '/profile/',
  '/chat/',
  '/verification/',
  '/university/',
  '/university-admin/',
  '/notifications/',
  '/superuser/',
  '/queries/',
  '/assessments/',
  '/roadmap/',
  '/health/',
  '/institute-lists/',
] as const;

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
}

function normalizeApiPath(pathname: string) {
  let path = pathname.replace(/\/{2,}/g, '/');

  // Accept both documented environment conventions:
  //   https://backend.example.com
  //   https://backend.example.com/api
  // and protect against a duplicated /api/api suffix.
  while (path.startsWith('/api/api/')) {
    path = path.slice(4);
  }

  if (path.startsWith('/api/')) {
    return path;
  }

  if (API_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return `/api${path}`;
  }

  return path;
}

/**
 * Normalize a Kormic request URL so a base URL with or without `/api`
 * reaches the canonical Django API. This specifically protects local and
 * older builds that otherwise POST to `/claim/start/` and receive an HTML
 * 404 page from the web server.
 */
export function normalizeKormicApiUrl(value: string) {
  if (!value) {
    return value;
  }

  if (!isAbsoluteUrl(value)) {
    const [pathAndQuery, hash = ''] = value.split('#', 2);
    const [pathname, query = ''] = (pathAndQuery ?? '').split('?', 2);
    const normalizedPath = normalizeApiPath(pathname || '/');
    return `${normalizedPath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  }

  try {
    const url = new URL(value);
    url.pathname = normalizeApiPath(url.pathname);
    return url.toString();
  } catch {
    return value;
  }
}

function requestUrl(input: FetchInput) {
  if (typeof input === 'string') {
    return input;
  }
  if (typeof URL !== 'undefined' && input instanceof URL) {
    return input.toString();
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  return '';
}

function normalizedFetchInput(input: FetchInput): FetchInput {
  const currentUrl = requestUrl(input);
  const normalizedUrl = normalizeKormicApiUrl(currentUrl);

  if (!currentUrl || normalizedUrl === currentUrl) {
    return input;
  }
  if (typeof input === 'string') {
    return normalizedUrl;
  }
  if (typeof URL !== 'undefined' && input instanceof URL) {
    // React Native's fetch typing accepts RequestInfo rather than URL even
    // though the runtime accepts URL objects. Returning the normalized
    // string is portable across native, web, and the TypeScript contract.
    return normalizedUrl;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new Request(normalizedUrl, input);
  }
  return input;
}

function isKormicApiRequest(value: string) {
  if (!value) {
    return false;
  }

  try {
    const pathname = isAbsoluteUrl(value) ? new URL(value).pathname : value.split(/[?#]/, 1)[0] ?? '';
    return pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function isHtmlResponse(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
}

function htmlResponseAsJson(response: Response, url: string) {
  const status = response.ok ? 502 : response.status || 502;
  const endpoint = (() => {
    try {
      return isAbsoluteUrl(url) ? new URL(url).pathname : url.split(/[?#]/, 1)[0] ?? url;
    } catch {
      return url;
    }
  })();

  const message = response.ok
    ? `The configured API address returned a web page instead of JSON for ${endpoint}. Check the app API base URL.`
    : `The Kormic service returned a non-JSON response (${status}) for ${endpoint}. Please try again in a moment.`;

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Central defensive transport wrapper for the existing fetch-based API
 * client. It preserves normal JSON responses, but converts an HTML proxy,
 * routing, or Django error page into the JSON error envelope expected by the
 * app instead of allowing `JSON.parse` to expose "Unexpected character: <".
 */
export function createKormicApiFetch(fetchImplementation: FetchImplementation): FetchImplementation {
  return async (input, init) => {
    const nextInput = normalizedFetchInput(input);
    const normalizedUrl = requestUrl(nextInput);
    const response = await fetchImplementation(nextInput, init);

    if (isKormicApiRequest(normalizedUrl) && isHtmlResponse(response)) {
      return htmlResponseAsJson(response, normalizedUrl);
    }

    return response;
  };
}

let installed = false;

export function installKormicApiTransport() {
  if (installed || typeof globalThis.fetch !== 'function') {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis) as FetchImplementation;
  globalThis.fetch = createKormicApiFetch(originalFetch) as typeof fetch;
  installed = true;
}
