import {
  ANNOTATION_ANCHORS,
  CURVE_INTERPOLATIONS,
  LINE_STYLES,
  REFERENCE_LINE_ORIENTATIONS,
  STIMULUS_TYPES,
  TABLE_ALIGNMENTS,
  type AnnotationAnchor,
  type AxisSpec,
  type CurveInterpolation,
  type DataTableStimulus,
  type EconGraphStimulus,
  type GraphCoordinate,
  type QuestionStimulusSpec,
  type ReferenceLineOrientation,
  type StimulusLineStyle,
  type TableAlignment,
} from "./model";

const MAX_TABLE_ROWS = 12;
const MAX_GRAPH_PRIMITIVES = 100;

export function validateQuestionStimulus(input: unknown): QuestionStimulusSpec {
  return parseQuestionStimulus(input, "stimulus");
}

export function parseQuestionStimulus(
  input: unknown,
  path: string,
): QuestionStimulusSpec {
  const stimulus = requireRecord(input, path);
  const type = requireEnum(stimulus.type, STIMULUS_TYPES, `${path}.type`);

  if (type === "econ_graph") return parseGraphStimulus(stimulus, path);
  return parseTableStimulus(stimulus, path);
}

function parseGraphStimulus(
  stimulus: Record<string, unknown>,
  path: string,
): EconGraphStimulus {
  const xAxis = parseAxis(stimulus.xAxis, `${path}.xAxis`);
  const yAxis = parseAxis(stimulus.yAxis, `${path}.yAxis`);
  const curves = requireArray(stimulus.curves, `${path}.curves`).map((value, index) =>
    parseCurve(value, index, xAxis, yAxis, path),
  );
  const points = parseOptionalArray(stimulus.points, `${path}.points`, (value, index) =>
    parsePoint(value, index, xAxis, yAxis, path),
  );
  const referenceLines = parseOptionalArray(
    stimulus.referenceLines,
    `${path}.referenceLines`,
    (value, index) => parseReferenceLine(value, index, xAxis, yAxis, path),
  );
  const arrows = parseOptionalArray(stimulus.arrows, `${path}.arrows`, (value, index) =>
    parseArrow(value, index, xAxis, yAxis, path),
  );
  const annotations = parseOptionalArray(
    stimulus.annotations,
    `${path}.annotations`,
    (value, index) => parseAnnotation(value, index, xAxis, yAxis, path),
  );
  assertUniqueIds(curves, `${path}.curves`);
  if (points !== undefined) assertUniqueIds(points, `${path}.points`);
  if (referenceLines !== undefined) {
    assertUniqueIds(referenceLines, `${path}.referenceLines`);
  }
  if (arrows !== undefined) assertUniqueIds(arrows, `${path}.arrows`);
  if (annotations !== undefined) assertUniqueIds(annotations, `${path}.annotations`);

  const primitiveCount =
    curves.length +
    (points?.length ?? 0) +
    (referenceLines?.length ?? 0) +
    (arrows?.length ?? 0) +
    (annotations?.length ?? 0);
  if (primitiveCount === 0) {
    throw new Error(
      `${path} must contain at least one curve or other graph primitive.`,
    );
  }
  if (primitiveCount > MAX_GRAPH_PRIMITIVES) {
    throw new Error(`${path} contains too many graph primitives.`);
  }

  return {
    type: "econ_graph",
    title: requireString(stimulus.title, `${path}.title`),
    description: requireString(stimulus.description, `${path}.description`),
    xAxis,
    yAxis,
    curves,
    ...(points === undefined ? {} : { points }),
    ...(referenceLines === undefined ? {} : { referenceLines }),
    ...(arrows === undefined ? {} : { arrows }),
    ...(annotations === undefined ? {} : { annotations }),
  };
}

function parseAxis(value: unknown, path: string): AxisSpec {
  const axis = requireRecord(value, path);
  const domainValue = axis.domain;
  if (!Array.isArray(domainValue) || domainValue.length !== 2) {
    throw new Error(`${path}.domain must contain exactly two numbers.`);
  }
  const domain = [
    requireFiniteNumber(domainValue[0], `${path}.domain[0]`),
    requireFiniteNumber(domainValue[1], `${path}.domain[1]`),
  ] as const;
  if (domain[1] <= domain[0]) {
    throw new Error(`${path}.domain must be finite and strictly increasing.`);
  }

  const ticks = parseOptionalArray(axis.ticks, `${path}.ticks`, (tick, index) => {
    const record = requireRecord(tick, `${path}.ticks[${index}]`);
    const value = requireFiniteNumber(record.value, `${path}.ticks[${index}].value`);
    if (value < domain[0] || value > domain[1]) {
      throw new Error(`${path}.ticks[${index}].value must lie within the axis domain.`);
    }
    return {
      value,
      label: requireString(record.label, `${path}.ticks[${index}].label`),
    };
  });

  return {
    label: requireString(axis.label, `${path}.label`),
    domain,
    ...(ticks === undefined ? {} : { ticks }),
    ...(axis.showTickLabels === undefined
      ? {}
      : {
          showTickLabels: requireBoolean(axis.showTickLabels, `${path}.showTickLabels`),
        }),
  };
}

