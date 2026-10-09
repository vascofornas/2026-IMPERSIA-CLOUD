import { chartGeometry, polylinePoints, registroChartBlocks } from "./healthCharts.js";

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
  let caption = `${block.series.length} lecturas en el mes`;
  if (block.mode === "pressure" && last) {
    caption = `Última: ${last.systolic}/${last.diastolic} mmHg · ${caption}`;
  } else if (last?.value != null) {
    const unit =
      block.kind === "glucosa" ? " mg/dL" : block.kind === "peso" ? " kg" : block.kind === "sueno" ? " h" : "";
    caption = `Última: ${String(last.value).replace(".", ",")}${unit} · ${caption}`;
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

export default function RegistroMeasureCharts({ items, year, month }) {
  const blocks = registroChartBlocks(items, year, month);
  if (!blocks.length) return null;

  return (
    <section className="habitos-registro-charts" aria-labelledby="habitos-charts-heading">
      <h3 id="habitos-charts-heading" className="habitos-subheading">
        Gráficas del mes
      </h3>
      <div className="habitos-measure-chart-grid">
        {blocks.map((block) => (
          <MeasureChart key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}
