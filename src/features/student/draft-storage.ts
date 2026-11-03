import type { NeedDraft } from './types';

interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}

// Queue writes so a slow autosave cannot resurrect a discarded/submitted draft.
export function createNeedDraftStorage(storage: Storage, ownerId: string) {
  const key = `dongulab:need-draft:v1:${ownerId}`;
  let pending: Promise<unknown> = Promise.resolve();
  const enqueue = (action: () => Promise<unknown>) => {
    const result = pending.then(action, action);
    pending = result.catch(() => {});
    return result;
  };
  return {
    async load(fallback: NeedDraft): Promise<NeedDraft> {
      await pending;
      const raw = await storage.getItem(key);
      if (!raw) return { ...fallback };
      try {
        const value = JSON.parse(raw);
        if (!value || Object.keys(fallback).some(field => typeof value[field] !== 'string') ||
          !['wood', 'metal', 'plastic'].includes(value.materialType)) return { ...fallback };
        return Object.fromEntries(Object.keys(fallback).map(field => [field, value[field]])) as unknown as NeedDraft;
      } catch { return { ...fallback }; }
    },
    save(draft: NeedDraft) {
      const raw = JSON.stringify(draft);
      return enqueue(() => storage.setItem(key, raw));
    },
    clear() { return enqueue(() => storage.removeItem(key)); },
  };
}
