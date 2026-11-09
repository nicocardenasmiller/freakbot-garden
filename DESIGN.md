# Freakbot's Conservatory: design doc

Version 1.2 · 9 Nov 2026 · owner: Felix (1.1: cards are written at summary time, section 7; 1.2: Phase 1 decisions in sections 3, 4.3, 5.4, 5.5, 6.4, 6.5, 9)

A study app for PhD reading. You answer a few questions a day about papers you have read; right answers water a small conservatory of plants, one plant per research topic. Freakbot, a salvaged pixel robot who survived the apocalypse, lives there, tends the plants and talks to you. It is an installable web app (PWA) hosted on GitHub Pages and used mostly on a Samsung phone.

This file is the source of truth for every build session. Read it fully before changing code. When a decision here changes, update this file in the same commit.

Visual reference: the design canvas "Freakbot's Base: Style Options", Round 7 (boards F1 to F6). Earlier rounds on that canvas are rejected directions; ignore them.

---

## 1. Goals and non-goals

**Goals**
- Make daily recall of read papers a 3-minute habit (spaced repetition, not trivia).
- Make progress visible as a garden that fills in over months, tied to real topics.
- Feel calm and cozy: dark academia room, pixel art, one character, no clutter.
- Work offline on the phone; sync progress between phone and Mac.

**Non-goals (v1)**
- No social features, no leaderboards, no push server (reminders come from a Claude scheduled task).
- No login bonuses or rewards that do not come from answering questions.
- No shop or currency spending. Water is a score, not money (see open decisions).
- Plants never die.

---

## 2. Core loop

1. Open the app. The conservatory shows the time of day from the phone clock. Freakbot says one line (often which plant is thirsty).
2. Tap **Water the garden**. Answer 3 cards (index cards). Short answers are self-graded: knew it / partly / not yet. Multiple choice grades itself.
3. Each answer waters the plant for that card's topic. Freakbot rolls to that plant and waters it (animation F6).
4. After the third card: streak updates, rewards (if any) show, and a new Journal page (lore) unlocks.
5. Each paper you summarize adds 2–3 cards the same day, and a new topic plants its seed right away. The Friday task adds review and synthesis cards across papers.

---

## 3. Screens

| Tab | Screen | Reference board |
|---|---|---|
| Garden | The conservatory scene, stat line, one primary button, Freakbot's slip | F1 morning, F2 golden, F3 night, F6 animated |
| Cards | Index-card quiz flow (front: question, write answer; back: answer, explanation, source, grade) | F5 |
| Herbarium | Grid of plant sheets; tap one for its herbarium sheet (specimen, label, papers cited, "Water this plant") | F4 |
| Journal | Lore chapters unlocked so far, written as journal pages; past weekly results | (not mocked yet) |

Layout rules (phone 390 px wide reference):
- Top: title "The Conservatory" (Cormorant Garamond 26/600) and local date/time (EB Garamond italic). Under it a thin stat strip in small caps: Water · Streak · Plants.
- Scene: 388 × 560 px (art 97 × 140 at 4×), centred, `image-rendering: pixelated`. The scene never scrolls. On phones narrower than 388 px (the Galaxy S25 is 360 px) keep 4× and trim the side edges evenly.
- Bottom: one primary action, then the 4-tab nav. Nothing else.
- Settings (the sync token) opens by tapping the stat strip. The strip also shows the "not syncing" state.
- Freakbot's speech is a paper slip over the scene: parchment fill, VT323 19 px, tilted ±1.5°, auto-hides after ~6 s, tap to dismiss.

---

## 4. Art direction

### 4.1 Pixel rules
- Scene art resolution 97 × 140, displayed at 4×. Plants 26 × 34. Freakbot sprite grid 18 × 24 drawn inside a 32 × 34 frame (includes scarf tails).
- No anti-aliasing, no smooth gradients inside art, no rotation of pixel art. Light is done with stepped, quantized glows (see `art/final.py`).
- Motion is stepped: CSS `steps()` or frame swaps, ~150 ms per tick. No easing curves.
- Respect `prefers-reduced-motion`: freeze animations, keep slips.

