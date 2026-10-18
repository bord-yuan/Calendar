"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LoginSession } from "@/types/calendar";

type AuthFormProps = {
  on_login: (login_session: LoginSession) => void;
};

export function AuthForm({ on_login }: AuthFormProps) {
  const [user_id, set_user_id] = useState("");
  const [password, set_password] = useState("");
  const [loading, set_loading] = useState(false);
  const [message, set_message] = useState("");
  const [confirm_new, set_confirm_new] = useState(false);

  async function login_user(create_user: boolean) {
    if (password === "") {
      set_message("Password 不能为空。");
      return;
    }

    set_loading(true);
    set_message("");

    const { data, error } = await createClient().rpc("login_user", {
      user_id,
      password,
      create_user,
    });

    if (error) {
      set_message(error.message);
      set_loading(false);
      return;
    }

    if (data === "not_found") {
      set_confirm_new(true);
      set_loading(false);
      return;
    }

    if (data === "invalid_password") {
      set_message("Password 不正确。");
      set_loading(false);
      return;
    }

    if (data === "password_empty") {
      set_message("Password 不能为空。");
      set_loading(false);
      return;
    }

    if (data === "authenticated" || data === "created") {
      on_login({ user_id, password });
      return;
    }

    set_message("登录失败，请重试。");
    set_loading(false);
  }

  function handle_submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void login_user(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] p-5 text-slate-950">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.2),_transparent_42%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
            C
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
              Calendar
            </p>
            <p className="text-sm text-slate-500">输入账号即可开始</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">登录日程表</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          新用户直接输入即可注册
        </p>

        <form className="mt-8 space-y-5" onSubmit={handle_submit}>
          <label className="block text-sm font-semibold text-slate-700">
            ID
            <input
              className="field"
              onChange={(event) => set_user_id(event.target.value)}
              placeholder="输入任意长度非空字符串"
              value={user_id}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              className="field"
              onChange={(event) => set_password(event.target.value)}
              placeholder="任意长非空即可，例：1"
              required
              type="password"
              value={password}
            />
          </label>

          {message && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </p>
          )}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "处理中…" : "登录"}
          </button>
        </form>
      </section>

      {confirm_new && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5 backdrop-blur-sm"
          onClick={() => !loading && set_confirm_new(false)}
          role="dialog"
        >
          <section
            className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl"
            onClick={(click_event) => click_event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
              New user
            </p>
            <h2 className="mt-2 text-2xl font-bold">新建 ID？</h2>
            <p className="mt-3 break-all text-sm leading-6 text-slate-500">
              login 表中没有 <strong className="text-slate-900">{user_id}</strong>，是否使用当前 Password 创建？
            </p>
            <div className="mt-7 flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
                onClick={() => set_confirm_new(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white"
                onClick={() => {
                  set_confirm_new(false);
                  void login_user(true);
                }}
                type="button"
              >
                确认新建
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
