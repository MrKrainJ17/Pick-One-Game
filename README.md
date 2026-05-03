# Pick One

A tournament-style preference game. Pick a category, then run through a 64-item single-elimination bracket. The winner is whatever you actually like the most.

## Run it

Just open `index.html` in any modern browser — no build step, no server, no dependencies.

```
open index.html
```

If you want to test the Web Share API or clipboard reliably, serve it instead:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — shell with the persistent control buttons (theme + sound) and the `#app` mount point.
- `style.css` — all styles. Mobile-first, responsive. Two themes via `:root` + `:root.light-mode`. Matchup screen flips between top/bottom (portrait) and left/right (landscape ≥ 720px). The bracket reveal uses a March Madness layout that scrolls horizontally.
- `script.js` — game logic. Sectioned: data → state → utils → bracket → rendering → actions → init.
- `README.md` — this file.

## Features

- 9 categories, each with 64 items.
- Cartoon SVG art from [OpenMoji](https://openmoji.org/) — image URLs are derived automatically from each item's emoji codepoints, with a fallback to the native emoji if the image fails to load.
- Dark / light mode toggle (top-right ☀️/🌙). Defaults to system preference, persisted in `localStorage`.
- Mute toggle (top-right 🔊/🔇) for the per-tap "clack" sound. The sound is generated on the fly with the Web Audio API — no external audio files. Persisted in `localStorage`.
- Haptic feedback on every tap via `navigator.vibrate(...)` — no-op on devices that don't support it.
- March Madness bracket: the 64 items split into two halves of 32, the left and right sides flow inward, and they meet at the championship in the center. Winners are bolded and highlighted, losers get crossed out with an animated strikethrough.
- **Mid-tournament reveals**: after every round, the full bracket is shown with the just-completed round's losers animating off, plus a Continue button. After the final, the champion is crowned with Play Again / Share buttons.

## Adding a new category

Open `script.js` and find the `CATEGORIES` object near the top. Add a new key:

```js
const CATEGORIES = {
  // ...existing categories
  music: {
    name: "Music",
    emoji: "🎵",
    accent: "#34c759",   // any hex — used for the highlights and champion glow
    items: parseItems(
      "Rock 🎸, Jazz 🎷, Hip Hop 🎤, ..." +
      // ...keep going until you have 64 items, separated by ", "
    )
  }
};
```

Rules:
- **Exactly 64 items** per category (the bracket is hardcoded to 6 rounds).
- Each item is `Name <emoji>` — single space between name and emoji. Multi-word names work fine because we split on the *last* space.
- The image URL is computed automatically from the emoji's Unicode codepoints, so you don't need to hand-write any URLs. If a particular emoji isn't in OpenMoji, the matchup screen quietly falls back to the native emoji.
- The card on the home screen picks up the new category automatically.

If you want a matching accent border on the home-screen card, add a rule in `style.css`:

```css
.category-card[data-category="music"]         { border-color: rgba(52, 199, 89, 0.55); }
.category-card[data-category="music"]:active  { background: rgba(52, 199, 89, 0.10); }
```

## Adding or swapping items in an existing category

Edit the string inside `parseItems(...)` for that category. Keep the count at 64 and keep the format `Name emoji, Name emoji, ...`.

## How the OpenMoji URLs are built

`emojiToOpenMojiUrl(emoji)` in `script.js`:
1. Iterates the emoji's Unicode codepoints (handles surrogate pairs and ZWJ sequences).
2. Drops the variation selector `U+FE0F` (OpenMoji filenames omit it).
3. Joins the remaining codepoints as uppercase hex with `-`, e.g. `1F468-200D-1F680.svg` for 👨‍🚀.
4. Returns `https://openmoji.org/data/color/svg/<HEX>.svg`.

If a file 404s, the `<img onerror>` handler swaps in a span containing the original emoji.

## How the bracket layout works

`script.js` keeps the bracket as a flat array of rounds (`state.rounds[r]`) where each round is an array of matches. For the March Madness display, each non-final round is split in half by absolute match index — lower indices fill the left columns, upper indices fill the (mirrored) right columns. With `justify-content: space-around` on every round column, the matches in adjacent rounds line up on their pairing centers automatically.

Each "bracket reveal" between rounds uses the same DOM. Losers from previously revealed rounds get a `loser-immediate` class (no animation) and the just-completed round's losers get a regular `loser` class so they animate in fresh.
