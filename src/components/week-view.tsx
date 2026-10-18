"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDays,
  dateKey,
  eventDeadlineDate,
  eventOccursOnDate,
  formatEventCountdown,
  formatEventTime,
  getEventStatus,
  statusLabels,
} from "@/lib/calendar";
import { course_periods } from "@/lib/course-schedule";
import type { EventRecord, EventStatus } from "@/types/calendar";
import type { CalendarViewMode } from "@/components/bottom-navigation";

type TimelineBlock = {
  start: number;
  end: number;
  height: number;
  kind: "period" | "break" | "hour";
};

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const after_course_hours = [21, 22, 23, 24];
const course_period_height = 48;
const course_break_height = 10;
const after_course_hour_height = 64;
const timeline_blocks = build_timeline_blocks();
const timeline_height = timeline_blocks.reduce(
  (height, block) => height + block.height,
  0,
);

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
  const [show_completed, set_show_completed] = useState(false);

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
        const unfinished_events = events_for_day
          .filter((event) => event.event_status === "unfinished")
          .sort(sort_by_ddl);
        const completed_events = events_for_day
          .filter((event) => event.event_status === "completed")
          .sort(sort_by_ddl);
        const day_items: (EventRecord | "completed-toggle")[] = [
          ...unfinished_events,
          ...(completed_events.length > 0 ? (["completed-toggle"] as const) : []),
          ...(show_completed ? completed_events : []),
        ];
        return (
          <section key={weekday}>
            <div className="space-y-2">
              {day_items.map((event) => {
                if (event === "completed-toggle") {
                  return (
                    <div className="flex items-center gap-2" key={event}>
                      <span className="size-8 shrink-0" />
                      <button
                        aria-expanded={show_completed}
                        className="flex min-h-12 flex-1 items-center justify-between rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition active:scale-[0.98] active:bg-slate-200"
                        onClick={() => set_show_completed((current) => !current)}
                        type="button"
                      >
                        <span>已完成事项</span>
                        <span className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                            {completed_events.length}
                          </span>
                          <span className="text-xs text-slate-400">
                            {show_completed ? "收起" : "展开"}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                }

                const status = getEventStatus(event, now);
                const is_completed = event.event_status === "completed";
                return (
                  <div
                    className="flex items-center gap-2"
                    key={`${event.event_id}:${event.occurrence_date}`}
                  >
                    <button
                      aria-label={is_completed ? "恢复为未完成" : "标记为完成"}
                      aria-pressed={is_completed}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg transition active:scale-90"
                      onClick={() => on_status_change(event)}
                      type="button"
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-md border-[1.5px] transition ${
                          is_completed
                            ? "border-slate-500 bg-slate-500"
                            : "border-slate-400 bg-transparent"
                        }`}
                      >
                        {is_completed && (
                          <svg
                            aria-hidden="true"
                            className="size-3.5 text-white"
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
                      className={`grid h-24 min-w-0 flex-1 grid-rows-[1fr_3fr] rounded-2xl border-l-4 px-3 py-2 text-left shadow-sm transition active:scale-[0.98] active:brightness-95 ${is_completed ? "opacity-60" : status === "ended" ? "opacity-55" : ""}`}
                      onClick={() => on_select(event)}
                      style={{
                        borderLeftColor: is_completed ? "#94a3b8" : event.colour,
                        backgroundColor: is_completed
                          ? "#f1f5f9"
                          : `${event.colour}12`,
                      }}
                      type="button"
                    >
                      <p
                        className={`min-w-0 truncate text-sm font-bold leading-6 ${is_completed ? "text-slate-400" : ""}`}
                      >
                        {event.event_name}
                      </p>
                      <span className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_5rem_5.5rem] items-center gap-3">
                        <p
                          className={`min-w-0 truncate text-xs font-medium ${is_completed ? "text-slate-400" : "text-slate-600"}`}
                        >
                          {formatEventTime(event)} · {event.type}
                        </p>
                        <span className="line-clamp-3 w-20 text-center text-xs leading-4 text-slate-400">
                          {event.type === "课程"
                            ? course_location(event.description)
                            : event.description}
                        </span>
                        <span className="flex w-[5.5rem] shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${is_completed ? "bg-slate-200 text-slate-500" : status_styles[status]}`}
                          >
                            {is_completed ? "已完成" : statusLabels[status]}
                          </span>
                          <span className="whitespace-nowrap text-xs font-semibold text-slate-400">
                            {is_completed ? "完成" : formatEventCountdown(event, now)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}

              {events_for_day.length === 0 && (
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
  on_select,
}: Omit<WeekViewProps, "view_mode" | "on_status_change">) {
  const [selected_events, set_selected_events] = useState<EventRecord[]>([]);
  const timeline_scroll = useRef<HTMLDivElement>(null);
  const today = dateKey(new Date());
  const days = weekdays.map((weekday, index) => ({
    day: addDays(week_start, index),
    weekday,
  }));

  useEffect(() => {
    const animation_frame = window.requestAnimationFrame(() => {
      if (!timeline_scroll.current) return;
      timeline_scroll.current.scrollLeft = 0;
    });
    return () => window.cancelAnimationFrame(animation_frame);
  }, [week_start]);

  return (
    <>
      <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      <div
        className="hide-scrollbar overflow-x-auto"
        ref={timeline_scroll}
      >
      <div style={{ width: "calc(140% - 25.6px)" }}>
      <header className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-white">
        <div className="sticky left-0 z-20 flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
          {week_start.getMonth() + 1}月
        </div>
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
          className="sticky left-0 z-20 w-16 shrink-0 bg-slate-50"
          style={{ height: timeline_height }}
        >
          {course_periods.map((period) => (
            <span
              className="absolute inset-x-0 flex flex-col items-center justify-center text-slate-400"
              key={period.period}
              style={{
                height: course_period_height,
                top: timeline_position(period.start),
              }}
            >
              <span className="text-[9px] font-bold">{period.period}</span>
              <span className="mt-0.5 text-center text-[8px] font-semibold leading-[10px] tabular-nums">
                <span className="block">{minutes_time(period.start)}</span>
                <span className="block">-{minutes_time(period.end)}</span>
              </span>
            </span>
          ))}
          {after_course_hours.map((hour) => (
            <span
              className={`absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums text-slate-400 ${
                hour === 24 ? "-translate-y-full -mt-1" : "-translate-y-1/2"
              }`}
              key={hour}
              style={{ top: timeline_position(hour * 60) }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: timeline_height }}>
          {timeline_blocks.map((block, index) => (
            <div
              className={`absolute inset-x-0 border-t border-slate-200 ${
                block.kind === "break" ? "bg-slate-100/70" : ""
              }`}
              key={`${block.kind}:${block.start}:${index}`}
              style={{
                height: block.height,
                top: timeline_position(block.start),
              }}
            />
          ))}
          <div
            className="absolute inset-x-0 border-t border-slate-200"
            style={{ top: timeline_height }}
          />

          <div className="absolute inset-0 grid grid-cols-7">
            {days.map(({ day, weekday }) => {
              const day_events = events.filter((event) => {
                if (!eventOccursOnDate(event, day)) return false;
                const range = event_range_on_day(event, day);
                return range.end > 8 * 60 && range.start < 24 * 60;
              });
              const event_groups = group_events_by_start(day_events, day);

              return (
                <div
                  className="relative min-w-0 border-l border-slate-200 last:border-r"
                  key={weekday}
                >
                  {event_groups.map((event_group) => {
                    const event = event_group[0];
                    const range = event_range_on_day(event, day);
                    const visible_start = Math.max(range.start, 8 * 60);
                    const visible_end = Math.min(range.end, 24 * 60);
                    const top = timeline_position(visible_start);
                    const height =
                      event.type !== "任务"
                        ? Math.max(
                            28,
                            timeline_position(visible_end) - top,
                          )
                        : 52;

                    return (
                      <button
                        className="absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-[3px] px-1 py-1 text-left shadow-sm transition active:scale-95 active:brightness-90"
                        key={event_group
                          .map(
                            (group_event) =>
                              `${group_event.event_id}:${group_event.occurrence_date}`,
                          )
                          .join("|")}
                        onClick={() =>
                          event_group.length > 1
                            ? set_selected_events(event_group)
                            : on_select(event)
                        }
                        style={{
                          backgroundColor:
                            event_group.length > 1
                              ? "#f1f5f9"
                              : "#ffffff",
                          borderLeftColor:
                            event_group.length > 1 ? "#475569" : event.colour,
                          height: event_group.length > 1 ? 52 : height,
                          top,
                        }}
                        type="button"
                      >
                        {event_group.length === 1 && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0"
                            style={{ backgroundColor: `${event.colour}22` }}
                          />
                        )}
                        <span
                          className="relative z-10 line-clamp-2 text-[10px] font-bold leading-3 text-slate-800"
                        >
                          {event_group.length > 1 ? "多个事项" : event.event_name}
                        </span>
                        {event_group.length === 1 &&
                          event.type === "课程" &&
                          course_location(event.description) && (
                            <span className="relative z-10 mt-0.5 block truncate text-[10px] font-semibold leading-3 text-slate-600">
                              {course_location(event.description)}
                            </span>
                          )}
                        {event_group.length > 1 && (
                          <span className="relative z-10 mt-1 block text-[9px] font-semibold leading-3 text-slate-500">
                            {event_group.length} 项
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      </div>
      </section>

      {selected_events.length > 0 && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => set_selected_events([])}
          role="dialog"
        >
          <section
            className="max-h-[76dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-[#f3f7ef] p-5 shadow-2xl"
            onClick={(click_event) => click_event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Same time
                </p>
                <h2 className="mt-1 text-xl font-bold">多个事项</h2>
              </div>
              <button
                aria-label="关闭"
                className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition active:scale-90"
                onClick={() => set_selected_events([])}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {selected_events.map((event) => (
                <button
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-[0.98]"
                  key={`${event.event_id}:${event.occurrence_date}`}
                  onClick={() => {
                    set_selected_events([]);
                    on_select(event);
                  }}
                  type="button"
                >
                  <span
                    className="h-12 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: event.colour }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {event.event_name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatEventTime(event)} · {event.type}
                    </span>
                    {event.description && (
                      <span className="mt-1 block truncate text-xs text-slate-400">
                        {event.type === "课程"
                          ? course_location(event.description)
                          : event.description}
                      </span>
                    )}
                  </span>
                  <span className="text-slate-300">›</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function event_minutes(ddl_time: string) {
  const [hour, minute] = ddl_time.split(":").map(Number);
  return hour * 60 + minute;
}

function course_location(description: string) {
  const location =
    description
      .split(/\r?\n/)
      .find((line) => /^\s*地点\s*[:：]/.test(line)) ?? description;
  return location.replace(/^\s*地点\s*[:：]\s*/, "").trim();
}

function sort_by_ddl(first: EventRecord, second: EventRecord) {
  return eventDeadlineDate(first).getTime() - eventDeadlineDate(second).getTime();
}

function group_events_by_start(events: EventRecord[], day: Date) {
  const sorted_events = events
    .map((event) => ({ event, start: event_range_on_day(event, day).start }))
    .sort((first, second) => first.start - second.start);
  const groups: EventRecord[][] = [];
  let previous_start: number | null = null;

  for (const { event, start } of sorted_events) {
    if (previous_start !== null && start - previous_start < 30) {
      groups[groups.length - 1].push(event);
    } else {
      groups.push([event]);
    }
    previous_start = start;
  }

  return groups;
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

function build_timeline_blocks() {
  const blocks: TimelineBlock[] = [];

  course_periods.forEach((period, index) => {
    blocks.push({
      start: period.start,
      end: period.end,
      height: course_period_height,
      kind: "period",
    });

    const next_start = course_periods[index + 1]?.start ?? 21 * 60;
    if (period.end < next_start) {
      blocks.push({
        start: period.end,
        end: next_start,
        height: course_break_height,
        kind: "break",
      });
    }
  });

  for (let hour = 21; hour < 24; hour += 1) {
    blocks.push({
      start: hour * 60,
      end: (hour + 1) * 60,
      height: after_course_hour_height,
      kind: "hour",
    });
  }

  return blocks;
}

function timeline_position(minutes: number) {
  let position = 0;

  for (const block of timeline_blocks) {
    if (minutes <= block.start) return position;

    if (minutes < block.end) {
      return (
        position +
        ((minutes - block.start) / (block.end - block.start)) * block.height
      );
    }

    position += block.height;
  }

  return timeline_height;
}
