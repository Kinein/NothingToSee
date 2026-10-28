//@ data/lines — What people say and read: gossip, Lenny, rumours, news, endings. Change the words here
//@ Defines: LENNY_HINTS, LENNY_FACTION, LENNY_RAMBLE, RUMORS, TOPICS, SNEAK_ABOUT, SNEAK_TMR, PAIR_ABOUT, BLAME, SMALL, SLIPS, TONIGHT, LENNY_WARN, WRONG_TALK, STAGE_NEWS, WEIRD, …
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ── Lines: what people say, read and see written. Plain text only; the code that uses each pool is named beside it.

// ── Lenny, rumours, small talk topics (town/cast, town/talk)
const LENNY_HINTS = ['Three of ’em. Always three. And a week, that’s all THEY need.', 'Everybody’s got a funny habit. THEIRS are funnier. Watch for the ones that don’t add up.', '#FACTION', 'Pictures. Nobody believes what you SAW. Not even you.', 'The loudest one pointing fingers? Ask yourself why.', 'Catch ’em at THEIR business. Envelopes. Stashes. Gadgets. That’s proof.', 'People talk. Half of it’s rubbish. Go and look for yourself.', 'Shake things. Radios. Microwaves. THEY keep stuff in things. In their own desk? Gotcha.', '#PLACE', 'Some nights THEY meet. 1 a.m., behind Pell’s. Ask me the day before.', 'Pick up what THEY drop. THEY hate seein’ it on you.', 'Proof first. Then call ’em out. In public, where folks can hear.', 'Alone with one of ’em, you got no friends. THEY don’t need to pretend.'];
const LENNY_FACTION = { aliens: 'THEY stare at lights. And THEY can’t leave a gadget alone.', lizards: 'THEY hug radiators. Cold blood. And the fish, God, the fish.', zombies: 'Check the fridges. THEY’re always hungry. Don’t sleep, neither.' };
const LENNY_RAMBLE = ['Pigeons are fine.', 'Eat something.', 'Don’t look at the moon.', 'Forms never end.'];
const RUMORS = {
  aliens: ['{s} hums. Like a fridge.', '{s} never blinks.', 'Radios go weird near {s}.', '{s} sugars everything.'],
  lizards: ['{s} is always cold.', '{s} swallows food whole.', '{s} has a heater. In July.', 'Dead flies under {s}’s chair.'],
  zombies: ['{s} smells off.', '{s} cut a hand. No blood.', '{s} eats it raw.', '{s} never sleeps.'],
  mundane: ['{s} owes me $20.', '{s} reads my emails.', '{s} microwaves fish.', '{s} cries in the car.', '{s} wants to quit.', '{s} talks to plants.'],
};
const TOPICS = ['weather', 'coin', 'work', 'tv', 'food', 'car', 'heart', 'question', 'laugh', 'people'];

