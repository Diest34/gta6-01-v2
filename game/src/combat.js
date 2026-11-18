// Combat: Rook's pistol and fists, the bullets in the air, and the rival
// shooters who fire back and drop cash when they go down.
import { COMBAT } from './config.js';
import { collideCircle } from './city.js';
import { hurtPlayer } from './player.js';
import { scarePeds } from './pedestrians.js';

/** One bullet: position, velocity, who fired it, and a short life. */
export function fireBullet(state, x, y, angle, from) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * COMBAT.bulletSpeed,
    vy: Math.sin(angle) * COMBAT.bulletSpeed,
    from,
    life: COMBAT.bulletLife,
  });
}

/** Rook fires the pistol toward the aim point (costs one round). */
export function tryShoot(state, input) {
  const player = state.player;
  if (player.shootCd > 0 || state.ammo <= 0) return false;
  player.shootCd = 0.22;
  state.ammo -= 1;
  state.stats.shots += 1;
  const angle = Math.atan2(input.aim.y - player.y, input.aim.x - player.x);
  const ox = player.x + Math.cos(angle) * 22;
  const oy = player.y + Math.sin(angle) * 22;
  fireBullet(state, ox, oy, angle, 'player');
  scarePeds(state, player.x, player.y, 320);
  state.events.push({ type: 'shot' });
  return true;
}

/** Rook's punch: a short arc in front, 34 damage. */
export function tryPunch(state) {
  const player = state.player;
  if (player.punchCd > 0 || player.inCar) return false;
  player.punchCd = COMBAT.punchCooldown;
  let hit = false;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const facing = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    let diff = Math.abs(facing - player.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (d < COMBAT.punchRange && diff < 1.1) {
      enemy.hp -= COMBAT.punchDamage;
      hit = true;
      if (enemy.hp <= 0) state.events.push({ type: 'enemy-down', enemy });
    }
  }
  // A punch that lands on a pedestrian is assault — the law notices.
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (d < COMBAT.punchRange) {
      ped.state = 'down';
      ped.downAt = 4;
      hit = true;
      state.events.push({ type: 'crime', stars: 1, what: 'Assaulted a pedestrian' });
      break;
    }
  }
  state.events.push({ type: 'punch', hit });
  return hit;
}

/** A rival shooter, placed by a mission or by the heat. */
export function spawnEnemy(state, x, y) {
  const enemy = {
    x, y,
    angle: 0,
    hp: COMBAT.enemyHp,
    shootCd: 1,
    strafe: Math.random() < 0.5 ? 1 : -1,
  };
  state.enemies.push(enemy);
  return enemy;
}

function stepBullets(state, dt) {
  const keep = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    const hit = collideCircle(state.city, b.x, b.y, 2);
    if (hit.hit) continue; // a wall eats the round
    let spent = false;
    if (b.from === 'player') {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        if (Math.hypot(enemy.x - b.x, enemy.y - b.y) < 18) {
          enemy.hp -= COMBAT.bulletDamage;
          spent = true;
          if (enemy.hp <= 0) state.events.push({ type: 'enemy-down', enemy });
          break;
        }
      }
      if (!spent) {
        for (const car of state.cars) {
          if (car.driven || car.kind === 'wreck') continue;
          if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
            car.hp -= COMBAT.bulletDamage;
            spent = true;
            break;
          }
        }
      }
    } else if (Math.hypot(state.player.x - b.x, state.player.y - b.y) < 16) {
      // An enemy round finds Rook (or the car he is driving).
      if (state.player.inCar) {
        state.player.inCar.hp -= COMBAT.bulletDamage;
        if (state.player.inCar.hp <= 0) state.events.push({ type: 'car-wrecked', car: state.player.inCar });
      } else {
        hurtPlayer(state, COMBAT.bulletDamage);
      }
      spent = true;
    }
    if (!spent) keep.push(b);
  }
  state.bullets = keep;
}

function stepEnemies(state, dt) {
  const player = state.player;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.angle = Math.atan2(dy, dx);
    if (dist > 300) {
      enemy.x += Math.cos(enemy.angle) * 95 * dt;
      enemy.y += Math.sin(enemy.angle) * 95 * dt;
    } else if (dist < 140) {
      enemy.x -= Math.cos(enemy.angle) * 60 * dt;
      enemy.y -= Math.sin(enemy.angle) * 60 * dt;
    } else {
      // Strafe sideways so the gunfight moves.
      enemy.x += Math.cos(enemy.angle + Math.PI / 2) * 55 * enemy.strafe * dt;
      enemy.y += Math.sin(enemy.angle + Math.PI / 2) * 55 * enemy.strafe * dt;
      if (state.rng() < dt * 0.4) enemy.strafe *= -1;
    }
    const snapped = collideCircle(state.city, enemy.x, enemy.y, 12);
    enemy.x = snapped.x;
    enemy.y = snapped.y;
    enemy.shootCd -= dt;
    if (enemy.shootCd <= 0 && dist < COMBAT.enemyRange) {
      enemy.shootCd = COMBAT.enemyShootCooldown;
      const spread = (state.rng() - 0.5) * 0.16;
      fireBullet(state, enemy.x, enemy.y, enemy.angle + spread, 'enemy');
    }
  }
  // The dead drop $40 where they fell; Rook collects by walking over it.
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && !enemy.paid) {
      enemy.paid = true;
      state.money += COMBAT.enemyDrop;
      state.stats.kills += 1;
      state.events.push({ type: 'cash', amount: COMBAT.enemyDrop, what: 'Rival dropped $40' });
    }
  }
  state.enemies = state.enemies.filter((e) => e.hp > 0);
}

export function stepCombat(state, input, dt) {
  if (input.shootHeld && !state.player.inCar) tryShoot(state, input);
  stepBullets(state, dt);
  stepEnemies(state, dt);
}
