export const API = {
  base: import.meta.env.VITE_API_BASE_URL ?? '',
  mock: (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'
};

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const res = await fetch(API.base + path, {
    credentials: 'include',
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined)
    }
  });

  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {
      // fallback to statusText
    }
    throw new Error(errMsg || `Request failed with status ${res.status}`);
  }

  return res.json();
}
