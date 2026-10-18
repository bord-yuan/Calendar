import { dateKey } from "@/lib/calendar";
import { randomColour } from "@/lib/colours";
import { course_periods } from "@/lib/course-schedule";

type CourseRule = {
  weekday: number;
  event_name: string;
  teacher: string;
  weeks: number[];
  room: string;
  first_period: number;
  last_period: number;
  colour: string;
};

export type ParsedCourseWorkbook = {
  term: string;
  course_names: string[];
  occurrence_count: number;
  rules: CourseRule[];
};

export type CourseImportItem = {
  event_name: string;
  start_date: string;
  start_time: string;
  ddl_date: string;
  ddl_time: string;
  colour: string;
  description: string;
};

const weekday_labels = [
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
  "星期日",
];

export async function parseCourseWorkbook(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const first_sheet_name = workbook.SheetNames[0];
  if (!first_sheet_name) throw new Error("课表中没有工作表");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[first_sheet_name],
    { header: 1, defval: "", raw: false },
  );
  const weekday_row = rows.findIndex((row) =>
    weekday_labels.every((label, index) => cell_text(row[index + 1]) === label),
  );
  if (weekday_row < 0) throw new Error("没有找到星期一至星期日的课表表头");

  const metadata = rows
    .slice(0, weekday_row)
    .flat()
    .map(cell_text)
    .join(" ");
  const term = metadata.match(/学年学期：\s*([0-9-]+)/)?.[1] ?? "";
  const parsed_rules: Omit<CourseRule, "colour">[] = [];

  for (const row of rows.slice(weekday_row + 1)) {
    if (row.some((value) => cell_text(value).startsWith("备注："))) break;

    for (let weekday_index = 0; weekday_index < 7; weekday_index += 1) {
      const lines = cell_text(row[weekday_index + 1])
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      for (const block of parse_course_blocks(lines, weekday_index)) {
        const period_numbers = parse_periods(block.periods);
        parsed_rules.push({
          weekday: weekday_index,
          event_name: block.event_name,
          teacher: block.teacher,
          weeks: parse_weeks(block.weeks),
          room: block.room,
          first_period: period_numbers[0],
          last_period: period_numbers[period_numbers.length - 1],
        });
      }
    }
  }

  const unique_rules = [
    ...new Map(
      parsed_rules.map((rule) => [
        [
          rule.weekday,
          rule.event_name,
          rule.teacher,
          rule.weeks.join(","),
          rule.room,
          rule.first_period,
          rule.last_period,
        ].join("|"),
        rule,
      ]),
    ).values(),
  ];
  if (unique_rules.length === 0) throw new Error("课表中没有可导入的课程");

  const colour_by_course = new Map<string, string>();
  const rules = unique_rules.map((rule) => {
    if (!colour_by_course.has(rule.event_name)) {
      colour_by_course.set(rule.event_name, randomColour());
    }
    return { ...rule, colour: colour_by_course.get(rule.event_name)! };
  });

  return {
    term,
    course_names: [...colour_by_course.keys()],
    occurrence_count: rules.reduce((count, rule) => count + rule.weeks.length, 0),
    rules,
  } satisfies ParsedCourseWorkbook;
}

export function buildCourseImportItems(
  parsed: ParsedCourseWorkbook,
  first_week_monday: string,
) {
  return parsed.rules.flatMap((rule) => {
    const start_period = course_periods.find(
      (period) => period.period === rule.first_period,
    );
    const end_period = course_periods.find(
      (period) => period.period === rule.last_period,
    );
    if (!start_period || !end_period) throw new Error("课表中存在未知节次");

    return rule.weeks.map((week) => {
      const date = add_days(
        first_week_monday,
        (week - 1) * 7 + rule.weekday,
      );
      return {
        event_name: rule.event_name,
        start_date: date,
        start_time: minutes_time(start_period.start),
        ddl_date: date,
        ddl_time: minutes_time(end_period.end),
        colour: rule.colour,
        description: `教师：${rule.teacher}\n地点：${rule.room}`,
      } satisfies CourseImportItem;
    });
  });
}

function cell_text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function parse_weeks(value: string) {
  const body = value.replace(/[［\[]周[］\]]/g, "").replaceAll("，", ",");
  const weeks = body.split(",").flatMap((part) => {
    const range = part.trim().match(/^(\d+)-(\d+)$/);
    if (!range) {
      const week = Number(part.trim());
      if (!Number.isInteger(week) || week < 1) throw new Error(`无法识别周次：${value}`);
      return [week];
    }

    const start = Number(range[1]);
    const end = Number(range[2]);
    if (start < 1 || end < start) throw new Error(`无法识别周次：${value}`);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  return [...new Set(weeks)].sort((first, second) => first - second);
}

function parse_periods(value: string) {
  const periods = (value.match(/\d+/g) ?? []).map(Number);
  if (
    periods.length === 0 ||
    periods.some((period) => period < 1 || period > course_periods.length)
  ) {
    throw new Error(`无法识别节次：${value}`);
  }
  return periods;
}

function parse_course_blocks(lines: string[], weekday_index: number) {
  const blocks: {
    event_name: string;
    teacher: string;
    weeks: string;
    room: string;
    periods: string;
  }[] = [];
  let block_start = 0;

  lines.forEach((line, index) => {
    if (!/^[［\[].+[］\]]节$/.test(line)) return;

    const block = lines.slice(block_start, index + 1);
    if (block.length < 5) {
      throw new Error(`${weekday_labels[weekday_index]}存在无法识别的课程内容`);
    }

    blocks.push({
      event_name: block.slice(0, -4).join(" "),
      teacher: block[block.length - 4],
      weeks: block[block.length - 3],
      room: block[block.length - 2],
      periods: block[block.length - 1],
    });
    block_start = index + 1;
  });

  if (block_start !== lines.length) {
    throw new Error(`${weekday_labels[weekday_index]}存在无法识别的课程内容`);
  }

  return blocks;
}

function add_days(date_value: string, days: number) {
  const [year, month, day] = date_value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function minutes_time(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
