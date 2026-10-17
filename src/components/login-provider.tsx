"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import type { LoginSession } from "@/types/calendar";

type LoginContextValue = {
  login_session: LoginSession | null;
  login_user: (login_session: LoginSession) => void;
  logout_user: () => void;
};

const LoginContext = createContext<LoginContextValue | null>(null);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [login_session, set_login_session] = useState<LoginSession | null>(null);

  function login_user(new_login_session: LoginSession) {
    set_login_session(new_login_session);
  }

  function logout_user() {
    set_login_session(null);
  }

  return (
    <LoginContext.Provider value={{ login_session, login_user, logout_user }}>
      {children}
    </LoginContext.Provider>
  );
}

export function useLogin() {
  const login_context = useContext(LoginContext);
  if (!login_context) throw new Error("LoginProvider is missing");
  return login_context;
}
