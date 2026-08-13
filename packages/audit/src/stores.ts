/**
 * Storage adapters for the audit chain. Append-only semantics everywhere:
 * stores expose load() + append(); there is deliberately no update/delete.
 *
 *  - createMemoryStore      — tests, ephemeral sessions
 *  - createFileStore        — Node (JSONL file); loads lazily via dynamic import
 *  - createIndexedDbStore   — browser persistence (idb)
 */
import type { AuditEvent } from './chain.js';

export interface AuditStore {
  load(): Promise<readonly AuditEvent[]>;
  append(event: AuditEvent): Promise<void>;
}

export function createMemoryStore(initial: readonly AuditEvent[] = []): AuditStore {
  const events: AuditEvent[] = [...initial];
  return {
    async load() {
      return [...events];
    },
    async append(event: AuditEvent) {
      events.push(event);
    },
  };
}

/** Node-only JSONL file store. Throws in non-Node runtimes. */
export function createFileStore(filePath: string): AuditStore {
  let cache: AuditEvent[] | null = null;
  async function fs() {
    if (typeof process === 'undefined' || !process.versions?.node) {
      throw new Error('createFileStore is only available under Node.js');
    }
    return import('node:fs/promises');
  }
  return {
    async load() {
      if (cache) return [...cache];
      const { readFile } = await fs();
      try {
        const text = await readFile(filePath, 'utf8');
        cache = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => JSON.parse(l) as AuditEvent);
      } catch {
        cache = [];
      }
      return [...cache];
    },
    async append(event: AuditEvent) {
      const { appendFile, mkdir } = await fs();
      const dir = filePath.replace(/[/\\][^/\\]+$/, '');
      if (dir && dir !== filePath) await mkdir(dir, { recursive: true });
      await appendFile(filePath, JSON.stringify(event) + '\n', 'utf8');
      if (cache) cache.push(event);
    },
  };
}

/** Browser IndexedDB store (idb). Object store: 'events', keyPath 'eventId'. */
export function createIndexedDbStore(dbName = 'mamasafe-audit', storeName = 'events'): AuditStore {
  let dbPromise: Promise<import('idb').IDBPDatabase> | null = null;
  async function db() {
    if (!dbPromise) {
      const { openDB } = await import('idb');
      dbPromise = openDB(dbName, 1, {
        upgrade(d) {
          if (!d.objectStoreNames.contains(storeName)) {
            d.createObjectStore(storeName, { keyPath: 'eventId' });
          }
        },
      });
    }
    return dbPromise;
  }
  return {
    async load() {
      const d = await db();
      const all = (await d.getAll(storeName)) as AuditEvent[];
      // eventIds are random uuids, so key order ≠ chain order. Reconstruct
      // chain order by following previousEventHash links from GENESIS.
      const byPrev = new Map(all.map((e) => [e.previousEventHash, e]));
      const ordered: AuditEvent[] = [];
      let cursor: string | undefined = 'GENESIS';
      let next: AuditEvent | undefined;
      while ((next = cursor !== undefined ? byPrev.get(cursor) : undefined)) {
        ordered.push(next);
        cursor = next.eventHash;
      }
      // Any orphans (should not happen in append-only use) appended at the end.
      for (const e of all) if (!ordered.includes(e)) ordered.push(e);
      return ordered;
    },
    async append(event: AuditEvent) {
      const d = await db();
      await d.put(storeName, event);
    },
  };
}