// ── Gossip and slips (town/talk)
// Gossip points at a person or a place; the why is yours to find out. Ordinary people only pass on what somebody really
// did (a habit, a smell, a night out) or what they saw happen. THEY say the same kind of things about ordinary people,
// and THEY're the ones who make the loud, sure accusations: a lie can afford to sound certain.
const SNEAK_ABOUT = ['{s} slips off to {p} {t}. Every day.', 'Watch {s} {t}. Off to {p}, every time.', '{s} disappears into {p} {t}. Thinks nobody notices.', 'If you can’t find {s} {t}, try {p}.'];
const SNEAK_TMR = ['{s} will be off to {p} {t} tomorrow. Always is.', 'Tomorrow, keep an eye on {s} {t}. Off to {p}, every time.'];
const PAIR_ABOUT = ['{a} and {b} are always whispering together. What about?', 'Every time I turn round, {a}’s off in a corner with {b}.', '{a} and {b}. Thick as thieves lately.', 'What do {a} and {b} talk about all day? They stop when you walk up.'];
const BLAME = ['I saw {s} with glowing eyes. In the dark. Glowing!', '{s} isn’t human. I’d bet my life on it.', 'I saw {s} eat something alive behind Pell’s.', '{s}’s skin moved. On its own. I saw it.', 'I saw {s} at two in the morning, walking wrong. Like a puppet.', '{s} hissed at me. Actually hissed.', 'Watch {s}’s shadow some time. It’s always a bit late.', '{s} is one of THEM. I’m telling you.', '{s} never blinks. Watch. Never.'];
const SMALL = ['Busy day.', 'Can’t complain. Well, I can.', 'Rain again later, they say.', 'Long week, isn’t it?', 'Nice to have a chat. Nobody chats any more.', 'Kettle’s broken again.', 'Did you see the game? Me neither.', 'Same old, same old.'];
// THEM, slipping: what the week has in it, early, in the middle, at the end
const SLIPS = {
  aliens: [['Have you ever been measured? Properly measured?', 'It’s curious what’s in your brain, isn’t it?', 'Everyone in this town is so… readable.'], ['People just get up and leave in the night. It happens.', 'You’d be surprised what fits inside a person.'], ['Look up tonight. Go on.', 'The sky’s going to be very busy soon.']],
  lizards: [['Everyone’s got a price. Even you.', 'Money’s just warmth you can hold.'], ['Half this street owes somebody. Funny, that.', 'The council’s very reasonable, once you get to know them.'], ['Wexley’s going to get a lot warmer.', 'It’s nicer downstairs than you’d think.']],
  zombies: [['Do you ever just… smell people?', 'I’m so hungry lately. Not for bread.'], ['It doesn’t hurt. The bite. Not after a while.', 'More of us every day. Regulars, I mean.'], ['Stay in after dark. Or don’t. I don’t mind.', 'Everyone’s coming over on Sunday. Everyone.']],
};
const TONIGHT = { attack: ['Early night for me. Big night.', 'Don’t wait up tonight. Ha.', 'Lock your door tonight. Joking!'], gather: ['Old friends tonight. A late one.', 'We’re all meeting up later. Just us.'] };
// third what he's seen from his bench: plain, and true, and not always what it sounds like.
const LENNY_WARN = {
  tonight: ['Tonight I suspect weird activity. Lock your door.', 'Something’s happening tonight. I can feel it in my teeth.', 'Stay in tonight. Trust me.'],
  known: ['THEY know you. Nowhere to hide!', 'THEY’ve got your face now. Watch your back.', 'THEY talk about you. I hear ’em.'],
  noticed: ['THEY’ve started asking about you. Keep your head down.', 'Somebody asked me where you live. I said I don’t know. I don’t, do I?'],
  late: ['THEY’re so close to THEIR goal, THEY don’t even hide it any more!', 'Look at ’em. Not even pretending now.'],
  mid: ['Every night THEY get bolder. Feel it?', 'Busy, THEY are. Busier every night.'],
  early: ['THEY’re settling in. Quiet. That’s when THEY’re worst.', 'Nothing’s happened yet. That’s the scary part.'],
};

// ── What THEY spread (them/moves)
const WRONG_TALK = ['It’s lizards. I’ve seen the scales.', 'They’re dead inside. Literally. Check their fridges.', 'Cold-blooded, the lot of them.', 'Something in the water made them like this.'];

// ── Headlines as THEIR week goes on (them/plan)
const STAGE_NEWS = {
  lizards: [null, 'Pell’s shelves half empty, says shopper', 'Wexley Holdings buys Pell’s', 'Residents asked to “mind their own business”', 'Town hall closed until further notice'],
  aliens: [null, 'Sleepwalkers found standing in Main street', 'Lights over the park again', 'Three strangers missing this week', 'Something over the park'],
  zombies: [null, 'Pets going missing on Larkspur Court', 'Graves found disturbed', 'Council talks curfew', 'Nobody answers at the council'],
};