### 4.2 The room
A small Victorian conservatory that doubles as a study. Fixed composition (do not rearrange per screen):
- Back: four gothic-arched glass panes with iron mullions. Outside: the overgrown scrapyard skyline with a crane (Freakbot's past, kept at a distance).
- Hanging copihue basket top centre.
- Left: writing desk with stacked books, green banker's lamp, open notebook, inkwell; candle at night.
- Right: three-tier étagère (plant stand) with 6 small clay pots.
- Floor: wood planks, worn burgundy rug with gold border centre, big floor pots left and right.
- Freakbot stands on the rug; brass watering can beside him.

### 4.3 Time of day (phone clock)
| Band | Hours | Sky | Lighting |
|---|---|---|---|
| Morning | 05:00 to 11:00 | pale cream to blue-grey | sun shafts across the floor, lamp off |
| Day | 11:00 to 17:00 | clear blue (to draw; not mocked) | flat, lamp off |
| Golden | 17:00 to 21:00 | amber to rose to plum | long warm shafts, lamp on |
| Night | 21:00 to 05:00 | navy, stars, crescent moon | lamp + candle glows, moonlight patch, Freakbot asleep |

Implementation: render the room once per band (pre-baked PNGs) plus Freakbot and plants as separate layers so they can move. Plants are graded to match the band (multipliers in `art/final.py → grade()`). Until the Day art exists (Phase 3), the Day band shows the morning room.

### 4.4 Palette (UI tokens)
| Token | Hex | Use |
|---|---|---|
| ink | #17110D | app background (night: #0F0C0A) |
| parchment | #EADFC6 | cards, slips, primary surface |
| card | #F4EEDF | index cards |
| text-dark | #2A1D15 | text on parchment |
| text-muted | #B8A888 | secondary text on ink |
| brass | #B08D4A | small-caps labels, active tab |
| burgundy | #7A2632 | destructive-weight actions, card rule (#B5413F) |
| bottle | #2F4A35 | secondary accent |
| rule-blue | #A9C3D6 | ruled lines on cards |
| line | #4A3626 | dividers on ink |

### 4.5 Type
- Cormorant Garamond (display, 500/600, italic): titles, plant names, primary buttons.
- EB Garamond (body, 400/500, italic): everything else, including written answers on cards (italic).
- VT323: only Freakbot's voice (slips) and nothing else.
- Small caps style: 12 px, letter-spacing 0.16em, uppercase.
- No third family. No typewriter font.

### 4.6 Freakbot
- Base sprite: his Mac app's code (`freakbot/web/freakbot.js` v1.3.1), outfit: tin can, bare metal paint, bottlecap propeller, spring arms, wheel.
- Added for this app: mustard scarf with burgundy stripes, two tails on his right side (`art/final.py → scarf()`). Must stay visible on the burgundy rug.
- Frames now: open, blink, happy with right arm up (watering), sleep. Needed later: look left/right, wobble (missed), jump (got it), yawn, roll (wheel animation from the app code).
- Voice: Puerto Rican Spanglish picking up Chilean slang (wepa, pana, dale, po, bacán, pucha, cachai). Lowercase, short, warm, a bit dry. No hearts, no em dashes, no real song lyrics.

### 4.7 Plants
Eight species, each with 5 stages (seed, sprout, sapling, bloom, fruit) plus thirsty and wilted. Generator: `art/plants.py`. Sheet: `art/out/plants_all.png`.

| Species | Latin | Look by stage |
|---|---|---|
| Limonero | Citrus limon | white blossoms at bloom, lemons at fruit |
| Copihue | Lapageria rosea | vine up a stake, red bells; one rare white bell at fruit |
| Araucaria | Araucaria araucana | adds a branch tier per stage; piñones at fruit |
| Quisco | Echinopsis chiloensis | column cactus, grows arms, big white flower |
| Nalca | Gunnera tinctoria | giant leaves on red stalks, flower spike (leaves need a redraw: currently read as round trees) |
| Tomatera | Solanum lycopersicum | trellis, yellow flowers, red tomatoes |
| Maravilla | Helianthus annuus | tallest; bud then full head |
| Liuto | Alstroemeria | more stems per stage, speckled orange-pink flowers |

Thirsty: leaves to dry olive, 1 px droop, pale cracked soil. Wilted: stronger droop (3 px), browner, a dry-soil ring. Both must be readable at scene scale; add a small droplet icon above a thirsty plant if not.

---

## 5. Game rules

### 5.1 Topics and plants
- A topic is a note in the vault's `Topics/` folder. A paper belongs to a topic through its `topics` frontmatter.
- A topic gets a plant once it has at least one paper with a summary and at least one question.
- Species are assigned in `data/plants.json` (topic → species, slot). Default: assign in order of first appearance, cycling through species. Felix can edit the file.
- Capacity: 12 visible plants (6 étagère, 4 floor, 2 hanging). Seeds, sprouts and saplings sit on the étagère; bloom and fruit move to floor pots or hanging baskets. If more than 12 topics qualify, show the 12 with the most questions; the rest live in the Herbarium only (open decision: second room).

### 5.2 Stage from mastery
For each topic, over its questions' latest grades: `answered` = number answered at least once; `mastery` = (got + 0.5 × partial) / answered.

| Stage | Rule |
|---|---|
| seed | planted, nothing answered |
| sprout | answered ≥ 1 |
| sapling | answered ≥ 5 and mastery ≥ 0.4 |
| bloom | answered ≥ 10 and mastery ≥ 0.6 |
| fruit | answered ≥ 15 and mastery ≥ 0.8 |

Stages can go down if mastery drops (the plant loses fruit, not its size: never below sapling once reached).

### 5.3 Water, thirst
- Water per answer: knew it 10, partly 6, not yet 3. Water is a running total shown in the stat strip.
- Thirsty: topic has questions due and none answered in 7 days. Wilted: 21 days. Answering any card of that topic clears it.

### 5.4 Daily cards
- 3 cards per day, fixed for the day once picked (seeded by the date).
- Pick reviews first: weight not yet 6, partly 4, knew it 1, times min(4, 1 + days since last seen / 3). Skip knew-it cards seen in the last 3 days. Prefer different papers.
- Reserve one of the 3 slots for an unanswered card whenever one exists, so reviews cannot crowd out new cards.
- Fill the reserved slot and any remaining slots with unanswered cards from all card files (weekly sets and batches), newest file first, in order within each file.
- If nothing is due, the day counts as done with no water.

### 5.5 Streak
- A day counts when every card picked for it is graded (local date), even if fewer than 3 were available. A day with nothing due also counts, with no water.
- Freezes: +1 at every 7-day streak, max 2; a missed day consumes one automatically.
- Milestones (days 1, 7, 14, 30, 60) unlock room details instead of scraps: e.g. rug fringe, second candle, framed print, gramophone, globe. List lives in `data/milestones.json`.

### 5.6 Journal
- One lore chapter per completed day, in order (13 chapters from the Mac app’s `lines.js`, Coronel Plumas appears in text only). After the last, weekly results pages only, until new chapters are written.

---

## 6. Data and architecture

### 6.1 Stack
- Static site, no framework required (vanilla JS modules) or a small Vite + Preact build. Keep the bundle under 300 KB excluding art.
- PWA: `manifest.webmanifest` (name "Freakbot", icon from the sprite, `display: standalone`, theme #17110D) and a service worker that caches the shell, art and current cards for offline use.
- Hosting: GitHub Pages from the public repo, at `https://freakbot.nicolascardenasmiller.com/`.

### 6.2 Repos
| Repo | Visibility | Holds |
|---|---|---|
| `freakbot-garden` | public | app code, art, `data/cards/<week>.json`, `data/plants.json`, `data/milestones.json` |
| `freakbot-garden-save` | private | `save.json` (progress) |

Felix accepted that questions are public (they summarize published papers).

### 6.3 Card file (`data/cards/2026-11-13.json`)
```json
{
  "week": "2026-11-13",
  "generatedAt": "ISO time",
  "pool": 88,
  "cards": [
    {
      "id": "2026-11-13__q01",
      "kind": "recall | evidence | concept | synthesis",
      "format": "short | mc",
      "topics": ["Trade"],
      "citekeys": ["bermeoAidNotOil2016"],
      "paper": "Bermeo (2016)",
      "citation": "Bermeo, S. 2016. \"Aid Is Not Oil.\" International Organization 70(1).",
      "prompt": "...",
      "options": ["..."],
      "correct": 0,
      "answer": "...",
      "explanation": "...",
      "source": "zotero_library/bermeoAidNotOil2016.md · pp. 7-13"
    }
  ]
}
```
`data/cards/index.json` lists all card files (weekly sets `<date>.json` and summary-time batches `<date>-batch.json`) so the app can load them. Batch card ids look like `b-<citekey>-1`.

### 6.4 Save file (`save.json` in the private repo)
```json
{
  "v": 1,
  "responses": { "<card id>": { "grade": "got|partial|missed", "at": "ISO", "day": "YYYY-MM-DD", "choice": 0, "text": "..." } },
  "days": { "YYYY-MM-DD": { "cards": ["<card id>"], "done": true, "frozen": false, "water": 26, "at": "ISO" } },
  "profile": { "streak": 0, "best": 0, "freezes": 0, "water": 0, "daysDone": 0, "lastDay": null, "unlocked": [] }
}
```
Keep only the latest response per card in `responses`; append history to `history/<YYYY-MM>.jsonl` if needed later.

### 6.5 Sync
- Writes go to localStorage first (works offline), then to GitHub through the Contents API (`PUT /repos/{owner}/freakbot-garden-save/contents/save.json` with the file `sha`).
- On conflict (sha mismatch): fetch, merge by taking the newer `at` per card and per day (a done day always beats an unfinished one), recompute profile, retry once.
- Auth: a fine-grained personal access token with Contents read/write on `freakbot-garden-save` only. Entered once per device in Settings, stored in localStorage, never committed, never logged. Show "not syncing" state clearly when missing or rejected.

---

## 7. Content pipeline

New cards come from two places:

1. **Summary time (primary, added 9 Nov 2026).** When Claude writes a paper's Claude Summary (workflow in `claude/Reading_Batch_Workflow.md`, section 8), it also writes 2–3 cards for that paper from the PDF: one recall, one evidence, and optionally one concept or synthesis card. They go live the same day as `data/cards/<date>-batch.json`. New papers therefore enter the garden immediately: a new topic plants its seed the day the paper is summarized, not on Friday.
2. **Friday task (secondary).** Fills gaps and adds what single-paper cards cannot: synthesis cards across papers, concept cards from `Concepts/`, new angles on papers you keep missing, and cards for any summarized paper that has none yet (for example notes summarized outside the workflow). It skips papers that already have batch cards unless you have been missing them.

Two Claude scheduled tasks already exist and must be updated when the app ships:
- **Weekly reading quiz** (Fridays 08:40 ET, runs on the Mac): today writes the quiz to the old claude.ai quiz page's database. Change it to: read `save.json` for history, write `data/cards/<date>.json` in the card format above (add `topics` and `citation`), update `index.json`, commit and push to `freakbot-garden`.
- **Freakbot streak reminder** (daily 19:35 ET, cloud): today reads the old page's database. Change it to read `save.json` from the private repo.

Migration from the current quiz page (claude.ai artifact "Friday Reading Quiz"): export its `quizzes`, `responses`, `days`, `profile` collections and convert to the new files once, before switching the tasks.

---

## 8. Build phases

**Phase 1: playable core**
- Repo scaffold, PWA install, Pages deploy.
- Cards tab: load cards, daily 3, index-card UI (front/back), grading, water, streak, freezes.
- Save locally + GitHub sync with token.
- Garden tab with one static room per time band and Freakbot idle (bob, blink).
- Done when: installable on the Samsung, works offline, a graded card syncs to the Mac within a minute.

**Phase 2: the garden**
- Plants from `plants.json`, stages from mastery, thirsty/wilted, slot placement and moves.
- Freakbot watering animation after each answer (F6), sleep at night, slips.
- Herbarium sheets.
- Done when: answering a Trade card visibly waters the lemon tree.

**Phase 3: polish**
- Journal and lore, milestones, day sky art, more Freakbot frames, nalca redraw, sound off by default.
- Update the two scheduled tasks; migrate old data; retire the claude.ai quiz page.

---

## 9. Open decisions
1. What water is for, beyond a score (room decorations to place? unlocks only?).
2. More than 12 topics: second room, or only comps topics get plants.
3. Which topics map to which species (default automatic).
4. Whether the Friday quiz stays 12 cards or shrinks now that dailies exist.
5. Resolved: the app moved to its own subdomain, `freakbot.nicolascardenasmiller.com`, so the sync token in localStorage is no longer shared with `nicolascardenasmiller.com` and the other Pages sites served from it.

## 10. Assets in this bundle
| Path | What |
|---|---|
| `art/plants.py` | plant generator (8 species × stages, thirsty) |
| `art/final.py` | conservatory scenes, time-of-day grading, scarf, frames |
| `art/garden2.py` | helper used by `final.py` (`plant_img`) |
| `art/gen.js` | extracts Freakbot sprites from the Mac app code into `sprites.json` (needs the app's `freakbot.js`) |
| `art/sprites.json` | pre-extracted sprite pixel lists |
| `art/out/` | rendered PNGs: scenes, background without Freakbot, Freakbot frames, plant sheet |

Regenerate: `cd art && python3 final.py` (Python 3 + Pillow).
