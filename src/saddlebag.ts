export type BagValueSubscriptionFunction<T> = (value: T | undefined) => void;
export type BagAllChangeSubscriptionFunction<T> = (key: string, value: T | undefined) => void;
export type BagPopulatedSubscriptionFunction<T> = (store: Map<string, T>| undefined) => void;


export class Subscription<T> {

    private readonly _subscriptions: Map<string, BagValueSubscriptionFunction<T>[]>;
    private  _allChangesSubscriptions: BagAllChangeSubscriptionFunction<T>[];
    private readonly _allChangesBit: number;
    private readonly _key: string;
    private readonly _subFunction: BagValueSubscriptionFunction<T>;
    private readonly _allChangesFunction: BagAllChangeSubscriptionFunction<T>;
    private readonly _populatedFunction: BagPopulatedSubscriptionFunction<T>;
    private _storePopulatedSubscriptions: BagPopulatedSubscriptionFunction<T>[];

    constructor(subs: Map<string, BagValueSubscriptionFunction<T>[]>,
                allChangesSubs: BagAllChangeSubscriptionFunction<T>[],
                storePopulatedSubscriptions: BagPopulatedSubscriptionFunction<T>[],
                subFunction: BagValueSubscriptionFunction<T>,
                allChangesFunction: BagAllChangeSubscriptionFunction<T>,
                populatedFunction: BagPopulatedSubscriptionFunction<T>,
                key: string,
                allChangesBit: number) {
        this._subscriptions = subs;
        this._allChangesSubscriptions = allChangesSubs;
        this._allChangesBit = allChangesBit;
        this._key = key
        this._subFunction = subFunction;
        this._allChangesFunction = allChangesFunction;
        this._storePopulatedSubscriptions = storePopulatedSubscriptions;
        this._populatedFunction = populatedFunction;
    }
    unsubscribe(): void {

        switch (this._allChangesBit) {
            case 0:
                const located = this._subscriptions.get(this._key)
                if (located) {
                    this._subscriptions.set(this._key,
                        located.filter((cb) => cb !== this._subFunction));
                }
                break;
            case 1:
                this._allChangesSubscriptions =
                    this._allChangesSubscriptions.filter((cb) => cb !== this._allChangesFunction);
                break;
            case 2:
                this._storePopulatedSubscriptions =
                    this._storePopulatedSubscriptions.filter((cb) => cb !== this._populatedFunction);


        }

        if (this._allChangesBit == 0)  {


        } else {


        }
    }
}


export interface Bag<T> {
    set(key: string, value: T): void;
    get(key: string): T | undefined;
    populate(data: Map<string, T>): void
    export(): Map<string, T>
    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription<T>;
    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription<T>;
    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription<T>;
    reset(): void;
}




export function CreateBag<T>(): Bag<T> {
    return new bag<T>();
}

class bag<T> {
    private _values: Map<string, T>;
    private readonly _subscriptions: Map<string, BagValueSubscriptionFunction<T>[]>;
    private readonly _allChangesSubscriptions: BagAllChangeSubscriptionFunction<T>[];
    private readonly _storePopulatedSubscriptions: BagPopulatedSubscriptionFunction<T>[];

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
        if(this._allChangesSubscriptions.length > 0) {
            this._allChangesSubscriptions.forEach(
                (callback: BagAllChangeSubscriptionFunction<T>) => callback(key, value));
        }
    }

    get(key: string): T | undefined {
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
    
    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription<T> {
        if (!this._subscriptions.has(key)) {
            this._subscriptions.set(key, [callback]);
        } else {
            const existingSubscriptions = this._subscriptions.get(key);
            if (existingSubscriptions) {
                this._subscriptions.set(key, [...existingSubscriptions, callback]);
            }
        }

        return new Subscription(
            this._subscriptions,
            this._allChangesSubscriptions,
            this._storePopulatedSubscriptions,
            callback,
            ()=>{},
            ()=>{},
            key,
            0);



        // return {
        //
        //
        //     unsubscribe() {
        //         this._subscriptions.set(key,
        //             this._subscriptions.get(key).filter((cb) => cb !== callback));
        //     }
        // };
    }

    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription<T> {
        this._allChangesSubscriptions.push(callback);


        return new Subscription(
            this._subscriptions,
            this._allChangesSubscriptions,
            this._storePopulatedSubscriptions,
            ()=>{},
            callback,
            ()=>{},
            '',
            1);



        //return new Subscription(this._subscriptions,this._allChangesSubscriptions,true,"",()=>{},callback);

        // return {
        //     unsubscribe() {
        //         this._allChangesSubscriptions =
        //             this._allChangesSubscriptions.filter((cb) => cb !== callback);
        //     }
        // }
    }

    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription<T> {
        this._storePopulatedSubscriptions.push(callback);

        return new Subscription(
            this._subscriptions,
            this._allChangesSubscriptions,
            this._storePopulatedSubscriptions,
            ()=>{},
            ()=>{},
            callback,
            '',
            2);

    }

}




