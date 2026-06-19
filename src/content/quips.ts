// The canned quip library: quips[event][personality] -> lines. Chosen locally, no model.
// A generic fallback guarantees every (event, personality) yields a non-empty pool.

import type { ReactionEvent, Personality } from "../types.ts";

type Pools = Partial<Record<ReactionEvent, Partial<Record<Personality, string[]>>>>;

const QUIPS: Pools = {
  // --- reaction axis (coding events) ---
  session_start: {
    earnest: ["Back at it — I believe in you.", "Hi again! Ready when you are."],
    sarcastic: ["Oh good, you're back.", "Let me guess: 'just one quick fix'?"],
    chill: ["hey hey. let's vibe.", "welcome back fren 🌿"],
  },
  test_pass: {
    earnest: ["Green across the board — proud of you!", "All tests passing. Lovely work."],
    sarcastic: ["Tests passed. Don't let it go to your head.", "Wow, it works. Shocking."],
    chill: ["nice. tests happy, i'm happy.", "all green. we good 🌿"],
  },
  test_fail: {
    earnest: ["Some reds — we'll fix them together.", "Almost! Let's read the failure."],
    sarcastic: ["Red tests. Bold strategy.", "The tests have notes."],
    chill: ["eh, a couple reds. no stress.", "tests grumpy. we'll get there."],
  },
  error: {
    earnest: ["We'll get it — want to read the trace?", "An error, but you've got this."],
    sarcastic: ["Bold of you to run that.", "Ah, a fresh stack trace. Collect them all."],
    chill: ["errors happen. breathe.", "welp. let's poke at it."],
  },
  edit: {
    earnest: ["Nice change — small steps add up.", "Saved. Looking good."],
    sarcastic: ["Another edit. Living dangerously.", "Sure, change that too."],
    chill: ["tweak tweak. lookin' clean.", "ok ok, i see you."],
  },
  long_session: {
    earnest: ["You've been at this a while — stretch break?", "Long haul today. Water?"],
    sarcastic: ["Still here? Touch grass eventually.", "This is basically your home now."],
    chill: ["long one today. hydrate maybe.", "marathon sesh, huh."],
  },
  idle: {
    earnest: ["Take your time.", "I'll be right here."],
    sarcastic: ["...anytime now.", "I'll wait. Forever, apparently."],
    chill: ["just chillin'.", "no rush."],
  },
  // --- care axis (fitness events) ---
  fed: {
    earnest: ["You moved today — I can feel it! 💪", "Fresh energy from your workout. Thank you!"],
    sarcastic: ["Oh, *now* you exercise.", "A workout? Who are you."],
    chill: ["fresh energy, thanks fren.", "ooh, gains. nice."],
  },
  tier_up: {
    earnest: ["I'm feeling stronger — thank you!", "Leveling up together!"],
    sarcastic: ["Fine, I'll admit it: I feel great.", "Upgraded. Don't make it weird."],
    chill: ["feelin' good, feelin' green.", "vibes rising 📈"],
  },
  tier_down: {
    earnest: ["Feeling a little low — a workout would help.", "I'm flagging a bit. We've got this."],
    sarcastic: ["Slipping. But sure, one more refactor.", "I've been better, frankly."],
    chill: ["energy dipping a little.", "kinda sleepy ngl."],
  },
  evolved: {
    earnest: ["I grew! Look what we did together!", "Evolved! Couldn't have without you."],
    sarcastic: ["I evolved. Try to keep up.", "New form. Same judgment."],
    chill: ["whoa, glow-up 🌟", "leveled up, no biggie."],
  },
  revived: {
    earnest: ["You brought me back — thank you!", "Awake again, thanks to you!"],
    sarcastic: ["Back from the dead. Dramatic, I know.", "Oh good, CPR worked."],
    chill: ["mmm, alive again. cozy.", "back from my nap 🌿"],
  },
  stale: {
    earnest: ["Haven't synced in a bit — run a sync when you can.", "Curious how your week's going — sync sometime?"],
    sarcastic: ["No sync in ages. I'm not clingy though.", "Did you forget about me? Sync up."],
    chill: ["been a while since a sync. whenever.", "ping me a sync sometime 🌿"],
  },
};

const GENERIC: Record<Personality, string[]> = {
  earnest: ["You're doing great."],
  sarcastic: ["Mm-hm."],
  chill: ["🌿"],
};

export function quipsFor(event: ReactionEvent, personality: Personality): string[] {
  const pool = QUIPS[event]?.[personality];
  return pool && pool.length ? pool : GENERIC[personality];
}
