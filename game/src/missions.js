// The five jobs Sable lines up for Rook, plus the repeatable taxi fares after
// them. Each mission is a small step machine: a target on the map, a rule for
// when the step is done, and a payout at the end.
import { GRID, roadX, roadY } from './config.js';
import { int } from './random.js';
import { createCar } from './cars.js';
import { spawnEnemy } from './combat.js';

export const MISSIONS = [
  { id: 0, name: 'First Fare', pay: 150, brief: 'A fare at Coral Market. Take them to Sunset Plaza.' },
  { id: 1, name: 'Hot Delivery', pay: 250, brief: 'A package at the Old Cannery. Dune Strip, 75 seconds.' },
  { id: 2, name: 'Getaway Driver', pay: 400, brief: 'Get to 2 stars, then stay hot for 20 seconds.' },
  { id: 3, name: 'The Courier', pay: 500, brief: 'Ram three cars, then grab the case at Marina Row.' },
  { id: 4, name: 'The Harbor Job', pay: 1000, brief: 'Get to 3 stars, steal the armored Mule, bring it home.' },
];

function setMarker(state, x, y, label) {
  state.marker = { x, y, label };
}

/** Begin mission `index` (0..4) from its first step. */
export function startMission(state, index) {
  const def = MISSIONS[index];
  const L = state.city.landmarks;
  const mission = { index, step: 0, timer: 0, data: {}, target: null };
  state.mission = mission;
  if (index === 0) {
    mission.target = { x: L.market.x, y: roadY(1), label: 'Pick up the fare' };
  } else if (index === 1) {
    mission.timer = 75;
    mission.target = { x: L.cannery.x, y: roadY(4), label: 'Pick up the package' };
  } else if (index === 2) {
    mission.target = null;
  } else if (index === 3) {
    mission.data.rams = 0;
    mission.target = null;
  } else if (index === 4) {
    mission.target = null;
  }
  setMarker(state, mission.target ? mission.target.x : 0, mission.target ? mission.target.y : 0, def.name);
  if (!mission.target) state.marker = null;
  state.events.push({ type: 'toast', text: `New job: ${def.name} — $${def.pay}` });
  return mission;
}

function completeMission(state) {
  const mission = state.mission;
  const def = MISSIONS[mission.index];
  state.money += def.pay;
  state.done[mission.index] = true;
  state.missionIndex = mission.index + 1;
  state.mission = null;
  state.marker = null;
  state.events.push({ type: 'mission-done', def, pay: def.pay });
  if (state.missionIndex < MISSIONS.length) {
    startMission(state, state.missionIndex);
  } else {
    startFare(state);
  }
}

function failMission(state, why) {
  const index = state.mission.index;
  state.events.push({ type: 'toast', text: `${why} — starting ${MISSIONS[index].name} over` });
  startMission(state, index);
}

/** A fare after the five jobs: a pickup, a drop-off, $60–$120. */
export function startFare(state) {
  const pay = 60 + int(state.rng, 0, 6) * 10;
  const pickup = { x: roadX(int(state.rng, 1, GRID.cols - 1)), y: roadY(int(state.rng, 0, GRID.rows - 1)) };
  let drop = { x: roadX(int(state.rng, 1, GRID.cols - 1)), y: roadY(int(state.rng, 0, GRID.rows - 1)) };
  if (Math.hypot(drop.x - pickup.x, drop.y - pickup.y) < 500) {
    drop = { x: roadX(GRID.cols - 1), y: roadY(GRID.rows - 1) };
  }
  state.fare = { phase: 'pickup', pickup, drop, pay };
  setMarker(state, pickup.x, pickup.y, 'Fare pickup');
}

function stepFare(state, dt) {
  const fare = state.fare;
  const player = state.player;
  if (fare.phase === 'pickup') {
    setMarker(state, fare.pickup.x, fare.pickup.y, 'Fare pickup');
    if (player.inCar && Math.hypot(player.x - fare.pickup.x, player.y - fare.pickup.y) < 70) {
      fare.phase = 'drop';
      state.events.push({ type: 'toast', text: 'Fare aboard — take them to the marker' });
    }
  } else {
    setMarker(state, fare.drop.x, fare.drop.y, 'Fare drop-off');
    if (player.inCar && Math.hypot(player.x - fare.drop.x, player.y - fare.drop.y) < 70) {
      state.money += fare.pay;
      state.events.push({ type: 'cash', amount: fare.pay, what: `Fare paid $${fare.pay}` });
      startFare(state);
    }
  }
}

function near(player, target, radius) {
  return Math.hypot(player.x - target.x, player.y - target.y) < radius;
}

