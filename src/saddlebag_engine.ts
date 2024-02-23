import {
    Bag,
    BagAllChangeSubscriptionFunction,
    BagPopulatedSubscriptionFunction,
    BagValueSubscriptionFunction, Subscription
} from "./saddlebag.ts";
import {BAG_OBJECT_STORE} from "./bag.manager.ts";

export function CreateBag<T>(id: string, stateful?: boolean): Bag<T> {
    return new bag<T>(id, stateful);
}

export class BagSubscription<T> {

    private readonly _allChangesBit: number;
    private _key: string;
    private _subFunction: BagValueSubscriptionFunction<T> | undefined;
    private _allChangesFunction: BagAllChangeSubscriptionFunction<T> | undefined;
    private _populatedFunction: BagPopulatedSubscriptionFunction<T> | undefined
    private readonly _bag: bag<T>;

    constructor(bag: bag<T>,
                allChangesBit: number) {
        this._bag = bag;
        this._allChangesBit = allChangesBit;
        this._key = '';
        this._subFunction = undefined;
        this._allChangesFunction = undefined
        this._populatedFunction = undefined;
    }

    set allChangeFunction(allChangesFunction: BagAllChangeSubscriptionFunction<T>) {
        this._allChangesFunction = allChangesFunction;
    }

    set populatedFunction(populatedFunction: BagPopulatedSubscriptionFunction<T>) {
        this._populatedFunction = populatedFunction;
    }

    set subscriptionFunction(subFunction: BagValueSubscriptionFunction<T>) {
        this._subFunction = subFunction;
    }

    set key(key: string) {
        this._key = key;
    }

    unsubscribe(): void {
        switch (this._allChangesBit) {
            case 0:
                const located = this._bag._subscriptions.get(this._key)
                if (located) {
                    this._bag._subscriptions.set(this._key,
                        located.filter((cb) => cb !== this._subFunction));
                }
                break;
            case 1:
                this._bag._allChangesSubscriptions =
                    this._bag._allChangesSubscriptions.filter((cb) => cb !== this._allChangesFunction);
                break;
            case 2:
                this._bag._storePopulatedSubscriptions =
                    this._bag._storePopulatedSubscriptions.filter((cb) => cb !== this._populatedFunction);
        }
    }
}

class bag<T> {
    private _id: string;
    private _stateful: boolean;
    private _values: Map<string, T>;
    private _db: IDBDatabase | undefined;
    private _bagStore: IDBObjectStore | undefined;

    _subscriptions: Map<string, BagValueSubscriptionFunction<T>[]>;
    _allChangesSubscriptions: BagAllChangeSubscriptionFunction<T>[];
    _storePopulatedSubscriptions: BagPopulatedSubscriptionFunction<T>[];

    constructor(id: string, stateful?: boolean) {
        this._values = new Map<string, T>();
        this._subscriptions = new Map<string, BagValueSubscriptionFunction<T>[]>()
        this._allChangesSubscriptions = [];
        this._storePopulatedSubscriptions = [];
        this._stateful = stateful || false;
        this._id = id;
    }

    set(key: string, value: T): void {
        this._values.set(key, structuredClone(value));
        this.alertSubscribers(key, value)

        if (this._stateful && this._db) {
            this._db.transaction([BAG_OBJECT_STORE], 'readwrite')
                .objectStore(BAG_OBJECT_STORE)
                .put(this._values, this._id);
        }
    }

    get id(): string {
        return this._id;
    }

    set db(db: IDBDatabase | undefined) {
        this._db = db;
    }

    reset(): void {
        // @ts-ignore
        this._values.forEach((value: T, key: string) => {
            this.alertSubscribers(key, undefined); // the value is gone!
        });
        this._values = new Map<string, T>();
    }

    private alertSubscribers(key: string, value: T | undefined): void {
        if (this._subscriptions.has(key)) {
            this._subscriptions.get(key)?.forEach(
                (callback: BagValueSubscriptionFunction<T>) => callback(value));
        }
        if (this._allChangesSubscriptions.length > 0) {
            this._allChangesSubscriptions.forEach(
                (callback: BagAllChangeSubscriptionFunction<T>) => callback(key, value));
        }
    }

    get(key: string): T | undefined {
        return this._values.get(key);
    }

    populate(data: Map<string, T>): void {
        if (data && data.size > 0) {
            this._values = structuredClone(data);
            if (this._storePopulatedSubscriptions.length > 0) {
                this._storePopulatedSubscriptions.forEach(
                    (callback: BagPopulatedSubscriptionFunction<T>) => callback(data));
            }
        }
    }

    export(): Map<string, T> {
        return this._values;
    }

    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription {
        if (!this._subscriptions.has(key)) {
            this._subscriptions.set(key, [callback]);
        } else {
            const existingSubscriptions = this._subscriptions.get(key);
            if (existingSubscriptions) {
                this._subscriptions.set(key, [...existingSubscriptions, callback]);
            }
        }

        const sub = new BagSubscription(this, 0);
        sub.key = key;
        sub.subscriptionFunction = callback;
        return sub;
    }

    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription {
        this._allChangesSubscriptions.push(callback);
        const sub = new BagSubscription(this, 1);
        sub.allChangeFunction = callback;
        return sub;
    }

    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): BagSubscription<T> {
        this._storePopulatedSubscriptions.push(callback);

        const sub = new BagSubscription(this, 2);
        sub.populatedFunction = callback;
        return sub;
    }
}




