import {CreateBag, Bag} from "./saddlebag";

export interface BagManager {
    CreateBag<T>(key: string): Bag<T>;
    GetBag<T>(key: string): Bag<T>;
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

    GetBag<T>(key: string): Bag<T> {
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

let _storeManagerSingleton: BagManager;
export function CreateStoreManager(): BagManager {
    if (!_storeManagerSingleton) {
        _storeManagerSingleton = new saddlebagManager();
    }
    return _storeManagerSingleton;
}

export function GetStoreManager(): BagManager {
   return CreateStoreManager();
}