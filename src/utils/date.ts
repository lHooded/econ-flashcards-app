const HOURS_IN_MS = 60 * 60 * 1000;

export function getStudyDeadline(
  examAt: string | null,
  studyBufferHours: number,
): string | null {
  if (examAt === null) {
    return null;
  }

  const examTimestamp = Date.parse(examAt);
  if (!Number.isFinite(examTimestamp)) {
    return null;
  }

  return new Date(examTimestamp - studyBufferHours * HOURS_IN_MS).toISOString();
}

export function formatLocalDateTime(
  isoDate: string | null,
  emptyLabel = "Not configured",
): string {
  if (isoDate === null) {
    return emptyLabel;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toLocalDateTimeInputValue(isoDate: string | null): string {
  if (isoDate === null) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

export function localDateTimeInputToIso(value: string): string | null {
  if (value.trim() === "") {
    return null;
  }

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    throw new Error("Choose a valid exam date and time.");
  }

  return date.toISOString();
}
