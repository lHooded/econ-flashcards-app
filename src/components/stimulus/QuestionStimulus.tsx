import type { QuestionStimulusSpec } from "../../stimulus/model";
import { DataTable } from "./DataTable";
import { EconGraph } from "./EconGraph";

export function QuestionStimulus({ stimulus }: { stimulus?: QuestionStimulusSpec }) {
  if (stimulus === undefined) return null;
  return stimulus.type === "econ_graph" ? (
    <EconGraph stimulus={stimulus} />
  ) : (
    <DataTable stimulus={stimulus} />
  );
}
