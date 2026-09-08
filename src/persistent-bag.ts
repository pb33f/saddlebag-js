/** Capacity and database settings for a lazily loaded persistent Bag. */
export interface PersistentBagOptions {
    /** Maximum retained entries; zero disables storage. */
    maxEntries: number;
    /** Maximum sum of caller-declared payload bytes, excluding IndexedDB overhead. */
    maxBytes: number;
    /** Dedicated database name; defaults to saddlebag-persistent (separate from legacy Bags). */
    databaseName?: string;
}

/** An asynchronous Bag whose structured-cloneable values remain in IndexedDB until read. */
export interface PersistentBag<T> {
    /** Read one value without refreshing its eviction order or loading other entries. */
    get(key: string): Promise<T | undefined>;
    /**
     * Atomically replace an entry and evict oldest-written entries to fit this handle's limits.
     * Supply payload bytes explicitly (for example Blob.size). Returns false if it cannot fit;
     * in that case any old value at this key is removed, leaving unrelated entries intact.
     * Resolves after commit. Reads do not change eviction order. Values must be structured-cloneable.
     */
    set(key: string, value: T, sizeBytes: number): Promise<boolean>;
    /** Remove one key, resolving after commit. */
    delete(key: string): Promise<void>;
    /** Remove only this Bag's entries, resolving after commit. */
    clear(): Promise<void>;
    /** Release this handle's connection. Later operations reject; already started ones finish. */
    close(): void;
}

type Totals = { count: number; bytes: number; next: number };
type Entry = { size: number; order: number; bag: string };
type RequestReader = <V>(
    request: IDBRequest<V>,
    next: (value: V) => void,
) => void;
const STORES = ['values', 'entries', 'totals'];

function validSize(value: number): boolean {
    return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Open a persistent Bag without reading its contents. Bag IDs isolate records within a database.
 * Use consistent limits for handles sharing a Bag; each write applies the writing handle's limits.
 * Storage errors reject rather than silently falling back to memory. Connections close on upgrades.
 */
export function OpenPersistentBag<T>(
    id: string,
    options: PersistentBagOptions,
): Promise<PersistentBag<T>> {
    return new Promise((resolve, reject) => {
        const {
            maxEntries,
            maxBytes,
            databaseName = 'saddlebag-persistent',
        } = options;
        if (!validSize(maxEntries) || !validSize(maxBytes)) {
            throw new RangeError(
                'Persistent Bag limits must be non-negative safe integers',
            );
        }
        const opening = indexedDB.open(databaseName, 1);
        let blocked = false;
        opening.onblocked = () => {
            blocked = true;
            reject(new Error('Persistent Bag database open is blocked'));
        };
        opening.onerror = () => reject(opening.error);
        opening.onupgradeneeded = () => {
            const db = opening.result;
            db.createObjectStore('values');
            db.createObjectStore('entries').createIndex('order', [
                'bag',
                'order',
            ]);
            db.createObjectStore('totals');
        };
        opening.onsuccess = () => {
            const db = opening.result;
            if (blocked) {
                db.close();
                return;
            }
            db.onversionchange = () => db.close();
            const range = IDBKeyRange.bound([id], [id, []]);
            function transaction<R>(
                mode: IDBTransactionMode,
                body: (
                    tx: IDBTransaction,
                    read: RequestReader,
                    done: (value: R) => void,
                ) => void,
            ): Promise<R> {
                return new Promise((success, failure) => {
                    const tx = db.transaction(
                        mode === 'readonly' ? ['values'] : STORES,
                        mode,
                    );
                    let result: R;
                    let cause: unknown;
                    tx.oncomplete = () => success(result);
                    tx.onabort = () =>
                        failure(
                            cause ??
                                tx.error ??
                                new DOMException(
                                    'Transaction aborted',
                                    'AbortError',
                                ),
                        );
                    const guard = (action: () => void) => {
                        try {
                            action();
                        } catch (error) {
                            cause = error;
                            tx.abort();
                        }
                    };
                    const read: RequestReader = (request, next) => {
                        request.onsuccess = () =>
                            guard(() => next(request.result));
                    };
                    guard(() =>
                        body(tx, read, (value) => {
                            result = value;
                        }),
                    );
                });
            }
            function mutate(
                key: string,
                value: T,
                size: number,
                writing: boolean,
            ): Promise<boolean> {
                return transaction('readwrite', (tx, read, done) => {
                    const values = tx.objectStore('values');
                    const entries = tx.objectStore('entries');
                    const totals = tx.objectStore('totals');
                    const entryKey = [id, key];
                    read(totals.get(id), (saved: Totals | undefined) => {
                        const state = saved ?? { count: 0, bytes: 0, next: 0 };
                        read(
                            entries.get(entryKey),
                            (old: Entry | undefined) => {
                                if (old) {
                                    state.count--;
                                    state.bytes -= old.size;
                                    entries.delete(entryKey);
                                }
                                const retained =
                                    writing &&
                                    maxEntries > 0 &&
                                    size <= maxBytes;
                                if (old && !retained) values.delete(entryKey);
                                const save = () => {
                                    if (retained) {
                                        state.count++;
                                        state.bytes += size;
                                        values.put(value, entryKey);
                                        entries.put(
                                            {
                                                bag: id,
                                                order: state.next++,
                                                size,
                                            },
                                            entryKey,
                                        );
                                    }
                                    totals.put(state, id);
                                    done(retained);
                                };
                                // Subtraction keeps comparison exact even near MAX_SAFE_INTEGER.
                                const over = () =>
                                    retained &&
                                    (state.count >= maxEntries ||
                                        state.bytes > maxBytes - size);
                                if (!over()) {
                                    save();
                                    return;
                                }
                                const cursor = entries
                                    .index('order')
                                    .openCursor(range);
                                read(cursor, (item) => {
                                    if (!item || !over()) {
                                        save();
                                        return;
                                    }
                                    state.count--;
                                    state.bytes -= (item.value as Entry).size;
                                    values.delete(item.primaryKey);
                                    item.delete();
                                    item.continue();
                                });
                            },
                        );
                    });
                });
            }
            resolve({
                get: (key) =>
                    transaction('readonly', (tx, read, done) =>
                        read(tx.objectStore('values').get([id, key]), done),
                    ),
                set: (key, value, size) => {
                    if (!validSize(size))
                        return Promise.reject(
                            new RangeError(
                                'Payload size must be a non-negative safe integer',
                            ),
                        );
                    return mutate(key, value, size, true);
                },
                delete: (key) =>
                    mutate(key, undefined as T, 0, false).then(() => undefined),
                clear: () =>
                    transaction('readwrite', (tx, _read, done) => {
                        tx.objectStore('values').delete(range);
                        tx.objectStore('entries').delete(range);
                        tx.objectStore('totals').delete(id);
                        done(undefined);
                    }),
                close: () => db.close(),
            });
        };
    });
}
