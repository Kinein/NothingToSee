//@ gfx/station — The police cells drawn: bars, benches, the booking corner, the sliding doors
//@ Defines: STN, CELL_X, CELL_N, CELL_BARS_Z, CELL_DOOR, CELL_CLOCK, CELL_CHART_X, stnBars, stnWall, stnDoorGeo, stnSteelToilet, stnBench, stnTubeCage, stnDesk, stnTripod, buildStation, …
//@ Uses:    gfx/world-geometry, core/util, gfx/gl, gfx/wall-dressing, world/grid, gfx/models, gfx/renderer, gfx/post, world/light-map, gfx/draw-helpers
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the police cells, drawn: the bars, the steel benches and toilets, the booking corner with its height
// chart and camera, the desk. Lit and seen only while you're held (town/cell.js plays the hours in here). The cell doors
// slide, so each is a mesh of its own; the tubes, the clock's hands and the sky in the windows are drawn live by cell.js.
const STN = {
  steel: C(0x80878a),
  steelD: C(0x3f4549),
  bar: C(0x2a2e32),
  wood: C(0x5e4631),
  woodD: C(0x3a2a1c),
  paper: C(0xd8d4c8),
  navy: C(0x1d2a44),
};
const CELL_X = [1, 7, 13]; // each cell's first tile from the west; yours is the last, nearest the booking corner
const CELL_N = STATION_Z0 + 0.5 + WT; // the back wall's face
const CELL_BARS_Z = STATION_Z0 + 3.5 + WT; // the bars' line, flush with the ends of the walls between the cells
const CELL_DOOR = { at: 1.9, w: 1.2, slide: 1.15 }; // the door: its west edge from the cell's first tile, its width, how far it slides
const CELL_CLOCK = [CELL_X[2] + 4.2, 1.98, CELL_N + 0.005]; // high on your cell's back wall, to the right of the window
const CELL_CHART_X = 21.5; // the height chart, and where you stand against it

