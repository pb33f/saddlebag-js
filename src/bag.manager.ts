import {CreateBag, Bag} from "./saddlebag";

export interface BagManager {
    CreateBag<T>(key: string): Bag<T> | undefined;
    GetBag<T>(key: string): Bag<T> | undefined;
    ResetBags(): void;
}

class saddlebagManager implements BagManager {
    private _bags: Map<string, Bag<any>>;

    constructor() {
        this._bags = new Map<string, Bag<any>>();
    }

    CreateBag<T>(key: string): Bag<T> {
        const store: Bag<T> = CreateBag<T>();
        this._bags.set(key, store);
        return store;
    }

    GetBag<T>(key: string): Bag<T> | undefined {
        if (this._bags.has(key)) {
            return this._bags.get(key);
        }
        return CreateBag<T>();
    }

    ResetBags() {
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