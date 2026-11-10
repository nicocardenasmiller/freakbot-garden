# Freakbot's Conservatory: design doc

Version 2.1 · 9 Nov 2026 · owner: Felix (1.1: cards are written at summary time, section 7; 1.2: Phase 1 decisions in sections 3, 4.3, 5.4, 5.5, 6.4, 6.5, 9; 1.3: ship room restyle in section 4, key-point grading, Friday task moved up; 1.4: full ship redesign, sections 3 and 4; 1.5: white interior, rooms and travel, sections 4.2, 5.1, 5.7, 9; 1.6: signage interface and shared palette, sections 3, 4.4, 4.5; 1.7: Android app, section 6.7; 1.8: phone reminders, Phase 2 details in 5.1, 5.3, 5.7, 6.4; 1.9: the Archive has its own architecture, 5.7; 2.0: interface materials, live window, tap reactions, pixel widget; 2.1: Phase 3, sections 5.5 to 5.7)

A study app for PhD reading. You answer a few questions a day about papers you have read; right answers water a small conservatory of plants, one plant per research topic. Freakbot, a salvaged pixel robot who survived the apocalypse, lives there, tends the plants and talks to you. It is an installable web app (PWA) hosted on GitHub Pages and used mostly on a Samsung phone.

This file is the source of truth for every build session. Read it fully before changing code. When a decision here changes, update this file in the same commit.

Visual reference: the design canvas "Freakbot's Base: Style Options", Round 7 (boards F1 to F6). Earlier rounds on that canvas are rejected directions; ignore them. Since 1.4 the room and interface follow sections 3 and 4, not those boards.

---

## 1. Goals and non-goals

**Goals**
- Make daily recall of read papers a 3-minute habit (spaced repetition, not trivia).
- Make progress visible as a garden that fills in over months, tied to real topics.
- Feel calm and cozy: the overgrown hydroponics bay of a derelict spaceship, retro cyberpunk pixel art, one character.
- Work offline on the phone; sync progress between phone and Mac.

**Non-goals (v1)**
- No social features, no leaderboards, no push server (reminders come from a Claude scheduled task).
- No login bonuses or rewards that do not come from answering questions.
- No shop or currency spending. Water is never spent; its running total moves the building (section 5.7).
- Plants never die.

---

## 2. Core loop

1. Open the app. The conservatory shows the time of day from the phone clock. Freakbot says one line (often which plant is thirsty).
2. Tap **Water the garden**. Answer 3 cards (index cards). Short answers are graded by tapping the key points you remembered: all is knew it, some is partly, none is not yet. Multiple choice grades itself.
3. Each answer waters the plant for that card's topic. Freakbot rolls to that plant and waters it (animation F6).
4. After the third card: streak updates, rewards (if any) show, and a new Journal page (lore) unlocks.
5. Each paper you summarize adds 2–3 cards the same day, and a new topic plants its seed right away. The Friday task adds review and synthesis cards across papers.

---

## 3. Screens

| Tab | Screen | Reference board |
|---|---|---|
| Garden | The conservatory scene, stat line, one primary button, Freakbot's slip | F1 morning, F2 golden, F3 night, F6 animated |
| Cards | Index-card quiz flow (front: question, optional written answer; back: key points to tap, full answer, explanation, source) | F5 |
| Herbarium | Grid of plant sheets; tap one for its herbarium sheet (specimen, label, papers cited, "Water this plant") | F4 |
| Journal | Lore chapters unlocked so far, written as journal pages; past weekly results | (not mocked yet) |

Layout rules (phone 390 px wide reference):
- Top: title "The Conservatory" (Michroma 14, uppercase) and local date/time (Barlow Condensed). Under it a thin stat strip in label style, each item with a small color block: Water · Streak · Plants.
- Scene: 388 × 560 px (art 97 × 140 at 4×), centred, `image-rendering: pixelated`. The scene never scrolls. On phones narrower than 388 px (the Galaxy S25 is 360 px) keep 4× and trim the side edges evenly.
- Bottom: one primary action, then the 4-tab nav. Nothing else.
- Settings (the sync token) opens by tapping the stat strip. The strip also shows the "not syncing" state.
- Freakbot's speech is a terminal slip over the scene: panel fill, VT323 19 px, tilted ±1.5°, auto-hides after ~6 s, tap to dismiss.

---

## 4. Art direction

