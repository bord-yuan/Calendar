"use client";

import { FormEvent, useState } from "react";
import { dateKey } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, LoginSession, RepeatType } from "@/types/calendar";

const colours = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c"];
const more_colours = [
  "#111827",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#b91c1c",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#9f1239",
  "#78350f",
];
const all_colours = [...colours, ...more_colours];
const types = ["任务", "事件"] as const;
const repeat_options: { label: string; value: RepeatType }[] = [
  { label: "一次性", value: "once" },
  { label: "每天", value: "daily" },
  { label: "周一至周五", value: "weekdays" },
  { label: "自定义", value: "custom" },
];
const weekday_options = [
  { label: "一", value: 1 },
  { label: "二", value: 2 },
  { label: "三", value: 3 },
  { label: "四", value: 4 },
  { label: "五", value: 5 },
  { label: "六", value: 6 },
  { label: "日", value: 7 },
];

function random_colour() {
  return all_colours[Math.floor(Math.random() * all_colours.length)];
}

type EventFormProps = LoginSession & {
  event: EventRecord | null;
  on_close: () => void;
  on_saved: () => void;
};

export function EventForm({
  user_id,
  password,
  event,
  on_close,
  on_saved,
}: EventFormProps) {
  const [event_name, set_event_name] = useState(event?.event_name ?? "");
  const [type, set_type] = useState<(typeof types)[number]>(
    event?.type === "事件" ? "事件" : "任务",
  );
  const [repeat_type, set_repeat_type] = useState<RepeatType>(
    event?.repeat_type ?? "once",
  );
  const [repeat_days, set_repeat_days] = useState<number[]>(
    event?.repeat_days ?? [],
  );
  const [start_date, set_start_date] = useState(
    event?.series_start_date ?? event?.start_date ?? event?.ddl_date ?? dateKey(new Date()),
  );
  const [start_time, set_start_time] = useState(
    event?.start_time?.slice(0, 5) ?? "08:00",
  );
  const [ddl_date, set_ddl_date] = useState(
    event?.series_ddl_date ?? event?.ddl_date ?? dateKey(new Date()),
  );
  const [ddl_time, set_ddl_time] = useState(event?.ddl_time.slice(0, 5) ?? "09:00");
  const [colour, set_colour] = useState(() => event?.colour ?? random_colour());
  const [show_more_colours, set_show_more_colours] = useState(false);
  const [description, set_description] = useState(event?.description ?? "");
  const [saving, set_saving] = useState(false);
  const [error, set_error] = useState("");

  async function handle_submit(form_event: FormEvent<HTMLFormElement>) {
    form_event.preventDefault();
    set_error("");

    if (
      type === "事件" &&
      `${start_date}T${start_time}` >= `${ddl_date}T${ddl_time}`
    ) {
      set_error("事件的开始时间必须早于结束时间");
      return;
    }

    if (repeat_type === "custom" && repeat_days.length === 0) {
      set_error("请至少选择一个重复日");
      return;
    }

    set_saving(true);

    const result = await createClient().rpc("save_event", {
      user_id,
      password,
      event_id: event?.event_id ?? null,
      event_name,
      type,
      repeat_type,
      repeat_days: repeat_type === "custom" ? repeat_days : [],
      start_date: type === "事件" ? start_date : null,
      start_time: type === "事件" ? start_time : null,
      ddl_date,
      ddl_time,
      colour,
      description,
    });

    if (result.error) {
      set_error(result.error.message);
      set_saving(false);
      return;
    }

    on_saved();
  }

  async function delete_event() {
    if (!event || !window.confirm("确定删除这个 event 吗？")) return;
    set_saving(true);

    const result = await createClient().rpc("delete_event", {
      user_id,
      password,
      event_id: event.event_id,
    });

    if (result.error) {
      set_error(result.error.message);
      set_saving(false);
      return;
    }

    on_saved();
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-[15px] backdrop-blur-sm"
      role="dialog"
    >
      <section className="hide-scrollbar max-h-[76dvh] w-full max-w-[340px] overflow-y-auto rounded-3xl bg-[#f3f7ef] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
              {event ? "Edit event" : "New event"}
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {event ? "编辑 event" : "添加 event"}
            </h2>
          </div>
          <button
            aria-label="关闭"
            className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition active:scale-90 active:bg-slate-200"
            onClick={on_close}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handle_submit}>
          <label className="block text-sm font-semibold text-slate-700">
            event_name
            <input
              className="field !mt-1 !rounded-xl !px-3 !py-2"
              onChange={(form_event) => set_event_name(form_event.target.value)}
              required
              value={event_name}
            />
          </label>

          <div className="grid gap-3">
            <label className="block text-sm font-semibold text-slate-700">
              type
              <select
                className="field !mt-1 !rounded-xl !px-3 !py-2"
                onChange={(form_event) =>
                  set_type(form_event.target.value as (typeof types)[number])
                }
                value={type}
              >
                {types.map((type_option) => (
                  <option key={type_option}>{type_option}</option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-500">
                {type === "任务"
                  ? "任务：有明确的截止日期和时间。"
                  : "事件：会持续一段时间，需要填写开始与结束时间。"}
              </span>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              重复
              <select
                className="field !mt-1 !rounded-xl !px-3 !py-2"
                onChange={(form_event) =>
                  set_repeat_type(form_event.target.value as RepeatType)
                }
                value={repeat_type}
              >
                {repeat_options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {repeat_type === "custom" && (
              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">
                  每周重复日
                </legend>
                <div className="mt-1 grid grid-cols-7 gap-1.5">
                  {weekday_options.map((weekday) => {
                    const selected = repeat_days.includes(weekday.value);
                    return (
                      <button
                        aria-pressed={selected}
                        className={`aspect-square rounded-lg text-sm font-bold transition active:scale-90 ${selected ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
                        key={weekday.value}
                        onClick={() =>
                          set_repeat_days((current) =>
                            selected
                              ? current.filter((day) => day !== weekday.value)
                              : [...current, weekday.value].sort((a, b) => a - b),
                          )
                        }
                        type="button"
                      >
                        {weekday.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            {type === "事件" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-slate-700">
                  开始日期
                  <input
                    className="field !mt-1 !rounded-xl !px-3 !py-2"
                    onChange={(form_event) => set_start_date(form_event.target.value)}
                    required
                    type="date"
                    value={start_date}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  开始时间
                  <input
                    className="field !mt-1 !rounded-xl !px-3 !py-2"
                    onChange={(form_event) => set_start_time(form_event.target.value)}
                    required
                    type="time"
                    value={start_time}
                  />
                </label>
              </div>
            )}
            <div className={`grid gap-3 ${type === "事件" ? "grid-cols-2" : ""}`}>
              <label className="block text-sm font-semibold text-slate-700">
                {type === "事件" ? "结束日期" : "截止日期"}
                <input
                  className="field !mt-1 !rounded-xl !px-3 !py-2"
                  onChange={(form_event) => set_ddl_date(form_event.target.value)}
                  required
                  type="date"
                  value={ddl_date}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {type === "事件" ? "结束时间" : "截止时间"}
                <input
                  className="field !mt-1 !rounded-xl !px-3 !py-2"
                  onChange={(form_event) => set_ddl_time(form_event.target.value)}
                  required
                  type="time"
                  value={ddl_time}
                />
              </label>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">colour</legend>
            <div className="mt-1 flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3">
              {colours.map((colour_option) => (
                <button
                  aria-label={`选择 colour ${colour_option}`}
                  className={`size-7 rounded-full transition active:scale-90 ${colour === colour_option ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : ""}`}
                  key={colour_option}
                  onClick={() => set_colour(colour_option)}
                  style={{ backgroundColor: colour_option }}
                  type="button"
                />
              ))}
              <button
                aria-expanded={show_more_colours}
                aria-label="更多颜色"
                className={`flex size-7 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm transition active:scale-90 ${!colours.includes(colour) ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : ""}`}
                onClick={() => set_show_more_colours((current) => !current)}
                style={{
                  background:
                    "conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                }}
                type="button"
              >
                +
              </button>
            </div>
            {show_more_colours && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-8 gap-2">
                  {more_colours.map((colour_option) => (
                    <button
                      aria-label={`选择 colour ${colour_option}`}
                      className={`aspect-square w-full rounded-md transition active:scale-90 ${colour === colour_option ? "ring-2 ring-slate-900 ring-offset-2" : ""}`}
                      key={colour_option}
                      onClick={() => set_colour(colour_option)}
                      style={{ backgroundColor: colour_option }}
                      type="button"
                    />
                  ))}
                </div>
                <label className="relative mt-3 flex min-h-10 cursor-pointer items-center gap-3 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition active:bg-slate-200">
                  <span
                    className="size-6 shrink-0 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: colour }}
                  />
                  自定义颜色
                  <input
                    aria-label="自定义颜色"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(form_event) => set_colour(form_event.target.value)}
                    type="color"
                    value={colour}
                  />
                </label>
              </div>
            )}
          </fieldset>

          <label className="block text-sm font-semibold text-slate-700">
            description
            <textarea
              className="field !mt-1 min-h-20 resize-y !rounded-xl !px-3 !py-2"
              onChange={(form_event) => set_description(form_event.target.value)}
              value={description}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3">
            {event ? (
              <button
                className="min-h-11 rounded-xl px-4 font-semibold text-red-600 transition active:scale-[0.98] active:bg-red-50"
                disabled={saving}
                onClick={() => void delete_event()}
                type="button"
              >
                删除 event
              </button>
            ) : (
              <span />
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-xl border border-slate-200 px-4 font-semibold transition active:scale-[0.98] active:bg-slate-100"
                onClick={on_close}
                type="button"
              >
                取消
              </button>
              <button
                className="min-h-11 rounded-xl bg-slate-950 px-4 font-semibold text-white transition active:scale-[0.98] active:bg-slate-800"
                disabled={saving}
                type="submit"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
