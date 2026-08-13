import { deriveStudyTimeForecast, type DeriveStudyTimeForecastInput } from "./forecast";

interface ForecastWorkerScope {
  onmessage: ((event: MessageEvent<DeriveStudyTimeForecastInput>) => void) | null;
  postMessage: (message: ForecastWorkerResponse) => void;
}

type ForecastWorkerResponse =
  | {
      readonly type: "complete";
      readonly forecast: ReturnType<typeof deriveStudyTimeForecast>;
    }
  | { readonly type: "error"; readonly message: string };

const workerScope = self as unknown as ForecastWorkerScope;

workerScope.onmessage = (event) => {
  try {
    workerScope.postMessage({
      type: "complete",
      forecast: deriveStudyTimeForecast(event.data),
    });
  } catch (error: unknown) {
    workerScope.postMessage({
      type: "error",
      message:
        error instanceof Error ? error.message : "Forecast could not be calculated.",
    });
  }
};