function parseCurve(
  value: unknown,
  index: number,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
  graphPath: string,
) {
  const path = `${graphPath}.curves[${index}]`;
  const curve = requireRecord(value, path);
  const points = requireArray(curve.points, `${path}.points`).map((point, pointIndex) =>
    parseCoordinate(point, `${path}.points[${pointIndex}]`, xAxis, yAxis),
  );
  if (points.length < 2) {
    throw new Error(`${path}.points must contain at least two coordinates.`);
  }
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    if (points[pointIndex].x <= points[pointIndex - 1].x) {
      throw new Error(`${path}.points must have strictly increasing x coordinates.`);
    }
  }

  const interpolation = parseOptionalEnum(
    curve.interpolation,
    CURVE_INTERPOLATIONS,
    `${path}.interpolation`,
  );
  const lineStyle = parseOptionalEnum(
    curve.lineStyle,
    LINE_STYLES,
    `${path}.lineStyle`,
  );
  const labelAt =
    curve.labelAt === undefined
      ? undefined
      : parseCoordinate(curve.labelAt, `${path}.labelAt`, xAxis, yAxis);

  return {
    id: requireString(curve.id, `${path}.id`),
    label: requireString(curve.label, `${path}.label`),
    points,
    ...(interpolation === undefined ? {} : { interpolation }),
    ...(lineStyle === undefined ? {} : { lineStyle }),
    ...(labelAt === undefined ? {} : { labelAt }),
  };
}

function parsePoint(
  value: unknown,
  index: number,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
  graphPath: string,
) {
  const path = `${graphPath}.points[${index}]`;
  const point = requireRecord(value, path);
  const guideLines = parseOptionalArray(
    point.guideLines,
    `${path}.guideLines`,
    (line, lineIndex) => {
      if (line !== "x" && line !== "y") {
        throw new Error(`${path}.guideLines[${lineIndex}] must be "x" or "y".`);
      }
      return line;
    },
  );
  return {
    ...parseCoordinate(point, path, xAxis, yAxis),
    id: requireString(point.id, `${path}.id`),
    label: requireString(point.label, `${path}.label`),
    ...(guideLines === undefined ? {} : { guideLines }),
  };
}

function parseReferenceLine(
  value: unknown,
  index: number,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
  graphPath: string,
) {
  const path = `${graphPath}.referenceLines[${index}]`;
  const line = requireRecord(value, path);
  const orientation = requireEnum(
    line.orientation,
    REFERENCE_LINE_ORIENTATIONS,
    `${path}.orientation`,
  );
  const valueCoordinate = requireFiniteNumber(line.value, `${path}.value`);
  const domain = orientation === "horizontal" ? yAxis.domain : xAxis.domain;
  if (valueCoordinate < domain[0] || valueCoordinate > domain[1]) {
    throw new Error(`${path}.value must lie within its axis domain.`);
  }
  const lineStyle = parseOptionalEnum(line.lineStyle, LINE_STYLES, `${path}.lineStyle`);
  return {
    id: requireString(line.id, `${path}.id`),
    orientation,
    value: valueCoordinate,
    label: requireString(line.label, `${path}.label`),
    ...(lineStyle === undefined ? {} : { lineStyle }),
  };
}

function parseArrow(
  value: unknown,
  index: number,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
  graphPath: string,
) {
  const path = `${graphPath}.arrows[${index}]`;
  const arrow = requireRecord(value, path);
  const from = parseCoordinate(arrow.from, `${path}.from`, xAxis, yAxis);
  const to = parseCoordinate(arrow.to, `${path}.to`, xAxis, yAxis);
  if (from.x === to.x && from.y === to.y) {
    throw new Error(`${path}.from and ${path}.to must be different coordinates.`);
  }
  return {
    id: requireString(arrow.id, `${path}.id`),
    from,
    to,
    ...(arrow.label === undefined
      ? {}
      : { label: requireString(arrow.label, `${path}.label`) }),
  };
}