### 4.1 Pixel rules
- Scene art resolution 97 × 140, displayed at 4×. Plants 26 × 34. Freakbot sprite grid 18 × 24 drawn inside a 32 × 34 frame (includes scarf tails).
- No anti-aliasing, no smooth gradients inside art, no rotation of pixel art. Light is done with stepped, quantized glows and ordered dithering (see `art/final.py`).
- Motion is stepped: CSS `steps()` or frame swaps, ~150 ms per tick. No easing curves.
- Respect `prefers-reduced-motion`: freeze animations, keep slips.

### 4.2 The room
The hydroponics bay of a flying library, a derelict ship that Freakbot keeps running as it drifts between abandoned cities and planets. One-point perspective, fixed composition (do not rearrange per screen):
- Hull: octagonal rings with structural ribs recede to the back wall, with ceiling light panels, corner light strips and deck seams running along the ship's length. No staggered, brick-like or speckled surfaces.
- Back: one large octagonal viewport set deep into the hull, onto the current destination (section 5.7). In orbit: stars, a distant station and a planet that turns through the day.
- Plants escape along the hull, thickest in the upper corners. Never an even garland.
- Hanging copihue basket top centre.
- Left: research console with a terminal and stacked books. Above it the red LIBROS sign, the one hot light in the room.
- Right: three-tier grow rack in a dark glass bay with red light bars and 6 small pots.
- Floor: metal deck, Freakbot's round charging pad centre, big floor bays left and right.
- Freakbot stands on the pad; brass watering can beside him. Tapping him makes him jump, wiggle or cheer with a line. Four quick taps annoy him.
- The view outside is live (`js/windowfx.js`): stars twinkle, clouds drift or city lights flicker, a ship crosses, the odd shooting star. It freezes under reduced motion.

Color: the room and the interface share one palette (section 4.4). Warm white hull, black, signal red, blue, yellow, foliage cool. Depth matters more than whiteness: sections brighten toward the window, the nearest section is dark, ribs throw shadows, and furniture has side faces and contact shadows. Light is one dithered pass in `art/final.py → grade()`: falloff from the window, the viewport mirrored in the deck, haze around the frame, form shading on sprites, grime on the hull. Everything is scaled to Freakbot: the console at his chest, the terminal the size of his head, the rack about twice his height, thin ribs. Avoid pure red next to bright green.

### 4.3 Time of day (phone clock)
| Band | Hours | Sky | Lighting |
|---|---|---|---|
| Morning | 05:00 to 11:00 | sunrise on the planet's limb | warm ship lighting, ice strips |
| Day | 11:00 to 17:00 | bright blue planet, black space | cool and even, ice strips |
| Golden | 17:00 to 21:00 | orange planet, violet space | warm, amber strips |
| Night | 21:00 to 05:00 | dark planet with city lights | dim, pale blue strips, sign glow, Freakbot asleep |

Implementation: render the room once per band (pre-baked PNGs) plus Freakbot and plants as separate layers so they can move. Plants are graded to match the band (multipliers in `art/final.py → BANDS`).

### 4.4 Palette (shared by the room and the interface)
| Token | Day | Night | Use |
|---|---|---|---|
| ink | #D9DAD4 | #15181E | app background, hull white |
| panel | #EFEEE8 | #1F232B | cards, slips, settings |
| panel-raised | #F8F7F2 | #292E37 | options and key points |
| text | #1C2028 | #EFEEE8 | primary text |
| text-muted | #565E6B | #A5A9A6 | secondary text |
| bar | #1C2028 | #EFEEE8 | label bars, primary buttons, active tab |
| rule | #1C2028 | #6C6E6C | panel borders |
| line | #A9ACA8 | #3E434C | minor dividers |
| red | #C4402E | #E0604A | the sign, warnings, button edge |
| blue | #2B6CA3 | #8DB8DE | Water marker, written answers, floor lights |
| yellow | #E0A92E | #E0A92E | Streak marker, selected key point, terminal |

### 4.5 Type
- Michroma: the title, primary buttons, panel headings. Uppercase, small sizes only.
- Barlow (400 to 600): all reading text on cards.
- Barlow Condensed (600, 700): labels, clock, tabs, sources. Label style is 12 to 13 px, wide tracking, uppercase.
- VT323: only Freakbot's voice (slips) and nothing else.
- No fifth family.
- The interface works like ship signage: black label bars and small square color markers.
- It is built from the ship's materials, on the scene's 4 px grid: dithered hull and panel textures per time band (`ui_<band>_plate/panel.png` from `art/final.py`), 4 px bevels and rules, notched corners, no 1 or 2 px lines. Real GPU shaders are not used.

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
- Species are assigned in `data/plants.json` (topic → species). Default for topics not listed: order of first appearance, cycling through species. Felix can edit the file. Slots are not stored: they follow from each plant's stage.
- Capacity: 12 visible plants per room (6 rack, 4 floor, 2 hanging). Seeds, sprouts and saplings sit on the rack; bloom and fruit move to floor pots or hanging baskets. A plant spills into the other group when its own is full. Each room holds 12 plants, filled in order of first appearance. When a room is full the next one opens (section 5.7).

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
- Thirsty: topic has questions due and none answered in 7 days. Wilted: 21 days. Answering any card of that topic clears it. A card is due unless it was graded knew it in the last 3 days. A seed with nothing answered is never thirsty.

