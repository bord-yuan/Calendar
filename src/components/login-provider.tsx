"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  cache_change_event,
  login_cache_key,
  remove_cache,
  write_cache,
} from "@/lib/cache";
import type { LoginSession } from "@/types/calendar";

type LoginContextValue = {
  login_session: LoginSession | null;
  login_ready: boolean;
  login_user: (login_session: LoginSession) => void;
  logout_user: () => void;
};

const LoginContext = createContext<LoginContextValue | null>(null);

function subscribe_login_cache(on_store_change: () => void) {
  window.addEventListener("storage", on_store_change);
  window.addEventListener(cache_change_event, on_store_change);

  return () => {
    window.removeEventListener("storage", on_store_change);
    window.removeEventListener(cache_change_event, on_store_change);
  };
}

function get_login_cache() {
  return window.localStorage.getItem(login_cache_key);
}

function get_server_login_cache() {
  return null;
}

function subscribe_browser_ready() {
  return () => undefined;
}

function get_browser_ready() {
  return true;
}

function get_server_browser_ready() {
  return false;
}

export function LoginProvider({ children }: { children: ReactNode }) {
  const login_cache = useSyncExternalStore(
    subscribe_login_cache,
    get_login_cache,
    get_server_login_cache,
  );
  const login_ready = useSyncExternalStore(
    subscribe_browser_ready,
    get_browser_ready,
    get_server_browser_ready,
  );
  const login_session = useMemo(
    () => (login_cache ? (JSON.parse(login_cache) as LoginSession) : null),
    [login_cache],
  );

  function login_user(new_login_session: LoginSession) {
    write_cache(login_cache_key, new_login_session);
  }

  function logout_user() {
    remove_cache(login_cache_key);
  }

  return (
    <LoginContext.Provider
      value={{ login_session, login_ready, login_user, logout_user }}
    >
      {children}
    </LoginContext.Provider>
  );
}

export function useLogin() {
  const login_context = useContext(LoginContext);
  if (!login_context) throw new Error("LoginProvider is missing");
  return login_context;
}
