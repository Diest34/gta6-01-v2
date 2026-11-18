# gta6-01-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Diest34/gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Diest34/gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Sunset Keys** is an original 2D top-down open-world crime game, built for
make.fun's "Make GTA 6" bounty ($1,666 USDC). It runs on plain Canvas 2D
with ES modules — no libraries, no network calls, no build step. The whole
game lives in `game/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## The world

Solmar Bay spans 2796×2400 pixels across 8×6 blocks, split into six
districts — Palmetto Heights, Coral Market, Old Cannery, Harbor Point,
Marina Row and Dune Strip — with a beach and open water hugging the south
edge. You are Rook, a driver-for-hire who owes the fixer Sable one season
of work, and you pay that debt one job at a time.

## How it plays

- **On foot and behind the wheel** — move and drive with WASD or the arrow
  keys. Press E to get into a car (or steal one), F to punch, aim with the
  mouse and click (or K) to shoot, R to buy 12 rounds for $10.
- **Heat** — every crime pushes your wanted level up through 0–5 stars.
  Interceptors hunt you down, ram your car for 6 HP a hit, and bust you
  if they catch you on foot: a 20% fine and a wake-up at Harbor Clinic.
  Stay clean for 22 seconds with no cop within 420 px and the heat fades.
- **Five jobs for Sable** — First Fare ($150), Hot Delivery ($250, 75 s
  on the clock), Getaway Driver ($400, shake the tail for 20 s at 2
  stars), The Courier ($500, ram three times and grab the case), and The
  Harbor Job ($1,000, steal the armored Mule at 3 stars). After that,
  repeatable taxi fares pay $60–120 a ride. Rival crews shoot back and
  drop $40 when they fall.
- **A city that moves** — 22 parked cars, 14 traffic cars cruising
  intersection to intersection on the right-hand lane, and 26 pedestrians
  who stroll the sidewalks, run from gunshots and get knocked down by
  cars. A day clock, district names and a minimap keep you oriented.
- **Sound, synthesized live** — WebAudio only: an engine hum that follows
  your speed, a two-tone siren while you are wanted, plus gunshots,
  punches, crashes, cash and jingles.
- **Saving** — P or Esc pauses and writes the run to localStorage
  (`sunset-keys.save.v1`). Enter continues, N starts fresh from the
  title screen.

## Screenshots

The four frames in `screenshots/` come from `game/src/shots.js` (seed 7):
the title over five seconds of city life, Rook walking east along Coral
Market, a three-star chase in a Gull GT, and the Hot Delivery run heading
south toward Dune Strip. Every shot is the real simulation stepped forward
by a scripted autopilot — nothing is hand-posed.

## Inside the code

```
game/index.html         the page; loads ./src/main.js as a module
game/src/config.js      tuning, palette, car models, wanted rules, combat
game/src/random.js      mulberry32 and small random helpers
game/src/city.js        layout, buildings, parks, palms, districts, collision
game/src/input.js       keyboard, mouse and scripted input
game/src/audio.js       WebAudio synthesis
game/src/save.js        localStorage save / load
game/src/player.js      on-foot movement, entering cars, getting hurt
game/src/cars.js        car factory, parked and traffic cars, driving, traffic AI
game/src/pedestrians.js pedestrian spawns, strolls, fear, knock-downs
game/src/police.js      wanted level, spawns, chase / ram / bust, decay
game/src/combat.js      bullets, melee, shooting, rival enemies
game/src/missions.js    the five jobs, the step machine, fares, markers
game/src/hud.js         HUD and minimap
game/src/render.js      world drawing, cars, people, screens
game/src/game.js        one state, one stepGame
game/src/shots.js       the four deterministic screenshot scenes
game/src/main.js        boot, the loop, screens, save-on-pause
main.ts                 copies game/ + screenshots/ to /output, writes dossier.json
serve.ts                local static server for game/ on localhost:8080
vendor/makefun-game.ts  the make.fun dossier library (unmodified kit file)
```

## License

MIT. See `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nn10gehx&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