// a run of bars from x0 to x1 along z: uprights, a rail at the foot, one across the middle, one along the top
function stnBars(g, x0, x1, z) {
  const n = Math.max(1, Math.round((x1 - x0) / 0.2));
  for (let k = 0; k <= n; k++) g.cyl(x0 + ((x1 - x0) * k) / n, 0.04, z, 0.021, 0.021, 2.55, 6, STN.bar, XM('metal'));
  g.bx((x0 + x1) / 2, 0, z, x1 - x0 + 0.04, 0.07, 0.07, STN.bar, XM('metal'));
  g.bx((x0 + x1) / 2, 1.0, z, x1 - x0 + 0.04, 0.05, 0.06, STN.bar, XM('metal'));
  g.bx((x0 + x1) / 2, 2.56, z, x1 - x0 + 0.04, 0.1, 0.08, STN.bar, XM('metal'));
}
// a piece on a wall's face that sinks with the wall when it's cut away: (wx, wz) the wall's tile, `side` the way the
// face looks. Local frame as for mount(): x along the wall, y up, z out of the face.
function stnWall(g, wx, wz, side, along, fn) {
  const [dx, dz, a] = { S: [0, 1, 0], N: [0, -1, Math.PI], E: [1, 0, Math.PI / 2], W: [-1, 0, -Math.PI / 2] }[side];
  const prevCell = g.cell,
    prevMat = g.mat;
  g.cell = [wx + 1000.5, wz + 0.5];
  g.mat = M4.mul(M4.mul(M4.trans(wx + 0.5 + dx * WT, 0, wz + 0.5 + dz * WT), M4.rotY(a)), M4.trans(along, 0, 0));
  try {
    fn(g);
  } finally {
    g.mat = prevMat;
    g.cell = prevCell;
  }
}
function stnDoorGeo() {
  const g = new Geo(),
    w = CELL_DOOR.w;
  g.ao = 0.8;
  g.aoH = 1.4;
  stnBars(g, 0.05, w - 0.05, 0);
  for (const x of [0.02, w - 0.02]) g.bx(x, 0, 0, 0.05, 2.6, 0.06, STN.bar, XM('metal')); // the frame
  g.bx(w - 0.12, 0.92, 0.05, 0.14, 0.24, 0.05, STN.steelD, XM('metal')); // the lock, on the corridor side
  g.bx(w - 0.12, 1.0, 0.085, 0.05, 0.05, 0.02, C(0x8a8a80));
  g.bx(w - 0.3, 0.98, 0.06, 0.16, 0.04, 0.04, STN.steelD); // the handle
  return makeMesh(g);
}
function stnSteelToilet(g, x, z) {
  g.bx(x, 0.0, z + 0.05, 0.44, 0.38, 0.42, STN.steel, XM('metal'));
  g.cyl(x, 0.38, z + 0.08, 0.2, 0.19, 0.03, 12, mul3(STN.steel, 1.1), XM('metal'));
  g.cyl(x, 0.405, z + 0.08, 0.14, 0.14, 0.006, 12, C(0x1c2224));
  g.bx(x, 0.0, z - 0.2, 0.5, 0.98, 0.16, STN.steel, XM('metal')); // the back, with the basin on top
  g.bx(x, 0.98, z - 0.14, 0.42, 0.06, 0.26, mul3(STN.steel, 1.05), XM('metal'));
  g.bx(x, 1.005, z - 0.12, 0.3, 0.04, 0.16, C(0x2a3032));
  g.cyl(x, 1.04, z - 0.24, 0.02, 0.02, 0.1, 6, STN.steelD);
}
function stnBench(g, x0, x1) {
  g.bx((x0 + x1) / 2, 0.4, CELL_N + 0.24, x1 - x0, 0.06, 0.48, STN.steel, XM('metal'));
  g.bx((x0 + x1) / 2, 0.36, CELL_N + 0.46, x1 - x0, 0.1, 0.04, STN.steelD, XM('metal'));
  for (const x of [x0 + 0.25, x1 - 0.25]) {
    g.bx(x, 0.02, CELL_N + 0.02, 0.06, 0.38, 0.04, STN.steelD);
    g.xf(M4.mul(M4.trans(x, 0.22, CELL_N + 0.2), M4.rotX(0.75)), () => g.bx(0, -0.02, 0, 0.05, 0.05, 0.42, STN.steelD));
  }
}
// the tube's cage over a window; the tube inside it is drawn lit by cell.js
function stnTubeCage(g, x) {
  const z = CELL_N + 0.07;
  g.bx(x, 2.36, z - 0.03, 1.08, 0.04, 0.08, STN.steelD, XM('metal'));
  g.bx(x, 2.5, z - 0.03, 1.08, 0.04, 0.08, STN.steelD, XM('metal'));
  for (let k = 0; k < 6; k++) g.bx(x - 0.5 + k * 0.2, 2.36, z + 0.04, 0.012, 0.18, 0.012, STN.bar);
  for (const y of [2.39, 2.47]) g.bx(x, y, z + 0.05, 1.02, 0.012, 0.012, STN.bar);
}
function stnDesk(g, x, z) {
  g.bx(x, 0.72, z, 1.5, 0.05, 0.76, STN.wood, XM('wood'));
  for (const s of [-1, 1]) g.bx(x + s * 0.55, 0, z, 0.38, 0.72, 0.7, STN.woodD, XM('wood'));
  g.bx(x, 0.4, z + 0.36, 0.72, 0.3, 0.02, STN.woodD);
  g.bx(x - 0.35, 0.77, z + 0.05, 0.42, 0.12, 0.3, C(0x2f3134)); // a typewriter, a sheet in it
  g.bx(x - 0.35, 0.86, z - 0.05, 0.3, 0.16, 0.01, STN.paper, XM('print'));
  for (let k = 0; k < 3; k++)
    g.bx(
      x + 0.15 + k * 0.012,
      0.77 + k * 0.012,
      z + 0.1 - k * 0.02,
      0.24,
      0.012,
      0.32,
      mul3(STN.paper, 1 - k * 0.06),
      XM('print'),
    );
  g.cyl(x + 0.05, 0.77, z - 0.22, 0.045, 0.04, 0.1, 8, C(0xd8d4c8)); // a mug
  g.bx(x + 0.35, 0.77, z - 0.22, 0.2, 0.12, 0.1, C(0x2a2a2a)); // the radio
  g.cyl(x + 0.43, 0.89, z - 0.25, 0.006, 0.006, 0.25, 4, COL.black);
  g.cyl(x + 0.6, 0.77, z - 0.1, 0.08, 0.08, 0.02, 10, STN.steelD); // the lamp's foot and stem
  g.cyl(x + 0.6, 0.79, z - 0.1, 0.012, 0.012, 0.32, 6, STN.steelD);
}
function stnTripod(g, x, z) {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    g.xf(M4.mul(M4.mul(M4.trans(x + Math.sin(a) * 0.2, 0, z + Math.cos(a) * 0.2), M4.rotY(a)), M4.rotX(-0.16)), () =>
      g.bx(0, 0, 0, 0.025, 1.36, 0.025, COL.black),
    );
  }
  g.cyl(x, 1.3, z, 0.035, 0.035, 0.12, 6, COL.black);
  g.bx(x, 1.42, z, 0.22, 0.16, 0.18, C(0x26282b)); // the camera, looking north at the chart
  g.cyl(x, 1.5, z - 0.09, 0.05, 0.05, 0.1, 10, C(0x18191b));
  g.xf(M4.mul(M4.trans(x, 1.5, z - 0.14), M4.rotX(Math.PI / 2)), () =>
    g.cyl(0, 0, 0, 0.05, 0.055, 0.1, 10, C(0x18191b)),
  );
  g.bx(x + 0.1, 1.58, z, 0.08, 0.12, 0.06, C(0x3a3c3e)); // the flash
  g.bx(x + 0.1, 1.64, z - 0.032, 0.07, 0.05, 0.004, C(0xe8e8e0), EMIT(0.15));
}
function buildStation() {
  const g = new Geo(),
    lit = new Geo();
  g.ao = 0.7;
  g.aoH = 1.6;
  const Z0 = STATION_Z0;
  // ── the three cells
  CELL_X.forEach((x0, k) => {
    const xl = x0 - 0.5 + WT,
      xr = x0 + 5.5 - WT,
      d0 = x0 + CELL_DOOR.at,
      d1 = d0 + CELL_DOOR.w;
    stnBars(g, xl, d0, CELL_BARS_Z);
    stnBars(g, d1, xr, CELL_BARS_Z);
    g.bx((xl + d1) / 2, 2.6, CELL_BARS_Z + 0.07, d1 - xl, 0.06, 0.05, STN.steelD, XM('metal')); // the door's track
    stnBench(g, x0 + 1.15, x0 + 3.85);
    stnSteelToilet(g, x0 + 4.75, CELL_N + 0.3);
    stnTubeCage(g, x0 + 2.5);
    for (let b = 0; b < 4; b++) g.cyl(x0 + 2.2 + b * 0.2, 0.93, Z0 + 0.6, 0.018, 0.018, 1.22, 6, STN.bar, XM('metal')); // the window's bars
    g.bx(x0 + 2.5, 0.88, Z0 + 0.62, 1.0, 0.05, 0.1, C(0x6a6e6c)); // its sill
    if (k === 1) {
      g.xf(M4.mul(M4.trans(x0 + 1.2, 0.04, Z0 + 2.3), M4.rotY(1.1)), () => {
        g.cyl(0, -0.04, 0, 0.04, 0.04, 0.24, 8, C(0x3a2a14), GLASS); // a bottle, rolled under the bench
        g.cyl(0, 0.2, 0, 0.018, 0.018, 0.06, 6, C(0x3a2a14));
      });
      g.bx(x0 + 3.3, 0, Z0 + 1.9, 0.12, 0.08, 0.28, COL.black); // one shoe, kicked off
    } else if (k === 0) {
      g.bx(x0 + 2.2, 0.46, CELL_N + 0.24, 0.7, 0.1, 0.4, C(0x5a5f5a), XM('fabric')); // a blanket, folded
      g.bx(x0 + 2.5, 2.415, CELL_N + 0.06, 0.92, 0.05, 0.05, C(0x4a4e4c)); // its tube, dead
    }
  });
  // the clock's face: the hands go round in cell.js
  {
    const [cx, cy, cz] = CELL_CLOCK;
    g.xf(M4.mul(M4.trans(cx, cy, cz), M4.rotX(Math.PI / 2)), () => {
      g.cyl(0, 0, 0, 0.19, 0.19, 0.05, 18, C(0x2a2724)); // rotX turns its axis out of the wall
      g.cyl(0, 0.05, 0, 0.165, 0.165, 0.005, 18, C(0xd8d2c0));
    });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      g.bx(
        cx + Math.sin(a) * 0.13,
        cy + Math.cos(a) * 0.13 - 0.008,
        cz + 0.057,
        0.01,
        k % 3 ? 0.014 : 0.035,
        0.004,
        COL.black,
      );
    }
    g.xf(M4.mul(M4.trans(cx, cy, cz + 0.12), M4.rotX(Math.PI / 2)), () => {
      for (let k = 0; k < 5; k++) g.bx(-0.16 + k * 0.08, 0, 0, 0.01, 0.01, 0.4, STN.bar); // its cage
      g.cyl(0, -0.005, 0, 0.21, 0.21, 0.01, 18, STN.bar, null, false);
    });
  }
  // what you've scratched into the paint, or someone before you: tallies over the end of the bench
  for (let k = 0; k < 9; k++) {
    const grp = Math.floor(k / 5),
      i = k % 5,
      x = CELL_X[2] + 3.45 + grp * 0.2 + i * 0.03;
    if (i < 4) g.bx(x, 1.05, CELL_N + 0.003, 0.008, 0.11, 0.004, C(0x9a9c94));
    else
      g.xf(M4.mul(M4.trans(x - 0.05, 1.1, CELL_N + 0.004), M4.rotZ(1.0)), () =>
        g.bx(0, -0.07, 0, 0.008, 0.15, 0.004, C(0x9a9c94)),
      );
  }
  // ── the booking corner: the chart, the camera on its legs, a cabinet
  stnWall(g, CELL_CHART_X - 0.5, Z0, 'S', 0, (g) => {
    g.bx(0, 0.25, 0.006, 1.24, 1.9, 0.012, C(0xcdc8b8));
    for (let k = 0; k <= 17; k++) {
      const y = 0.4 + k * 0.1,
        big = k % 3 === 0;
      g.bx(0, y, 0.014, big ? 1.16 : 0.6, big ? 0.014 : 0.007, 0.003, C(0x2a2a28));
      if (big) for (const s of [-1, 1]) g.bx(s * 0.52, y + 0.03, 0.015, 0.08, 0.035, 0.003, C(0x2a2a28)); // the heights
    }
    g.bx(0, 2.13, 0.012, 0.9, 0.16, 0.02, STN.navy);
    g.bx(0, 2.18, 0.024, 0.66, 0.05, 0.004, C(0xc8b880));
  });
  stnTubeCage(g, CELL_CHART_X);
  stnTripod(g, CELL_CHART_X, Z0 + 3.1);
  g.bx(19.45, 0, CELL_N + 0.32, 0.6, 1.32, 0.62, C(0x6d726c), XM('metal')); // the filing cabinet
  for (let k = 0; k < 4; k++) g.bx(19.45, 0.12 + k * 0.31, CELL_N + 0.635, 0.5, 0.26, 0.01, C(0x5f645e));
  // ── the corridor: the desk, a chair each side, the board of notices, a bench to wait on, water
  stnDesk(g, 23.6, Z0 + 5.05);
  lit.cyl(24.2, 1.1, Z0 + 4.95, 0.13, 0.07, 0.14, 10, C(0x2e5a3a), EMIT(0.35)); // the green shade
  lit.cyl(24.2, 1.09, Z0 + 4.95, 0.08, 0.08, 0.01, 10, C(0xfff0c8), EMIT(1.4));
  g.xf(M4.trans(23.6, 0, Z0 + 4.3), () => MODELS.chair_office(g));
  g.xf(M4.mul(M4.trans(22.2, 0, Z0 + 5.4), M4.rotY(Math.PI / 2 + 0.3)), () => MODELS.chair(g, { x: 22, z: Z0 + 5 }));
  stnWall(g, 25, Z0 + 2, 'W', 0, (g) => {
    DK.board(g, 1.3, 0.9, 1.15, 'notes', 41);
    g.xf(M4.trans(-0.1, 0, 0.03), () => DK.missing(g, 1.35, 7));
  });
  stnWall(g, 25, Z0 + 4, 'W', 0.1, (g) => DK.calendar(g, 1.3, 12));
  stnWall(g, 25, Z0 + 6, 'W', 0, (g) => DK.switchPlate(g));
  stnWall(g, 0, Z0 + 5, 'E', 0, (g) => DK.extinguisher(g));
  g.xf(M4.mul(M4.trans(9.5, 0, Z0 + 6.95), M4.rotY(Math.PI)), () => {
    g.bx(0, 0.42, 0, 2.2, 0.05, 0.42, STN.wood, XM('wood'));
    for (const s of [-1, 1]) g.bx(s * 0.95, 0, 0, 0.06, 0.42, 0.36, STN.woodD);
  });
  g.xf(M4.mul(M4.trans(17.5, 0, Z0 + 6.95), M4.rotY(Math.PI)), () => MODELS.watercooler(g));
  g.xf(M4.trans(3.2, 0, Z0 + 6.4), () => MODELS.bucket(g));
  const out = [makeMesh(g, { cut: 1 })],
    lm = makeMesh(lit);
  lm.litGrp = 'station';
  out.push(lm);
  return out;
}
function stationRenderInit() {
  R.decor.push(...buildStation());
  R.cellDoors = CELL_X.map((x0) => {
    const m = stnDoorGeo();
    m.model = M4.trans(x0 + CELL_DOOR.at, 0, CELL_BARS_Z + 0.07);
    m.center = [x0 + CELL_DOOR.at, 1, CELL_BARS_Z];
    return m;
  });
  for (const t of STATION_TUBES)
    R.glows.push({ p: [t.x, t.y, t.z + 0.06], col: nrm3(t.l.col), size: 0.55, grp: 'station', light: t.l, spec: 0.8 });
  const lamp = LIGHTS.find((l) => l.grp === 'station' && l.col[0] > l.col[2] * 1.3);
  if (lamp)
    R.glows.push({ p: [24.2, 1.05, STATION_Z0 + 4.95], col: nrm3(lamp.col), size: 0.4, grp: 'station', light: lamp });
}
