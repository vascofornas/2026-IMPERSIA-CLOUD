import {
  chartGeometry,
  formatAxisValue,
  polylinePoints,
  registroChartBlocks,
  registroMonthAverages,
} from "./healthCharts.js";

function ChartAxes({ geom }) {
  const { plotLeft, plotTop, plotBottom, width, yAxisTicks, xAxisTicks } = geom;
  return (
    <>
      {yAxisTicks.map((tick) => (
        <g key={tick.value} className="habitos-chart-axis-y">
          <line x1={plotLeft} y1={tick.y} x2={width - geom.margins.right} y2={tick.y} className="habitos-chart-grid-line" />
          <text x={plotLeft - 6} y={tick.y} textAnchor="end" dominantBaseline="middle" className="habitos-chart-axis-text">
            {tick.label}
          </text>
        </g>
      ))}
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        className="habitos-chart-axis-line"
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={width - geom.margins.right}
        y2={plotBottom}
        className="habitos-chart-axis-line"
      />
      {xAxisTicks.map((tick) => (
        <text
          key={tick.label + tick.x}
          x={tick.x}
          y={plotBottom + 14}
          textAnchor="middle"
          className="habitos-chart-axis-text habitos-chart-axis-x"
        >
          {tick.label}
        </text>
      ))}
    </>
  );
}

function MeasureChart({ block }) {
  const width = 320;
  const height = 118;
  const margins = { left: 40, right: 10, top: 8, bottom: 22 };
  const geom = chartGeometry(
    block.series,
    block.mode === "pressure" ? "pressure" : "single",
    width,
    height,
    margins,
    block.kind,
  );
  if (!geom) return null;

  const last = block.series[block.series.length - 1];
  const n = block.series.length;
  let mediaPart = "";
  if (block.mode === "pressure") {
    const sys =
      block.series.reduce((acc, p) => acc + p.systolic, 0) / n;
    const dia =
      block.series.reduce((acc, p) => acc + p.diastolic, 0) / n;
    mediaPart = `Media: ${formatAxisValue(sys, "presion")}/${formatAxisValue(dia, "presion")} mmHg`;
  } else {
    const avg = block.series.reduce((acc, p) => acc + p.value, 0) / n;
    const unit =
      block.kind === "glucosa" ? " mg/dL" : block.kind === "peso" ? " kg" : block.kind === "sueno" ? " h" : "";
    mediaPart = `Media: ${formatAxisValue(avg, block.kind)}${unit}`;
  }

  let caption = `${n} lectura${n === 1 ? "" : "s"} en el mes`;
  if (block.mode === "pressure" && last) {
    caption = `${mediaPart} · Última: ${last.systolic}/${last.diastolic} mmHg · ${caption}`;
  } else if (last?.value != null) {
    const unit =
      block.kind === "glucosa" ? " mg/dL" : block.kind === "peso" ? " kg" : block.kind === "sueno" ? " h" : "";
    caption = `${mediaPart} · Última: ${String(last.value).replace(".", ",")}${unit} · ${caption}`;
  } else {
    caption = `${mediaPart} · ${caption}`;
  }

  const yUnit =
    block.kind === "presion"
      ? "mmHg"
      : block.kind === "glucosa"
        ? "mg/dL"
        : block.kind === "peso"
          ? "kg"
          : block.kind === "sueno"
            ? "h"
            : "";

  return (
    <figure className="habitos-measure-chart">
      <figcaption className="habitos-measure-chart-title">
        {block.title}
        {yUnit && <span className="private habitos-measure-chart-unit"> ({yUnit})</span>}
      </figcaption>
      <svg
        className="habitos-measure-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Gráfica de ${block.title} en el mes`}
      >
        <ChartAxes geom={geom} />
        {geom.mode === "pressure" ? (
          <>
            <polyline className="habitos-chart-line habitos-chart-line-sys" fill="none" points={polylinePoints(geom.points, "sysY")} />
            <polyline className="habitos-chart-line habitos-chart-line-dia" fill="none" points={polylinePoints(geom.points, "diaY")} />
            {geom.points.map((p, i) => (
              <g key={i}>
                <circle className="habitos-chart-dot-sys" cx={p.x} cy={p.sysY} r="2.5" />
                <circle className="habitos-chart-dot-dia" cx={p.x} cy={p.diaY} r="2.5" />
              </g>
            ))}
          </>
        ) : (
          <>
            <polyline className="habitos-chart-line" fill="none" points={polylinePoints(geom.points, "y")} />
            {geom.points.map((p, i) => (
              <circle key={i} className="habitos-chart-dot" cx={p.x} cy={p.y} r="2.5" />
            ))}
          </>
        )}
      </svg>
      <p className="private habitos-measure-chart-axis-hint">Eje horizontal: día del mes</p>
      <p className="private habitos-measure-chart-legend">
        {block.mode === "pressure" ? (
          <>
            <span className="habitos-chart-legend-sys">Sistólica</span>
            <span className="habitos-chart-legend-dia">Diastólica</span>
          </>
        ) : null}
      </p>
      <p className="private habitos-measure-chart-caption">{caption}</p>
    </figure>
  );
}

function MonthAverages({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="habitos-registro-averages" role="region" aria-label="Medias del mes">
      <p className="habitos-registro-averages-kicker">Medias del mes</p>
      <ul className="habitos-registro-averages-grid">
        {rows.map((row) => (
          <li key={row.kind} className="habitos-registro-average">
            <p className="habitos-registro-average-label">{row.title}</p>
            <p className="habitos-registro-average-value">{row.value}</p>
            <p className="private habitos-registro-average-n">
              {row.n} lectura{row.n === 1 ? "" : "s"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegistroMeasureCharts({ items, year, month }) {
  const averages = registroMonthAverages(items, year, month);
  const blocks = registroChartBlocks(items, year, month);
  if (!averages.length && !blocks.length) return null;

  return (
    <section
      className="habitos-registro-charts"
      aria-label={blocks.length ? "Medias y gráficas del mes" : "Medias del mes"}
      {...(blocks.length ? { "aria-labelledby": "habitos-charts-heading" } : {})}
    >
      <MonthAverages rows={averages} />
      {blocks.length > 0 && (
        <>
          <h3 id="habitos-charts-heading" className="habitos-subheading">
            Gráficas del mes
          </h3>
          <div className="habitos-measure-chart-grid">
            {blocks.map((block) => (
              <MeasureChart key={block.id} block={block} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
