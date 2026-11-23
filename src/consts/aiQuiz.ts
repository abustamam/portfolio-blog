// Where /ai-quiz sends responses. See docs/ai-quiz-setup.md.
//
// Production builds post to /api/ai-quiz on the same origin, which Caddy routes
// to the ai-quiz-intake service. Dev builds have no backend, so they default to
// "not collecting" and the quiz says so. PUBLIC_AI_QUIZ_ENDPOINT overrides both.
const DEFAULT_ENDPOINT = import.meta.env.PROD ? '/api/ai-quiz' : '';

export const AI_QUIZ_ENDPOINT: string = import.meta.env.PUBLIC_AI_QUIZ_ENDPOINT ?? DEFAULT_ENDPOINT;
