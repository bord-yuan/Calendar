"use client";

import Link from "next/link";

export type CalendarViewMode = "today" | "week";

type BottomNavigationProps = {
  active_item: "calendar" | "my";
  view_mode?: CalendarViewMode;
  on_add?: () => void;
  on_view_change?: (view_mode: CalendarViewMode) => void;
};

export function BottomNavigation({
  active_item,
  view_mode = "today",
  on_add,
  on_view_change,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 items-end border-t border-slate-200 bg-white/95 px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 rounded-2xl bg-slate-100 p-1.5">
        {active_item === "calendar" ? (
          <>
            <button
              className={`h-14 flex-1 rounded-xl text-base font-bold transition ${view_mode === "today" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500"}`}
              onClick={() => on_view_change?.("today")}
              type="button"
            >
              当日
            </button>
            <button
              className={`h-14 flex-1 rounded-xl text-base font-bold transition ${view_mode === "week" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500"}`}
              onClick={() => on_view_change?.("week")}
              type="button"
            >
              本周
            </button>
          </>
        ) : (
          <>
            <Link
              className="flex h-14 flex-1 items-center justify-center rounded-xl text-base font-bold text-slate-500"
              href="/#today"
            >
              当日
            </Link>
            <Link
              className="flex h-14 flex-1 items-center justify-center rounded-xl text-base font-bold text-slate-500"
              href="/#week"
            >
              本周
            </Link>
          </>
        )}
      </div>

      {on_add ? (
        <button
          aria-label="添加新日程"
          className="mx-3 flex size-17 shrink-0 items-center justify-center rounded-full bg-teal-600 text-4xl font-light leading-none text-white shadow-[0_10px_25px_rgba(13,148,136,0.35)] transition active:scale-95"
          onClick={on_add}
          type="button"
        >
          +
        </button>
      ) : (
        <Link
          aria-label="添加新日程"
          className="mx-3 flex size-17 shrink-0 items-center justify-center rounded-full bg-teal-600 text-4xl font-light leading-none text-white shadow-[0_10px_25px_rgba(13,148,136,0.35)]"
          href="/#add-event"
        >
          +
        </Link>
      )}

      <Link
        className={`flex h-17 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-sm font-bold transition ${active_item === "my" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}
        href="/my"
      >
        <span className="text-xl">●</span>
        <span className="mt-0.5">我的</span>
      </Link>
    </nav>
  );
}