// ── Odd remarks, mail, papers, the forum, snooping (play/verbs)
const WEIRD = ['Do you ever hear the streetlights?', 'There’s one more ceiling tile today. I counted.', 'My teeth feel loose when it rains.', 'Some nights the hum stops. Then I can’t sleep.', 'I don’t dream any more. Do you?', 'This town is smaller than it looks.', 'I like it quiet. Properly quiet.'];
const WEIRD_THEM = ['Your skin looks warm.', 'We’ve all been very patient with you.', 'Not long now.', 'Sleep more. It helps us.'];
const MAIL = ['Bank statement', 'Postcard from Mom', 'Lock catalogue', 'Gutter flyer'];
const NEWS = {
  general: ['Council to study study', 'Lights over reservoir', 'Cat found, owner unsure'],
  aliens: ['Cows won’t stop looking up', 'Radio ham hears counting'],
  lizards: ['Record cricket sales', 'Heatwave “pleasant,” say some'],
  zombies: ['Someone buys the offcuts', 'Cemetery keeper quits'],
};
const FORUM = { aliens: 'Thread: people who stare at lights', lizards: 'Thread: shoppers who read cold', zombies: 'Thread: clients who walked out' };
const SNOOP_MUNDANE = ['Pens. Old mint.', 'Rejection letter', 'Abandoned diet', 'Photos of a dog'];

// ── Visions (horror/visions)
const FAKE_LINES = ['{s} was in the closet again. In the dark.', '{s} came out of the restroom wet to the elbows.', '{s} stood by the dumpster at 3. Not moving.', 'Heard {s} humming through the wall. One note.', '{s} asked what you eat.'];

// ── Junk found rummaging (play/stashes)
const JUNK = ['a lost spoon and two buttons', 'loose change and a hairgrip', 'a dead battery', 'a folded love note, not to you', 'a dried-out sandwich crust', 'a key to nothing', 'a loose fuse', 'three dice and a bottle cap', 'a broken watch'];

// ── Innocent oddities and THEIR frame-ups (play/oddities)
// what an ordinary person keeps in their own things that looks like THEIRS, and what it really is
const ODDITY_HOME = {
  envelope: { k: 'envelope', what: 'A cash envelope', icon: 'coin', desc: 'a fat envelope of cash, no name on it', truth: 'a gambling debt. The letter’s in with the cash' },
  pills: { k: 'pills', what: 'Unlabelled pills', icon: 'paper', desc: 'a jar of pills, the label scratched off', truth: 'heart pills. Nobody’s meant to know' },
  letters: { k: 'letters', what: 'A bundle of letters', icon: 'paper', desc: 'letters, tied with string, a strange crest on each', truth: 'love letters. Not from who you’d think' },
  mask: { k: 'mask', what: 'A spare face', icon: 'paper', desc: 'a rubber face, folded flat', truth: 'a Halloween mask. Still in its bag' },
  scanner: { k: 'scanner', what: 'A box with a light', icon: 'glyph', desc: 'a small black box, one light blinking', truth: 'a police scanner. They listen in at night' },
};
const ODDITY_TIC = ['just a nervous tic', 'bad eyes. Nothing else', 'an old injury. It plays up', 'too much coffee. That’s all'];
const ODDITY_RUMOR = ['Someone saw {s} with one of THEM. At night.', '{s} was out by the bins at three. Talking to nobody.', 'They say {s} isn’t who they say they are.', 'Somebody saw {s} go down a manhole. Swear to God.'];
const ODDITY_HEARD = ['Heard it at the diner. Everyone’s saying it.', 'I don’t know. Somebody said it. Forget I did.', 'That’s just talk. Nobody actually saw anything.'];

// ── Pressing someone about THEM (play/oddities)
const PRESS_SAW = ['I saw it. I SAW its face come off. {s}.', 'It was {s}. I watched it change. I’ll say it again.', 'You want to know? It was {s}. I was there.'];
const PRESS_BOUGHT = ['{s} helped me out. That’s all.', 'I don’t know anything about {s}. Leave it.', '{s}’s been good to me. Why?'];
const PRESS_VICTIM = ['I don’t remember. {s} was there, I think. Then nothing.', 'There’s a gap. An hour. {s} was the last face.', 'It’s all fog. {s}. Something about {s}.'];
const PRESS_NONE = ['I don’t know anything.', 'About what?', 'You’re asking the wrong person.', 'Nothing. I’ve seen nothing.'];
const COME_WITH = { yes: ['Sure. Lead the way.', 'Alright. Where are we going?', 'For an hour. Then I’m off.'], no: ['Not now.', 'I’m busy. Sorry.', 'Maybe later.'], bye: ['Right, I’m off.', 'That’s my hour. See you.', 'I’ve got to go.'] };

