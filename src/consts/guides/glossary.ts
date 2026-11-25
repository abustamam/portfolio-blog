// The glossary: the single source for the glossary page and the term popovers.
// `short` is the popover sentence (25 words at most). `why` shows on the
// glossary page only. `guide` is the guide that explains the term properly;
// omitted means the glossary is the only place it is explained.

export interface GlossaryTerm {
  /** Anchor on the glossary page. */
  id: string;
  /** Display form. */
  term: string;
  /** Synonyms that resolve to this entry. */
  also?: string[];
  /** The popover sentence, 25 words at most. */
  short: string;
  /** One sentence: why you would care (glossary page only). */
  why: string;
  /** Guide id that explains it properly; omitted = glossary only. */
  guide?: string;
  /** One of "the six you need first". */
  first?: boolean;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'ai',
    term: 'AI',
    also: ['artificial intelligence'],
    short: 'Here, a computer program that writes answers to what you type, in ordinary sentences.',
    why: 'Every guide here is about this one kind of program, so it helps to know what it is and what it is not.',
    guide: 'what-is-ai',
    first: true,
  },
  {
    id: 'chat-app',
    term: 'chat app',
    also: ['chatbot', 'AI app', 'assistant'],
    short: 'The app or website where you type to the AI and it writes back. ChatGPT, Gemini, Copilot and Claude are chat apps.',
    why: 'This is the thing you actually open and use, so most of the advice here is about how to use one well.',
    guide: 'what-is-ai',
    first: true,
  },
  {
    id: 'prompt',
    term: 'prompt',
    short: 'What you type to the AI: your question or instructions, and anything you paste in with them.',
    why: 'The answer you get depends a great deal on what you write, so a clearer prompt usually gives a better answer.',
    guide: 'prompt',
    first: true,
  },
  {
    id: 'model',
    term: 'model',
    short: 'The part that writes the answers. One app usually offers a few, from small and quick to large and careful.',
    why: 'Picking a different model in the same app can change how good, how slow and how limited your answers are.',
    guide: 'which-model',
    first: true,
  },
  {
    id: 'conversation',
    term: 'chat',
    also: ['conversation', 'thread'],
    short: 'One back-and-forth with the AI, from your first message to your last. A new chat starts from nothing.',
    why: 'The AI works from the chat you are in, so starting a new one for a new job keeps old messages from getting in the way.',
    guide: 'first-ten-minutes',
    first: true,
  },
  {
    id: 'usage-limit',
    term: 'usage limit',
    also: ['quota', 'allowance', 'cap', 'rate limit'],
    short: 'How much you can use the app before it asks you to wait or pay. It refills after a few hours or days.',
    why: 'If the app suddenly stops answering, this is usually the reason, and knowing it saves you from thinking something is broken.',
    guide: 'usage-limits',
    first: true,
  },
  {
    id: 'plan',
    term: 'plan',
    also: ['free plan', 'free tier', 'paid plan', 'subscription'],
    short: 'What your account includes. The free plan costs nothing and has smaller limits; a paid plan is a monthly charge for more.',
    why: 'It decides how much you can do before the app asks you to wait, and which models you can use, so check yours before you rely on the app for a task.',
    guide: 'usage-limits',
  },
  {
    id: 'context-window',
    term: 'context window',
    also: ['context'],
    short: 'How much of the conversation the AI can keep in view at once. Past that, the earliest parts drop out.',
    why: 'In a very long chat the AI can quietly lose what you said at the start, which is why it sometimes seems to forget.',
    guide: 'does-it-remember',
  },
  {
    id: 'memory',
    term: 'memory',
    also: ['saved memory', 'personalisation', 'personalization'],
    short: 'A setting that lets the app keep a few facts about you between chats. You can read, edit or turn it off.',
    why: 'It decides whether the app carries things about you from one chat to the next, so you should know whether it is on.',
    guide: 'does-it-remember',
  },
  {
    id: 'chat-history',
    term: 'chat history',
    also: ['past chats', 'history'],
    short: 'The list of your earlier chats, kept in your account so you can reopen or delete them.',
    why: 'Anything you typed may still be sitting in your account, so you can go back to it or remove it when you want.',
    guide: 'does-it-remember',
  },
  {
    id: 'token',
    term: 'token',
    short: 'The unit apps count usage in: a short word or a piece of a longer one. Long chats and big files use more.',
    why: 'It explains why a long chat or a big file uses up your limit faster than a short question does.',
    guide: 'usage-limits',
  },
  {
    id: 'hallucination',
    term: 'hallucination',
    also: ['making things up'],
    short: 'When the AI states something false as if it were true: an invented number, quote or source.',
    why: 'The AI can sound sure and still be wrong, so anything that matters needs checking before you use it.',
    guide: 'when-ai-is-wrong',
  },
  {
    id: 'attach',
    term: 'attach',
    also: ['upload'],
    short: 'Giving the AI a file or photo along with your message, usually with a paperclip or plus button.',
    why: 'It lets the AI work from your actual document or picture instead of your description of it, but it also means sharing that file.',
    guide: 'photos-files-voice',
  },
  {
    id: 'voice-mode',
    term: 'voice mode',
    also: ['voice', 'dictation'],
    short: 'Talking to the app instead of typing. Dictation turns speech into a typed message; voice mode answers out loud.',
    why: 'If typing is slow or awkward for you, speaking to the app can be the easier way to use it.',
    guide: 'photos-files-voice',
  },
  {
    id: 'thinking',
    term: 'thinking setting',
    also: ['reasoning', 'extended thinking'],
    short: 'A switch that makes the model work through a problem before answering. Slower, and it uses more of your limit.',
    why: 'It can give a better answer to a hard question, but you pay for it in waiting time and in your limit.',
    guide: 'which-model',
  },
  {
    id: 'agent',
    term: 'agent',
    short: 'An AI set up to carry out several steps on its own, such as searching, opening files and writing a result.',
    why: 'You will see this word in news and in app menus, and it means the AI is doing a job for you instead of just answering a question.',
  },
  {
    id: 'training-data',
    term: 'training data',
    also: ['training'],
    short: 'The writing a model learned its patterns from. It stops at a cut-off date, so the model may not know recent events.',
    why: 'It is why the AI can know a great deal and still be out of date on what happened recently.',
    guide: 'what-is-ai',
  },
  {
    id: 'llm',
    term: 'LLM',
    also: ['large language model'],
    short: 'The technical name for the kind of model behind chat apps. You can read it as "model".',
    why: 'You will meet this abbreviation in articles and product pages, and it just means the same kind of model that your chat app uses.',
    guide: 'what-is-ai',
  },
  {
    id: 'stochastic',
    term: 'stochastic',
    short: 'Involving chance. An AI app picks each next word with a little randomness, so the same question can get a different answer twice.',
    why: 'It explains why asking the same question twice does not always give the same answer.',
  },
  {
    id: 'temperature',
    term: 'temperature',
    short: 'The setting for how much chance goes into each word. Low keeps answers predictable; high makes them more varied. Chat apps set it for you.',
    why: "You'll see this word in app settings and articles about AI; it's one reason the same question can get a different answer twice.",
  },
  {
    id: 'project',
    term: 'project',
    also: ['projects', 'notebook', 'notebooks'],
    short: 'A saved space for one ongoing job. You give it instructions and files once, and every new chat inside it starts with them.',
    why: 'If you keep pasting the same background into new chats, a project saves you from doing it.',
    guide: 'projects',
  },
];

const norm = (s: string) => s.trim().toLowerCase();

/** Resolve a term, or any of its `also` synonyms, to its entry. Case-insensitive. */
export function findTerm(text: string): GlossaryTerm | undefined {
  const key = norm(text);
  if (!key) return undefined;
  return GLOSSARY.find((t) => norm(t.term) === key || (t.also ?? []).some((a) => norm(a) === key));
}
