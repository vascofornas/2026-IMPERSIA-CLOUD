import { habitKindLabel, isHabitLog, logRecordDate } from "./habitos.js";

const MIN_POINTS = 2;

function textOf(item) {
  return `${item.habit_notes || ""} ${item.title || ""}`;
}

export function parsePressure(item) {
  const m = textOf(item).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!m) return null;
  return { systolic: Number(m[1]), diastolic: Number(m[2]) };
}

export function parseWeightKg(item) {
  const s = textOf(item);
  let m = s.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!m) m = s.match(/peso\s+(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

export function parseGlucoseMgDl(item) {
  const s = textOf(item);
  let m = s.match(/(\d{2,3}(?:[.,]\d+)?)\s*mg\s*\/?\s*dl/i);
  if (!m) m = s.match(/glucosa\s+(\d{2,3})/i);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

export function logsOfKindInMonth(items, year, month, kind) {
  return items
    .filter((item) => {
      if (!isHabitLog(item) || item.habit_kind !== kind) return false;
      const d = logRecordDate(item);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export function pressureSeries(items, year, month) {
  return logsOfKindInMonth(items, year, month, "presion")
    .map((item) => {
      const p = parsePressure(item);
      const d = logRecordDate(item);
      if (!p || !d) return null;
      return { date: d, label: d.getDate(), ...p };
    })
    .filter(Boolean);
}

export function weightSeries(items, year, month) {
  return logsOfKindInMonth(items, year, month, "peso")
    .map((item) => {
      const kg = parseWeightKg(item);
      const d = logRecordDate(item);
      if (kg == null || !d) return null;
      return { date: d, label: d.getDate(), value: kg };
    })
    .filter(Boolean);
}

export function glucoseSeries(items, year, month) {
  return logsOfKindInMonth(items, year, month, "glucosa")
    .map((item) => {
      const mg = parseGlucoseMgDl(item);
      const d = logRecordDate(item);
      if (mg == null || !d) return null;
      return { date: d, label: d.getDate(), value: mg };
    })
    .filter(Boolean);
}

export function registroChartBlocks(items, year, month) {
  const blocks = [];
  const presion = pressureSeries(items, year, month);
  if (presion.length >= MIN_POINTS) {
    blocks.push({ id: "presion", kind: "presion", title: habitKindLabel("presion"), series: presion, mode: "pressure" });
  }
  const peso = weightSeries(items, year, month);
  if (peso.length >= MIN_POINTS) {
    blocks.push({ id: "peso", kind: "peso", title: habitKindLabel("peso"), series: peso, mode: "single" });
  }
  const glucosa = glucoseSeries(items, year, month);
  if (glucosa.length >= MIN_POINTS) {
    blocks.push({ id: "glucosa", kind: "glucosa", title: habitKindLabel("glucosa"), series: glucosa, mode: "single" });
  }
  return blocks;
}

function scale(value, min, max, height) {
  if (max <= min) return height / 2;
  return height - ((value - min) / (max - min)) * height;
}

export function formatAxisValue(value, kind) {
  if (kind === "peso") {
    const n = Math.round(value * 10) / 10;
    return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  }
  return String(Math.round(value));
}

function yTicks(minY, maxY) {
  const mid = (minY + maxY) / 2;
  return [maxY, mid, minY];
}

export function chartGeometry(series, mode, width, height, margins, kind) {
  const { left, right, top, bottom } = margins;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const n = series.length;
  if (n < 2) return null;

  let minY;
  let maxY;
  if (mode === "pressure") {
    minY = Math.min(...series.map((p) => Math.min(p.systolic, p.diastolic))) - 4;
    maxY = Math.max(...series.map((p) => Math.max(p.systolic, p.diastolic))) + 4;
  } else {
    const span = Math.max(0.4, (Math.max(...series.map((p) => p.value)) - Math.min(...series.map((p) => p.value))) * 0.15);
    minY = Math.min(...series.map((p) => p.value)) - span;
    maxY = Math.max(...series.map((p) => p.value)) + span;
  }

  const xAt = (i) => left + (i / (n - 1)) * plotW;
  const yAt = (val) => top + scale(val, minY, maxY, plotH);

  const points = series.map((row, i) => {
    const x = xAt(i);
    if (mode === "pressure") {
      return {
        x,
        sysY: yAt(row.systolic),
        diaY: yAt(row.diastolic),
        dayLabel: row.label,
      };
    }
    return {
      x,
      y: yAt(row.value),
      dayLabel: row.label,
    };
  });

  const yAxisTicks = yTicks(minY, maxY).map((value) => ({
    value,
    label: formatAxisValue(value, kind === "pressure" ? "presion" : kind),
    y: yAt(value),
  }));

  const xIndices = [...new Set([0, Math.floor((n - 1) / 2), n - 1])].sort((a, b) => a - b);
  const xAxisTicks = xIndices.map((i) => ({
    x: xAt(i),
    label: String(series[i].label),
  }));

  return {
    points,
    minY,
    maxY,
    mode,
    width,
    height,
    margins,
    plotW,
    plotH,
    yAxisTicks,
    xAxisTicks,
    plotLeft: left,
    plotTop: top,
    plotBottom: top + plotH,
  };
}

export function polylinePoints(points, key) {
  return points.map((p) => `${p.x},${p[key]}`).join(" ");
}