function parseAnnotation(
  value: unknown,
  index: number,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
  graphPath: string,
) {
  const path = `${graphPath}.annotations[${index}]`;
  const annotation = requireRecord(value, path);
  const anchor = parseOptionalEnum(
    annotation.anchor,
    ANNOTATION_ANCHORS,
    `${path}.anchor`,
  );
  return {
    ...parseCoordinate(annotation, path, xAxis, yAxis),
    id: requireString(annotation.id, `${path}.id`),
    text: requireString(annotation.text, `${path}.text`),
    ...(anchor === undefined ? {} : { anchor }),
  };
}

function parseCoordinate(
  value: unknown,
  path: string,
  xAxis: AxisSpec,
  yAxis: AxisSpec,
): GraphCoordinate {
  const coordinate = requireRecord(value, path);
  const x = requireFiniteNumber(coordinate.x, `${path}.x`);
  const y = requireFiniteNumber(coordinate.y, `${path}.y`);
  if (x < xAxis.domain[0] || x > xAxis.domain[1]) {
    throw new Error(`${path}.x must lie within the x-axis domain.`);
  }
  if (y < yAxis.domain[0] || y > yAxis.domain[1]) {
    throw new Error(`${path}.y must lie within the y-axis domain.`);
  }
  return { x, y };
}

function parseTableStimulus(
  stimulus: Record<string, unknown>,
  path: string,
): DataTableStimulus {
  const columns = requireArray(stimulus.columns, `${path}.columns`).map(
    (value, index) => {
      const columnPath = `${path}.columns[${index}]`;
      const column = requireRecord(value, columnPath);
      const align = parseOptionalEnum(
        column.align,
        TABLE_ALIGNMENTS,
        `${columnPath}.align`,
      );
      return {
        key: requireString(column.key, `${columnPath}.key`),
        label: requireString(column.label, `${columnPath}.label`),
        ...(align === undefined ? {} : { align }),
      };
    },
  );
  if (columns.length < 2 || columns.length > 6) {
    throw new Error(`${path}.columns must contain between 2 and 6 columns.`);
  }
  if (new Set(columns.map((column) => column.key)).size !== columns.length) {
    throw new Error(`${path}.columns must have unique keys.`);
  }

  const rows = requireArray(stimulus.rows, `${path}.rows`).map((value, index) => {
    const rowPath = `${path}.rows[${index}]`;
    const row = requireRecord(value, rowPath);
    const cells = requireArray(row.cells, `${rowPath}.cells`).map((cell, cellIndex) =>
      requireString(cell, `${rowPath}.cells[${cellIndex}]`),
    );
    if (cells.length !== columns.length) {
      throw new Error(`${rowPath}.cells must contain exactly ${columns.length} cells.`);
    }
    return {
      id: requireString(row.id, `${rowPath}.id`),
      cells,
    };
  });
  if (rows.length < 2 || rows.length > MAX_TABLE_ROWS) {
    throw new Error(`${path}.rows must contain between 2 and ${MAX_TABLE_ROWS} rows.`);
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error(`${path}.rows must have unique IDs.`);
  }

  return {
    type: "table",
    caption: requireString(stimulus.caption, `${path}.caption`),
    columns,
    rows,
    ...(stimulus.note === undefined
      ? {}
      : { note: requireString(stimulus.note, `${path}.note`) }),
  };
}

function parseOptionalArray<T>(
  value: unknown,
  path: string,
  parser: (value: unknown, index: number) => T,
): T[] | undefined {
  if (value === undefined) return undefined;
  return requireArray(value, path).map(parser);
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Stimulus validation failed: ${path} must be an array.`);
  }
  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Stimulus validation failed: ${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Stimulus validation failed: ${path} must be a non-empty string.`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Stimulus validation failed: ${path} must be a boolean.`);
  }
  return value;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Stimulus validation failed: ${path} must be finite.`);
  }
  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  choices: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !choices.includes(value as T)) {
    throw new Error(
      `Stimulus validation failed: ${path} has unsupported value "${String(value)}".`,
    );
  }
  return value as T;
}

function parseOptionalEnum<T extends string>(
  value: unknown,
  choices: readonly T[],
  path: string,
): T | undefined {
  return value === undefined ? undefined : requireEnum(value, choices, path);
}

function assertUniqueIds(
  values: readonly { readonly id: string }[],
  path: string,
): void {
  if (new Set(values.map((value) => value.id)).size !== values.length) {
    throw new Error(`Stimulus validation failed: ${path} must have unique IDs.`);
  }
}

export type {
  AnnotationAnchor,
  AxisSpec,
  CurveInterpolation,
  ReferenceLineOrientation,
  StimulusLineStyle,
  TableAlignment,
};
