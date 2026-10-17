export type LoginSession = {
  user_id: string;
  password: string;
};

export type EventRecord = {
  user_id: string;
  event_id: string;
  event_name: string;
  type: string;
  ddl_date: string;
  ddl_time: string;
  colour: string;
  description: string;
};

export type EventStatus = "upcoming" | "soon" | "ended";
