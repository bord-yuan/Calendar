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

export function eventStartDate(event: EventRecord) {
  if (event.type === "事件" && event.start_date && event.start_time) {
    return new Date(`${event.start_date}T${event.start_time}`);
  }
  return eventDate(event);
}

export function eventDeadlineDate(event: EventRecord) {
  return event.type === "事件" ? eventStartDate(event) : eventDate(event);
}

export function formatTime(ddl_time: string) {
  return ddl_time.slice(0, 5);
}

export function formatEventTime(event: EventRecord) {
  if (event.type === "任务" || !event.start_date || !event.start_time) {
    return formatTime(event.ddl_time);
  }

  const start_time = formatTime(event.start_time);
  const end_time = formatTime(event.ddl_time);
  if (event.start_date === event.ddl_date) {
    return `${start_time}–${end_time}`;
  }

  const start_date = eventStartDate(event);
  const end_date = eventDate(event);
  return `${start_date.getMonth() + 1}月${start_date.getDate()}日 ${start_time} – ${end_date.getMonth() + 1}月${end_date.getDate()}日 ${end_time}`;
}

export function eventOccursOnDate(event: EventRecord, date: Date) {
  const key = dateKey(date);
  if (event.type === "任务" || !event.start_date) {
    return event.ddl_date === key;
  }
  return event.start_date <= key && event.ddl_date >= key;
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

export function formatEventSchedule(event: EventRecord) {
  if (event.type === "任务" || !event.start_date || !event.start_time) {
    return `${formatFullDate(eventDate(event))} · ${formatTime(event.ddl_time)}`;
  }

  const start = eventStartDate(event);
  const end = eventDate(event);
  if (event.start_date === event.ddl_date) {
    return `${formatFullDate(start)} · ${formatEventTime(event)}`;
  }
  return `${formatFullDate(start)} ${formatTime(event.start_time)} – ${formatFullDate(end)} ${formatTime(event.ddl_time)}`;
}

export function formatEventCountdown(event: EventRecord, now: Date) {
  const target = eventDeadlineDate(event);
  const difference = target.getTime() - now.getTime();
  const total_minutes = Math.floor(Math.abs(difference) / (60 * 1000));
  const hours = Math.floor(total_minutes / 60);
  const minutes = total_minutes % 60;
  const duration = `${hours}h${minutes}min`;

  return difference < 0 ? `过期 ${duration}` : duration;
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

export const repeatLabels: Record<EventRecord["repeat_type"], string> = {
  once: "一次性",
  daily: "每天",
  weekdays: "周一至周五",
  custom: "自定义重复",
};

export function formatRepeat(event: EventRecord) {
  if (event.repeat_type !== "custom") return repeatLabels[event.repeat_type];

  const weekday_labels = ["一", "二", "三", "四", "五", "六", "日"];
  return `每周${event.repeat_days.map((day) => weekday_labels[day - 1]).join("、")}`;
}
