// Where /ai-quiz sends responses. See docs/ai-quiz-setup.md.
//
// Paste the Apps Script web app URL (ends in /exec) into FALLBACK_ENDPOINT,
// or set PUBLIC_AI_QUIZ_ENDPOINT at build time (that wins when set).
// Empty means "not collecting yet": the quiz still works and tells the
// person their answers weren't sent.
const FALLBACK_ENDPOINT = '';

export const AI_QUIZ_ENDPOINT: string =
  import.meta.env.PUBLIC_AI_QUIZ_ENDPOINT || FALLBACK_ENDPOINT;
