"use client";

import { useState } from "react";
import { remove_cache_prefix } from "@/lib/cache";
import { all_colours } from "@/lib/colours";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, LoginSession } from "@/types/calendar";

type CourseOption = {
  name: string;
  colour: string;
};

export function CourseNameEditor({ user_id, password }: LoginSession) {
  const [show_modal, set_show_modal] = useState(false);
  const [courses, set_courses] = useState<CourseOption[]>([]);
  const [selected_name, set_selected_name] = useState("");
  const [new_name, set_new_name] = useState("");
  const [selected_colour, set_selected_colour] = useState("");
  const [loading, set_loading] = useState(false);
  const [saving, set_saving] = useState(false);
  const [error, set_error] = useState("");
  const [result_message, set_result_message] = useState("");

  async function open_modal() {
    set_show_modal(true);
    set_loading(true);
    set_error("");
    set_result_message("");

    const result = await createClient().rpc("get_events", {
      user_id,
      password,
      from_date: null,
      to_date: null,
    });

    if (result.error) {
      set_error(result.error.message);
    } else {
      const course_map = new Map<string, string>();
      ((result.data ?? []) as EventRecord[])
        .filter((event) => event.type === "课程")
        .forEach((event) => {
          if (!course_map.has(event.event_name)) {
            course_map.set(event.event_name, event.colour);
          }
        });
      const course_options = [...course_map.entries()]
        .map(([name, colour]) => ({ name, colour }))
        .sort((first, second) =>
          first.name.localeCompare(second.name, "zh-CN"),
        );
      const first_course = course_options[0];
      set_courses(course_options);
      set_selected_name(first_course?.name ?? "");
      set_new_name(first_course?.name ?? "");
      set_selected_colour(first_course?.colour ?? "");
    }
    set_loading(false);
  }

  function select_course(course_name: string) {
    const course = courses.find((item) => item.name === course_name);
    set_selected_name(course_name);
    set_new_name(course?.name ?? "");
    set_selected_colour(course?.colour ?? "");
    set_result_message("");
  }

  async function update_course_card() {
    const trimmed_name = new_name.trim();
    if (!selected_name || !trimmed_name || !selected_colour) return;

    set_saving(true);
    set_error("");
    set_result_message("");

    const result = await createClient().rpc("update_course_cards", {
      user_id,
      password,
      old_event_name: selected_name,
      new_event_name: trimmed_name,
      new_colour: selected_colour,
    });

    if (result.error) {
      set_error(result.error.message);
    } else {
      const updated_count = Number(result.data ?? 0);
      remove_cache_prefix(`calendar_events:v2:${user_id}:`);
      const next_courses = courses
        .filter((course) => course.name !== selected_name)
        .concat({ name: trimmed_name, colour: selected_colour })
        .sort((first, second) =>
          first.name.localeCompare(second.name, "zh-CN"),
        );
      set_courses(next_courses);
      set_selected_name(trimmed_name);
      set_new_name(trimmed_name);
      set_result_message(`已修改 ${updated_count} 个课程事项`);
    }
    set_saving(false);
  }

  return (
    <>
      <button
        className="min-h-14 w-full rounded-2xl bg-white/80 px-5 text-left font-bold text-slate-700 shadow-sm transition active:scale-[0.98]"
        onClick={() => void open_modal()}
        type="button"
      >
        自定义课程卡
      </button>

      {show_modal && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-[15px] backdrop-blur-sm"
          onClick={() => !saving && set_show_modal(false)}
          role="dialog"
        >
          <section
            className="hide-scrollbar max-h-[76dvh] w-full max-w-[340px] overflow-y-auto rounded-3xl bg-[#f3f7ef] p-5 shadow-2xl"
            onClick={(click_event) => click_event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Customize course cards
                </p>
                <h2 className="mt-2 text-xl font-bold">自定义课程卡</h2>
              </div>
              <button
                aria-label="关闭自定义课程卡"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition active:scale-90"
                disabled={saving}
                onClick={() => set_show_modal(false)}
                type="button"
              >
                ×
              </button>
            </header>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                原课程名
                <select
                  className="field mt-1"
                  disabled={loading || saving || courses.length === 0}
                  onChange={(change_event) => select_course(change_event.target.value)}
                  value={selected_name}
                >
                  {loading ? (
                    <option value="">正在读取课程名…</option>
                  ) : courses.length > 0 ? (
                    courses.map((course) => (
                      <option key={course.name} value={course.name}>
                        {course.name}
                      </option>
                    ))
                  ) : (
                    <option value="">暂无课程</option>
                  )}
                </select>
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">
                  课程颜色
                </legend>
                <div className="mt-1 grid grid-cols-8 gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  {all_colours.map((colour) => (
                    <button
                      aria-label={`选择颜色 ${colour}`}
                      className={`aspect-square w-full rounded-md transition active:scale-90 ${selected_colour === colour ? "ring-2 ring-slate-900 ring-offset-2" : ""}`}
                      key={colour}
                      onClick={() => {
                        set_selected_colour(colour);
                        set_result_message("");
                      }}
                      style={{ backgroundColor: colour }}
                      type="button"
                    />
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-semibold text-slate-700">
                新课程名
                <input
                  className="field mt-1"
                  disabled={loading || saving}
                  onChange={(change_event) => {
                    set_new_name(change_event.target.value);
                    set_result_message("");
                  }}
                  placeholder="输入新的课程名"
                  value={new_name}
                />
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {result_message && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {result_message}
                </p>
              )}

              <button
                className="min-h-12 w-full rounded-xl bg-slate-950 px-4 font-bold text-white transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  loading ||
                  saving ||
                  !selected_name ||
                  !new_name.trim() ||
                  !selected_colour
                }
                onClick={() => void update_course_card()}
                type="button"
              >
                {saving ? "修改中…" : "保存课程卡"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
