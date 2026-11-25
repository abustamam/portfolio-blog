// Game logic for "Spot the mistake" (/ai-guides/when-ai-is-wrong/).
// Pure functions so the page script and the tests share one source of truth.
// Nothing here touches storage or the network: the game keeps its state in
// memory and forgets it on reload.

import type { MistakeRound, MistakeType } from '../consts/guides/mistakeRounds';

export interface GameState {
  /** Index of the round being played; equals the number of rounds when the game is over. */
  round: number;
  /** Per round: did the reader tap a part that was not the mistake before finding it? */
  missed: boolean[];
  /** Has the mistake in the current round been found (explanation showing)? */
  found: boolean;
}

export type TapResult = 'found' | 'look-again' | 'ignored';

export function newGame(rounds: readonly MistakeRound[]): GameState {
  return { round: 0, missed: rounds.map(() => false), found: false };
}

export function isOver(state: GameState, rounds: readonly MistakeRound[]): boolean {
  return state.round >= rounds.length;
}

/** The index of the one wrong part in a round. Throws if a round has none or several. */
export function wrongPartIndex(round: MistakeRound): number {
  const idx = round.parts.flatMap((p, i) => (p.wrong ? [i] : []));
  if (idx.length !== 1) throw new Error(`round ${round.id} must have exactly one wrong part, has ${idx.length}`);
  return idx[0];
}

/**
 * Tap part `part` of the current round. Tapping the mistake reveals it; tapping
 * any other part says "look again" and counts the round as missed (once).
 * Taps after the mistake is found, or after the game is over, are ignored.
 */
export function tap(
  state: GameState,
  rounds: readonly MistakeRound[],
  part: number,
): { state: GameState; result: TapResult } {
  if (isOver(state, rounds) || state.found) return { state, result: 'ignored' };
  const round = rounds[state.round];
  if (part < 0 || part >= round.parts.length) return { state, result: 'ignored' };
  if (part === wrongPartIndex(round)) return { state: { ...state, found: true }, result: 'found' };
  const missed = state.missed.slice();
  missed[state.round] = true;
  return { state: { ...state, missed }, result: 'look-again' };
}

/** Move to the next round once the mistake is found. */
export function nextRound(state: GameState, rounds: readonly MistakeRound[]): GameState {
  if (!state.found || isOver(state, rounds)) return state;
  return { ...state, round: state.round + 1, found: false };
}

/** Rounds where the mistake was found with the first tap. */
export function score(state: GameState): number {
  return state.missed.filter((m) => !m).length;
}

/** Mistake types of the rounds that were missed, in round order, without repeats. */
export function missedTypes(state: GameState, rounds: readonly MistakeRound[]): MistakeType[] {
  const out: MistakeType[] = [];
  rounds.forEach((r, i) => {
    if (state.missed[i] && !out.includes(r.type)) out.push(r.type);
  });
  return out;
}
