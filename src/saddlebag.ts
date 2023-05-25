export type BagValueSubscriptionFunction<T> = (value: T) => void;
export type BagAllChangeSubscriptionFunction<T> = (key: string, value: T) => void;
export type BagPopulatedSubscriptionFunction<T> = (store: Map<string, T>) => void;

export interface Subscription {
    unsubscribe(): void
}
export interface Bag<T> {
    set(key: string, value: T): void;
    get(key: string): T;
    populate(data: Map<string, T>): void
    export(): Map<string, T>
    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription;
    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription;
    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription;
    reset(): void;
}

export function CreateBag<T>(): Bag<T> {
    return new bag<T>();
}

class bag<T> {
    private _values: Map<string, T>;
    private _subscriptions: Map<string, BagValueSubscriptionFunction<T>[]>;
    private _allChangesSubscriptions: BagAllChangeSubscriptionFunction<T>[];
    private _storePopulatedSubscriptions: BagPopulatedSubscriptionFunction<T>[];

    constructor() {
        this._values = new Map<string, T>();
        this._subscriptions = new Map<string, BagValueSubscriptionFunction<T>[]>()
        this._allChangesSubscriptions = [];
        this._storePopulatedSubscriptions = [];
    }

    set(key: string, value: T): void {
        this._values.set(key, value);
        this.alertSubscribers(key, value)
    }

    reset(): void {
        this._values.forEach((value: T, key: string) => {
            this.alertSubscribers(key, null); // the value is gone!
        });
        this._values = new Map<string, T>();
    }

    private alertSubscribers(key: string, value: T): void {
        if (this._subscriptions.has(key)) {
            this._subscriptions.get(key).forEach(
                (callback: BagValueSubscriptionFunction<T>) => callback(value));
        }
        if(this._allChangesSubscriptions.length > 0) {
            this._allChangesSubscriptions.forEach(
                (callback: BagAllChangeSubscriptionFunction<T>) => callback(key, value));
        }
    }

    get(key: string): T {
        return this._values.get(key);
    }

    populate(data: Map<string, T>): void {
        if (data && data.size > 0) {
            this._values = data;
            if(this._storePopulatedSubscriptions.length > 0) {
                this._storePopulatedSubscriptions.forEach(
                    (callback: BagPopulatedSubscriptionFunction<T>) => callback(data));
            }
        }
    }

    export(): Map<string, T> {
        return this._values
    }
    
    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription {
        if (!this._subscriptions.has(key)) {
            this._subscriptions.set(key, [callback]);
        } else {
            const existingSubscriptions: BagValueSubscriptionFunction<T>[] = this._subscriptions.get(key);
            this._subscriptions.set(key, [...existingSubscriptions, callback]);
        }
        return {
            unsubscribe() {
                this._subscriptions.set(key,
                    this._subscriptions.get(key).filter((cb) => cb !== callback));
            }
        };
    }

    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription {
        this._allChangesSubscriptions.push(callback);
        return {
            unsubscribe() {
                this._allChangesSubscriptions =
                    this._allChangesSubscriptions.filter((cb) => cb !== callback);
            }
        }
    }

    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription {
        this._storePopulatedSubscriptions.push(callback);
        return {
            unsubscribe() {
                this._storePopulatedSubscriptions =
                    this._storePopulatedSubscriptions.filter((cb) => cb !== callback);
            }
        }
    }

}




