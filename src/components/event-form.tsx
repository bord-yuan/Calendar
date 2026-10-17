"use client";

import { FormEvent, useState } from "react";
import { dateKey } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, LoginSession } from "@/types/calendar";

const colours = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#475569"];
const types = ["课程", "作业", "普通"];

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
  const [type, set_type] = useState(event?.type ?? types[0]);
  const [ddl_date, set_ddl_date] = useState(event?.ddl_date ?? dateKey(new Date()));
  const [ddl_time, set_ddl_time] = useState(event?.ddl_time.slice(0, 5) ?? "09:00");
  const [colour, set_colour] = useState(event?.colour ?? colours[0]);
  const [description, set_description] = useState(event?.description ?? "");
  const [saving, set_saving] = useState(false);
  const [error, set_error] = useState("");

  async function handle_submit(form_event: FormEvent<HTMLFormElement>) {
    form_event.preventDefault();
    set_saving(true);
    set_error("");

    const result = await createClient().rpc("save_event", {
      user_id,
      password,
      event_id: event?.event_id ?? null,
      event_name,
      type,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
    >
      <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
              {event ? "Edit event" : "New event"}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {event ? "编辑 event" : "添加 event"}
            </h2>
          </div>
          <button
            aria-label="关闭"
            className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
            onClick={on_close}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handle_submit}>
          <label className="block text-sm font-semibold text-slate-700">
            event_name
            <input
              className="field"
              onChange={(form_event) => set_event_name(form_event.target.value)}
              required
              value={event_name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">
              type
              <select
                className="field"
                onChange={(form_event) => set_type(form_event.target.value)}
                value={type}
              >
                {types.map((type_option) => (
                  <option key={type_option}>{type_option}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              ddl_date
              <input
                className="field"
                onChange={(form_event) => set_ddl_date(form_event.target.value)}
                required
                type="date"
                value={ddl_date}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              ddl_time
              <input
                className="field"
                onChange={(form_event) => set_ddl_time(form_event.target.value)}
                required
                type="time"
                value={ddl_time}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">colour</legend>
            <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 px-3">
              {colours.map((colour_option) => (
                <button
                  aria-label={`选择 colour ${colour_option}`}
                  className={`size-7 rounded-full transition ${colour === colour_option ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : ""}`}
                  key={colour_option}
                  onClick={() => set_colour(colour_option)}
                  style={{ backgroundColor: colour_option }}
                  type="button"
                />
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold text-slate-700">
            description
            <textarea
              className="field min-h-28 resize-y"
              onChange={(form_event) => set_description(form_event.target.value)}
              value={description}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            {event ? (
              <button
                className="rounded-2xl px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
                disabled={saving}
                onClick={() => void delete_event()}
                type="button"
              >
                删除 event
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold"
                onClick={on_close}
                type="button"
              >
                取消
              </button>
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white"
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
