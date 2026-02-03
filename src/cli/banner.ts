/**
 * Animated ASCII banner.
 *
 * On a colour-capable TTY the banner glitch-reveals left-to-right, then a
 * purple→pink gradient sweeps across it.  On a pipe or when colours are
 * disabled a single static frame is printed instead.
 */

import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Pixel font — every letter is exactly 6 rows tall.  Widths vary.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  E: [
    '██████',
    '██    ',
    '████  ',
    '██    ',
    '██    ',
    '██████',
  ],
  X: [
    '██   ██',
    ' ██ ██ ',
    '  ███  ',
    '  ███  ',
    ' ██ ██ ',
    '██   ██',
  ],
  T: [
    '██████',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    '  ██  ',
  ],
  M: [
    '██    ██',
    '███  ███',
    '██ ██ ██',
    '██ ██ ██',
    '██    ██',
    '██    ██',
  ],
  I: [
    '██████',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    '██████',
  ],
  G: [
    ' ████ ',
    '██  ██',
    '██    ',
    '██ ███',
    '██  ██',
    ' ████ ',
  ],
};

// ---------------------------------------------------------------------------
// Purple → pink colour palette
// ---------------------------------------------------------------------------
const PALETTE = [
  '#4C1D95', // deep indigo
  '#6D28D9', // violet
  '#8B5CF6', // purple
  '#A855F7', // fuchsia-purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#F472B6', // light pink
];

/** Characters scattered across the banner during the glitch phase. */
const GLITCH = '░▒▓▄▀▐▌█';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Deterministic pseudo-random in [0, 1). */
function prng(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Compose the pixel-font rows for a word. */
function renderLines(word: string, gap = 2): string[] {
  const letters = word.split('').map(ch => FONT[ch]!);
  const height  = letters[0].length;
  const pad     = ' '.repeat(gap);
  const lines: string[] = [];

  for (let row = 0; row < height; row++) {
    lines.push(letters.map(l => l[row]).join(pad));
  }

  return lines;
}

/**
 * Colour + optional glitch a single rendered line.
 *
 * @param line         raw text line from renderLines()
 * @param frame        current animation frame (0-based)
 * @param glitchFrames total frames the glitch phase lasts
 * @param colorOffset  horizontal palette shift (increases during sweep)
 */
function styleLine(
  line: string,
  frame: number,
  glitchFrames: number,
  colorOffset: number
): string {
  const width = line.length;
  let   out   = '';

  for (let i = 0; i < width; i++) {
    if (line[i] === ' ') { out += ' '; continue; }

    // Each column "settles" (stops glitching) at a slightly different frame.
    // A small random jitter per-column keeps the reveal from looking mechanical.
    const settleFrame = (i / width) * glitchFrames * 0.7
                      + prng(0, i)  * glitchFrames * 0.3;
    const settled     = frame >= settleFrame;

    const ch = settled
      ? line[i]
      : GLITCH[Math.floor(prng(frame, i) * GLITCH.length)];

    // Smooth colour gradient across columns, shifted each sweep frame.
    const t        = ((i + colorOffset) % (PALETTE.length * 5)) / 5;
    const colorIdx = Math.floor(t) % PALETTE.length;
    out           += chalk.hex(PALETTE[colorIdx])(ch);
  }

  return out;
}

// ---------------------------------------------------------------------------
// ANSI cursor helpers (TTY only)
// ---------------------------------------------------------------------------
const cursorUp  = (n: number) => `\x1b[${n}A`;
const clearLine = '\x1b[2K';

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------
const GLITCH_FRAMES = 5;  // frames the glitch lasts
const SWEEP_FRAMES  = 8;  // frames of colour sweep after full reveal
const TOTAL_FRAMES  = GLITCH_FRAMES + SWEEP_FRAMES;
const FRAME_MS      = 60; // ms per frame
const COLOR_SHIFT   = 3;  // palette units shifted per sweep frame
const INDENT        = '  ';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Print the animated EXTMIG banner and the author credit.
 * Degrades gracefully to a single static frame when stdout is not a TTY or
 * colours are unsupported.
 */
export async function showBanner(): Promise<void> {
  const lines = renderLines('EXTMIG');
  const rows  = lines.length;
  const animate = !!process.stdout.isTTY && chalk.level > 0;

  if (animate) {
    // ── animated path ──────────────────────────────────────────────────
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      const colorOffset = Math.max(0, frame - GLITCH_FRAMES) * COLOR_SHIFT;

      if (frame > 0) process.stdout.write(cursorUp(rows));

      for (const line of lines) {
        process.stdout.write(
          clearLine + INDENT + styleLine(line, frame, GLITCH_FRAMES, colorOffset) + '\n'
        );
      }

      if (frame < TOTAL_FRAMES - 1) await sleep(FRAME_MS);
    }
  } else {
    // ── static fallback (piped / no-colour) ────────────────────────────
    const finalOffset = (SWEEP_FRAMES - 1) * COLOR_SHIFT;

    for (const line of lines) {
      process.stdout.write(
        INDENT + styleLine(line, TOTAL_FRAMES - 1, GLITCH_FRAMES, finalOffset) + '\n'
      );
    }
  }

  // ── author credit ──────────────────────────────────────────────────
  const bannerWidth  = lines[0].length;
  const dividerChars = '╌'.repeat(bannerWidth);
  const credit       = 'developed by Jihed Mrouki';
  const creditPad    = ' '.repeat(Math.floor((bannerWidth - credit.length) / 2));

  console.log('');
  console.log(INDENT + chalk.hex('#4C1D95')(dividerChars));
  console.log(INDENT + creditPad + chalk.hex('#EC4899').bold(credit));
  console.log(INDENT + chalk.hex('#4C1D95')(dividerChars));
  console.log('');
}