// ── The confrontation (play/arena): THEY lie, a human tells the truth, and it all sounds the same
const ARENA_OPEN = ['What is this?', 'You want to do this here? Fine.', 'Go on, then. Say it.', 'Everybody look. Here we go.', 'Is this about me?'];
const ARENA_SAY = {
  home: ['There’s nothing in my desk but pens.', 'Nobody keeps anything at mine. Look all you like.', 'My things are my things. Nothing in them.'],
  habit: ['I was never there. Not once.', 'At that hour? I was in bed.', 'I go straight home after work. Every day.'],
  body: ['Look at me. Do I look strange to you?', 'My face is my face.', 'That’s not me in any picture.'],
  contact: ['Nobody can say a word against me.', 'Who says? Name one person.', 'I hardly know anyone here.'],
};
const ARENA_FILLER = ['I’ve lived in this town twenty years.', 'I take my coffee black. Always have.', 'I was born two streets from here.', 'I pay my taxes. Mostly.', 'I’ve never missed a day of work.'];
const ARENA_LIE_BOUGHT = ['And {w} will tell you I was with them.', 'Ask {w}. {w} knows me.'];
const ARENA_REBUT = ['That could be anyone in a coat.', 'A blur. You’ve got a blur.', 'That’s a shadow. That’s all that is.', 'Anyone can say anything.'];
const ARENA_BACKED = { card: ['And this.', 'Then explain this one.'], habit: ['Every day, at that hour. I watched you.', 'I know where you go.'], witness: ['I saw it too.', 'It’s true. I was there.'] };
const ARENA_CLEAR = ['…', 'Where did you get that?', 'That— that proves nothing.', 'Put that away.'];
const ARENA_WRONG = ['What has that got to do with anything?', 'That’s not what I said.', 'You’re not even listening.'];
const ARENA_PASS = ['See? Nothing.', 'Nothing to say to that?', 'Thought not.'];
const ARENA_TRUTH = ['…Yes? That’s true. Everyone knows that.', 'And? It’s true.', 'That’s the one thing nobody doubts.'];
const ARENA_KNOW = { lie: ['{q}? Not me. Never.', 'Me? {q}? Don’t be silly.'], open: ['How well do you even know me?', 'You don’t know the first thing about me.'] };
const ARENA_COUNTER = ['They’ve been following me for days. Look at them.', 'Ask yourselves who’s been sneaking round people’s homes.', 'Look at the state of them. Look.', 'Who takes pictures of people’s faces? Who does that?'];
const ARENA_HOLD = ['I’m fine. I’m not the one on trial.', 'Don’t change the subject.', 'Answer the question.'];
const ARENA_ESCAPE = ['I don’t have to listen to this.', 'I’m leaving.', 'We’re done here.'];
const ARENA_INNOCENT = ['Yes. It was {t}. Happy now?', 'That? That’s {t}. Thanks for telling everyone.', 'Fine. It’s {t}. Now you all know.'];
const ARENA_PLANTED = ['I’ve never seen that in my life.', 'That’s not mine. I swear it’s not mine.', 'Somebody put that there.'];
const ARENA_NOTMINE = ['That’s not me.', 'That isn’t anything to do with me.'];
// the officer: a telling-off the first time (an opener, the complaint, the warning), a chase after that; a grab you slip
// (what he shouts), and when you've slipped him enough, giving up
const COP_WARN = {
  open: ['Oi! You. Stop right there.', 'Hey! Yes, YOU. A word.', 'Hold it. Don’t you walk away from me.'],
  mid: ['I’ve had calls about you. All week.', 'Creeping round people’s houses? Frightening folk?', 'People are scared of you. Do you know that?'],
  close: ['This is a warning. The only one you get.', 'Next time it’s the cuffs. Understood?', 'One more call about you and you sleep at the station.'],
};
const COP_CHASE = ['Stop! Police!', 'Don’t make this worse!', 'You can’t run forever!', 'Stop right there!', 'I warned you!'];
const COP_CATCH = ['That’s it. Hands behind your back.', 'I told you. You’re coming with me.', 'Enough running. Turn round.'];
const COP_SLIP  = ['Hold STILL!', 'Get back here!', 'Slippery, are we?', 'You’re only making it worse!'];
const COP_HIT   = ['Right. That’s assaulting an officer.', 'You did NOT just do that.', 'On the ground. Now.'];
const COP_QUIT  = ['Fine. FINE. Next time.', 'I’m too old for this.', 'You’ll keep. I know where you live.'];
const ARENA_RANT = ['Look at them! LOOK!', 'Why won’t anyone LISTEN?', 'It’s not a person!'];
// the truth, beaten out of someone on the blow before they go down (combat/brawl), or when THEY give in (play/arena,
// play/confront): the same words either way
const CONFESS = {
  innocent: ['I’m innocent, man! STOP!', 'I didn’t DO anything! Stop!', 'I’m nobody! I’m just me! Please!'],
  bribed: ['I was bribed! It’s my fault!', 'They PAID me! I’m sorry, I’m sorry!', 'It was only money! I just looked away!'],
  bitten: ['I was bitten! I’ve been hiding it!', 'It BIT me! I didn’t tell anyone!', 'Look at my arm… I was bitten, OK?!'],
  chipped: ['THEY control my mind!', 'There’s something in my head! THEY put it there!', 'THEY took me… THEY’re in my HEAD!'],
  them: {
    lizards: ['Fine. FINE. Call your men.', 'We were so CLOSE.', 'You have no idea what’s under this town.'],
    aliens: ['Take me, then. Take me to your… whoever you have.', 'The signal is already sent.', 'We were so close.'],
    zombies: ['…hhhh. Fine.', 'It was so warm in there.', 'Not so loud. We give up.'],
  },
};
// the morning THEIR mark first shows (them/servants)
const MARK_NEWS = {
  lizards: 'Gold pins on some chests today',
  aliens: 'Something grows out of some people’s ears',
  zombies: 'Flies follow some people today. And that walk',
};
const ARENA_END = {
  partial: ['Enough of this face.', 'You want to SEE?', 'FINE.'],
  pfail: ['Are we done? Good.', 'You’ll regret this.', 'I’ll be seeing you.'],
  fail: ['Get some sleep. Really.', 'Somebody call them a doctor.', 'Are you finished?'],
  wrong: ['How could you.', 'I’ll never forget this.', 'Get away from me.'],
};
const ARENA_CROWD = { up: ['Oh my God.', 'It’s true…', 'Look at its face!'], down: ['Ha!', 'Get a grip.', 'Not this again.'], still: ['…', 'Hm.'] };
// the banner over the ring: which part of it this is, and what you can do ({n}: the accused, {i} of {k}: the statement)
const ARENA_BEAT = {
  open:      ['Confronting {n}', 'Everyone in earshot is listening'],
  stmt:      ['Testimony · {i} of {k}', 'A lie? Show the card from the same frame. Or let it pass'],
  stmtEmpty: ['Testimony · {i} of {k}', 'No cards left to show'],
  rebut:     ['It explains it away', 'Back it up: another card, a habit you watched, or a witness'],
  rebutNone: ['It explains it away', 'Nothing to back it up with'],
  know:      ['How well do you know me?', 'True, or a lie?'],
  counter:   ['It turns it on you', 'Hold your nerve'],
  escape:    ['It’s making a run for it', 'Block the way: E (or tap) in the green'],
};
// the verdict, big, when it's over
const ARENA_VERDICT = {
  total:   ['It gives up', 'The crowd holds it down. The FBI is on the way'],
  partial: ['Its face comes off', 'Right in front of everyone'],
  escaped: ['It breaks and runs', 'Everyone saw what it is. Go after it'],
  pfail:   ['Doubt', 'The town will watch it. Tonight, it comes for you'],
  fail:    ['They laugh at you', 'Nobody believes a word. People will talk'],
  wrong:   ['Wrong person', 'You told the whole room their business'],
};
// why the crowd just moved, beside the number
const ARENA_WHY = {
  clear: 'caught in a lie', backed: 'backed up', alone: 'just a blur', wrongLie: 'wrong card for that', pass: 'a lie let go',
  truth: 'that one was true', notMine: 'not theirs', innocent: 'only their own secret', planted: 'planted on them',
  knowRight: 'you know them', knowWrong: 'you don’t', counter: 'you cracked', faced: 'that camera in their face', block: 'blocked the way',
};
// under the crowd meter: why it started where it did ({w}: someone in the room)
const ARENA_ROOM = {
  witness: '{w} saw it', friend: '{w} likes you', close: '{w} is close to them', grudge: '{w} holds a grudge',
  unwell: 'you look unwell', mad: 'they think you’re mad', trapped: 'it’s in your trap', // who's THEIRS stays unsaid
};
// what the town says afterwards, in the hours after ({s}: the accused, {p}: you)
const ARENA_TALK = {
  total: ['{s} was one of THEM. In front of everyone.', 'They’ve got {s}. On its knees.'],
  partial: ['{s} changed. Right there in front of us.', 'Don’t go out tonight. {s}’s still out there.'],
  pfail: ['Strange business with {s} and {p}.', 'Did you see {s}’s face? Something wasn’t right.'],
  fail: ['{p}’s lost it. Shouting at {s} like that.', 'Keep away from {p}. Seriously.'],
  wrong: ['What {p} said to {s}. Shameful.', 'Poor {s}. {p} told everyone their business.'],
};

