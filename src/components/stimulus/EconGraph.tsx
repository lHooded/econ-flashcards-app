import { useId } from "react";
import type {
  AnnotationSpec,
  AxisSpec,
  CurveSpec,
  EconGraphStimulus,
  GraphCoordinate,
  PointSpec,
  ReferenceLineSpec,
} from "../../stimulus/model";

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 440;
const PLOT = { left: 82, right: 28, top: 46, bottom: 66 } as const;
const CURVE_COLOURS = ["#176b87", "#b24c2f", "#247a5a", "#6a4c93"] as const;

export function EconGraph({ stimulus }: { stimulus: EconGraphStimulus }) {
  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const arrowMarkerId = `${idPrefix}-arrow`;
  const xScale = makeScale(stimulus.xAxis, true);
  const yScale = makeScale(stimulus.yAxis, false);

  return (
    <figure className="question-stimulus graph-stimulus">
      <figcaption>{stimulus.title}</figcaption>
      <svg
        className="econ-graph-svg"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        aria-label={`${stimulus.title}. ${stimulus.description}`}
      >
        <title id={titleId}>{stimulus.title}</title>
        <desc id={descriptionId}>{stimulus.description}</desc>
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#243b53" />
          </marker>
        </defs>
        <g className="econ-graph-plot">
          <Axis axis={stimulus.xAxis} horizontal scale={xScale} />
          <Axis axis={stimulus.yAxis} scale={yScale} />
          {stimulus.referenceLines?.map((line) => (
            <ReferenceLine key={line.id} line={line} xScale={xScale} yScale={yScale} />
          ))}
          {stimulus.curves.map((curve, index) => (
            <Curve
              key={curve.id}
              curve={curve}
              colour={CURVE_COLOURS[index % CURVE_COLOURS.length]}
              xScale={xScale}
              yScale={yScale}
            />
          ))}
          {stimulus.points?.map((point) => (
            <GraphPoint key={point.id} point={point} xScale={xScale} yScale={yScale} />
          ))}
          {stimulus.arrows?.map((arrow) => {
            const from = toSvgPoint(arrow.from, xScale, yScale);
            const to = toSvgPoint(arrow.to, xScale, yScale);
            return (
              <g key={arrow.id} className="econ-graph-arrow">
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  markerEnd={`url(#${arrowMarkerId})`}
                />
                {arrow.label === undefined ? null : (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 8}
                    textAnchor="middle"
                  >
                    {arrow.label}
                  </text>
                )}
              </g>
            );
          })}
          {stimulus.annotations?.map((annotation) => (
            <Annotation
              key={annotation.id}
              annotation={annotation}
              xScale={xScale}
              yScale={yScale}
            />
          ))}
        </g>
      </svg>
    </figure>
  );
}

type Scale = (value: number) => number;

function makeScale(axis: AxisSpec, horizontal: boolean): Scale {
  const [minimum, maximum] = axis.domain;
  const length = horizontal
    ? VIEWBOX_WIDTH - PLOT.left - PLOT.right
    : VIEWBOX_HEIGHT - PLOT.top - PLOT.bottom;
  const origin = horizontal ? PLOT.left : VIEWBOX_HEIGHT - PLOT.bottom;
  const direction = horizontal ? 1 : -1;
  return (value) =>
    origin + direction * ((value - minimum) / (maximum - minimum)) * length;
}

