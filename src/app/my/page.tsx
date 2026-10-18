"use client";

import { AuthForm } from "@/components/auth-form";
import { BulkDeleteEvents } from "@/components/bulk-delete-events";
import { BottomNavigation } from "@/components/bottom-navigation";
import { CourseImport } from "@/components/course-import";
import { CourseNameEditor } from "@/components/course-name-editor";
import { useLogin } from "@/components/login-provider";

export default function MyPage() {
  const { login_session, login_ready, login_user, logout_user } = useLogin();

  if (!login_ready) return null;

  if (!login_session) return <AuthForm on_login={login_user} />;

  return (
    <main className="app-shell text-slate-950">
      <header className="border-b border-slate-200/80 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">我的</h1>
      </header>

      <div className="grid gap-5 px-5 pb-32 pt-7">
        <section className="rounded-[1.6rem] border border-white bg-white/80 p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">当前用户</p>
          <p className="mt-2 break-all text-xl font-bold">{login_session.user_id}</p>
          <button
            className="mt-6 min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-600"
            onClick={logout_user}
            type="button"
          >
            退出登录
          </button>
        </section>

        <CourseImport {...login_session} />
        <CourseNameEditor {...login_session} />
        <BulkDeleteEvents {...login_session} />
      </div>

      <BottomNavigation active_item="my" />
    </main>
  );
}
