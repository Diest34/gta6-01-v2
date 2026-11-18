// The HUD: health, money, ammo, wanted stars, clock, district and the current
// job — plus a minimap of Solmar Bay in the corner.
import { BEACH_Y, FONT, GRID, PALETTE, WANTED, WATER_Y, WORLD, roadX, roadY } from './config.js';
import { districtAt } from './city.js';
import { missionObjective } from './missions.js';

const VIEW_W = 1280;
const VIEW_H = 720;

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function clockText(seconds) {
  // A hair of epsilon: the clock accumulates 1/60 s steps, so after exactly
  // four seconds it can read 3.9999999 and floor to 3.
  const m = Math.floor((seconds + 0.0001) / 60);
  const s = Math.floor((seconds + 0.0001) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function drawHud(ctx, state) {
  const player = state.player;
  // Top-left: health bar and money.
  ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
  ctx.fillRect(14, 12, 250, 64);
  text(ctx, 'ROOK', 24, 36, 15, PALETTE.muted, 'left', true);
  ctx.fillStyle = '#3a1512';
  ctx.fillRect(24, 44, 150, 12);
  ctx.fillStyle = player.hp > 30 ? PALETTE.green : PALETTE.red;
  ctx.fillRect(24, 44, Math.max(0, 150 * (player.hp / 100)), 12);
  text(ctx, `$${Math.floor(state.money)}`, 186, 58, 20, PALETTE.gold, 'left', true);

  // Top-centre: the job.
  const job = missionObjective(state);
  ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
  const jobW = Math.max(340, ctx.measureText(job.objective).width + 48);
  ctx.fillRect((VIEW_W - jobW) / 2, 12, jobW, 56);
  text(ctx, job.title.toUpperCase(), VIEW_W / 2, 34, 15, PALETTE.gold, 'center', true);
  text(ctx, job.objective, VIEW_W / 2, 56, 15, PALETTE.text, 'center');

  // Top-right: wanted stars, ammo, clock, district.
  ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
  ctx.fillRect(VIEW_W - 264, 12, 250, 64);
  let stars = '';
  for (let i = 0; i < WANTED.maxStars; i += 1) stars += i < state.wanted ? '★' : '☆';
  text(ctx, stars, VIEW_W - 24, 38, 22, state.wanted > 0 ? PALETTE.red : PALETTE.muted, 'right', true);
  text(ctx, `Ammo ${state.ammo}`, VIEW_W - 24, 62, 15, PALETTE.text, 'right');
  text(ctx, clockText(state.clock), VIEW_W - 130, 62, 15, PALETTE.text, 'right');
  text(ctx, districtAt(state.city, player.x, player.y), 24, VIEW_H - 16, 15, PALETTE.text, 'left', true);

  // Car health, when driving.
  if (player.inCar) {
    const car = player.inCar;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
    ctx.fillRect(14, 86, 250, 30);
    text(ctx, car.model.toUpperCase(), 24, 107, 14, PALETTE.text, 'left', true);
    ctx.fillStyle = '#3a1512';
    ctx.fillRect(130, 96, 120, 10);
    ctx.fillStyle = car.hp > car.maxHp * 0.3 ? PALETTE.gold : PALETTE.red;
    ctx.fillRect(130, 96, Math.max(0, 120 * (car.hp / car.maxHp)), 10);
  }

  // Toasts, newest on top, fading out.
  let y = 96 + (player.inCar ? 34 : 0);
  for (const toast of state.toasts) {
    const alpha = Math.min(1, toast.ttl / 0.8);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
    const w = ctx.measureText(toast.text).width + 28;
    ctx.fillRect((VIEW_W - w) / 2, y, w, 30);
    text(ctx, toast.text, VIEW_W / 2, y + 20, 15, PALETTE.gold, 'center');
    ctx.globalAlpha = 1;
    y += 36;
  }
}

/** The minimap: the whole city shrunk to the bottom-right corner. */
export function drawMinimap(ctx, state) {
  const MW = 210;
  const MH = 180;
  const ox = VIEW_W - MW - 14;
  const oy = VIEW_H - MH - 14;
  const sx = MW / WORLD.width;
  const sy = MH / WORLD.height;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.8)';
  ctx.fillRect(ox - 4, oy - 4, MW + 8, MH + 8);
  // Water and sand at the bottom.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(ox, oy + BEACH_Y * sy, MW, (WORLD.height - BEACH_Y) * sy);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(ox, oy + BEACH_Y * sy, MW, (WATER_Y - BEACH_Y) * sy);
  // Roads.
  ctx.fillStyle = PALETTE.asphalt;
  for (let i = 0; i <= GRID.cols; i += 1) {
    ctx.fillRect(ox + roadX(i) * sx - 2, oy, 4, BEACH_Y * sy);
  }
  for (let j = 0; j < GRID.rows; j += 1) {
    ctx.fillRect(ox, oy + roadY(j) * sy - 2, MW, 4);
  }
  // Buildings.
  ctx.fillStyle = PALETTE.buildingRoof;
  for (const b of state.city.buildings) {
    ctx.fillRect(ox + b.x * sx, oy + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  // Mission marker, pulsing.
  if (state.marker) {
    const pulse = 3 + Math.sin(state.clock * 5) * 1.5;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(ox + state.marker.x * sx, oy + state.marker.y * sy, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police, then Rook.
  ctx.fillStyle = PALETTE.cop;
  for (const cop of state.cops) {
    if (cop.kind !== 'police') continue;
    ctx.beginPath();
    ctx.arc(ox + cop.x * sx, oy + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + state.player.x * sx, oy + state.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ox + state.player.x * sx, oy + state.player.y * sy, 6, 0, Math.PI * 2);
  ctx.stroke();
}