/** Advance the current mission one step; fares run once the jobs are done. */
export function stepMission(state, dt) {
  if (state.missionIndex >= MISSIONS.length) {
    if (!state.fare) startFare(state);
    stepFare(state, dt);
    return;
  }
  const mission = state.mission;
  if (!mission) {
    startMission(state, state.missionIndex);
    return;
  }
  const player = state.player;
  const L = state.city.landmarks;

  if (mission.index === 0) {
    if (mission.step === 0) {
      setMarker(state, L.market.x, roadY(1), 'Pick up the fare');
      if (player.inCar && near(player, { x: L.market.x, y: roadY(1) }, 70)) {
        mission.step = 1;
        state.events.push({ type: 'toast', text: 'Fare aboard — Sunset Plaza' });
      }
    } else {
      setMarker(state, L.plaza.x, roadY(3), 'Drop off the fare');
      if (player.inCar && near(player, { x: L.plaza.x, y: roadY(3) }, 70)) completeMission(state);
    }
  } else if (mission.index === 1) {
    mission.timer -= dt;
    if (mission.timer <= 0) {
      failMission(state, 'Too slow — the package went cold');
      return;
    }
    if (mission.step === 0) {
      setMarker(state, L.cannery.x, roadY(4), 'Pick up the package');
      if (near(player, { x: L.cannery.x, y: roadY(4) }, 70)) {
        mission.step = 1;
        state.events.push({ type: 'toast', text: 'Package in hand — Dune Strip, fast' });
      }
    } else {
      setMarker(state, L.dunes.x, roadY(5), 'Deliver the package');
      if (near(player, { x: L.dunes.x, y: roadY(5) }, 70)) completeMission(state);
    }
  } else if (mission.index === 2) {
    if (mission.step === 0) {
      state.marker = null;
      if (state.wanted >= 2) {
        mission.step = 1;
        mission.timer = 20;
        state.events.push({ type: 'toast', text: 'Two stars — stay hot for 20 seconds' });
      }
    } else {
      state.marker = null;
      if (state.wanted >= 2) {
        mission.timer -= dt;
        if (mission.timer <= 0) completeMission(state);
      }
      // Busted mid-getaway restarts the job (handled by the bust event).
    }
  } else if (mission.index === 3) {
    if (mission.step === 0) {
      state.marker = null;
      if (mission.data.rams >= 3) {
        mission.step = 1;
        mission.target = { x: L.marina.x, y: roadY(5) };
        for (let i = 0; i < 2; i += 1) {
          spawnEnemy(state, L.marina.x + (i === 0 ? -120 : 120), roadY(5) - 60);
        }
        state.events.push({ type: 'toast', text: 'Three rams — the case is at Marina Row' });
      }
    } else {
      setMarker(state, L.marina.x, roadY(5), 'Grab the case');
      if (near(player, { x: L.marina.x, y: roadY(5) }, 70)) completeMission(state);
    }
  } else if (mission.index === 4) {
    if (mission.step === 0) {
      state.marker = null;
      if (state.wanted >= 3) {
        mission.step = 1;
        const mule = createCar('Mule', roadX(6) + 30, roadY(3), Math.PI / 2, 'parked');
        state.cars.push(mule);
        mission.data.mule = mule;
        for (let i = 0; i < 3; i += 1) {
          spawnEnemy(state, roadX(6) + (i - 1) * 130, roadY(3) + 90);
        }
        state.events.push({ type: 'toast', text: 'Three stars — the armored Mule is by the clinic' });
      }
    } else if (mission.step === 1) {
      const mule = mission.data.mule;
      setMarker(state, mule.x, mule.y, 'Steal the Mule');
      if (player.inCar === mule) {
        mission.step = 2;
        state.events.push({ type: 'toast', text: 'Mule taken — bring it to Sable’s Garage' });
      }
    } else {
      setMarker(state, L.garage.x, roadY(1), 'Deliver the Mule');
      if (player.inCar === mission.data.mule && near(player, { x: L.garage.x, y: roadY(1) }, 80)) {
        completeMission(state);
      }
    }
  }
}

/** The mission line for the HUD: title plus the current objective. */
export function missionObjective(state) {
  if (state.missionIndex >= MISSIONS.length) {
    const fare = state.fare;
    if (!fare) return { title: 'Taxi', objective: 'Fares around Solmar Bay' };
    return {
      title: 'Taxi',
      objective: fare.phase === 'pickup' ? `Pick up the fare ($${fare.pay})` : `Drop off the fare ($${fare.pay})`,
    };
  }
  const mission = state.mission;
  // The title follows the mission actually running, not the index counter:
  // a staged scene (or a job restarted after a bust) can run a mission
  // whose index differs from missionIndex.
  const def = MISSIONS[mission ? mission.index : state.missionIndex];
  if (!mission) return { title: def.name, objective: def.brief };
  let objective = def.brief;
  if (mission.index === 0) objective = mission.step === 0 ? 'Pick up the fare at Coral Market (in a car)' : 'Drop the fare at Sunset Plaza';
  else if (mission.index === 1) objective = mission.step === 0 ? `Pick up the package (${Math.ceil(mission.timer)}s)` : `Deliver to Dune Strip (${Math.ceil(mission.timer)}s)`;
  else if (mission.index === 2) objective = mission.step === 0 ? 'Get to 2 stars — steal, punch, ram' : `Stay at 2+ stars: ${Math.ceil(mission.timer)}s`;
  else if (mission.index === 3) objective = mission.step === 0 ? `Ram cars: ${mission.data.rams}/3` : 'Grab the case at Marina Row';
  else if (mission.index === 4) objective = mission.step === 0 ? 'Get to 3 stars' : mission.step === 1 ? 'Steal the armored Mule' : 'Deliver the Mule to Sable’s Garage';
  return { title: def.name, objective };
}
