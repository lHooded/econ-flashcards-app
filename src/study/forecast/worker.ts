import { deriveStudyTimeForecast, type DeriveStudyTimeForecastInput } from "./forecast";
import type { ForecastWorkerResponse } from "./workerProtocol";

interface ForecastWorkerScope {
  onmessage: ((event: MessageEvent<DeriveStudyTimeForecastInput>) => void) | null;
  postMessage: (message: ForecastWorkerResponse) => void;
}

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
