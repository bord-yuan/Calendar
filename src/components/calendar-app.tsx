"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import { EventForm } from "@/components/event-form";
import { useLogin } from "@/components/login-provider";
import { WeekView } from "@/components/week-view";
import {
  addDays,
  dateKey,
  eventDate,
  formatDate,
  formatFullDate,
  formatTime,
  getEventStatus,
  startOfWeek,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord } from "@/types/calendar";

type CalendarAppProps = {
  mode: "week" | "all";
};

export function CalendarApp({ mode }: CalendarAppProps) {
  const supabase = useMemo(() => createClient(), []);
  const { login_session, login_user, logout_user } = useLogin();
  const [week_start, set_week_start] = useState(() => startOfWeek(new Date()));
  const [events, set_events] = useState<EventRecord[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState("");
  const [show_form, set_show_form] = useState(false);
  const [selected_event, set_selected_event] = useState<EventRecord | null>(null);
  const [now, set_now] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => set_now(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const load_events = useCallback(async () => {
    if (!login_session) return;
    set_loading(true);
    set_error("");

    const { data, error: query_error } = await supabase.rpc("get_events", {
      user_id: login_session.user_id,
      password: login_session.password,
      from_date: mode === "week" ? dateKey(week_start) : null,
      to_date: mode === "week" ? dateKey(addDays(week_start, 6)) : null,
    });

    if (query_error) {
      set_error(query_error.message);
      set_events([]);
    } else {
      set_events((data ?? []) as EventRecord[]);
    }
    set_loading(false);
  }, [login_session, mode, supabase, week_start]);

  useEffect(() => {
    const request = window.setTimeout(() => void load_events(), 0);
    return () => window.clearTimeout(request);
  }, [load_events]);

  function open_event(event_id: string) {
    set_selected_event(
      events.find((event) => event.event_id === event_id) ?? null,
    );
    set_show_form(true);
  }

  function close_form() {
    set_show_form(false);
    set_selected_event(null);
  }

  function event_saved() {
    close_form();
    void load_events();
  }

  const reminders = events.filter(
    (event) => getEventStatus(event, now) === "soon",
  );

  if (!login_session) return <AuthForm on_login={login_user} />;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f4f1ea]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 font-bold text-white">
              C
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
                Calendar
              </span>
              <span className="hidden text-xs text-slate-400 sm:block">
                user_id: {login_session.user_id}
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm">
            <Link
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "week" ? "bg-slate-950 text-white" : "text-slate-500"}`}
              href="/"
            >
              本周
            </Link>
            <Link
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "all" ? "bg-slate-950 text-white" : "text-slate-500"}`}
              href="/events"
            >
              全部
            </Link>
          </nav>

          <button
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-white"
            onClick={logout_user}
            type="button"
          >
            退出
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
              {mode === "week" ? "Weekly events" : "All events"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {mode === "week" ? "本周 event" : "全部 event"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {mode === "week"
                ? `${formatFullDate(week_start)} — ${formatDate(addDays(week_start, 6))}`
                : "按 ddl_date 和 ddl_time 排列"}
            </p>
          </div>
          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-lg"
            onClick={() => set_show_form(true)}
            type="button"
          >
            ＋ 添加 event
          </button>
        </section>

        {mode === "week" && (
          <>
            <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white bg-white/70 p-3 shadow-sm">
              <div className="flex gap-2">
                <button
                  className="nav-button"
                  onClick={() => set_week_start(addDays(week_start, -7))}
                  type="button"
                >
                  ← 上一周
                </button>
                <button
                  className="nav-button"
                  onClick={() => set_week_start(startOfWeek(new Date()))}
                  type="button"
                >
                  回到本周
                </button>
                <button
                  className="nav-button"
                  onClick={() => set_week_start(addDays(week_start, 7))}
                  type="button"
                >
                  下一周 →
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-500">仅加载当前周</p>
            </section>

            {reminders.length > 0 && (
              <section className="mb-5 rounded-[1.4rem] bg-amber-100 px-5 py-4 text-amber-950">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  即将到期
                </p>
                <p className="mt-1 font-semibold">
                  {reminders[0].event_name} · {formatTime(reminders[0].ddl_time)}
                </p>
              </section>
            )}
          </>
        )}

        {error && (
          <p className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            读取 event 失败：{error}
          </p>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-[2rem] bg-white/60 text-slate-400">
            正在读取 event…
          </div>
        ) : mode === "week" ? (
          <WeekView
            events={events}
            now={now}
            on_select={open_event}
            week_start={week_start}
          />
        ) : (
          <AllEvents events={events} now={now} on_select={open_event} />
        )}
      </div>

      {show_form && (
        <EventForm
          event={selected_event}
          on_close={close_form}
          on_saved={event_saved}
          password={login_session.password}
          user_id={login_session.user_id}
        />
      )}
    </main>
  );
}

function AllEvents({
  events,
  now,
  on_select,
}: {
  events: EventRecord[];
  now: Date;
  on_select: (event_id: string) => void;
}) {
  const upcoming_events = events.filter((event) => eventDate(event) >= now);
  const ended_events = events
    .filter((event) => eventDate(event) < now)
    .sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EventGroup events={upcoming_events} on_select={on_select} title="即将开始" />
      <EventGroup events={ended_events} on_select={on_select} title="已经结束" />
    </div>
  );
}

function EventGroup({
  events,
  title,
  on_select,
}: {
  events: EventRecord[];
  title: string;
  on_select: (event_id: string) => void;
}) {
  return (
    <section className="rounded-[1.8rem] border border-white bg-white/75 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {events.length}
        </span>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <button
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:shadow-md"
            key={event.event_id}
            onClick={() => on_select(event.event_id)}
            type="button"
          >
            <span
              className="h-12 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: event.colour }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{event.event_name}</span>
              <span className="mt-1 block text-sm text-slate-500">
                {formatFullDate(eventDate(event))} · {formatTime(event.ddl_time)}
              </span>
              <span className="mt-2 block text-xs text-slate-400">{event.type}</span>
            </span>
            <span className="text-slate-300">›</span>
          </button>
        ))}
        {events.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            暂无 event
          </p>
        )}
      </div>
    </section>
  );
}
