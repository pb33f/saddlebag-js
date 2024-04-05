import {CreateBag} from "./saddlebag_engine.js";
import {Bag} from "./saddlebag.js";


export const BAG_OBJECT_STORE = 'bags';
export const BAG_DB_NAME = 'saddlebag';

/**
 * BagManager is a singleton that manages all the bags in the application.
 */
export interface BagManager {
    /**
     * Create a bag with the given key.
     * @param {string} key to use when referencing the bag
     * @return {Bag} the bag that was created
     */
    createBag<T>(key: string): Bag<T> | undefined;

    /**
     * Get a bag with the given key. If the bag does
     * not exist, then it will be created.
     * @param key to use when referencing the bag
     * @return {Bag} the bag that was requested
     */
    getBag<T>(key: string): Bag<T> | undefined;

    /**
     * Reset all bags to their initial state.
     */
    resetBags(): void;

    /**
     * Load all stateful bags from IndexedDB.
     * @return {Promise<BagDB>} a promise that resolves when all bags are loaded
     */
    loadStatefulBags(): Promise<BagDB>;

    /**
     * Get the indexedDB database
     * @return {IDBDatabase | null} the indexedDB database
     */
    get db(): IDBDatabase | null;

}

export interface BagDB  {
    db: IDBDatabase | undefined;
}

class saddlebagManager implements BagManager {
    private _bags: Map<string, Bag<any>>;
    private readonly _stateful: boolean;
    private _db: IDBDatabase | undefined

    constructor(stateful: boolean) {
        this._bags = new Map<string, Bag<any>>();
        this._stateful = stateful;
    }

    loadStatefulBags(): Promise<BagDB> {
        return new Promise<BagDB>((resolve) => {
            const request = indexedDB.open(BAG_DB_NAME, 1);
            request.onupgradeneeded = () => {
                // @ts-ignore
                this._db = request.result
                this._db.createObjectStore(BAG_OBJECT_STORE);
            };

            request.onsuccess = () => {
                // @ts-ignore
                this._db = request.result

                if (this._db) {
                    const tx =  this._db.transaction(BAG_OBJECT_STORE)
                    const cursor = tx.objectStore(BAG_OBJECT_STORE).openCursor()

                    cursor.onsuccess = (event) => {
                        // @ts-ignore
                        let cursor = event.target.result;
                        if (cursor) {
                            let key = cursor.primaryKey;
                            let value = cursor.value;
                            const bag = this.createBag(key);
                            bag.populate(value);
                            this._bags.set(key, bag);
                            cursor.continue();
                        } else {
                            resolve({db: this._db});
                        }
                    }
                }
            }
        })
    }

    get db(): IDBDatabase | null {
        if (this._db) {
            return this._db;
        }
        return null;
    }

    createBag<T>(key: string): Bag<T> {
        const bag: Bag<T> = CreateBag<T>(key, this._stateful);
        bag.db = this._db;
        this._bags.set(key, bag);
        return bag;
    }

    getBag<T>(key: string): Bag<T> | undefined {
        if (this._bags.has(key)) {
            return this._bags.get(key);
        }
        return this.createBag(key)
    }

    resetBags() {
        this._bags.forEach((bag: Bag<any>) => {
            bag.reset();
        });
    }
}

let _bagManagerSingleton: BagManager;

/**
 * CreateBagManager creates a singleton BagManager.
 * @returns {BagManager} the singleton BagManager
 */
export function CreateBagManager(stateful?: boolean): BagManager {
    if (!_bagManagerSingleton) {
        _bagManagerSingleton = new saddlebagManager(stateful || false);
    }
    return _bagManagerSingleton;
}

/**
 * GetBagManager returns the singleton BagManager.
 * @returns {BagManager} the singleton BagManager
 */
export function GetBagManager(): BagManager {
   return CreateBagManager();
}