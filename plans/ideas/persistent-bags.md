# Lazy persistent Bags

## Outcome
Persist structured-cloneable values such as avatar Blobs across page reloads without eagerly hydrating every Bag or rewriting a complete Map. Preserve all existing synchronous Bag behavior. Reads must not cause writes. Bound retained entries and declared payload bytes; deletion and clear apply only to the selected Bag.

## Crushed design
The legacy stateful Bag snapshots the entire Map on each set and the manager loads every Bag. Extending that synchronous model would keep those costs. Add an independent asynchronous `OpenPersistentBag` API backed by a separate IndexedDB database; do not migrate or change existing Bags.

Use three stores: payloads keyed by Bag and key, small indexed entry metadata, and per-Bag counters. A single readwrite transaction replaces, accounts, and evicts oldest-written entries. Separate metadata prevents eviction from cloning unrelated Blobs. FIFO avoids LRU touch writes. Each set carries a caller-declared byte size (Blob.size for images); sizes measure payload, not browser overhead. IndexedDB serializes concurrent writes across handles and tabs. Reads fetch only the requested payload. Clear deletes Bag-scoped key ranges and its counters. Close releases the connection, while version changes automatically close obsolete connections.

Reject invalid capacities and sizes. Oversized entries remove any old value and return false without evicting unrelated entries. Resolve writes only on transaction completion; reject open, blocked, request, transaction and clone failures. No TTL, subscriptions, generic adapters, in-memory mirrors, network policy or automatic retry machinery.

## Verification
Use fake-indexeddb fixtures to prove reopen/Blob behavior, lazy and readonly reads, replacement/FIFO/byte and count limits, scoped clear, concurrent handles, failure rollback and lifecycle. Enforce 100% statements, branches, functions and lines for every new runtime module, retaining legacy tests. Build types and package. Validate a real-browser Blob reload when available. Independent correctness and de-slop reviews precede publication; leave the PR open.
