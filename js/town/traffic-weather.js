//@ town/traffic-weather — Traffic and weather
//@ Defines: CARS, CAR_COLS, carMesh, carNight, spawnCar, updateCars, weatherTick
//@ Uses:    sim/core, core/util, world/grid, world/light-map, chase/fbi, town/arrest, gfx/props, world/vision, gfx/renderer, audio/sound
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── traffic & weather ─────────────────────────
const CARS = [];
const CAR_COLS = [0x6a2a24, 0x2c3e50, 0x8a8478, 0x3b4a32, 0x1f1f22, 0x7a6a3a];
let carT = 6,
  carMeshes = null;
function carMesh(i) {
  if (!carMeshes) carMeshes = CAR_COLS.map((c) => buildCarMesh(c));
  return carMeshes[i % carMeshes.length];
}
function carNight() {
  const h = G ? hourF() : 23;
  return h >= 18.2 || h < 7;
}
function spawnCar() {
  const east = chance(0.5);
  const v = rand(5.5, 7.5);
  CARS.push({
    x: east ? -4 : W + 4,
    z: east ? 16.5 : 15.5,
    dir: east ? 1 : -1,
    v,
    vMax: v,
    mesh: carMesh(irand(0, CAR_COLS.length - 1)),
    wait: 0,
    honked: false,
    model: M4.ident(),
  });
}
function updateCars(dt, running) {
  DYN.length = 0;
  if (running) {
    carT -= dt;
    const h = hourF();
    const busy = h > 7 && h < 20 ? 1 : h > 5.5 && h < 23.5 ? 0.5 : 0.18;
    if (carT <= 0) {
      carT = rand(9, 26) / busy;
      if (CARS.length < 3 && !FBI.ops.length && !ARREST.on) spawnCar();
    }
  }
  let loud = 0;
  for (let i = CARS.length - 1; i >= 0; i--) {
    const c = CARS[i];
    let block = false;
    for (const p of CHARS) {
      if (!p.onMap) continue;
      const ahead = (p.x - c.x) * c.dir;
      if (Math.abs(p.z - c.z) < 0.9 && ahead > 0.6 && ahead < 3.4) {
        block = true;
        break;
      }
    }
    if (!block)
      for (const o of CARS) {
        if (o !== c && o.dir === c.dir) {
          const ahead = (o.x - c.x) * c.dir;
          if (ahead > 0 && ahead < 3.3) block = true;
        }
      }
    let vT = running ? (block ? 0 : c.vMax) : 0;
    if (c.fbi) vT = fbiCarV(c, vT);
    else if (c.cop) vT = copCarV(c, vT);
    c.v += (vT - c.v) * Math.min(1, dt * (block ? 6 : 1.4));
    c.x += c.v * c.dir * dt;
    if (block && running) {
      c.wait += dt;
      if (c.wait > 1.4 && !c.honked) {
        c.honked = true;
        if (visAt(c.x, c.z) > 0.2 || Math.hypot(PLAYER.x - c.x, PLAYER.z - c.z) < 10) {
          const [sx] = project(c.x, 0.5, c.z);
          audio.horn(clamp((sx / Math.max(1, window.innerWidth)) * 2 - 1, -1, 1));
        }
      }
    } else c.wait = 0;
    if (c.x < -6 || c.x > W + 6) {
      CARS.splice(i, 1);
      continue;
    }
    c.model = M4.mul(M4.trans(c.x, 0, c.z), M4.rotY(c.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    if (carNight()) {
      const hx = Math.floor(c.x + c.dir * 1.2),
        hz = Math.floor(c.z);
      if (inb(hx, hz)) DYN.push({ x: hx, z: hz, dx: c.dir, dz: 0, cone: 0.8, col: [1, 0.92, 0.76], int: 1.2, r: 9.5 });
      const tx = Math.floor(c.x - c.dir * 1.2);
      if (inb(tx, hz)) DYN.push({ x: tx, z: hz, col: [1, 0.12, 0.08], int: 0.4, r: 2.4 });
    }
    if (G && G.started)
      loud = Math.max(loud, clamp(1 - Math.hypot(PLAYER.x - c.x, PLAYER.z - c.z) / 16, 0, 1) * clamp(c.v / 6, 0, 1));
  }
  return loud;
}
function weatherTick(dtGame) {
  const h = hourF();
  const target =
    G.rainDay && (G.rainFrom > G.rainTo ? h >= G.rainFrom || h < G.rainTo : h >= G.rainFrom && h < G.rainTo)
      ? G.rainAmt
      : 0;
  G.rainK += (target - G.rainK) * Math.min(1, dtGame * 0.03);
  G.wet = Math.max(G.rainK, (G.wet || 0) - dtGame * 0.003);
}
