import type { EventRecord, EventStatus } from "@/types/calendar";

const SOON_IN_MS = 30 * 60 * 1000;

export function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const distance_to_monday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + distance_to_monday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eventDate(event: EventRecord) {
  return new Date(`${event.ddl_date}T${event.ddl_time}`);
}

export function formatTime(ddl_time: string) {
  return ddl_time.slice(0, 5);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function getEventStatus(event: EventRecord, now: Date): EventStatus {
  const ddl = eventDate(event);
  if (ddl.getTime() < now.getTime()) return "ended";
  if (ddl.getTime() - now.getTime() <= SOON_IN_MS) return "soon";
  return "upcoming";
}

export const statusLabels: Record<EventStatus, string> = {
  upcoming: "未开始",
  soon: "即将到期",
  ended: "已结束",
};
