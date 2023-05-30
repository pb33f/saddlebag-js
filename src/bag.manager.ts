import {CreateBag} from "./saddlebag_engine.ts";
import {Bag} from "./saddlebag.ts";


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
}

class saddlebagManager implements BagManager {
    private _bags: Map<string, Bag<any>>;

    constructor() {
        this._bags = new Map<string, Bag<any>>();
    }

    createBag<T>(key: string): Bag<T> {
        const store: Bag<T> = CreateBag<T>();
        this._bags.set(key, store);
        return store;
    }

    getBag<T>(key: string): Bag<T> | undefined {
        if (this._bags.has(key)) {
            return this._bags.get(key);
        }
        return CreateBag<T>();
    }

    resetBags() {
        this._bags.forEach((store: Bag<any>) => {
            store.reset();
        });
    }
}

let _bagManagerSingleton: BagManager;

/**
 * CreateBagManager creates a singleton BagManager.
 * @returns {BagManager} the singleton BagManager
 */
export function CreateBagManager(): BagManager {
    if (!_bagManagerSingleton) {
        _bagManagerSingleton = new saddlebagManager();
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