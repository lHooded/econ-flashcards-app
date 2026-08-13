import type { StudyTimeForecast } from "./model";

export type ForecastWorkerResponse =
  | { readonly type: "complete"; readonly forecast: StudyTimeForecast }
  | { readonly type: "error"; readonly message: string };

export type ForecastWorkerLoadState =
  | { readonly status: "ready"; readonly forecast: StudyTimeForecast }
  | { readonly status: "error"; readonly message: string };

export function reduceForecastWorkerResponse(
  response: ForecastWorkerResponse,
  cancelled = false,
): ForecastWorkerLoadState | null {
  if (cancelled) return null;
  return response.type === "complete"
    ? { status: "ready", forecast: response.forecast }
    : { status: "error", message: response.message };
}
