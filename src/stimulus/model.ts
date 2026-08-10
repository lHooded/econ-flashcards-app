export const STIMULUS_TYPES = ["econ_graph", "table"] as const;
export type QuestionStimulusType = (typeof STIMULUS_TYPES)[number];

export const CURVE_INTERPOLATIONS = ["linear", "smooth"] as const;
export type CurveInterpolation = (typeof CURVE_INTERPOLATIONS)[number];

export const LINE_STYLES = ["solid", "dashed"] as const;
export type StimulusLineStyle = (typeof LINE_STYLES)[number];

export const REFERENCE_LINE_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ReferenceLineOrientation = (typeof REFERENCE_LINE_ORIENTATIONS)[number];

export const TABLE_ALIGNMENTS = ["left", "center", "right"] as const;
export type TableAlignment = (typeof TABLE_ALIGNMENTS)[number];

export const ANNOTATION_ANCHORS = ["start", "middle", "end"] as const;
export type AnnotationAnchor = (typeof ANNOTATION_ANCHORS)[number];

export interface AxisTick {
  readonly value: number;
  readonly label: string;
}

export interface AxisSpec {
  readonly label: string;
  readonly domain: readonly [number, number];
  readonly ticks?: readonly AxisTick[];
  readonly showTickLabels?: boolean;
}

export interface GraphCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface CurveSpec {
  readonly id: string;
  readonly label: string;
  readonly points: readonly GraphCoordinate[];
  readonly interpolation?: CurveInterpolation;
  readonly lineStyle?: StimulusLineStyle;
  readonly labelAt?: GraphCoordinate;
}

export interface PointSpec extends GraphCoordinate {
  readonly id: string;
  readonly label: string;
  readonly guideLines?: readonly ("x" | "y")[];
}

export interface ReferenceLineSpec {
  readonly id: string;
  readonly orientation: ReferenceLineOrientation;
  readonly value: number;
  readonly label: string;
  readonly lineStyle?: StimulusLineStyle;
}

export interface ArrowSpec {
  readonly id: string;
  readonly from: GraphCoordinate;
  readonly to: GraphCoordinate;
  readonly label?: string;
}

export interface AnnotationSpec extends GraphCoordinate {
  readonly id: string;
  readonly text: string;
  readonly anchor?: AnnotationAnchor;
}

export interface EconGraphStimulus {
  readonly type: "econ_graph";
  readonly title: string;
  readonly description: string;
  readonly xAxis: AxisSpec;
  readonly yAxis: AxisSpec;
  readonly curves: readonly CurveSpec[];
  readonly points?: readonly PointSpec[];
  readonly referenceLines?: readonly ReferenceLineSpec[];
  readonly arrows?: readonly ArrowSpec[];
  readonly annotations?: readonly AnnotationSpec[];
}

export interface DataTableColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: TableAlignment;
}

export interface DataTableRow {
  readonly id: string;
  readonly cells: readonly string[];
}

export interface DataTableStimulus {
  readonly type: "table";
  readonly caption: string;
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly DataTableRow[];
  readonly note?: string;
}

export type QuestionStimulusSpec = EconGraphStimulus | DataTableStimulus;
