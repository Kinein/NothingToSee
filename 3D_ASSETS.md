# 3D Assets: what the game has, and what it could have

All of the game's 3D assets are **procedural**. There are no model files: every mesh is built in code
from boxes, cylinders, spheres and tubes (the `g.bx`, `g.cyl`, `g.sphere` helpers in `gfx/world-geometry.js`)
when the game starts. "Adding an asset" here means writing a builder function, not importing a `.glb`.

Legend: ✅ in the game now · 💡 idea for a new asset

---

## Part 1: Assets the game has now

### Furniture and fixtures (`gfx/models.js`, types listed in `OT` in `world/objects.js`)

**Home and bathroom**
- ✅ Bed
- ✅ Nightstand / bedside lamp
- ✅ Wardrobe
- ✅ Toilet
- ✅ Shower
- ✅ Bathroom sink
- ✅ Radiator
- ✅ Rugs (home, Agnes's, house) and hallway runner

**Kitchen**
- ✅ Fridge (home and office versions)
- ✅ Counter
- ✅ Kitchen sink counter
- ✅ Stove
- ✅ Microwave

**Living room**
- ✅ Television (modern, 2 cells wide)
- ✅ Old television
- ✅ Radio
- ✅ Phone
- ✅ Table
- ✅ Chair
- ✅ Armchair
- ✅ Sofa (3 cells wide)
- ✅ Floor lamp
- ✅ Birdcage
- ✅ Bookshelf

**Office**
- ✅ Desk
- ✅ Big desk (the boss's)
- ✅ Computer desk
- ✅ Office chair
- ✅ Water cooler
- ✅ Printer
- ✅ Coffee machine
- ✅ Vending machine
- ✅ Server rack
- ✅ Metal shelving
- ✅ Rubber plant

**Shop**
- ✅ Grocery shelves
- ✅ Household-goods shelves
- ✅ Snack shelves
- ✅ Drinks cooler
- ✅ Newspaper rack
- ✅ Till / shop counter
- ✅ Boxes / crates

**Building**
- ✅ Stairs
- ✅ Mailboxes
- ✅ Agnes's door (the one you knock on)
- ✅ Doors (built by `lairDoorGeo` / the door system)

**Street, park and alley**
- ✅ Streetlamp
- ✅ Park lamp
- ✅ Bare-bulb alley lamp
- ✅ Elm tree
- ✅ Bench
- ✅ Payphone
- ✅ Bin
- ✅ Dumpster
- ✅ Rubbish bags
- ✅ Hydrant
- ✅ Storm drain
- ✅ Fences (3 and 4 cells long)
- ✅ Lenny's shopping trolley
- ✅ Mop bucket
- ✅ Parked car
- ✅ Moving cars and traffic (`buildCarMesh` in `gfx/props.js`)

### Wall dressing (`gfx/wall-dressing.js`)
- ✅ Picture frames
- ✅ Wall clock
- ✅ Corkboard
- ✅ Whiteboard
- ✅ Calendar
- ✅ Wall shelf
- ✅ Wall cabinet
- ✅ Mirror
- ✅ Power outlet
- ✅ Sconce lights
- ✅ Fire extinguisher
- ✅ Towel rail
- ✅ Coat hooks
- ✅ Posters
- ✅ "Missing" posters
- ✅ Decorative plates
- ✅ Embroidered sampler
- ✅ Fuse box
- ✅ Neon signs and shop signage
- ✅ Window dressing: blinds, curtains, shop windows, string lights

### Evidence and items (`gfx/props.js`)
- ✅ Shed skin (lizards)
- ✅ Severed finger (the dead)
- ✅ Scorch mark (aliens)
- ✅ Puddle
- ✅ Stain
- ✅ Tape
- ✅ Device
- ✅ Opened panel with screws and wires on the floor
- ✅ Steel-jaw trap, with bait
- ✅ Stash contents: cash roll, tokens, ledger, star chart, gadget, glowing chips

### THEIR lairs (`gfx/lair-models.js`, `gfx/lair-dressing.js`)
Three lair styles: **ship** (aliens), **den** (lizards), **sewer** (the dead).
- ✅ Operating table with lit gutters
- ✅ Control console with blinking buttons
- ✅ Specimen jars (some have eyes)
- ✅ Specimen tank
- ✅ Stasis pod
- ✅ Holo table
- ✅ Gold hoard piles
- ✅ Counting table with stacked coins
- ✅ Rope-tied chair
- ✅ Iron stairs
- ✅ Nest of twigs, leaves and rags
- ✅ Body remains with bones
- ✅ Junk and bone piles
- ✅ Lair doors, light halos, light shafts, water floor (sewer)

### Characters (`gfx/people.js`, `gfx/body-parts.js`, `town/cast.js`)
One shared sculpted body rig; each person is set by a `look` (skin, hair style, clothes, height, build, accessories).
- ✅ The player
- ✅ Gordon Hale, manager (tie, watch)
- ✅ Denise Park, accounts (cardigan, bun, brooch)
- ✅ Martin Kowalczyk, IT (beard, glasses, lanyard)
- ✅ Priya Raman, analyst (scarf, gold earrings)
- ✅ Earl Fitch, clerk (vest, bald, glasses)
- ✅ Joanne Webb, reception
- ✅ Vic Moreau, shop clerk (apron)
- ✅ Ray Kessler, courier (jacket, beanie, bag)
- ✅ Agnes Dorn, neighbour (pearls, cardigan)
- ✅ Lenny, park regular (coat, beanie, beard)
- ✅ Strangers (randomised)
- ✅ Police officer
- ✅ FBI agents (`chase/fbi.js`)
- ✅ Parts kit: hair styles (side, bun, short, long, bald, messy), beards, glasses, hats, earrings, necklaces, belts, watches, bags, skirts, sleeves

### Creatures and true forms (`gfx/creatures.js`, `horror/`)
- ✅ Alien true form
- ✅ Lizard true form, with tongue and sloughing skin
- ✅ Dead (zombie) true form
- ✅ Half forms: a head, arm, hand or body that is half changed for a second
- ✅ Tenth forms: smaller flickers of the true form
- ✅ Change cracks across the skin
- ✅ Reach rig (`gfx/reach-rig.js`): limbs that stretch toward you

---

## Part 2: Assets the game could have

Ideas that fit the existing setting (a small town, an office, three kinds of THEM) and the procedural style.

### Home
- 💡 Laundry basket and washing machine
- 💡 Dish rack with plates
- 💡 Answering machine with a blinking light (for messages THEY leave)
- 💡 Desk with a corkboard of your own case notes, in 3D
- 💡 Deadbolt and chain on the front door, as upgradeable door props
- 💡 Peephole view frame
- 💡 Boarded-up window planks (barricading)

### Office
- 💡 Filing cabinets with drawers that open
- 💡 Photocopier (different from the printer)
- 💡 Cubicle partitions
- 💡 Ceiling fluorescent panels that flicker
- 💡 Conference table and projector screen
- 💡 Paper shredder with half-shredded evidence
- 💡 Security camera on the wall

### Town
- 💡 Bus stop shelter, and a bus to match the traffic code's `bus`
- 💡 Police car with a light bar
- 💡 Black FBI sedan / surveillance van
- 💡 Manholes (an entrance to the sewer lair)
- 💡 Power lines and telephone poles
- 💡 Diner or bar interior: booths, stools, jukebox
- 💡 Church or community hall with pews and a notice board
- 💡 Police station: front desk, holding cell bars, evidence lockers
- 💡 Library: stacks, microfiche reader, old newspaper archive
- 💡 Laundromat: rows of machines (a good place to snoop)
- 💡 Playground: swings, slide, sandpit
- 💡 Weather props: puddles, snow drifts, fallen leaves
- 💡 Stray cat or dog (animals that react to THEM before people do)
- 💡 Crows on the power lines

### Investigation gear
- 💡 Camera (the photo verb, as a held prop)
- 💡 Tape recorder
- 💡 Torch / flashlight with a visible cone
- 💡 UV lamp that shows hidden stains
- 💡 Geiger counter or homemade detector for aliens
- 💡 Salt line, garlic, other folk-remedy wards
- 💡 Red string and pushpins on a real 3D board
- 💡 Binoculars

### Evidence, one new piece per faction
- 💡 Aliens: crop-circle burn, a metal implant, a puddle of coolant
- 💡 Lizards: a heat lamp hidden in a closet, an egg clutch, a cold-blooded thermos
- 💡 The dead: grave dirt on shoes, a bone in the bin, a fly swarm

### THEIR lairs
- 💡 Ship: tractor-beam column, crew bunks, star map dome, probe arms over the table
- 💡 Den: incubators, hot rocks, rows of human suits on hangers
- 💡 Sewer: coffins, candles, a pile of shoes, a rotten feast table
- 💡 Cages for people who were taken

### Creatures
- 💡 Alien drone or probe that patrols
- 💡 Lizard hatchling
- 💡 Rats in the sewer
- 💡 A mid-transformation "suit" left empty on the floor
- 💡 A queen or leader form for the finale on Friday

### Effects and set pieces
- 💡 UFO / saucer over the town on the last night
- 💡 Spotlight beams from helicopters during the chase
- 💡 Police tape and evidence markers at a scene
- 💡 Fire and smoke for a burned-down building ending
