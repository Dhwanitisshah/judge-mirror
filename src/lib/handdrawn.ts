// Hand-drawn red-pen strokes as SVG path strings. Pure functions.
// Every shape takes a numeric seed: the jitter is irregular like a pen, but the same input always
// draws the same stroke, so nothing wobbles between renders.

export type Point = { x: number; y: number };

/** Small deterministic random generator (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 100) / 100;

/** A smooth open curve through the points (Catmull-Rom converted to cubic Beziers). */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${f(points[0].x)} ${f(points[0].y)}`;
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/**
 * A wavy red-pen underline from x=0 to x=width, centred on y=0 (translate it into place).
 * Uneven wave height and length, plus a slight drift, so it never looks ruled or repeated.
 */
export function wavyUnderlinePath(width: number, seed: number): string {
  const rand = seededRandom(seed);
  const w = Math.max(width, 4);
  const drift = (rand() - 0.5) * 2.4; // the pen ends a little higher or lower than it started
  const points: Point[] = [];
  let x = 0;
  let up = rand() > 0.5;
  while (x < w) {
    const amp = 0.9 + rand() * 1.1;
    const y = (up ? -amp : amp) + drift * (x / w) + (rand() - 0.5) * 0.6;
    points.push({ x, y });
    x += 5 + rand() * 4;
    up = !up;
  }
  points.push({ x: w + (rand() - 0.5), y: drift + (rand() - 0.5) });
  return smoothPath(points);
}

/**
 * A hand-drawn loop around an ellipse centred on (cx, cy). It starts near the top, wobbles in radius,
 * is tilted a little, and stops short of its start, so it deliberately does not quite close.
 */
export function handEllipsePath(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const rand = seededRandom(seed);
  const steps = 16;
  const start = -Math.PI / 2 - 0.5 + rand() * 0.5; // begin a little left of the top
  const gap = 0.3 + rand() * 0.35; // radians left open at the end
  const sweep = Math.PI * 2 - gap;
  const spiral = 0.02 + rand() * 0.03; // the loop drifts inwards a touch, so the end misses the start
  const tilt = (rand() - 0.5) * 0.14;
  const phase = rand() * Math.PI * 2;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = start + sweep * t;
    const wobble = 1 + 0.04 * Math.sin(angle * 2 + phase) + (rand() - 0.5) * 0.05;
    const k = wobble * (1 - spiral * t);
    const ex = Math.cos(angle) * rx * k;
    const ey = Math.sin(angle) * ry * k;
    points.push({
      x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
      y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
    });
  }
  return smoothPath(points);
}

/** True if a loop's last point is clearly away from its first (used by tests to prove it "doesn't close"). */
export function endpointGap(path: string): number {
  const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 4) return 0;
  const [sx, sy] = nums;
  const ex = nums[nums.length - 2];
  const ey = nums[nums.length - 1];
  return Math.hypot(ex - sx, ey - sy);
}
