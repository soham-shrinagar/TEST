import { LINEUP } from '../../styles/lineupTokens';

export function halftoneDots(ctx, w, h, color, density, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const step = density;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const r = ((Math.sin(x * 0.11) + Math.cos(y * 0.09) + 2) / 4) * (step * 0.42);
      ctx.beginPath();
      ctx.arc(x + (Math.random() * 2 - 1), y + (Math.random() * 2 - 1), Math.max(0.6, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function torn(ctx, w, h) {
  ctx.beginPath();
  const seg = 14;
  const step = w / seg;
  ctx.moveTo(0, 4 + Math.random() * 6);
  for (let i = 1; i <= seg; i += 1) {
    ctx.lineTo(i * step, 4 + Math.random() * 8);
  }
  ctx.lineTo(w, h - 4 - Math.random() * 6);
  for (let i = seg; i >= 0; i -= 1) {
    ctx.lineTo(i * step, h - 4 - Math.random() * 8);
  }
  ctx.closePath();
}

export function makePosterTexture(cfg) {
  const W = 560;
  const H = 760;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  ctx.save();
  torn(ctx, W, H);
  ctx.clip();
  ctx.fillStyle = cfg.paper || LINEUP.paper;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = cfg.ink || LINEUP.ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  halftoneDots(ctx, W, H * 0.5, cfg.ink || LINEUP.ink, 9, 0.14);

  ctx.fillStyle = cfg.accent || LINEUP.accent;
  ctx.font = '700 22px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(cfg.eyebrow.toUpperCase(), W / 2, 100);

  ctx.fillStyle = cfg.ink || LINEUP.ink;
  ctx.font = `400 ${cfg.size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  const lines = cfg.name.split('\n');
  let ly = cfg.nameY;
  lines.forEach((line) => {
    ctx.fillText(line, W / 2, ly);
    ly += cfg.size * 0.98;
  });

  ctx.fillStyle = cfg.accent || LINEUP.accent;
  ctx.fillRect(40, H - 140, W - 80, 46);
  ctx.fillStyle = LINEUP.paper;
  ctx.font = '700 20px "Space Mono", monospace';
  ctx.fillText(cfg.role.toUpperCase(), W / 2, H - 108);

  ctx.fillStyle = cfg.ink || LINEUP.ink;
  ctx.font = '600 15px Archivo, sans-serif';
  ctx.fillText(cfg.meta, W / 2, H - 60);

  ctx.restore();

  return c;
}

export function makeGhostTexture(cfg) {
  const W = 560;
  const H = 760;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.font = `400 ${cfg.size}px Anton, sans-serif`;
  ctx.fillStyle = cfg.accent || LINEUP.accent;
  ctx.textAlign = 'center';
  let ly = cfg.nameY;
  cfg.name.split('\n').forEach((line) => {
    ctx.fillText(line, W / 2, ly);
    ly += cfg.size * 0.98;
  });
  return c;
}

export function easeOutBack(t) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function trapezoid(p, s) {
  const fadeIn = s.fadeIn !== undefined ? s.fadeIn : s.peak[0] - 0.05;
  const [pStart, pEnd] = s.peak;
  const { fadeOutEnd } = s;
  if (p < fadeIn || p > fadeOutEnd) return 0;
  if (p < pStart) return (p - fadeIn) / (pStart - fadeIn);
  if (p > pEnd) return 1 - (p - pEnd) / (fadeOutEnd - pEnd);
  return 1;
}
