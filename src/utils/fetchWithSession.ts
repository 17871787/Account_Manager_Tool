export type FetchWithSessionInit = RequestInit & {
  headers?: HeadersInit;
};

const defaultHeaders: HeadersInit = {
  Accept: 'application/json',
};

const mergeHeaders = (headers?: HeadersInit): HeadersInit => {
  const merged = new Headers(defaultHeaders);

  if (headers) {
    const provided = new Headers(headers);
    provided.forEach((value, key) => {
      merged.set(key, value);
    });
  }

  return merged;
};

export const fetchWithSession = (input: RequestInfo | URL, init: FetchWithSessionInit = {}) => {
  const { headers, ...rest } = init;

  return fetch(input, {
    ...rest,
    headers: mergeHeaders(headers),
    credentials: 'include',
  });
};
