// Browser storage for the free AI guides (/ai-guides/). Every guide that
// remembers something goes through here, so there is one key to inspect and
// one place to clear.
//
// - One namespaced localStorage key holding versioned JSON.
// - No cookies, no network: nothing stored here leaves the browser.
// - Every call is safe when storage is missing, blocked or throws (private
//   mode, quota, disabled site data): reads fall back to empty, writes are
//   dropped, and nothing throws to the caller.

export const GUIDE_STORE_KEY = 'bustamam.ai-guides';
export const GUIDE_STORE_VERSION = 1;

export interface GuideStoreData {
  v: typeof GUIDE_STORE_VERSION;
  /** A saved draft per interactive tool, keyed by the tool's storage key. */
  drafts: Record<string, unknown>;
  /** Guide ids (the collection id, e.g. "never-paste") in the order first opened. */
  visited: string[];
  /** The reader's chosen field ("I'm a…"), or null when not chosen. */
  field: string | null;
}

/** The subset of the Web Storage API this module uses. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const empty = (): GuideStoreData => ({ v: GUIDE_STORE_VERSION, drafts: {}, visited: [], field: null });

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Parse stored JSON; anything unreadable or from another version starts fresh. */
export function parseGuideStore(raw: string | null): GuideStoreData {
  if (!raw) return empty();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty();
  }
  if (!isRecord(data) || data.v !== GUIDE_STORE_VERSION) return empty();
  return {
    v: GUIDE_STORE_VERSION,
    drafts: isRecord(data.drafts) ? data.drafts : {},
    visited: Array.isArray(data.visited) ? data.visited.filter((x): x is string => typeof x === 'string') : [],
    field: typeof data.field === 'string' ? data.field : null,
  };
}

function defaultStorage(): StorageLike | null {
  try {
    // Reading `localStorage` itself throws a SecurityError when site data is blocked.
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createGuideStore(getStorage: () => StorageLike | null = defaultStorage) {
  const storage = () => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  const read = (): GuideStoreData => {
    try {
      return parseGuideStore(storage()?.getItem(GUIDE_STORE_KEY) ?? null);
    } catch {
      return empty();
    }
  };

  /** Apply `change` to the stored data and save it. Returns false when it could not be saved. */
  const write = (change: (d: GuideStoreData) => void): boolean => {
    try {
      const s = storage();
      if (!s) return false;
      const d = read();
      change(d);
      s.setItem(GUIDE_STORE_KEY, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  };

  return {
    /** The saved draft for a tool, or null. The caller checks its shape. */
    getDraft<T = unknown>(tool: string): T | null {
      const d = read().drafts[tool];
      return d === undefined ? null : (d as T);
    },
    /** Save a tool's draft. The value must survive JSON (strings, numbers, plain objects, arrays). */
    setDraft(tool: string, value: unknown): boolean {
      return write((d) => {
        d.drafts[tool] = value;
      });
    },
    clearDraft(tool: string): boolean {
      return write((d) => {
        delete d.drafts[tool];
      });
    },

    getVisited(): string[] {
      return read().visited;
    },
    hasVisited(id: string): boolean {
      return read().visited.includes(id);
    },
    markVisited(id: string): boolean {
      return write((d) => {
        if (!d.visited.includes(id)) d.visited.push(id);
      });
    },
    clearVisited(): boolean {
      return write((d) => {
        d.visited = [];
      });
    },

    getField(): string | null {
      return read().field;
    },
    /** Save the reader's field; null clears it. */
    setField(field: string | null): boolean {
      return write((d) => {
        d.field = field;
      });
    },

    /** Remove everything this module stored. */
    clearAll(): boolean {
      try {
        const s = storage();
        if (!s) return false;
        s.removeItem(GUIDE_STORE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type GuideStore = ReturnType<typeof createGuideStore>;

/** The store backed by the page's localStorage. Import this from components. */
export const guideStore: GuideStore = createGuideStore();
