# GameZone - Multi-Game Website

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Modern game hub homepage with game cards and navigation
- 11 distinct browser games, all playable in-page:
  1. **Geometry Dash** -- rhythm-based auto-runner, tap/space to jump over obstacles, spikes, and blocks in time with the beat. Multiple obstacle patterns.
  2. **Geometry Wave Dash** -- wave mode variant: hold space to go up, release to go down, navigate through spiked corridors.
  3. **Basketball** -- 2D physics-based game, aim and shoot hoops with a power/angle system. Increasing difficulty.
  4. **Baseball** -- pitch comes in, click/space to swing the bat at the right moment. Hit for singles/doubles/home runs based on timing.
  5. **Football** -- top-down or side-view play: QB throws to receivers, click to select receiver and release to throw. Defenders try to intercept. Drive down field to score touchdowns.
  6. **Soccer** -- 2D side-view: player vs goalie, aim with arrow keys, kick with spacebar, power bar mechanic.
  7. **Skateboard** -- side-scrolling skater: arrow keys to move, space/up to ollie, perform tricks (kickflip, grind) for points.
  8. **Car Racing** -- top-down or side-view car racing on a track, WASD/arrows to steer, avoid obstacles, lap timer.
  9. **Bike** -- side-scrolling BMX bike: balance and perform flips/tricks over ramps for points.
  10. **Plane** -- top-down or side-scroll plane flying: dodge clouds, mountains, enemy planes, collect fuel pickups. WASD to fly.
  11. **Duck RPG (Duck Dash)** -- duck character with three stats: Running, Flying, Swimming. Earn XP in races to level each up. Race modes: land race, sky race, river race. Stats affect speed in each environment. Persistent progress shown on duck's profile card.

- Game hub: clean grid of game cards with title, thumbnail illustration (canvas-drawn), short description, and Play button
- Each game opens in a full-screen overlay/modal with an X to close and return to hub
- High score tracking per game stored in backend
- Duck RPG: persistent duck stats stored in backend (level + XP per stat)

### Modify
Nothing (new project).

### Remove
Nothing (new project).

## Implementation Plan
1. Backend: store high scores (per game per session), duck RPG stats (run/fly/swim level + xp)
2. Frontend hub: responsive grid layout, game cards with canvas thumbnails, modern dark theme
3. Each game implemented as a self-contained React component using Canvas API + requestAnimationFrame
4. Game overlay system: clicking Play card opens fullscreen game, X closes it
5. Duck RPG: stat bar UI, race selection, XP gain, level-up animations
6. All games use keyboard + mouse controls with on-screen touch fallback buttons