### 5.4 Daily cards
- 3 cards per day, fixed for the day once picked (seeded by the date).
- Pick reviews first: weight not yet 6, partly 4, knew it 1, times min(4, 1 + days since last seen / 3). Skip knew-it cards seen in the last 3 days. Prefer different papers.
- Reserve one of the 3 slots for an unanswered card whenever one exists, so reviews cannot crowd out new cards.
- Fill the reserved slot and any remaining slots with unanswered cards from all card files (weekly sets and batches), newest file first, in order within each file.
- If nothing is due, the day counts as done with no water.

### 5.5 Streak
- A day counts when every card picked for it is graded (local date), even if fewer than 3 were available. A day with nothing due also counts, with no water.
- Freezes: +1 at every 7-day streak, max 2; a missed day consumes one automatically.
- Milestones (best streak of 1, 7, 14, 30, 60 days) unlock room details instead of scraps: framed print, second candle, gramophone, globe, rug fringe. List lives in `data/milestones.json`, and unlocks are permanent.

### 5.6 Journal
- One lore chapter per completed day, in order (13 chapters from the Mac app’s `lines.js`, Coronel Plumas appears in text only). After the last, weekly results pages only, until new chapters are written. Chapters live in `data/lore.json`. Weekly results group by Monday-start week and count each card's latest grade.

### 5.7 Rooms and travel
- Rooms open in this order, every 12 plants: Hydroponics bay, Archive (shelves of books and card catalogs), Observatory (domed roof, telescope), Greenhouse deck (open to the sky). Swipe or tap between them on the Garden tab. Each room must have its own architecture, furniture, light and plant positions, not a repaint of another room. The Archive is a tall wooden library: two storeys of books, a gallery where the small plants sit, a round brass window, a reading table with green lamps, a card catalog, a ladder and a rug. Bay and Archive exist so far; the Observatory and Greenhouse deck get drawn when someone reaches 25 plants, and until then those plants live in the Herbarium only.
- Destinations come from `data/locations.json` and show through the Bay's viewport. The current one is `floor(water / 200) mod count`, so it needs no saved state and only answering cards can move the building. About one new view every 10 days.
- First destinations: orbit, old port city (Valparaíso-inspired), ruined college town, ringed planet. Time-of-day lighting applies at every stop.

---

## 6. Data and architecture

