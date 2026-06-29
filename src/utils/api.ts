import { useAuth } from "../composables/useAuth";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const { getAccessToken } = useAuth();
  const token = getAccessToken();

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    const { logout } = useAuth();
    await logout();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
