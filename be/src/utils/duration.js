const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** "15m" | "7d" | "3600s" | "500" (ms) → số mili-giây */
export function toMs(value) {
  const m = /^(\d+)\s*([smhd])?$/i.exec(String(value).trim());
  if (!m) throw new Error(`Invalid duration: ${value}`);
  return Number(m[1]) * (m[2] ? UNITS[m[2].toLowerCase()] : 1);
}

export const toSeconds = (value) => Math.floor(toMs(value) / 1000);
