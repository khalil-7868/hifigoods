"use client";

/**
 * Offline write queue, backed by IndexedDB.
 *
 * Why IndexedDB rather than localStorage: receipts are `File`/`Blob` objects
 * and localStorage only holds strings. Base64-ing a 10 MB photo would blow the
 * ~5 MB quota on the first receipt.
 *
 * Why a hand-rolled wrapper rather than `idb`: this needs one object store and
 * four operations. The wrapper below is smaller than the dependency's README.
 *
 * Why an explicit queue rather than Background Sync: Background Sync is
 * Chromium-only, and it fires with no UI, so the operator gets no confirmation
 * that their expense ever landed. Here the queue is visible, counted in the
 * topbar, and flushed with toasts.
 */

const DB_NAME = "hifigoods-offline";
const DB_VERSION = 1;
const STORE = "pending-writes";

/** What kind of submission is queued — maps to a Server Action on flush. */
export type QueuedKind = "expenses" | "diesel";

export interface QueuedWrite {
  /** crypto.randomUUID, assigned client-side. */
  id: string;
  kind: QueuedKind;
  routeId: string;
  /** Human-readable summary for the pending list, e.g. "3 expenses · PKR 4,200". */
  label: string;
  /** Serialised form fields. Files are kept as Blobs with their filename. */
  fields: Record<string, string>;
  files: { name: string; fileName: string; blob: Blob }[];
  createdAt: number;
  /** Bumped each failed flush so a permanently-bad row can be surfaced. */
  attempts: number;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

/** IndexedDB is absent in SSR and blocked in some private-browsing modes. */
export function isQueueAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Splits a FormData into plain fields and Blobs so it survives IndexedDB.
 * Empty file inputs are dropped — they'd otherwise queue a 0-byte receipt.
 */
export function serializeFormData(formData: FormData): {
  fields: Record<string, string>;
  files: QueuedWrite["files"];
} {
  const fields: Record<string, string> = {};
  const files: QueuedWrite["files"] = [];

  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      if (value.size > 0) {
        files.push({ name, fileName: value.name, blob: value });
      }
    } else {
      fields[name] = value;
    }
  }

  return { fields, files };
}

/** Rebuilds a FormData for replay, restoring Blobs as named Files. */
export function deserializeFormData(entry: QueuedWrite): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entry.fields)) {
    formData.append(name, value);
  }
  for (const f of entry.files) {
    formData.append(f.name, new File([f.blob], f.fileName));
  }
  return formData;
}

export async function enqueue(
  entry: Omit<QueuedWrite, "id" | "createdAt" | "attempts">,
): Promise<QueuedWrite> {
  const record: QueuedWrite = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx("readwrite", (store) => store.add(record));
  notify();
  return record;
}

export async function listQueue(): Promise<QueuedWrite[]> {
  if (!isQueueAvailable()) return [];
  const all = await tx<QueuedWrite[]>("readonly", (store) => store.getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function countQueue(): Promise<number> {
  if (!isQueueAvailable()) return 0;
  return tx<number>("readonly", (store) => store.count());
}

export async function removeFromQueue(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id));
  notify();
}

export async function markFailed(id: string, error: string): Promise<void> {
  const existing = await tx<QueuedWrite | undefined>("readonly", (store) =>
    store.get(id),
  );
  if (!existing) return;
  await tx("readwrite", (store) =>
    store.put({
      ...existing,
      attempts: existing.attempts + 1,
      lastError: error,
    }),
  );
  notify();
}

export async function clearQueue(): Promise<void> {
  if (!isQueueAvailable()) return;
  await tx("readwrite", (store) => store.clear());
  notify();
}

/* -------------------------------------------------------------------------- */
/* Change notification                                                         */
/* -------------------------------------------------------------------------- */

const QUEUE_EVENT = "hifigoods:queue-changed";

/** Lets the topbar badge react without polling IndexedDB on a timer. */
function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_EVENT));
  }
}

export function onQueueChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}
