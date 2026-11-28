/**
 * Typed text for a one-line slot in a notification: every run of line breaks
 * and other control characters becomes one space, so nothing a person types
 * can start a new line. The stored row keeps the original text.
 */
export const oneLine = (s: string): string => s.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