// ── Endings (game/state)
const ENDINGS = {
  fired: ['You’re fired!', 'Mr. Hale’s patience is over. Next time, don’t forget your work.'],
  taken: {
    aliens: ['Taken.', 'Light under the door. Then everywhere.'],
    lizards: ['Taken.', 'Something cold at the foot of the bed.'],
    zombies: ['Taken.', 'You went to work as usual. Nobody noticed.'],
  },
  won: ['Nothing to see here.', 'Three of THEM caught before Friday was out. The streetlamp stopped flickering.'],
  committed: ['Committed.', 'They were very kind about it. The door only opens from the outside.'],
  killed: {
    aliens: ['Gone.', 'A red dot, a hum, and then nothing at all.'],
    lizards: ['Eaten.', 'It was very quick, and it was not hungry for long.'],
    zombies: ['Gone.', 'They took their time. Nobody heard a thing.'],
  },
  below: ['Taken below.', 'Under Wexley it is warm and dark. Nobody comes down here.'],
  escaped: ['Out.', 'You ran until Wexley was a glow behind the hills. You never went back. Some nights it still looks for you.'],
  prison: ['Locked up.', 'Three assaults. The judge didn’t want to hear about THEM.'],
  plan: {
    aliens: ['It’s done.', 'The lights came down over Wexley. Nobody looked up.'],
    lizards: ['It’s done.', 'Wexley got very warm, and very quiet.'],
    zombies: ['It’s done.', 'Everyone came in on Monday. Nobody wanted lunch.'],
  },
};
// a fight in the street (combat/brawl): onlookers egging it on, backing off, calling it in
const BRAWL_CHEER = ['Go on! Give it to ’em!', 'Ha! Get in there!', 'Fight! FIGHT!', 'My money’s on you.', 'Ooh, that’s gotta hurt.'];
const BRAWL_SCARED = ['Somebody stop them!', 'Oh God. Oh God.', 'Not again. Not here.'];
const BRAWL_CALL = ['That’s it, I’m calling the police!', 'Police? Yes. There’s a fight.', 'Police! I need the police!', 'I’m phoning the police. Right now.'];
const BRAWL_HELP = ['Somebody help!', 'Get OFF me!', 'Are you insane?'];
