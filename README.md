# gta6-01-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Diest34/gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Diest34/gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunset Keys — an original 2D top-down open-world crime game, built for the make.fun
**"Make GTA 6"** bounty ($1,666 USDC). Plain Canvas 2D and ES modules —
no libraries, no network requests, no build step. Everything the game needs
is in `game/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## The game

Solmar Bay is a 2796×2400 city of 8×6 blocks: Palmetto Heights, Coral
Market, Old Cannery, Harbor Point, Marina Row and Dune Strip, with a beach
and the water along the south edge. Rook is a driver-for-hire who owes
Sable, the fixer, one season. He pays it back one job at a time.

- **Drive and walk** — WASD or arrows. E enters a car (or steals one),
  F punches, mouse aim + click (or K) shoots, R buys 12 rounds for $10.
- **The wanted system** — crime raises 0–5 stars. Interceptors chase,
  ram and bust. Busted on foot means a 20% fine and waking up at Harbor
  Clinic. Lie low for 22 seconds and the heat decays.
- **Five jobs for Sable** — First Fare ($150), Hot Delivery ($250, 75 s),
  Getaway Driver ($400), The Courier ($500) and The Harbor Job ($1,000),
  then repeatable taxi fares ($60–120). Rival crews shoot back and drop
  $40 when they go down.
- **A living city** — 22 parked cars, 14 traffic cars driving
  intersection to intersection, 26 pedestrians who stroll, flee gunshots
  and get knocked down by cars. Day clock, district names, a minimap.
- **Sound** — WebAudio synthesis only: engine hum by speed, a two-tone
  siren while wanted, gunshots, punches, crashes, cash and jingles.
- **Save** — P or Esc pauses and saves to localStorage; Enter continues
  the run, N starts a new game from the title screen.

## Screenshots

The four screenshots in `screenshots/` are staged by `game/src/shots.js`
(seed 7): the title over five seconds of city life, Rook on foot along
Coral Market, a three-star chase in a Gull GT, and the Hot Delivery run
south toward Dune Strip. Each one plays the real rules forward — nothing
is posed by hand.

## Files

```
game/index.html        the page; loads ./src/main.js as a module
game/src/config.js     tuning, palette, car models, wanted, combat
game/src/random.js     mulberry32 and small random helpers
game/src/city.js       layout, buildings, parks, palms, districts, collision
game/src/input.js      keyboard, mouse and scripted input
game/src/audio.js      WebAudio synthesis
game/src/save.js       localStorage save / load
game/src/player.js     on-foot movement, entering cars, hurt
game/src/cars.js       car factory, parked and traffic cars, driving, traffic AI
game/src/pedestrians.js  pedestrian spawns, strolls, fear, knock-downs
game/src/police.js     wanted level, spawns, chase / ram / bust, decay
game/src/combat.js     bullets, melee, shooting, rival enemies
game/src/missions.js   the five jobs, the step machine, fares, markers
game/src/hud.js        HUD and minimap
game/src/render.js     world drawing, cars, people, screens
game/src/game.js       one state, one stepGame
game/src/shots.js      the four deterministic screenshot scenes
game/src/main.js       boot, the loop, screens, save-on-pause
main.ts                copies game/ + screenshots/ to /output, writes dossier.json
serve.ts               local static server for game/ on localhost:8080
vendor/makefun-game.ts the make.fun dossier library (unmodified kit file)
```

## License

MIT. See `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nn10gehx&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
