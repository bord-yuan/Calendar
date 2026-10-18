"use client";

import { ChangeEvent, useState } from "react";
import {
  buildCourseImportItems,
  parseCourseWorkbook,
  type ParsedCourseWorkbook,
} from "@/lib/course-import";
import { createClient } from "@/lib/supabase/client";
import type { LoginSession } from "@/types/calendar";

export function CourseImport({ user_id, password }: LoginSession) {
  const [show_modal, set_show_modal] = useState(false);
  const [file_name, set_file_name] = useState("");
  const [first_week_monday, set_first_week_monday] = useState("");
  const [parsed, set_parsed] = useState<ParsedCourseWorkbook | null>(null);
  const [reading, set_reading] = useState(false);
  const [importing, set_importing] = useState(false);
  const [error, set_error] = useState("");
  const [success, set_success] = useState("");

  async function select_file(change_event: ChangeEvent<HTMLInputElement>) {
    const file = change_event.target.files?.[0];
    if (!file) return;

    set_file_name(file.name);
    set_parsed(null);
    set_error("");
    set_success("");
    set_reading(true);

    try {
      set_parsed(await parseCourseWorkbook(file));
    } catch (read_error) {
      set_error(
        read_error instanceof Error ? read_error.message : "无法读取该课表",
      );
    } finally {
      set_reading(false);
    }
  }

  async function import_courses() {
    if (!parsed || !first_week_monday) return;

    set_error("");
    set_success("");
    set_importing(true);

    try {
      const course_items = buildCourseImportItems(parsed, first_week_monday);
      const result = await createClient().rpc("import_courses", {
        user_id,
        password,
        course_items,
      });

      if (result.error) {
        set_error(result.error.message);
      } else {
        set_success(`已导入 ${result.data ?? course_items.length} 节课程`);
      }
    } catch (import_error) {
      set_error(
        import_error instanceof Error ? import_error.message : "导入课程失败",
      );
    } finally {
      set_importing(false);
    }
  }

  return (
    <>
      <button
        className="min-h-14 w-full rounded-2xl bg-white/80 px-5 text-left font-bold text-slate-700 shadow-sm transition active:scale-[0.98]"
        onClick={() => set_show_modal(true)}
        type="button"
      >
        导入北邮课表
      </button>

      {show_modal && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-[15px] backdrop-blur-sm"
          onClick={() => !importing && set_show_modal(false)}
          role="dialog"
        >
          <section
            className="hide-scrollbar max-h-[76dvh] w-full max-w-[340px] overflow-y-auto rounded-3xl bg-[#f3f7ef] p-5 shadow-2xl"
            onClick={(click_event) => click_event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Import courses
                </p>
                <h2 className="mt-2 text-xl font-bold">导入北邮课表</h2>
              </div>
              <button
                aria-label="关闭导入课表"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition active:scale-90"
                disabled={importing}
                onClick={() => set_show_modal(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              北邮教务-&gt;课程与考试-&gt;学期理论课表-&gt;打印-&gt;导入.xls文件，第一周周一为2026.8.31
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              课表文件
              <input
                accept=".xls"
                className="field mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-600"
                disabled={reading || importing}
                onChange={(change_event) => void select_file(change_event)}
                type="file"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              第 1 周周一
              <input
                className="field mt-1"
                disabled={importing}
                onChange={(change_event) => {
                  set_first_week_monday(change_event.target.value);
                  set_success("");
                }}
                type="date"
                value={first_week_monday}
              />
            </label>

            {reading && (
              <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                正在读取课表…
              </p>
            )}

            {parsed && (
              <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                <p className="font-bold text-slate-800">{file_name}</p>
                <p className="mt-1">
                  {parsed.term ? `${parsed.term} 学期 · ` : ""}
                  {parsed.course_names.length} 门课程 · {parsed.occurrence_count} 节课
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </p>
            )}

            <button
              className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-4 font-bold text-white transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!parsed || !first_week_monday || reading || importing}
              onClick={() => void import_courses()}
              type="button"
            >
              {importing
                ? "导入中…"
                : parsed
                  ? `导入 ${parsed.occurrence_count} 节课程`
                  : "请先选择课表"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
