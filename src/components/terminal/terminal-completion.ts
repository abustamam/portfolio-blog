import type { SiteTerminalData } from './terminal-types';
import { isValidCwd, lsLines, resolveCd } from './terminal-fs';

export interface CompletionResult {
  completed: string; // replacement value for input.value
  matches: string[]; // all matches when > 1 (for display)
}

const COMMANDS = [
  'help',
  '?',
  'ls',
  'll',
  'cd',
  'cat',
  'open',
  'man',
  'pwd',
  'clear',
  'exit',
  'whoami',
  'hint',
  'theme',
  'trace',
  'coffee',
  '..',
];

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix;
}

function completeCommand(partial: string): CompletionResult {
  const matches = COMMANDS.filter((c) => c.startsWith(partial));
  if (matches.length === 0) return { completed: partial, matches: [] };
  if (matches.length === 1) return { completed: matches[0] + ' ', matches: [] };
  const prefix = longestCommonPrefix(matches);
  return { completed: prefix, matches };
}

function completePath(
  cmdPrefix: string,
  partialArg: string,
  cwd: string,
  data: SiteTerminalData,
): CompletionResult {
  const lastSlash = partialArg.lastIndexOf('/');
  let baseArg: string;
  let stub: string;

  if (lastSlash === -1) {
    baseArg = '';
    stub = partialArg;
  } else {
    baseArg = partialArg.slice(0, lastSlash + 1);
    stub = partialArg.slice(lastSlash + 1);
  }

  // Resolve the base directory for listing
  // If baseArg is empty, list from cwd; otherwise resolve it
  const resolvedBase = baseArg
    ? (resolveCd(cwd, baseArg.replace(/\/$/, '') || '~') ?? null)
    : cwd;

  if (!resolvedBase || !isValidCwd(resolvedBase, data)) {
    return { completed: cmdPrefix + partialArg, matches: [] };
  }

  const entries = lsLines(resolvedBase, data);
  // Filter out hint lines like `(use cat to read)` and the error string
  const realEntries = entries.filter(
    (e) => !e.startsWith('(') && e !== 'ls: invalid cwd',
  );

  const matches = realEntries.filter((e) => e.startsWith(stub));
  if (matches.length === 0) return { completed: cmdPrefix + partialArg, matches: [] };
  if (matches.length === 1) {
    const entry = matches[0];
    // Directory entries already have trailing `/` — don't add another character.
    // File entries get a trailing space for ergonomics.
    const suffix = entry.endsWith('/') ? '' : ' ';
    return { completed: cmdPrefix + baseArg + entry + suffix, matches: [] };
  }
  const prefix = longestCommonPrefix(matches);
  return { completed: cmdPrefix + baseArg + prefix, matches };
}

export function getCompletion(
  inputValue: string,
  cwd: string,
  data: SiteTerminalData,
): CompletionResult {
  const spaceIdx = inputValue.indexOf(' ');

  // No space yet — complete the command name
  if (spaceIdx === -1) {
    return completeCommand(inputValue);
  }

  // Space found — complete the argument as a path
  const cmdPrefix = inputValue.slice(0, spaceIdx + 1);
  const argPart = inputValue.slice(spaceIdx + 1);
  return completePath(cmdPrefix, argPart, cwd, data);
}
