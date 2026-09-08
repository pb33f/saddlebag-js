import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { OpenPersistentBag } from './main';

beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('IDBKeyRange', IDBKeyRange);
});
const options = { maxEntries: 3, maxBytes: 10 };
const open = (id = 'a', limits = options) =>
    OpenPersistentBag<Blob>(id, limits);
const blob = (n: number) => new Blob(['x'.repeat(n)], { type: 'image/png' });

async function raw(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('saddlebag-persistent', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
describe('persistent Bags', () => {
    it('persists real Blob content across handles without eager reads or read writes', async () => {
        const first = await open();
        expect(await first.get('missing')).toBeUndefined();
        expect(await first.set('avatar', blob(4), 4)).toBe(true);
        first.close();
        const db = await raw();
        const prototype = Object.getPrototypeOf(db);
        const spy = vi.spyOn(prototype, 'transaction');
        const second = await open();
        expect(spy).not.toHaveBeenCalled();
        const saved = await second.get('avatar');
        expect(saved?.type).toBe('image/png');
        expect(await saved?.text()).toBe('xxxx');
        expect(spy).toHaveBeenCalledExactlyOnceWith(['values'], 'readonly');
        spy.mockRestore();
        db.close();
        second.close();
    });
    it('writes one payload per insertion and never loads payloads to evict', async () => {
        const bag = await open('avatars', { maxEntries: 100, maxBytes: 100 });
        const db = await raw();
        const store = db.transaction('values').objectStore('values');
        const prototype = Object.getPrototypeOf(store);
        const put = vi.spyOn(prototype, 'put');
        const get = vi.spyOn(prototype, 'get');
        const cursor = vi.spyOn(prototype, 'openCursor');
        for (let i = 0; i < 1000; i++) await bag.set(String(i), blob(1), 1);
        expect(
            put.mock.contexts.filter(
                (store: IDBObjectStore) => store.name === 'values',
            ),
        ).toHaveLength(1000);
        expect(
            get.mock.contexts.filter(
                (store: IDBObjectStore) => store.name === 'values',
            ),
        ).toHaveLength(0);
        expect(
            cursor.mock.contexts.filter(
                (store: IDBObjectStore) => store.name === 'values',
            ),
        ).toHaveLength(0);
        put.mockRestore();
        get.mockRestore();
        cursor.mockRestore();
        expect(await bag.get('899')).toBeUndefined();
        expect((await bag.get('900'))?.size).toBe(1);
        db.close();
        bag.close();
    });

    it('enforces FIFO count limits and refreshes only on writes', async () => {
        const bag = await open('a', { maxEntries: 2, maxBytes: 99 });
        await bag.set('a', blob(1), 1);
        await bag.set('b', blob(1), 1);
        await bag.get('a');
        await bag.set('c', blob(1), 1);
        expect(await bag.get('a')).toBeUndefined();
        await bag.set('b', blob(2), 2);
        await bag.set('d', blob(1), 1);
        expect(await bag.get('c')).toBeUndefined();
        expect((await bag.get('b'))?.size).toBe(2);
        bag.close();
    });
    it('evicts multiple metadata entries for byte limits and accounts deletes/replacements', async () => {
        const bag = await open();
        await bag.set('a', blob(3), 3);
        await bag.set('b', blob(3), 3);
        await bag.set('c', blob(3), 3);
        await bag.set('d', blob(8), 8);
        expect(await bag.get('a')).toBeUndefined();
        expect(await bag.get('b')).toBeUndefined();
        expect(await bag.get('c')).toBeUndefined();
        await bag.delete('d');
        await bag.delete('missing');
        await bag.set('a', blob(10), 10);
        await bag.set('a', blob(1), 1);
        await bag.set('b', blob(9), 9);
        expect((await bag.get('a'))?.size).toBe(1);
        expect((await bag.get('b'))?.size).toBe(9);
        bag.close();
    });
    it('rejects oversized replacements without evicting unrelated entries', async () => {
        const bag = await open();
        await bag.set('a', blob(1), 1);
        await bag.set('b', blob(1), 1);
        expect(await bag.set('a', blob(11), 11)).toBe(false);
        expect(await bag.get('a')).toBeUndefined();
        expect((await bag.get('b'))?.size).toBe(1);
        const disabled = await open('a', { maxEntries: 0, maxBytes: 0 });
        expect(await disabled.set('b', blob(0), 0)).toBe(false);
        expect(await bag.get('b')).toBeUndefined();
        bag.close();
        disabled.close();
    });
    it('allows empty payloads at zero bytes and large exact sizes', async () => {
        const zero = await open('zero', { maxEntries: 1, maxBytes: 0 });
        expect(await zero.set('', blob(0), 0)).toBe(true);
        zero.close();
        const bag = await OpenPersistentBag<string>('large', {
            maxEntries: 3,
            maxBytes: Number.MAX_SAFE_INTEGER,
        });
        await bag.set('a', 'a', Number.MAX_SAFE_INTEGER - 1);
        await bag.set('b', 'b', 2);
        expect(await bag.get('a')).toBeUndefined();
        expect(await bag.get('b')).toBe('b');
        bag.close();
    });
    it('isolates Bags, custom databases and scoped clear including queued writes', async () => {
        const a = await open('a');
        const b = await open('a\u0000');
        const other = await OpenPersistentBag<Blob>('a', {
            ...options,
            databaseName: 'other',
        });
        await b.set('x', blob(2), 2);
        await other.set('x', blob(3), 3);
        const writing = a.set('x', blob(1), 1);
        const clearing = a.clear();
        await Promise.all([writing, clearing]);
        expect(await a.get('x')).toBeUndefined();
        expect((await b.get('x'))?.size).toBe(2);
        expect((await other.get('x'))?.size).toBe(3);
        await a.clear();
        await a.set('new', blob(10), 10);
        expect((await a.get('new'))?.size).toBe(10);
        a.close();
        b.close();
        other.close();
    });
    it('serializes concurrent handles without losing counters or exceeding capacity', async () => {
        const a = await open();
        const b = await open();
        await Promise.all(
            Array.from({ length: 20 }, (_, i) =>
                (i % 2 ? a : b).set(String(i), blob(4), 4),
            ),
        );
        const found = (
            await Promise.all(
                Array.from({ length: 20 }, (_, i) => a.get(String(i))),
            )
        ).filter(Boolean);
        expect(found).toHaveLength(2);
        expect((await a.get('19'))?.size).toBe(4);
        a.close();
        b.close();
    });
    it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
        'rejects invalid capacities and payload size %s',
        async (size) => {
            await expect(
                open('a', { maxEntries: size, maxBytes: 1 }),
            ).rejects.toThrow(RangeError);
            await expect(
                open('a', { maxEntries: 1, maxBytes: size }),
            ).rejects.toThrow(RangeError);
            const bag = await open();
            await expect(bag.set('a', blob(1), size)).rejects.toThrow(
                RangeError,
            );
            bag.close();
        },
    );
    it('rejects unavailable storage and closed handles', async () => {
        vi.stubGlobal('indexedDB', undefined);
        await expect(open()).rejects.toThrow();
        vi.stubGlobal('indexedDB', new IDBFactory());
        const bag = await open();
        bag.close();
        bag.close();
        await expect(bag.get('x')).rejects.toThrow();
        await expect(bag.clear()).rejects.toThrow();
    });
    it('rolls back replacement and eviction when a payload cannot be cloned', async () => {
        const bag = await OpenPersistentBag<unknown>('a', options);
        await bag.set('old', blob(10), 10);
        await expect(bag.set('bad', () => {}, 10)).rejects.toMatchObject({
            name: 'DataCloneError',
        });
        expect(((await bag.get('old')) as Blob).size).toBe(10);
        expect(await bag.get('bad')).toBeUndefined();
        bag.close();
    });
    it('closes automatically when another connection upgrades the database', async () => {
        const bag = await open();
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('saddlebag-persistent', 2);
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
        await expect(bag.get('x')).rejects.toThrow();
        await expect(open()).rejects.toMatchObject({ name: 'VersionError' });
    });
    it('rejects blocked opens and closes the eventual abandoned connection', async () => {
        const fake = {
            onblocked: null,
            onerror: null,
            onupgradeneeded: null,
            onsuccess: null,
            result: { close: vi.fn() },
        };
        vi.stubGlobal('indexedDB', { open: () => fake });
        const pending = open();
        (fake.onblocked as unknown as () => void)();
        await expect(pending).rejects.toThrow('blocked');
        (fake.onsuccess as unknown as () => void)();
        expect(fake.result.close).toHaveBeenCalledOnce();
    });
    it('rejects transaction aborts even when no request error exists', async () => {
        const bag = await open();
        const db = await raw();
        const prototype = Object.getPrototypeOf(db);
        const original = prototype.transaction;
        const spy = vi
            .spyOn(prototype, 'transaction')
            .mockImplementation(function (
                this: IDBDatabase,
                ...args: unknown[]
            ) {
                const tx = original.apply(this, args);
                queueMicrotask(() => tx.abort());
                return tx;
            });
        await expect(bag.get('x')).rejects.toMatchObject({
            name: 'AbortError',
        });
        spy.mockRestore();
        db.close();
        bag.close();
    });
    it('rejects asynchronous request errors and rolls back counters', async () => {
        const bag = await open();
        const db = await raw();
        await bag.set('old', blob(1), 1);
        const store = db.transaction('values').objectStore('values');
        const prototype = Object.getPrototypeOf(store);
        const original = prototype.put;
        const spy = vi.spyOn(prototype, 'put').mockImplementation(function (
            this: IDBObjectStore,
            value: unknown,
            key: IDBValidKey,
        ) {
            return this.name === 'values'
                ? this.add(value, ['a', 'old'])
                : original.call(this, value, key);
        });
        await expect(bag.set('bad', blob(1), 1)).rejects.toMatchObject({
            name: 'ConstraintError',
        });
        spy.mockRestore();
        expect(await bag.get('bad')).toBeUndefined();
        expect((await bag.get('old'))?.size).toBe(1);
        db.close();
        bag.close();
    });
});
