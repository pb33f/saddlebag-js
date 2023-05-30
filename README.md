# saddlebag

A tiny library for creating and managing stores and
state in any JavaScript Application running anywhere.

It is less than 1kb when gzipped and 3kb when minified.

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

`saddlebag` A product of [pb33f](https://pb33f.io).
