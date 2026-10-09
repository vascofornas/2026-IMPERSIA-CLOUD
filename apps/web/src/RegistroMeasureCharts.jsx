import { chartGeometry, polylinePoints, registroChartBlocks } from "./healthCharts.js";

function MeasureChart({ block }) {
  const width = 320;
  const height = 100;
  const padX = 8;
  const padY = 10;
  const geom = chartGeometry(block.series, block.mode === "pressure" ? "pressure" : "single", width, height, padX, padY);
  if (!geom) return null;

  const last = block.series[block.series.length - 1];
  let caption = `${block.series.length} lecturas en el mes`;
  if (block.mode === "pressure" && last) {
    caption = `Última: ${last.systolic}/${last.diastolic} mmHg · ${caption}`;
  } else if (last?.value != null) {
    const unit = block.kind === "glucosa" ? " mg/dL" : block.kind === "peso" ? " kg" : "";
    caption = `Última: ${String(last.value).replace(".", ",")}${unit} · ${caption}`;
  }

  return (
    <figure className="habitos-measure-chart">
      <figcaption className="habitos-measure-chart-title">{block.title}</figcaption>
      <svg
        className="habitos-measure-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Gráfica de ${block.title} en el mes`}
      >
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
