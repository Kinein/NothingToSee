//@ data/lines — What people say and read: gossip, Lenny, rumours, news, endings. Change the words here
//@ Defines: LENNY_HINTS, LENNY_FACTION, LENNY_NONSENSE, LENNY_RAMBLE, RUMORS, TOPICS, SNEAK_ABOUT, SNEAK_TMR, PAIR_ABOUT, BLAME, SMALL, SLIPS, TONIGHT, LENNY_WARN, WRONG_TALK, STAGE_NEWS, …
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ── Lines: what people say, read and see written. Plain text only; the code that uses each pool is named beside it.

// ── Lenny, rumours, small talk topics (town/cast, town/talk)
const LENNY_HINTS = ['Three of ’em. Always three. And a week, that’s all THEY need.', 'Everybody’s got a funny habit. THEIRS are funnier. Watch for the ones that don’t add up.', '#FACTION', 'Pictures. Nobody believes what you SAW. Not even you.', 'The loudest one pointing fingers? Ask yourself why.', 'Somebody looks over their shoulder, checks their watch, gets up? Follow ’em. Everybody does it. THEY do it too.', 'People talk. Half of it’s rubbish. Go and look for yourself.', 'Take things. Not pictures of things: the things. Found at somebody’s place, it’s on them.', '#NONSENSE', '#PLACE', '#FACTION', '#NONSENSE', 'Some nights THEY meet. 1 a.m., behind Pell’s. Ask me the day before.', '#FACTION', 'Pick up what THEY drop. THEY hate seein’ it on you.', 'Proof first. Then call ’em out. In public, where folks can hear.', 'Alone with one of ’em, you got no friends. THEY don’t need to pretend.'];
const LENNY_FACTION = {
  aliens: ['THEY stare at lights. And THEY can’t leave a gadget alone.', 'Look in their homes. Little cylinders that hum. A pistol with no trigger.', 'THEY click at walls. At the server rack. Like it talks back.', 'Their papers never agree. Born in Ohio on one, Toronto on the other. Fakes.', 'Look in a fridge. Empty. Spotless. Nobody lives like that.', 'Floating. Eyes lit up. You get a picture of THAT, you got ’em.'],
  lizards: ['THEY hug radiators. Cold blood. And the fish, God, the fish.', 'Coolers of fish, eaten to the bone. Skins in the laundry. Check.', 'Raw fish at lunch. Who does that?', 'Brass tokens, stamped with scales. THEY pay each other in ’em.', 'Royal blood, some of ’em. Or the country club, and they don’t look the type.', 'Nothing about ’em is old. THEY don’t live long enough.', 'The tongue. Too long. Watch a mouth when it thinks nobody’s looking.'],
  zombies: ['Check the fridges. THEY’re always hungry. Don’t sleep, neither.', 'Raw meat, bare hands. Out of the fridge at the office.', 'THEY stand in corners. Facing the wall. Swaying.', 'Old. Very old. Ask about the old days. THEY were there.', 'Their own obituary, in a drawer. A jar of teeth. I seen it.', 'An arm. Comes right off. Then back on, like nothing.'],
};
const LENNY_NONSENSE = ['Pigeons. Count ’em. Never the same number twice.', 'The moon’s closer on Tuesdays. Measured it.', 'Never trust a man with two watches.', 'Mailboxes. THEY don’t use ’em. I use ’em.', 'Shoelaces. Look at the shoelaces.', 'The bus is never late when you want it late.'];
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
const JUNK = ['a receipt for milk', 'an odd sock', 'a broken watch', 'a lost spoon and two buttons', 'loose change and a hairgrip', 'a dead battery', 'a folded love note, not to you', 'a dried-out sandwich crust', 'a key to nothing', 'a loose fuse', 'three dice and a bottle cap', 'a broken watch'];

