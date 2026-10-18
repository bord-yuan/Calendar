"use client";

import {
  addDays,
  dateKey,
  eventDeadlineDate,
  eventOccursOnDate,
  formatEventCountdown,
  formatEventTime,
  formatTime,
  getEventStatus,
  statusLabels,
} from "@/lib/calendar";
import type { EventRecord, EventStatus } from "@/types/calendar";
import type { CalendarViewMode } from "@/components/bottom-navigation";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const timeline_hours = Array.from({ length: 17 }, (_, index) => index + 8);
const hour_height = 64;
const timeline_height = (timeline_hours.length - 1) * hour_height;

const status_styles: Record<EventStatus, string> = {
  upcoming: "bg-slate-100 text-slate-500",
  soon: "bg-amber-100 text-amber-800",
  ended: "bg-slate-100 text-slate-400",
};

type WeekViewProps = {
  week_start: Date;
  events: EventRecord[];
  now: Date;
  on_select: (event: EventRecord) => void;
  on_status_change: (event: EventRecord) => void;
  view_mode: CalendarViewMode;
};

export function WeekView({
  week_start,
  events,
  now,
  on_select,
  on_status_change,
  view_mode,
}: WeekViewProps) {
  if (view_mode === "week") {
    return (
      <WeekTimeline
        events={events}
        now={now}
        on_select={on_select}
        week_start={week_start}
      />
    );
  }

  const today = dateKey(new Date());
  const visible_days = weekdays
    .map((weekday, index) => ({ day: addDays(week_start, index), weekday }))
    .filter(({ day }) => dateKey(day) === today);

  return (
    <div className="grid gap-4">
      {visible_days.map(({ day, weekday }) => {
        const events_for_day = events.filter((event) =>
          eventOccursOnDate(event, day),
        );
        const day_events = [
          ...events_for_day
            .filter((event) => event.event_status === "unfinished")
            .sort(sort_by_ddl),
          ...events_for_day
            .filter((event) => event.event_status === "completed")
            .sort(sort_by_ddl),
        ];
        return (
          <section key={weekday}>
            <div className="space-y-2">
              {day_events.map((event) => {
                const status = getEventStatus(event, now);
                const is_completed = event.event_status === "completed";
                return (
                  <div
                    className="flex items-center gap-3"
                    key={`${event.event_id}:${event.occurrence_date}`}
                  >
                    <button
                      aria-label={is_completed ? "恢复为未完成" : "标记为完成"}
                      aria-pressed={is_completed}
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl transition active:scale-90"
                      onClick={() => on_status_change(event)}
                      type="button"
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg border-[1.5px] transition ${
                          is_completed
                            ? "border-slate-500 bg-slate-500"
                            : "border-slate-400 bg-transparent"
                        }`}
                      >
                        {is_completed && (
                          <svg
                            aria-hidden="true"
                            className="size-5 text-white"
                            fill="none"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M4 10.5L8 14L16 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        )}
                      </span>
                    </button>

                    <button
                      className={`grid h-20 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_5rem_5.5rem] items-center gap-3 rounded-2xl border-l-4 p-3 text-left shadow-sm transition active:scale-[0.98] active:brightness-95 ${is_completed ? "opacity-60" : status === "ended" ? "opacity-55" : ""}`}
                      onClick={() => on_select(event)}
                      style={{
                        borderLeftColor: is_completed ? "#94a3b8" : event.colour,
                        backgroundColor: is_completed
                          ? "#f1f5f9"
                          : `${event.colour}12`,
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <p
                          className={`truncate text-sm font-bold leading-5 ${is_completed ? "text-slate-400" : ""}`}
                        >
                          {event.event_name}
                        </p>
                        <p
                          className={`mt-2 truncate text-xs font-medium ${is_completed ? "text-slate-400" : "text-slate-600"}`}
                        >
                          {formatEventTime(event)} · {event.type}
                        </p>
                      </span>
                      <span className="line-clamp-3 w-20 text-center text-xs leading-4 text-slate-400">
                        {event.description}
                      </span>
                      <span className="flex w-[5.5rem] shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${is_completed ? "bg-slate-200 text-slate-500" : status_styles[status]}`}
                        >
                          {is_completed ? "已完成" : statusLabels[status]}
                        </span>
                        <span className="whitespace-nowrap text-xs font-semibold text-slate-400">
                          {formatEventCountdown(event, now)}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}

              {day_events.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-300">
                  暂无 event
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WeekTimeline({
  week_start,
  events,
  now,
  on_select,
}: Omit<WeekViewProps, "view_mode" | "on_status_change">) {
  const today = dateKey(new Date());
  const days = weekdays.map((weekday, index) => ({
    day: addDays(week_start, index),
    weekday,
  }));

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <header className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-white">
        <div />
        {days.map(({ day, weekday }) => {
          const is_today = dateKey(day) === today;
          return (
            <div
              className={`flex min-w-0 flex-col items-center justify-center py-3 ${is_today ? "bg-teal-600 text-white" : "text-slate-500"}`}
              key={weekday}
            >
              <span className="text-[10px] font-bold">{weekday.slice(1)}</span>
              <span className="mt-1 text-base font-bold">{day.getDate()}</span>
            </div>
          );
        })}
      </header>

      <div className="flex">
        <div
          className="relative w-11 shrink-0 bg-slate-50"
          style={{ height: timeline_height }}
        >
          {timeline_hours.map((hour) => (
            <span
              className={`absolute right-1 text-[10px] font-semibold tabular-nums text-slate-400 ${
                hour === 8
                  ? "translate-y-1"
                  : hour === 24
                    ? "-translate-y-full -mt-1"
                    : "-translate-y-1/2"
              }`}
              key={hour}
              style={{ top: (hour - 8) * hour_height }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: timeline_height }}>
          {timeline_hours.map((hour) => (
            <div
              className="absolute inset-x-0 border-t border-slate-200"
              key={hour}
              style={{ top: (hour - 8) * hour_height }}
            />
          ))}

          <div className="absolute inset-0 grid grid-cols-7">
            {days.map(({ day, weekday }) => {
              const day_events = events.filter((event) => {
                const range = event_range_on_day(event, day);
                return range.end > 8 * 60 && range.start < 24 * 60;
              });

              return (
                <div
                  className="relative min-w-0 border-l border-slate-200 last:border-r"
                  key={weekday}
                >
                  {day_events.map((event) => {
                    const status = getEventStatus(event, now);
                    const range = event_range_on_day(event, day);
                    const visible_start = Math.max(range.start, 8 * 60);
                    const visible_end = Math.min(range.end, 24 * 60);
                    const top = ((visible_start - 8 * 60) / 60) * hour_height;
                    const height =
                      event.type === "事件"
                        ? Math.max(
                            28,
                            ((visible_end - visible_start) / 60) * hour_height,
                          )
                        : 52;

                    return (
                      <button
                        className={`absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-[3px] px-1 py-1 text-left shadow-sm transition active:scale-95 active:brightness-90 ${status === "ended" ? "opacity-55" : ""}`}
                        key={`${event.event_id}:${event.occurrence_date}`}
                        onClick={() => on_select(event)}
                        style={{
                          backgroundColor: `${event.colour}22`,
                          borderLeftColor: event.colour,
                          height,
                          top,
                        }}
                        type="button"
                      >
                        <span className="block truncate text-[10px] font-bold leading-3 text-slate-800">
                          {event.event_name}
                        </span>
                        <span className="mt-1 block text-[9px] font-semibold tabular-nums text-slate-500">
                          {event.type === "事件"
                            ? `${minutes_time(visible_start)}–${minutes_time(visible_end)}`
                            : formatTime(event.ddl_time)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function event_minutes(ddl_time: string) {
  const [hour, minute] = ddl_time.split(":").map(Number);
  return hour * 60 + minute;
}

function sort_by_ddl(first: EventRecord, second: EventRecord) {
  return eventDeadlineDate(first).getTime() - eventDeadlineDate(second).getTime();
}

function event_range_on_day(event: EventRecord, day: Date) {
  if (event.type === "任务" || !event.start_date || !event.start_time) {
    const deadline = event_minutes(event.ddl_time);
    return { start: deadline, end: deadline + 1 };
  }

  const day_key = dateKey(day);
  return {
    start: day_key === event.start_date ? event_minutes(event.start_time) : 0,
    end: day_key === event.ddl_date ? event_minutes(event.ddl_time) : 24 * 60,
  };
}

function minutes_time(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
