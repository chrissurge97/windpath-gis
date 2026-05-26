// ─────────────────────────────────────────────────────────────────
// Planning Utilities — real-world data fetching
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch real elevation from Open-Meteo SRTM (free, no key, reliable)
 */
export async function fetchElevation(lat, lng) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    const data = await res.json();
    return data?.elevation?.[0] ?? null;
  } catch {
    return null;
  }
}

// In-memory cache keyed by "lat2dp_lng2dp" to avoid duplicate fetches for nearby turbines
const _windCache = new Map();

function windCacheKey(lat, lng) {
  // Round to ~1km grid (2 decimal places ≈ 1.1 km)
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

/**
 * Fetch real historical wind data from Open-Meteo ERA5 (free, no API key required)
 * Returns { mean_speed, k, lambda } — Weibull params estimated from hourly data.
 * Results are cached by ~1 km grid cell so nearby turbines reuse the same fetch.
 */
export async function fetchWindData(lat, lng) {
  const key = windCacheKey(lat, lng);
  if (_windCache.has(key)) return _windCache.get(key);

  try {
    // 7 days is enough for a stable mean and keeps the response tiny (~168 values vs ~720)
    const end = new Date();
    const start = new Date(end - 7 * 24 * 3600 * 1000);
    const fmt = d => d.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&start_date=${fmt(start)}&end_date=${fmt(end)}&hourly=wind_speed_10m&wind_speed_unit=ms&timezone=UTC`;
    const res = await fetch(url);
    const data = await res.json();

    const speeds = (data?.hourly?.wind_speed_10m || []).filter(v => v != null && v >= 0);
    if (speeds.length < 10) return null;

    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length;
    const std = Math.sqrt(variance);

    const k = Math.max(1.2, Math.min(4, Math.pow(mean / (std || 0.01), 1.086)));
    const lambda = mean / gammaApprox(1 + 1 / k);

    const result = {
      mean_speed: +mean.toFixed(2),
      std: +std.toFixed(2),
      k: +k.toFixed(2),
      lambda: +lambda.toFixed(2),
      samples: speeds.length,
    };
    _windCache.set(key, result);
    return result;
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