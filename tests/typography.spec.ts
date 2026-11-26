import { test, expect } from '@playwright/test';
import { curlQuotes } from '../src/utils/typography';

test.describe('curlQuotes', () => {
  const CASES: [string, string][] = [
    ["What's safe to paste into AI", 'What’s safe to paste into AI'],
    ['"You\'ve reached your limit"', '“You’ve reached your limit”'],
    ['He said "stop."', 'He said “stop.”'],
    // A letter outside ASCII before the apostrophe is still a letter.
    ["A résumé's first line", 'A résumé’s first line'],
    // An apostrophe that stands for dropped digits is not an opening quote.
    ["the '90s", 'the ’90s'],
    ["the dogs' bowls", 'the dogs’ bowls'],
    // A single-quoted phrase closes after its punctuation.
    ["'Hello.' she said", '‘Hello.’ she said'],
    // Already curled text is left alone.
    ['“You’ve reached your limit”', '“You’ve reached your limit”'],
    ['No quotes here', 'No quotes here'],
  ];
  for (const [input, want] of CASES) {
    test(`${input} -> ${want}`, () => {
      expect(curlQuotes(input)).toBe(want);
    });
  }
});