// ── Innocent oddities (play/oddities)
// what an ordinary person keeps in their own things that looks like THEIRS, and what it really is
const ODDITY_HOME = {
  envelope: { k: 'envelope', what: 'A cash envelope', icon: 'coin', desc: 'a fat envelope of cash, no name on it', truth: 'a gambling debt. The letter’s in with the cash' },
  pills: { k: 'pills', what: 'Unlabelled pills', icon: 'paper', desc: 'a jar of pills, the label scratched off', truth: 'heart pills. Nobody’s meant to know' },
  letters: { k: 'letters', what: 'A bundle of letters', icon: 'paper', desc: 'letters, tied with string, a strange crest on each', truth: 'love letters. Not from who you’d think' },
  mask: { k: 'mask', what: 'A spare face', icon: 'paper', desc: 'a rubber face, folded flat', truth: 'a Halloween mask. Still in its bag' },
  scanner: { k: 'scanner', what: 'A box with a light', icon: 'glyph', desc: 'a small black box, one light blinking', truth: 'a police scanner. They listen in at night' },
  // the ones that look like a particular THEM (look): kept twice as often in a week it's that THEM
  trout: { k: 'trout', look: 'lizards', what: 'A bucket of trout', icon: 'bag', desc: 'a bucket of trout, some of them eaten', truth: 'I fish. Every weekend. So?' },
  sunlamp: { k: 'sunlamp', look: 'lizards', what: 'A sunlamp', icon: 'glyph', desc: 'a heat lamp, still warm, by the bed', truth: 'a sunlamp. The winters here get to me' },
  fishy: { k: 'fishy', look: 'lizards', fridge: 1, what: 'A fridge of fish', icon: 'bag', desc: 'a fridge packed with fish', truth: 'I love fish. Is that a crime?' },
  radio: { k: 'radio', look: 'aliens', what: 'A ham radio', icon: 'glyph', desc: 'a radio set, tuned to nothing, humming', truth: 'a ham radio. I talk to Norway' },
  bare: { k: 'bare', look: 'aliens', fridge: 1, empty: 1, what: 'An empty fridge', icon: 'bag', desc: 'empty, and spotless', truth: 'payday’s Friday' },
  butcher: { k: 'butcher', look: 'zombies', what: 'A butcher’s order', icon: 'bag', desc: 'ten pounds of raw meat in newspaper', truth: 'a butcher’s order. My sister’s wedding' },
};
// ── Biography (play/biography): facts are always true. t: the line in the book · say: how they'd tell you themselves
const BIO_PLAIN = [
  { t: 'Moved to Wexley in March.', say: 'I only moved here in March, you know.' },
  { t: 'Grew up two towns over, in Millbrook.', say: 'I grew up in Millbrook. Two towns over.' },
  { t: 'Has a sister in Dayton.', say: 'My sister’s in Dayton. We don’t talk much.' },
  { t: 'Was a lifeguard as a teenager.', say: 'I was a lifeguard, years ago. Can you believe it?' },
  { t: 'Used to play the trumpet. Badly.', say: 'I played the trumpet once. Badly.' },
  { t: 'Married once. It didn’t take.', say: 'I was married once. It didn’t take.' },
  { t: 'Allergic to cats.', say: 'Cats. I swell up like a balloon.' },
  { t: 'Worked at the cannery for six years.', say: 'Six years at the cannery. Never again.' },
  { t: 'Went to Wexley High.' },
  { t: 'Bowls on Thursdays.', say: 'Thursdays I bowl. Don’t ask me on a Thursday.' },
  { t: 'Their father ran the hardware store.' },
  { t: 'Born in Ohio.', say: 'I’m from Ohio originally.' },
  { t: 'Never learned to swim.', say: 'Never learned to swim. Never needed to.' },
  { t: 'Collects stamps.' },
  { t: 'Did two years in the army.', say: 'Two years in the army. That was enough.' },
  { t: 'Volunteers at the church fete.' },
  { t: 'Won a pie contest in 2019.' },
  { t: 'Owes money on a boat.' },
];
// one of THEM: what doesn't add up. The lizards: nothing old, and blue blood or the elite somewhere it shouldn't be.
// The dead: very old, and they'll tell you so. (The aliens' are pairs that disagree: BIO_ALIEN_PAIRS.)
const BIO_THEM = {
  lizards: [
    { t: 'Royal bloodline. A real one. Never mentions it.', say: 'My family? Royalty, technically. Long story.' },
    { t: 'Was at the governor’s ball last spring.', say: 'The governor’s ball was so dull this year.' },
    { t: 'A member of the country club. Doesn’t look the type.' },
    { t: 'Nothing they own is more than a year old.' },
    { t: 'Their oldest photograph is from last Christmas.', src: 'home' },
  ],
  zombies: [
    { t: 'Was friends with the man who invented the radio.', say: 'I knew the fellow who invented the radio. Nice man.' },
    { t: 'Remembers the flood of 1913. In detail.', say: 'Worse than the flood of ’13, this rain.' },
    { t: 'Their driver’s licence was issued in 1931.' },
    { t: 'Was already old when Mom was a girl.', src: 'mom' },
  ],
};
const BIO_ALIEN_PAIRS = [
  [{ t: 'Born in Ohio. Says so themselves.', say: 'I’m an Ohio kid, born and raised.' }, { t: 'Their birth certificate says Toronto.' }],
  [{ t: 'Forty-one, by their own account.', say: 'Forty-one next month. Don’t remind me.' }, { t: 'Their library card says twenty-nine.' }],
  [{ t: 'Went to school in Dayton.', say: 'School in Dayton. Go Comets.' }, { t: 'Dayton High has never heard of them.' }],
];
// an ordinary person's one odd-looking fact: true, odd, and nothing to do with THEM (truth: what they'll say)
const BIO_HUMAN_ODD = [
  { t: 'Changed their name in 2009.', truth: 'I changed my name after the divorce' },
  { t: 'Has no photographs from before they were twenty.', truth: 'there was a fire. Everything went' },
  { t: 'Was at the governor’s ball last year.', truth: 'I waited tables at it' },
  { t: 'Has been dead once. Four minutes, in 1998.', truth: 'I drowned, once. They brought me back' },
  { t: 'Their passport is in another name.', truth: 'my maiden name. I never got round to it' },
];
const ODDITY_TIC = ['just a nervous tic', 'bad eyes. Nothing else', 'an old injury. It plays up', 'too much coffee. That’s all'];
const ODDITY_RUMOR = ['Someone saw {s} with one of THEM. At night.', '{s} was out by the bins at three. Talking to nobody.', 'They say {s} isn’t who they say they are.', 'Somebody saw {s} go down a manhole. Swear to God.'];

