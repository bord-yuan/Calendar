export type LoginSession = {
  user_id: string;
  password: string;
};

export type RepeatType = "once" | "daily" | "weekdays" | "custom";

export type EventRecord = {
  user_id: string;
  event_id: string;
  event_name: string;
  type: "任务" | "事件";
  start_date: string | null;
  start_time: string | null;
  ddl_date: string;
  ddl_time: string;
  colour: string;
  description: string;
  event_status: "unfinished" | "completed";
  repeat_type: RepeatType;
  repeat_days: number[];
  occurrence_date: string;
  series_start_date: string | null;
  series_ddl_date: string;
};

export type EventStatus = "upcoming" | "soon" | "ended";
