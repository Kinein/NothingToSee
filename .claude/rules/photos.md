---
paths:
  - "js/play/photos.js"
  - "js/gfx/viewfinder.js"
  - "js/gfx/vf-sky.js"
  - "js/gfx/vf-stage.js"
---

# Photos and the camera

Moved unchanged from the *Where to change things* table in `CLAUDE.md`.

Photos: the wedge, the photo hint (`photoHintTick`), the flash rule (`photoSeen`), what F turns you onto
(`photoAim`, `CTRL.photoAim`): `js/play/photos.js` (`playerPhoto`, `takePhoto`).

- The camera's square (live view through your eyes, zoom, the walls and furniture left out of the shot, the flash,
  the print): `js/gfx/viewfinder.js` (`vfOpen`, `vfLens`, `vfRender`, `vfInWay`).
- The ceilings, sky and city skyline only the photo sees: `js/gfx/vf-sky.js` (`vfBackdrop`).
- The staged shot (what a shot is worth: `photoStakes`; something odd gets a whip-pan and slow push-in, evidence
  sends the camera round to where it shows best, walls permitting, and the subject poses for it; the world slows
  meanwhile): `js/gfx/vf-stage.js` (`VF_SHOT`, `VF_POSE`, `vfPlan`, `vfSpotOk`, `vfSlow`).

What a photo is worth as evidence (Habit and Body are photographed, Home is taken, a true form with no face is a
scary photo, not a card) is `docs/DESIGN.md`, *Evidence* and *Things and photos*: read it before changing what a
shot produces. The print is a GPU read-back: it goes through `warmLater` (gfx/portraits.js), never mid-frame.
