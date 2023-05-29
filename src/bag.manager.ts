import {CreateBag} from "./saddlebag_engine.ts";
import {Bag} from "./saddlebag.ts";


export interface BagManager {
    createBag<T>(key: string): Bag<T> | undefined;
    getBag<T>(key: string): Bag<T> | undefined;
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
export function CreateBagManager(): BagManager {
    if (!_bagManagerSingleton) {
        _bagManagerSingleton = new saddlebagManager();
    }
    return _bagManagerSingleton;
}

export function GetBagManager(): BagManager {
   return CreateBagManager();
}