// ── Gossip that used to take pressing: a witness, someone bought, someone THEY got to (town/talk). Running dry.
const GOSSIP_SAW = ['I saw {s} change. Its face came off. I SAW it.', 'It was {s}. I watched it change. Nobody believes me.', 'Don’t laugh. {s} turned into something. Right in front of me.'];
const GOSSIP_BOUGHT = ['{s}? Salt of the earth. Helped me out when nobody else would.', 'You want to know who’s decent round here? {s}. That’s who.', '{s}’s been good to me. Better than good.'];
const GOSSIP_LOST = ['I don’t remember last night. Any of it.', 'Last night’s gone. I woke up and it was just… gone.', 'Funny. I can’t remember last night. Not a thing.'];
const TOLD_ALL = ['I’ve told you everything.', 'That’s all I know. Honest.', 'I’ve told you everything I’ve heard.'];
const LENNY_TOLD = ['I’ve told you everything. Now go and LOOK.', 'That’s all I got today. Come back tomorrow.', 'You heard me. I’m not saying it twice.'];
const COME_WITH = { yes: ['Sure. Lead the way.', 'Alright. Where are we going?', 'For an hour. Then I’m off.'], no: ['Not now.', 'I’m busy. Sorry.', 'Maybe later.'], bye: ['Right, I’m off.', 'That’s my hour. See you.', 'I’ve got to go.'] };

// ── The confrontation (play/confrontation): each card turns ✓ or ✗ with one line from IT. A human owns up to what's
// true; one of THEM can't deny what's real, so it squirms; a card that isn't about them, anybody denies.
const CF_OPEN = ['{s}. Everyone listen.', 'I know what you are, {s}.', 'Look at this. All of you. {s}.', 'Tell them, {s}. Or I will.'];
const CF_YES_HUMAN = ['Yes. It’s {t}. So?', 'That? That’s {t}. Happy now?', 'Fine. It’s {t}. Now everybody knows.'];
const CF_YES_THEM = {
  home: ['Where did you get that?', 'That— lots of people have those.', 'You had no right to go in there.'],
  habit: ['Everyone has their little ways.', 'So I like it warm. So what?', 'I was… resting.'],
  body: ['A trick of the light.', 'That’s… you can’t prove that’s me.', 'Put that away.'],
  biography: ['Is that a crime now?', 'Who told you that?', 'I don’t see what that has to do with anything.'],
};
const CF_NO = {
  home: ['That’s not mine. Never seen it.', 'Somebody put that there.', 'That isn’t anything to do with me.'],
  habit: ['That’s not me.', 'I was never there.', 'Somebody else. Not me.'],
  body: ['That’s not me in that picture.', 'That’s a blur. Could be anyone.', 'Not me.'],
  biography: ['So? Lots of people moved here in March.', 'So? That’s just my life.', 'And? Half this town could say the same.'],
};
const CF_PLANTED = ['That’s not mine. How did that get in there?', 'I’ve never seen it in my life. Who put that there?', 'That— somebody put that there.'];
const CF_EMPTY = ['Well? Nothing? I thought so.', 'You’ve got nothing on me.', 'Go on, then. Show them.'];
const CF_SHRUG = ['Are we done? Good.', 'Get some sleep. Really.', 'Somebody call them a doctor.', 'Are you finished?'];
// the verdict, big, when it's over
const CF_VERDICT = {
  gives: ['It gives up', 'In front of everyone. The FBI is on its way'],
  ugly: ['It turns ugly', 'Nobody shrugs off two'],
  shrug: ['They shrug it off', 'And everyone listening thinks you’re mad'],
  ignored: ['Nobody reacts', 'Nobody here takes you seriously'],
};
// what the town says afterwards, in the hours after ({s}: the one you called out, {p}: you)
const CF_TALK = {
  gives: ['{s} was one of THEM. In front of everyone.', 'They’ve got {s}. On its knees.'],
  ugly: ['Did you see {s}’s face when {p} said it?', 'Strange business with {s} and {p}. It got ugly.'],
  shrug: ['{p}’s lost it. Shouting at {s} like that.', 'Keep away from {p}. Seriously.'],
};
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
// the truth, beaten out of someone on the blow before they go down (combat/brawl), or when THEY give in
// (play/confront): the same words either way
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
