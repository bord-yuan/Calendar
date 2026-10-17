export const login_cache_key = "calendar_login_session";
export const cache_change_event = "calendar_cache_change";

export function read_cache<CacheValue>(cache_key: string) {
  if (typeof window === "undefined") return null;

  try {
    const cached_value = window.localStorage.getItem(cache_key);
    return cached_value ? (JSON.parse(cached_value) as CacheValue) : null;
  } catch {
    return null;
  }
}

export function write_cache<CacheValue>(
  cache_key: string,
  cache_value: CacheValue,
) {
  try {
    window.localStorage.setItem(cache_key, JSON.stringify(cache_value));
    window.dispatchEvent(new Event(cache_change_event));
  } catch {
    return;
  }
}

export function remove_cache(cache_key: string) {
  try {
    window.localStorage.removeItem(cache_key);
    window.dispatchEvent(new Event(cache_change_event));
  } catch {
    return;
  }
}
