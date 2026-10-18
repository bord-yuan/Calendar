"use client";

import Link from "next/link";

export type CalendarViewMode = "today" | "week";

type BottomNavigationProps = {
  active_item: "calendar" | "my";
  view_mode?: CalendarViewMode | null;
  on_add?: () => void;
  on_view_change?: (view_mode: CalendarViewMode) => void;
};

export function BottomNavigation({
  active_item,
  view_mode = null,
  on_add,
  on_view_change,
}: BottomNavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex w-full items-end border-t border-[#e7e1d6] bg-[#faf8f3]/95 px-4 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(86,74,56,0.08)] backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 rounded-2xl bg-[#eeeae2] p-1.5">
        {active_item === "calendar" ? (
          <>
            <button
              className={`h-14 flex-1 rounded-xl text-lg font-black text-black transition ${view_mode === "today" ? "bg-[#ddd6c9] shadow-sm" : ""}`}
              onClick={() => on_view_change?.("today")}
              type="button"
            >
              今日
            </button>
            <button
              className={`h-14 flex-1 rounded-xl text-lg font-black text-black transition ${view_mode === "week" ? "bg-[#ddd6c9] shadow-sm" : ""}`}
              onClick={() => on_view_change?.("week")}
              type="button"
            >
              本周
            </button>
          </>
        ) : (
          <>
            <Link
              className="flex h-14 flex-1 items-center justify-center rounded-xl text-lg font-black text-black"
              href="/#today"
            >
              今日
            </Link>
            <Link
              className="flex h-14 flex-1 items-center justify-center rounded-xl text-lg font-black text-black"
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
          className="mx-3 flex size-16 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[0_10px_25px_rgba(15,23,42,0.3)] transition active:scale-95"
          onClick={on_add}
          type="button"
        >
          <AddIcon />
        </button>
      ) : (
        <Link
          aria-label="添加新日程"
          className="mx-3 flex size-16 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[0_10px_25px_rgba(15,23,42,0.3)]"
          href="/#add-event"
        >
          <AddIcon />
        </Link>
      )}

      <Link
        className={`flex h-17 w-20 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-black transition ${active_item === "my" ? "bg-[#ddd6c9] shadow-sm" : "bg-[#eeeae2]"}`}
        href="/my"
      >
        我的
      </Link>
    </nav>
  );
}

function AddIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-9"
      fill="none"
      viewBox="0 0 36 36"
    >
      <path
        d="M18 5V31M5 18H31"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
