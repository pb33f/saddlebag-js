# saddlebag

A tiny library for creating and managing stores and
state in any JavaScript Application running anywhere.

The build reports the current minified and gzipped bundle sizes.

It's called '_saddlebag_' because every cowboy needs a reliable and simple place to store their stuff.

`saddlebag` is built in TypeScript and has full type support.

---

`saddlebag` has two parts:

- `bags`
- `bag manager`

---

## Installation

npm:
```bash
npm install @pb33f/saddlebag
```

yarn:
```bash
yarn add @pb33f/saddlebag
```
---
## A quick summary of saddlebag

A `bag` is a store that holds state. A `bag manager` creates `bags` and provides
access to them from anywhere in the application.

`bag manager` is a singleton, only one manager can exist.

A `bag` is just a key-value `Map`. The values can be any object or primitive.

A `bag` can be subscribed to. When state changes in the `bag`, the subscribers will
be notified and passed the updated state.

There are three event types that can be subscribed to:

- When any individual value is updated.
- When any value is updated.
- When the `bag` is populated with initial state.

In order to subscribe to one of these event types, a callback function
must be provided. The callback function will be passed the updated state
when the event occurs.

A `bag` can be unsubscribed from when state is no-longer needed.

A `bag` can be cleared of all state and all subscribers can be notified using
the `reset()` method.

The `bag manager` holds `bag` instances as another 'key-value' `Map`. 

> Yes, this is a `Map` of `Map` instances (_bags_).

Only **one** instance of a bag with a given key can exist in the `bag manager`.

The `bag manager` can clear all state from all `bags` and notify all subscribers
using the `resetBags()` method.

---

## Stateful bags

When creating a `bag manager`, you can make it `stateful` by passing `true` to `CreateBagManager(true)`. All
bags created will then be 'fused' with a entry in `IndexedDB` in the browser.

A new tabled named `saddlebag` will be added, combined with a table called `bags`

Each write via `set` on a bag, will also write to the DB, and when you reload your browser, `saddlebag` can 
restore state to each bag automatically using the `loadStatefulBags()` method on your `bag manager`. 

A Promise is returned that resolves once all state is loaded and ready and your bags are loaded and ready hit the trail.

---

## Basic Use

All imports are exposed as named exports via `@pb33f/saddlebag`.

Import the `bag manager` and create an instance of it.

```typescript
import {Bag, BagManager, CreateBagManager} from "@pb33f/saddlebag";

const bagManager = CreateBagManager();
```

Create a `bag` using the `bag manager` instance.

```typescript  
const bag = bagManager.createBag<string>('foo');

// set a value for the key 'foo'
bag.set("foo", "bar");

```

Subscribe to a `bag` using the `subscribe()` method.

```typescript
const handleUpdate = (state: string) => {
  console.log('value changed:', state);
}

const subcription = bag.subscribe('foo', handleUpdate);
```

Update the value of a key in the `bag` using the `set()` method.

```typescript
bag.set('foo', 'baz');
```
And the console should output:

```
value changed: baz
```

To unsubscribe from a `bag`, use the `unsubscribe()` method
of the `Subscription` instance returned from the `subscribe()` method.

```typescript
subcription.unsubscribe();
```

## Listening for all state updates

To listen for all state updates in a `bag`, use the `onAllChanges()` method.

This method only takes a callback function, no key required as all keys will
trigger the event.

```typescript
const subcription = bag.onAllChanges(handleUpdate);
```

## Populating a store with initial state

If you already have the data you want to store, you can populate the `bag`
by simply passing a `Map<string, any>` to the `populate()` method. 

This map will contain the key-value pairs to be stored.

```typescript
const data = new Map<string, string>([["foo","bar"],["cake","burger"],["nugget","bucket"]]);
bag.populate(data);
```

### Listening for populated events

To listen for the `bag` being populated with initial state, use the `onPopulated()` method
of the `bag` instance.

```typescript
const subscription = bag.onPopulated((initialState) => {
            // do something...
        });
```

## Exporting the contents of a `bag`

Want to dump the data into something or somewhere else? Use the `export()` method.

```typescript
const bagData = bag.export();
```

## Getting an existing `bag` from the `bag manager`

If you already have a `bag` and want to get it from the `bag manager`, use the `getBag()` method.

```typescript
const bag = bagManager.getBag<string>('foo');
```

---

## Loading stateful bags

If the `bag manager` was created as a stateful one, then use the `loadStatefulBags()` to populate from IndexedDB.

```typescript
bagManager.loadStatefulBags().then(() => {
    // do something fun.
    ...
});
```

A promise is returned that resolves once all data is populated in all bags. 

The values for the DB/Store name in IndexedDB

```typescript
export const BAG_OBJECT_STORE = 'bags';
export const BAG_DB_NAME = 'saddlebag';
```

`saddlebag` A product of [pb33f](https://pb33f.io).

## Lazy persistent Bags

`OpenPersistentBag` stores individual structured-cloneable values in IndexedDB.
Opening a Bag does not restore its contents into memory, and reading an entry
does not write anything. The existing synchronous `CreateBag` and Bag manager
APIs remain unchanged; their stateful snapshots are separate from this API.

```ts
import { OpenPersistentBag } from '@pb33f/saddlebag';

const avatars = await OpenPersistentBag<Blob>('avatars', {
    maxEntries: 4096,
    maxBytes: 256 * 1024 * 1024,
    databaseName: 'my-app-avatar-cache',
});

const key = '/avatars/person/image-checksum';
let image = await avatars.get(key);
if (!image) {
    image = await (await fetch(key)).blob();
    await avatars.set(key, image, image.size);
}
// Create/revoke object URLs in the UI; store the Blob, never an object URL.
await avatars.delete(key);
await avatars.clear(); // Only this Bag, including its size accounting.
avatars.close();
```

- `get` resolves with the requested value or `undefined` after a readonly
  transaction. There is no eager loading, in-memory mirror, or TTL.
- `set` takes an explicit non-negative safe-integer payload size. For Blobs use
  `Blob.size`. Limits count these declared bytes, not IndexedDB's physical
  storage overhead; callers must provide accurate sizes.
- Writes evict the oldest-written entries until both byte and entry limits fit.
  Updating an existing entry refreshes its order; reads leave the order intact.
  This avoids disk writes for hot reads. An entry that cannot fit removes any
  previous value at that key and resolves `false`, without evicting other keys.
  Zero entry capacity disables retention; zero byte capacity permits empty values.
- Each write updates payloads, small eviction metadata and counters in one
  transaction. Concurrent tabs/handles cannot lose accounting updates. Use the
  same limits for handles sharing a Bag: each write applies that handle's limits,
  and opening with lower limits alone does not evict existing data.
- `set`, `delete` and `clear` resolve only after commit. Errors, including quota,
  clone, blocked-open and unavailable-storage errors, reject the operation.
  Applications decide how to fall back when persistence is unavailable.
- Bag IDs isolate entries within the database. The default database name is
  `saddlebag-persistent`; custom names must be dedicated to this API. This API
  does not migrate or read legacy stateful Bags.
- `close` releases the connection. Started transactions finish, later operations
  reject, and database upgrades close the handle automatically.
- `clear` runs after earlier writes. Before clearing on logout, stop producers
  from initiating further writes and await the clear; a later `set` can otherwise
  populate the Bag again. Authentication, key scoping, logout coordination and
  object-URL lifetime belong to the application.

Values must be structured-cloneable; Promises and functions are not supported.
The browser may evict IndexedDB data, so a persistent Bag should be treated as a
cache when its values can be fetched again.
