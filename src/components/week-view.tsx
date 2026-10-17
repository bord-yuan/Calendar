"use client";

import {
  addDays,
  dateKey,
  formatTime,
  getEventStatus,
  statusLabels,
} from "@/lib/calendar";
import type { EventRecord, EventStatus } from "@/types/calendar";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const status_styles: Record<EventStatus, string> = {
  upcoming: "bg-slate-100 text-slate-500",
  soon: "bg-amber-100 text-amber-800",
  ended: "bg-slate-100 text-slate-400",
};

type WeekViewProps = {
  week_start: Date;
  events: EventRecord[];
  now: Date;
  on_select: (event_id: string) => void;
};

export function WeekView({ week_start, events, now, on_select }: WeekViewProps) {
  const today = dateKey(new Date());

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {weekdays.map((weekday, index) => {
        const day = addDays(week_start, index);
        const day_events = events.filter((event) => event.ddl_date === dateKey(day));
        const is_today = dateKey(day) === today;

        return (
          <section
            className={`min-h-44 rounded-[1.4rem] border p-3 lg:min-h-[30rem] ${
              is_today
                ? "border-teal-300 bg-teal-50/60 shadow-[0_12px_35px_rgba(13,148,136,0.08)]"
                : "border-slate-200 bg-white/80"
            }`}
            key={weekday}
          >
            <header className="mb-3 flex items-center justify-between lg:block">
              <p className={`text-xs font-bold ${is_today ? "text-teal-700" : "text-slate-400"}`}>
                {weekday}
              </p>
              <p className="mt-1 text-xl font-bold">
                {day.getMonth() + 1}/{day.getDate()}
              </p>
            </header>

            <div className="space-y-2">
              {day_events.map((event) => {
                const status = getEventStatus(event, now);
                return (
                  <button
                    className={`w-full rounded-2xl border-l-4 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${status === "ended" ? "opacity-55" : ""}`}
                    key={event.event_id}
                    onClick={() => on_select(event.event_id)}
                    style={{
                      borderLeftColor: event.colour,
                      backgroundColor: `${event.colour}12`,
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-bold leading-5">
                        {event.event_name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status_styles[status]}`}
                      >
                        {statusLabels[status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-600">
                      {formatTime(event.ddl_time)} · {event.type}
                    </p>
                    {event.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {event.description}
                      </p>
                    )}
                  </button>
                );
              })}

              {day_events.length === 0 && (
                <div className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-300 lg:h-28">
                  暂无 event
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
