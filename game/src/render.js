// Drawing only: the world and the screens, pixels out. The camera shows a
// 1280x720 window of Solmar Bay, following Rook (or drifting over the city on
// the title screen), scaled to fit the browser window.
import { BEACH_Y, FONT, GRID, MODEL_BY_NAME, PALETTE, WATER_Y, WORLD, roadX, roadY } from './config.js';
import { drawHud, drawMinimap } from './hud.js';
import { MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };
  const camera = { x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    canvas.width = w;
    canvas.height = h;
    view.scale = Math.min(w / VIEW_W, h / VIEW_H);
    view.ox = (w - VIEW_W * view.scale) / 2;
    view.oy = (h - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function updateCamera(state, screen) {
    if (screen === SCREEN_TITLE) {
      camera.x = (state.clock * 26) % (WORLD.width - VIEW_W);
      camera.y = 240;
      return;
    }
    camera.x = Math.max(0, Math.min(WORLD.width - VIEW_W, state.player.x - VIEW_W / 2));
    camera.y = Math.max(0, Math.min(WORLD.height - VIEW_H, state.player.y - VIEW_H / 2));
  }

  function toScreen() {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox - camera.x * view.scale, view.oy - camera.y * view.scale);
  }

  function toLogical() {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  }

  function drawGround(state) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, BEACH_Y);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, BEACH_Y, WORLD.width, WATER_Y - BEACH_Y);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WATER_Y, WORLD.width, WORLD.height - WATER_Y);
    ctx.strokeStyle = PALETTE.waterDeep;
    ctx.lineWidth = 3;
    for (let y = WATER_Y + 26; y < WORLD.height; y += 44) {
      ctx.beginPath();
      for (let x = 0; x <= WORLD.width; x += 90) {
        const wave = Math.sin((x + state.clock * 40) / 130) * 5;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    for (const park of state.city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
  }

  function drawRoads() {
    ctx.fillStyle = PALETTE.asphalt;
    for (let i = 0; i <= GRID.cols; i += 1) {
      ctx.fillRect(roadX(i) - GRID.road / 2, 0, GRID.road, BEACH_Y);
    }
    for (let j = 0; j < GRID.rows; j += 1) {
      ctx.fillRect(0, roadY(j) - GRID.road / 2, WORLD.width, GRID.road);
    }
    // Centre dashes.
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (let i = 0; i <= GRID.cols; i += 1) {
      ctx.beginPath();
      ctx.moveTo(roadX(i), 0);
      ctx.lineTo(roadX(i), BEACH_Y);
      ctx.stroke();
    }
    for (let j = 0; j < GRID.rows; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, roadY(j));
      ctx.lineTo(WORLD.width, roadY(j));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      ctx.fillStyle = PALETTE.building;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.kind === 'clinic' ? PALETTE.clinic : b.kind === 'garage' ? PALETTE.garage
        : b.kind === 'market' ? PALETTE.market : b.kind === 'warehouse' ? PALETTE.warehouse
        : b.kind === 'tower' ? PALETTE.tower : PALETTE.buildingRoof;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      if (b.name) {
        text(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5, 15, PALETTE.text, 'center', true);
      }
    }
    for (const palm of state.city.palms) {
      ctx.strokeStyle = PALETTE.trunk;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x + 3, palm.y - 12);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      ctx.beginPath();
      ctx.arc(palm.x + 3, palm.y - 16, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarker(state) {
    const marker = state.marker;
    if (!marker) return;
    const pulse = 10 + Math.sin(state.clock * 5) * 4;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, pulse + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 5, 0, Math.PI * 2);
    ctx.fill();
    text(marker.label, marker.x, marker.y - pulse - 22, 15, PALETTE.gold, 'center', true);
  }

  function drawCarShape(car) {
    const model = MODEL_BY_NAME[car.model];
    const len = model.length;
    const wid = model.width;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = car.kind === 'police' ? PALETTE.cop : model.color;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 7);
    ctx.fill();
    // Cabin and windshield.
    ctx.fillStyle = 'rgba(20, 26, 34, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-len / 6, -wid / 2 + 4, len / 3, wid - 8, 4);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 3, 5);
    ctx.fillRect(len / 2 - 3, wid / 2 - 8, 3, 5);
    if (car.kind === 'police') {
      const flash = Math.floor(car.x + car.y + Date.now() / 260) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3a6fd8';
      ctx.fillRect(-4, -wid / 2 + 2, 8, 5);
      ctx.fillStyle = flash ? '#3a6fd8' : '#ff3b30';
      ctx.fillRect(-4, wid / 2 - 7, 8, 5);
    }
    if (car.driven) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6, 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCars(state) {
    for (const car of state.cars) {
      if (car.kind === 'wreck') {
        ctx.save();
        ctx.globalAlpha = 0.75;
        drawCarShape(car);
        ctx.restore();
        continue;
      }
      drawCarShape(car);
    }
  }

  function drawPeds(state) {
    for (const ped of state.peds) {
      if (ped.state === 'down') {
        ctx.fillStyle = '#c8b8a8';
        ctx.beginPath();
        ctx.ellipse(ped.x, ped.y, 13, 7, ped.angle, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = ped.state === 'flee' ? '#e8e4da' : '#b8c4d8';
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a2e35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ped.x, ped.y);
      ctx.lineTo(ped.x + Math.cos(ped.angle) * 11, ped.y + Math.sin(ped.angle) * 11);
      ctx.stroke();
    }
  }

  function drawEnemiesAndBullets(state) {
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      ctx.fillStyle = PALETTE.enemy;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 20, enemy.y + Math.sin(enemy.angle) * 20);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.bullet;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.inCar) return;
    if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) return; // blink
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 18, player.y + Math.sin(player.angle) * 18);
    ctx.stroke();
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (VIEW_W - width) / 2;
    const y = (VIEW_H - height) / 2;
    ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    text(title, VIEW_W / 2, y + 62, 44, PALETTE.gold, 'center', true);
    lines.forEach((line, i) => {
      text(line.text, VIEW_W / 2, y + 112 + i * 32, line.size || 18, line.color || PALETTE.text, 'center', line.bold);
    });
    text(prompt, VIEW_W / 2, y + height - 30, 18, PALETTE.gold, 'center');
  }

  function drawTitle(state, extra) {
    const lines = [];
    lines.push({ text: 'Rook owes Sable one season. Solmar Bay is how he pays it back.', size: 17, color: PALETTE.muted });
    lines.push({ text: '', size: 16 });
    MISSIONS.forEach((m, i) => {
      const mark = state.done[i] ? '✓' : i === state.missionIndex ? '▶' : '○';
      const color = state.done[i] ? PALETTE.green : i === state.missionIndex ? PALETTE.gold : PALETTE.muted;
      lines.push({ text: `${mark}  ${m.name} — $${m.pay}`, size: 18, color, bold: i === state.missionIndex });
    });
    lines.push({ text: '', size: 16 });
    lines.push({ text: 'WASD drive & walk · E enter a car · F punch · Click / K shoot · R buy ammo · P pause', size: 15, color: PALETTE.muted });
    const prompt = extra.hasSave ? 'Enter: continue · N: new game' : 'Enter or click: start';
    drawPanel('SUNSET KEYS', lines, prompt);
  }

  function drawPaused() {
    drawPanel('PAUSED', [{ text: 'Your run is saved.', size: 18, color: PALETTE.muted }], 'P or Enter: resume');
  }

  function drawOver() {
    drawPanel('WASTED', [{ text: 'Rook wakes up at Harbor Clinic, lighter in the pocket.', size: 18, color: PALETTE.muted }], 'Enter: back on the streets');
  }

  function draw(state, screen, extra) {
    updateCamera(state, screen);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    toScreen();
    drawGround(state);
    drawRoads();
    drawBuildings(state);
    drawMarker(state);
    drawCars(state);
    drawPeds(state);
    drawEnemiesAndBullets(state);
    drawPlayer(state);
    toLogical();
    if (screen === SCREEN_TITLE) {
      drawTitle(state, extra || {});
      return;
    }
    drawHud(ctx, state);
    drawMinimap(ctx, state);
    if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view, camera };
}