### 6.1 Stack
- Static site, no framework required (vanilla JS modules) or a small Vite + Preact build. Keep the bundle under 300 KB excluding art.
- PWA: `manifest.webmanifest` (name "Freakbot", icon from the sprite, `display: standalone`, theme #D9DAD4) and a service worker that caches the shell, art and current cards for offline use.
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
      "points": ["..."],
      "explanation": "...",
      "source": "zotero_library/bermeoAidNotOil2016.md · pp. 7-13"
    }
  ]
}
```
`points` holds 2 or 3 key points taken from `answer`, required on `short` cards. `data/cards/index.json` lists all card files (weekly sets `<date>.json` and summary-time batches `<date>-batch.json`) so the app can load them. Batch card ids look like `b-<citekey>-1`.

### 6.4 Save file (`save.json` in the private repo)
```json
{
  "v": 1,
  "responses": { "<card id>": { "grade": "got|partial|missed", "at": "ISO", "day": "YYYY-MM-DD", "choice": 0, "points": [0, 2], "text": "...", "reviewed": "note" } },
  "days": { "YYYY-MM-DD": { "cards": ["<card id>"], "extra": ["<card id>"], "done": true, "frozen": false, "water": 26, "at": "ISO" } },
  "peaks": { "<topic>": 2 },
  "profile": { "streak": 0, "best": 0, "freezes": 0, "water": 0, "daysDone": 0, "lastDay": null, "unlocked": [] }
}
```
`extra` holds cards asked through "Water this plant": they earn water but never affect whether the day is done. `peaks` is the highest stage each topic has reached and merges by maximum. `points` lists the key points tapped. `reviewed` is set by the Friday review when it lowers a grade, with `at` bumped so the change wins the merge. Keep only the latest response per card in `responses`; append history to `history/<YYYY-MM>.jsonl` if needed later.

### 6.5 Sync
- Writes go to localStorage first (works offline), then to GitHub through the Contents API (`PUT /repos/{owner}/freakbot-garden-save/contents/save.json` with the file `sha`).
- On conflict (sha mismatch): fetch, merge by taking the newer `at` per card and per day (a done day always beats an unfinished one), recompute profile, retry once.
- Auth: a fine-grained personal access token with Contents read/write on `freakbot-garden-save` only. Entered once per device in Settings, stored in localStorage, never committed, never logged. Show "not syncing" state clearly when missing or rejected.

### 6.7 Android app
- `app/` is a Capacitor shell (id `garden.freakbot.app`) that loads the live site, so web changes reach the phone without a reinstall. Only native changes need a new APK.
- It adds a daily 19:35 reminder that only fires when today's cards are not done (a day finished on the Mac counts once the phone app has opened), and a home-screen streak widget drawn as pixel art on a 2 dp grid: Freakbot in a mood that follows the day, a water drop and streak count (gold from 30 days), the last 7 days as squares, and a status in Spanish. The web app pushes `streak`, `freezes`, `lastDay` and `doneDay` to the native `FreakbotWidget` plugin whenever they change (`js/app.js → pushWidget`), so the widget never holds the sync token. The widget applies missed days itself, using the rule in 5.5.
- Hardened: no app data backup, no WebView or app debugging, and only the internet, notification and boot permissions.
- Installed directly on the phone, not through the Play Store. Build with `cd app/android && ./gradlew assembleDebug`.
- The Mac keeps using the website.

---

## 7. Content pipeline

New cards come from two places:

1. **Summary time (primary, added 9 Nov 2026).** When Claude writes a paper's Claude Summary (workflow in `claude/Reading_Batch_Workflow.md`, section 8), it also writes 2–3 cards for that paper from the PDF: one recall, one evidence, and optionally one concept or synthesis card. They go live the same day as `data/cards/<date>-batch.json`. New papers therefore enter the garden immediately: a new topic plants its seed the day the paper is summarized, not on Friday.
2. **Friday task (secondary).** Fills gaps and adds what single-paper cards cannot: synthesis cards across papers, concept cards from `Concepts/`, new angles on papers you keep missing, and cards for any summarized paper that has none yet (for example notes summarized outside the workflow). It skips papers that already have batch cards unless you have been missing them.

Scheduled jobs:
- **Weekly reading quiz** (Fridays 08:40 ET, a local task on the Mac; moved up from Phase 3): reads `save.json`, writes `data/cards/<date>.json` in the card format above and updates `index.json`, commits and pushes to `freakbot-garden`. It also reviews answers typed since the last run against each card's `points`; where a grade looks too generous it lowers the grade in `save.json` and sets `reviewed`, so the card comes back sooner, and it reports what it changed.
- **Streak reminder** (daily 19:35, on the phone): built into the Android app, section 6.7. The old cloud task no longer exists.

Migration from the old quiz page (claude.ai artifact "Friday Reading Quiz"): checked on 9 Nov 2026. It held no responses or profile, one unfinished day, and the same 12 questions as `data/cards/2026-11-09.json`, so there was nothing to convert. The page was then retired.

---

## 8. Build phases

**Phase 1: playable core**
- Repo scaffold, PWA install, Pages deploy.
- Cards tab: load cards, daily 3, index-card UI (front/back), grading, water, streak, freezes.
- Save locally + GitHub sync with token.
- Garden tab with one static room per time band and Freakbot idle (bob, blink).
- Done when: installable on the Samsung, works offline, a graded card syncs to the Mac within a minute.

**Phase 2: the garden**
- Plants from `plants.json`, stages from mastery, thirsty/wilted, slot placement and moves, rooms (section 5.7).
- Freakbot watering animation after each answer (F6), sleep at night, slips.
- Herbarium sheets.
- Done when: answering a Trade card visibly waters the lemon tree.

**Phase 3: polish**
- Journal and lore, milestones, travel between destinations (section 5.7), more Freakbot frames, nalca redraw, sound off by default.
- Old quiz page checked and retired, no data to migrate (section 7).

---

## 9. Open decisions
1. Resolved: water fuels travel (section 5.7).
2. Resolved: a new room opens every 12 plants (section 5.7).
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
