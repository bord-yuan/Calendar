"use client";

import { useState } from "react";
import { remove_cache_prefix } from "@/lib/cache";
import { createClient } from "@/lib/supabase/client";
import type { EventRecord, LoginSession } from "@/types/calendar";

type FieldName = "event_name" | "type";

const field_options: FieldName[] = ["event_name", "type"];
const type_options = ["任务", "事件", "课程"];

export function BulkDeleteEvents({ user_id, password }: LoginSession) {
  const [show_modal, set_show_modal] = useState(false);
  const [field_name, set_field_name] = useState<FieldName>("type");
  const [field_value, set_field_value] = useState("任务");
  const [event_names, set_event_names] = useState<string[]>([]);
  const [loading_names, set_loading_names] = useState(false);
  const [deleting, set_deleting] = useState(false);
  const [error, set_error] = useState("");
  const [result_message, set_result_message] = useState("");
  const value_options = field_name === "type" ? type_options : event_names;
  const value_label = field_value;

  async function open_modal() {
    set_show_modal(true);
    set_loading_names(true);
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
      const names = Array.from(
        new Set(
          ((result.data ?? []) as EventRecord[]).map((event) => event.event_name),
        ),
      ).sort((first, second) => first.localeCompare(second, "zh-CN"));
      set_event_names(names);
      if (field_name === "event_name") set_field_value(names[0] ?? "");
    }
    set_loading_names(false);
  }

  function change_field(next_field_name: FieldName) {
    set_field_name(next_field_name);
    set_field_value(
      next_field_name === "type" ? type_options[0] : (event_names[0] ?? ""),
    );
    set_error("");
    set_result_message("");
  }

  async function delete_events() {
    if (!field_value) return;
    const condition = `${field_name}=${value_label}`;
    if (
      !window.confirm(
        `确定永久删除所有满足“${condition}”的事项吗？此操作不可撤回。`,
      )
    ) {
      return;
    }

    set_deleting(true);
    set_error("");
    set_result_message("");

    const result = await createClient().rpc("delete_events_by_field", {
      user_id,
      password,
      field_name,
      field_value,
    });

    if (result.error) {
      set_error(result.error.message);
    } else {
      const deleted_count = Number(result.data ?? 0);
      remove_cache_prefix(`calendar_events:v2:${user_id}:`);
      set_result_message(
        deleted_count > 0
          ? `已永久删除 ${deleted_count} 个事项`
          : `没有找到满足“${condition}”的事项`,
      );
    }
    set_deleting(false);
  }

  return (
    <>
      <button
        className="min-h-14 w-full rounded-2xl border border-red-200 bg-red-50 px-5 text-left font-bold text-red-700 shadow-sm transition active:scale-[0.98] active:bg-red-100"
        onClick={() => void open_modal()}
        type="button"
      >
        批量删除事项
      </button>

      {show_modal && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-[15px] backdrop-blur-sm"
          onClick={() => !deleting && set_show_modal(false)}
          role="dialog"
        >
          <section
            className="hide-scrollbar max-h-[76dvh] w-full max-w-[340px] overflow-y-auto rounded-3xl bg-[#f3f7ef] p-5 shadow-2xl"
            onClick={(click_event) => click_event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                  Danger zone
                </p>
                <h2 className="mt-2 text-xl font-bold">批量删除事项</h2>
              </div>
              <button
                aria-label="关闭批量删除"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition active:scale-90"
                disabled={deleting}
                onClick={() => set_show_modal(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <p className="mt-2 text-sm leading-6 text-red-600">
              按一个数据库字段的等值条件批量删除，删除后不可撤回。
            </p>

            <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            字段
            <select
              className="field mt-1"
              disabled={deleting || loading_names}
              onChange={(change_event) =>
                change_field(change_event.target.value as FieldName)
              }
              value={field_name}
            >
              {field_options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            等于
            <select
              className="field mt-1"
              disabled={deleting || loading_names || value_options.length === 0}
              onChange={(change_event) => {
                set_field_value(change_event.target.value);
                set_result_message("");
              }}
              value={field_value}
            >
              {loading_names && field_name === "event_name" ? (
                <option value="">正在读取事项名称…</option>
              ) : value_options.length > 0 ? (
                value_options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))
              ) : (
                <option value="">暂无可选事项</option>
              )}
            </select>
          </label>

          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            删除条件：{field_name}={value_label || "未填写"}
          </p>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {result_message && (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
              {result_message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              className="min-h-12 rounded-xl border border-slate-200 px-4 font-semibold text-slate-600 transition active:scale-[0.98] active:bg-slate-100"
              disabled={deleting}
              onClick={() => set_show_modal(false)}
              type="button"
            >
              取消
            </button>
            <button
              className="min-h-12 rounded-xl bg-red-600 px-4 font-bold text-white transition enabled:active:scale-[0.98] enabled:active:bg-red-700 disabled:bg-red-300"
              disabled={!field_value || deleting}
              onClick={() => void delete_events()}
              type="button"
            >
              {deleting ? "删除中…" : "永久删除"}
            </button>
          </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
