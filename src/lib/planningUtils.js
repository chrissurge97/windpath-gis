// ─────────────────────────────────────────────────────────────────
// Planning Utilities — real-world data fetching
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch real elevation from Open-Elevation API (free, no key)
 */
export async function fetchElevation(lat, lng) {
  try {
    const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
    const data = await res.json();
    return data?.results?.[0]?.elevation ?? null;
  } catch {
    // Fallback: SRTM via open-meteo elevation endpoint
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
      const data = await res.json();
      return data?.elevation?.[0] ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Fetch real historical wind data from Open-Meteo ERA5 (free, no API key required)
 * Returns { mean_speed, k, lambda } — Weibull params estimated from hourly data
 */
export async function fetchWindData(lat, lng) {
  try {
    // Get last 30 days of hourly 10m wind speed
    const end = new Date();
    const start = new Date(end - 30 * 24 * 3600 * 1000);
    const fmt = d => d.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${fmt(start)}&end_date=${fmt(end)}&hourly=wind_speed_10m&wind_speed_unit=ms&timezone=UTC`;
    const res = await fetch(url);
    const data = await res.json();

    const speeds = (data?.hourly?.wind_speed_10m || []).filter(v => v != null && v >= 0);
    if (speeds.length < 10) return null;

    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length;
    const std = Math.sqrt(variance);

    // Estimate Weibull parameters from mean and std using method of moments
    const cv = std / mean; // coefficient of variation
    // k ≈ (mean/std)^1.086 approximation
    const k = Math.max(1.2, Math.min(4, Math.pow(mean / (std || 0.01), 1.086)));
    const lambda = mean / gammaApprox(1 + 1 / k);

    return {
      mean_speed: +mean.toFixed(2),
      std: +std.toFixed(2),
      k: +k.toFixed(2),
      lambda: +lambda.toFixed(2),
      samples: speeds.length,
    };
  } catch {
    return null;
  }
}

/**
 * Approximate Gamma function using Lanczos approximation
 */
function gammaApprox(x) {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaApprox(1 - x));
  x -= 1;
  const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let a = p[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += p[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

/**
 * Get Weibull params from a known mean wind speed (estimation)
 */
export function weibullFromMeanSpeed(meanSpeed, k = 2.0) {
  const lambda = meanSpeed / gammaApprox(1 + 1 / k);
  return { k, lambda: +lambda.toFixed(2) };
}