// Draws a shareable 1080×1350 result card (fits Instagram/Kakao previews)

export interface ShareCardData {
  emoji: string;
  title: string;
  gameName: string;
  color: string;
  score: number;
  stats: { label: string; value: string }[];
  newBest: boolean;
  player: string;
}

const INK = '#2b2140';
const DISPLAY = '"Fredoka", "Jua", "Pretendard Variable", sans-serif';
const BODY = '"Pretendard Variable", Pretendard, sans-serif';
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, shadow = 14) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x + shadow, y + shadow, w, h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export async function renderResultImage(d: ShareCardData): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
  } catch {
    // draw with fallback fonts
  }
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Cream background with polka dots
  ctx.fillStyle = '#fff5e6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(43, 33, 64, 0.08)';
  for (let y = 18; y < H; y += 40) {
    for (let x = 18; x < W; x += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Card
  const cx = 90;
  const cy = 120;
  const cw = W - 180 - 14;
  const ch = 1010;
  panel(ctx, cx, cy, cw, ch, 64, '#ffffff');

  // Colored header band
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, 330, [64, 64, 0, 0]);
  ctx.clip();
  ctx.fillStyle = d.color;
  ctx.fillRect(cx, cy, cw, 330);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let y = cy + 14; y < cy + 330; y += 30) {
    for (let x = cx + 14; x < cx + cw; x += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 330);
  ctx.lineTo(cx + cw, cy + 330);
  ctx.stroke();

  const mid = cx + cw / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.font = `170px ${EMOJI}`;
  ctx.fillText(d.emoji, mid, cy + 170);

  // Title + game
  ctx.fillStyle = INK;
  ctx.font = `700 84px ${DISPLAY}`;
  ctx.fillText(d.title, mid, cy + 420);
  ctx.font = `600 40px ${BODY}`;
  ctx.fillStyle = '#54496b';
  ctx.fillText(`${d.gameName} · ${d.player}`, mid, cy + 490);

  // Score well
  panel(ctx, cx + 70, cy + 540, cw - 140, 220, 40, '#fff0db', 0);
  ctx.fillStyle = '#7a7090';
  ctx.font = `700 34px ${BODY}`;
  ctx.fillText('최종 점수', mid, cy + 595);
  ctx.fillStyle = INK;
  ctx.font = `700 130px ${DISPLAY}`;
  ctx.fillText(Math.round(d.score).toLocaleString('ko-KR'), mid, cy + 685);

  if (d.newBest) {
    ctx.save();
    ctx.translate(cx + cw - 120, cy + 548);
    ctx.rotate(0.21);
    panel(ctx, -150, -40, 300, 80, 40, '#e3285f', 0);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.fillText('NEW BEST!', 0, 2);
    ctx.restore();
  }

  // Stats, two per row
  const stats = d.stats.slice(0, 4);
  const colW = (cw - 140 - 24) / 2;
  stats.forEach((s, i) => {
    const x = cx + 70 + (i % 2) * (colW + 24);
    const y = cy + 790 + Math.floor(i / 2) * 105;
    panel(ctx, x, y, colW, 90, 24, '#fff0db', 0);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7a7090';
    ctx.font = `700 24px ${BODY}`;
    ctx.fillText(s.label, x + 26, y + 30);
    ctx.fillStyle = INK;
    ctx.font = `600 36px ${DISPLAY}`;
    ctx.fillText(s.value, x + 26, y + 64);
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `700 48px ${DISPLAY}`;
  ctx.fillText('🍓 FRUIT ARCADE', W / 2, H - 120);
  ctx.fillStyle = '#7a7090';
  ctx.font = `500 30px ${BODY}`;
  ctx.fillText(window.location.host + window.location.pathname.replace(/\/$/, ''), W / 2, H - 66);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
