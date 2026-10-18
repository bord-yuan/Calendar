"use client";

import { useState } from "react";
import { remove_cache_prefix } from "@/lib/cache";
import { createClient } from "@/lib/supabase/client";
import type { LoginSession } from "@/types/calendar";

type FieldName =
  | "event_name"
  | "type"
  | "start_date"
  | "start_time"
  | "ddl_date"
  | "ddl_time"
  | "colour"
  | "description"
  | "event_status"
  | "repeat_type";

type FieldOption = {
  value: FieldName;
  label: string;
  input_type: "text" | "date" | "time" | "select";
  values?: { value: string; label: string }[];
};

const field_options: FieldOption[] = [
  { value: "event_name", label: "event_name", input_type: "text" },
  {
    value: "type",
    label: "type",
    input_type: "select",
    values: [
      { value: "任务", label: "任务" },
      { value: "事件", label: "事件" },
      { value: "课程", label: "课程（lecturer）" },
    ],
  },
  { value: "start_date", label: "start_date", input_type: "date" },
  { value: "start_time", label: "start_time", input_type: "time" },
  { value: "ddl_date", label: "ddl_date", input_type: "date" },
  { value: "ddl_time", label: "ddl_time", input_type: "time" },
  { value: "colour", label: "colour", input_type: "text" },
  { value: "description", label: "description", input_type: "text" },
  {
    value: "event_status",
    label: "event_status",
    input_type: "select",
    values: [
      { value: "unfinished", label: "未完成" },
      { value: "completed", label: "已完成" },
    ],
  },
  {
    value: "repeat_type",
    label: "repeat_type",
    input_type: "select",
    values: [
      { value: "once", label: "一次性" },
      { value: "daily", label: "每天" },
      { value: "weekdays", label: "周一至周五" },
      { value: "custom", label: "自定义" },
    ],
  },
];

export function BulkDeleteEvents({ user_id, password }: LoginSession) {
  const [expanded, set_expanded] = useState(false);
  const [field_name, set_field_name] = useState<FieldName>("type");
  const [field_value, set_field_value] = useState("任务");
  const [deleting, set_deleting] = useState(false);
  const [error, set_error] = useState("");
  const [result_message, set_result_message] = useState("");
  const selected_field = field_options.find(
    (option) => option.value === field_name,
  )!;
  const value_label =
    selected_field.values?.find((option) => option.value === field_value)?.label ??
    field_value;

  function change_field(next_field_name: FieldName) {
    const next_field = field_options.find(
      (option) => option.value === next_field_name,
    )!;
    set_field_name(next_field_name);
    set_field_value(next_field.values?.[0]?.value ?? "");
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
    <section className="rounded-[1.6rem] border border-red-200 bg-white/80 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
        Danger zone
      </p>
      <h2 className="mt-2 text-xl font-bold">批量删除事项</h2>
      <p className="mt-2 text-sm leading-6 text-red-600">
        按一个数据库字段的等值条件批量删除，删除后不可撤回。
      </p>

      {!expanded ? (
        <button
          className="mt-5 min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-4 font-bold text-red-700 transition active:scale-[0.98] active:bg-red-100"
          onClick={() => set_expanded(true)}
          type="button"
        >
          设置删除条件
        </button>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            字段
            <select
              className="field mt-1"
              disabled={deleting}
              onChange={(change_event) =>
                change_field(change_event.target.value as FieldName)
              }
              value={field_name}
            >
              {field_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            等于
            {selected_field.input_type === "select" ? (
              <select
                className="field mt-1"
                disabled={deleting}
                onChange={(change_event) => {
                  set_field_value(change_event.target.value);
                  set_result_message("");
                }}
                value={field_value}
              >
                {selected_field.values?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field mt-1"
                disabled={deleting}
                onChange={(change_event) => {
                  set_field_value(change_event.target.value);
                  set_result_message("");
                }}
                placeholder="请输入完全匹配的值"
                type={selected_field.input_type}
                value={field_value}
              />
            )}
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
              onClick={() => set_expanded(false)}
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
      )}
    </section>
  );
}
