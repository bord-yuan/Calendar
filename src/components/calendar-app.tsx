"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthForm } from "@/components/auth-form";
import {
  BottomNavigation,
  type CalendarViewMode,
} from "@/components/bottom-navigation";
import { EventForm } from "@/components/event-form";
import { useLogin } from "@/components/login-provider";
import { WeekView } from "@/components/week-view";
import {
  addDays,
  dateKey,
  eventDate,
  formatEventSchedule,
  formatEventTime,
  formatRepeat,
  getEventStatus,
  startOfWeek,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";
import { read_cache, write_cache } from "@/lib/cache";
import type { EventRecord } from "@/types/calendar";

type CalendarAppProps = {
  mode: "week" | "all";
};

type EventLoadMode = CalendarViewMode | "all";

export function CalendarApp({ mode }: CalendarAppProps) {
  const supabase = useMemo(() => createClient(), []);
  const { login_session, login_ready, login_user } = useLogin();
  const [week_start, set_week_start] = useState(() => startOfWeek(new Date()));
  const [events, set_events] = useState<EventRecord[]>([]);
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState("");
  const [show_form, set_show_form] = useState(false);
  const [selected_event, set_selected_event] = useState<EventRecord | null>(null);
  const [now, set_now] = useState(() => new Date());
  const [view_mode, set_view_mode] = useState<CalendarViewMode>("today");
  const active_cache_key = useRef<string | null>(null);
  const visible_cache_key = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => set_now(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const load_events = useCallback(async (
    load_mode: EventLoadMode,
    load_week_start: Date,
  ) => {
    if (!login_session) return;

    const from_date =
      load_mode === "all"
        ? null
        : load_mode === "today"
          ? dateKey(new Date())
          : dateKey(load_week_start);
    const to_date =
      load_mode === "all"
        ? null
        : load_mode === "today"
          ? from_date
          : dateKey(addDays(load_week_start, 6));
    const cache_key =
      load_mode === "all"
        ? null
        : `calendar_events:v2:${login_session.user_id}:${load_mode}:${from_date}:${to_date}`;
    const request_key =
      cache_key ?? `calendar_events:v2:${login_session.user_id}:all`;
    const cached_events = cache_key
      ? read_cache<EventRecord[]>(cache_key)
      : null;

    active_cache_key.current = request_key;
    visible_cache_key.current = cache_key;
    set_events(cached_events ?? []);
    set_loading(cached_events === null);
    set_error("");

    const { data, error: query_error } = await supabase.rpc("get_events", {
      user_id: login_session.user_id,
      password: login_session.password,
      from_date,
      to_date,
    });

    if (active_cache_key.current !== request_key) return;

    if (query_error) {
      set_error(`读取 event 失败：${query_error.message}`);
      if (!cached_events) set_events([]);
    } else {
      const loaded_events = (data ?? []) as EventRecord[];
      set_events(loaded_events);
      if (cache_key) write_cache(cache_key, loaded_events);
    }
    set_loading(false);
  }, [login_session, supabase]);

  useEffect(() => {
    if (!login_session || mode !== "week") return;

    function apply_hash() {
      const current_week_start = startOfWeek(new Date());

      if (window.location.hash === "#week") {
        set_week_start(current_week_start);
        set_view_mode("week");
        void load_events("week", current_week_start);
      } else {
        set_week_start(current_week_start);
        set_view_mode("today");
        void load_events("today", current_week_start);
      }

      if (window.location.hash === "#add-event") set_show_form(true);
    }

    apply_hash();
    window.addEventListener("hashchange", apply_hash);
    return () => window.removeEventListener("hashchange", apply_hash);
  }, [load_events, login_session, mode]);

  useEffect(() => {
    if (!login_session || mode !== "all") return;
    const request = window.setTimeout(
      () => void load_events("all", week_start),
      0,
    );
    return () => window.clearTimeout(request);
  }, [load_events, login_session, mode, week_start]);

  function open_event(event: EventRecord) {
    set_selected_event(event);
    set_show_form(true);
  }

  function close_form() {
    set_show_form(false);
    set_selected_event(null);
  }

  function event_saved() {
    close_form();
    if (mode === "all") {
      void load_events("all", week_start);
    } else {
      void load_events(view_mode, week_start);
    }
  }

  function change_view_mode(next_view_mode: CalendarViewMode) {
    const next_week_start =
      next_view_mode === "today" ? startOfWeek(new Date()) : week_start;

    set_week_start(next_week_start);
    set_view_mode(next_view_mode);
    window.history.replaceState(null, "", `#${next_view_mode}`);
    void load_events(next_view_mode, next_week_start);
  }

  function change_week(days: number) {
    const next_week_start = addDays(week_start, days);
    set_week_start(next_week_start);
    void load_events("week", next_week_start);
  }

  async function update_event_status(event: EventRecord) {
    if (!login_session) return;

    const event_status: EventRecord["event_status"] =
      event.event_status === "completed" ? "unfinished" : "completed";
    set_events((current_events) => {
      const next_events = current_events.map((item) =>
        item.event_id === event.event_id &&
        item.occurrence_date === event.occurrence_date
          ? { ...item, event_status }
          : item,
      );
      if (visible_cache_key.current) {
        write_cache(visible_cache_key.current, next_events);
      }
      return next_events;
    });
    set_error("");

    const { data: updated, error: update_error } = await supabase.rpc(
      "update_event_status",
      {
        user_id: login_session.user_id,
        password: login_session.password,
        event_id: event.event_id,
        occurrence_date: event.occurrence_date,
        event_status,
      },
    );

    if (update_error || !updated) {
      set_events((current_events) => {
        const next_events = current_events.map((item) =>
          item.event_id === event.event_id &&
          item.occurrence_date === event.occurrence_date
            ? { ...item, event_status: event.event_status }
            : item,
        );
        if (visible_cache_key.current) {
          write_cache(visible_cache_key.current, next_events);
        }
        return next_events;
      });
      set_error(
        `更新 event_status 失败：${update_error?.message ?? "Event not found"}`,
      );
    }
  }

  const reminders = events.filter(
    (event) => getEventStatus(event, now) === "soon",
  );
  const is_current_week =
    dateKey(week_start) === dateKey(startOfWeek(now));

  if (!login_ready) return null;

  if (!login_session) return <AuthForm on_login={login_user} />;

  return (
    <main className="app-shell text-slate-950">
      <div className="px-5 pb-32 pt-7">
        <section className="mb-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
                {mode === "week"
                  ? view_mode === "today"
                    ? "Today"
                    : view_mode === "week"
                      ? "This week"
                      : "Calendar"
                  : "All events"}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {mode === "week"
                  ? view_mode === "today"
                    ? "今日事项"
                    : view_mode === "week"
                      ? "本周事项"
                      : "选择日程视图"
                  : "全部 event"}
              </h1>
              {mode === "all" && (
                <p className="mt-2 text-sm text-slate-500">
                  按 ddl_date 和 ddl_time 排列
                </p>
              )}
            </div>
            {mode === "week" && view_mode === "today" && (
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-teal-700">
                  {new Intl.DateTimeFormat("zh-CN", {
                    weekday: "long",
                  }).format(now)}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {now.getMonth() + 1}月{now.getDate()}日
                </p>
              </div>
            )}
            {mode === "week" && view_mode === "week" && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  aria-label="上一周"
                  className="flex h-10 items-center justify-center rounded-xl bg-white/70 px-2.5 text-xs font-bold text-slate-600 shadow-sm transition active:scale-95"
                  onClick={() => change_week(-7)}
                  type="button"
                >
                  ← 上一周
                </button>
                {!is_current_week && (
                  <button
                    className="flex h-10 items-center justify-center rounded-xl bg-white/70 px-2.5 text-xs font-bold text-slate-600 shadow-sm transition active:scale-95"
                    onClick={() => {
                      const current_week_start = startOfWeek(now);
                      set_week_start(current_week_start);
                      void load_events("week", current_week_start);
                    }}
                    type="button"
                  >
                    返回
                  </button>
                )}
                <button
                  aria-label="下一周"
                  className="flex h-10 items-center justify-center rounded-xl bg-white/70 px-2.5 text-xs font-bold text-slate-600 shadow-sm transition active:scale-95"
                  onClick={() => change_week(7)}
                  type="button"
                >
                  下一周 →
                </button>
              </div>
            )}
          </div>
        </section>

        {mode === "week" && (
          <>
            {reminders.length > 0 && (
              <section className="mb-5 rounded-[1.4rem] bg-amber-100 px-5 py-4 text-amber-950">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                  即将到期
                </p>
                <p className="mt-1 font-semibold">
                  {reminders[0].event_name} · {formatEventTime(reminders[0])}
                </p>
              </section>
            )}
          </>
        )}

        {error && (
          <p className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
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
            on_status_change={(event) => void update_event_status(event)}
            view_mode={view_mode}
            week_start={week_start}
          />
        ) : (
          <AllEvents events={events} now={now} on_select={open_event} />
        )}
      </div>

      {mode === "week" && (
        <BottomNavigation
          active_item="calendar"
          on_add={() => set_show_form(true)}
          on_view_change={change_view_mode}
          view_mode={view_mode}
        />
      )}

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
  on_select: (event: EventRecord) => void;
}) {
  const upcoming_events = events.filter(
    (event) => event.repeat_type !== "once" || eventDate(event) >= now,
  );
  const ended_events = events
    .filter((event) => event.repeat_type === "once" && eventDate(event) < now)
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
  on_select: (event: EventRecord) => void;
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
            className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left transition active:scale-[0.98] active:bg-slate-50"
            key={`${event.event_id}:${event.occurrence_date}`}
            onClick={() => on_select(event)}
            type="button"
          >
            <span
              className="h-12 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: event.colour }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{event.event_name}</span>
              <span className="mt-1 block text-sm text-slate-500">
                {formatEventSchedule(event)}
              </span>
              <span className="mt-2 block text-xs text-slate-400">
                {event.type} · {formatRepeat(event)}
              </span>
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