function Axis({
  axis,
  horizontal = false,
  scale,
}: {
  axis: AxisSpec;
  horizontal?: boolean;
  scale: Scale;
}) {
  const axisPosition = horizontal ? VIEWBOX_HEIGHT - PLOT.bottom : PLOT.left;
  const endPosition = horizontal ? VIEWBOX_WIDTH - PLOT.right : PLOT.top;
  const ticks = axis.ticks ?? [];
  const showTickLabels = axis.showTickLabels ?? true;

  return (
    <g className="econ-graph-axis">
      <line
        x1={horizontal ? PLOT.left : axisPosition}
        y1={horizontal ? axisPosition : VIEWBOX_HEIGHT - PLOT.bottom}
        x2={horizontal ? endPosition : axisPosition}
        y2={horizontal ? axisPosition : endPosition}
      />
      {ticks.map((tick) => {
        const position = scale(tick.value);
        return (
          <g key={`${tick.value}-${tick.label}`}>
            <line
              className="econ-graph-tick"
              x1={horizontal ? position : axisPosition - 5}
              y1={horizontal ? axisPosition : position}
              x2={horizontal ? position : axisPosition}
              y2={horizontal ? axisPosition + 5 : position}
            />
            {showTickLabels ? (
              <text
                className="econ-graph-tick-label"
                x={horizontal ? position : axisPosition - 10}
                y={horizontal ? axisPosition + 22 : position + 4}
                textAnchor={horizontal ? "middle" : "end"}
              >
                {tick.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <text
        className="econ-graph-axis-label"
        x={horizontal ? (PLOT.left + VIEWBOX_WIDTH - PLOT.right) / 2 : 22}
        y={
          horizontal
            ? VIEWBOX_HEIGHT - 18
            : (PLOT.top + VIEWBOX_HEIGHT - PLOT.bottom) / 2
        }
        textAnchor="middle"
        transform={
          horizontal
            ? undefined
            : `rotate(-90 22 ${(PLOT.top + VIEWBOX_HEIGHT - PLOT.bottom) / 2})`
        }
      >
        {axis.label}
      </text>
    </g>
  );
}

function Curve({
  curve,
  colour,
  xScale,
  yScale,
}: {
  curve: CurveSpec;
  colour: string;
  xScale: Scale;
  yScale: Scale;
}) {
  const points = curve.points.map((point) => toSvgPoint(point, xScale, yScale));
  const path = createCurvePath(points, curve.interpolation ?? "linear");
  const labelAt = curve.labelAt ?? curve.points[Math.floor(curve.points.length / 2)];
  const labelPoint = toSvgPoint(labelAt, xScale, yScale);

  return (
    <g className="econ-graph-curve">
      <path
        d={path}
        fill="none"
        stroke={colour}
        strokeDasharray={curve.lineStyle === "dashed" ? "10 7" : undefined}
      />
      <text
        className="econ-graph-curve-label"
        x={labelPoint.x + 7}
        y={labelPoint.y - 7}
        stroke="#fff"
        strokeWidth="5"
        paintOrder="stroke"
      >
        {curve.label}
      </text>
    </g>
  );
}

function GraphPoint({
  point,
  xScale,
  yScale,
}: {
  point: PointSpec;
  xScale: Scale;
  yScale: Scale;
}) {
  const location = toSvgPoint(point, xScale, yScale);

  return (
    <g className="econ-graph-point">
      {point.guideLines?.includes("x") ? (
        <line
          className="econ-graph-guide"
          x1={location.x}
          y1={location.y}
          x2={location.x}
          y2={VIEWBOX_HEIGHT - PLOT.bottom}
        />
      ) : null}
      {point.guideLines?.includes("y") ? (
        <line
          className="econ-graph-guide"
          x1={PLOT.left}
          y1={location.y}
          x2={location.x}
          y2={location.y}
        />
      ) : null}
      <circle cx={location.x} cy={location.y} r="5" />
      <text
        className="econ-graph-point-label"
        x={location.x + 9}
        y={location.y - 9}
        stroke="#fff"
        strokeWidth="5"
        paintOrder="stroke"
      >
        {point.label}
      </text>
    </g>
  );
}

function ReferenceLine({
  line,
  xScale,
  yScale,
}: {
  line: ReferenceLineSpec;
  xScale: Scale;
  yScale: Scale;
}) {
  const position =
    line.orientation === "horizontal" ? yScale(line.value) : xScale(line.value);
  return (
    <g className="econ-graph-reference-line">
      <line
        x1={line.orientation === "horizontal" ? PLOT.left : position}
        y1={line.orientation === "horizontal" ? position : PLOT.top}
        x2={line.orientation === "horizontal" ? VIEWBOX_WIDTH - PLOT.right : position}
        y2={line.orientation === "horizontal" ? position : VIEWBOX_HEIGHT - PLOT.bottom}
        strokeDasharray={line.lineStyle === "solid" ? undefined : "6 5"}
      />
      <text
        x={
          line.orientation === "horizontal"
            ? VIEWBOX_WIDTH - PLOT.right - 5
            : position + 7
        }
        y={line.orientation === "horizontal" ? position - 8 : PLOT.top + 14}
        textAnchor={line.orientation === "horizontal" ? "end" : "start"}
        stroke="#fff"
        strokeWidth="5"
        paintOrder="stroke"
      >
        {line.label}
      </text>
    </g>
  );
}

function Annotation({
  annotation,
  xScale,
  yScale,
}: {
  annotation: AnnotationSpec;
  xScale: Scale;
  yScale: Scale;
}) {
  const location = toSvgPoint(annotation, xScale, yScale);
  return (
    <text
      className="econ-graph-annotation"
      x={location.x}
      y={location.y}
      textAnchor={annotation.anchor ?? "start"}
      stroke="#fff"
      strokeWidth="5"
      paintOrder="stroke"
    >
      {annotation.text}
    </text>
  );
}

function toSvgPoint(point: GraphCoordinate, xScale: Scale, yScale: Scale) {
  return { x: xScale(point.x), y: yScale(point.y) };
}

function createCurvePath(
  points: readonly { x: number; y: number }[],
  interpolation: "linear" | "smooth",
): string {
  if (interpolation === "linear") {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = {
      x: (previous.x + current.x) / 2,
      y: (previous.y + current.y) / 2,
    };
    path += ` Q ${previous.x} ${previous.y} ${midpoint.x} ${midpoint.y}`;
  }
  const last = points[points.length - 1];
  const prior = points[points.length - 2];
  path += ` Q ${prior.x} ${prior.y} ${last.x} ${last.y}`;
  return path;
}
