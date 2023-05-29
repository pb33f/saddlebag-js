export type BagValueSubscriptionFunction<T = any> = (value: T | undefined) => void;
export type BagAllChangeSubscriptionFunction<T = any> = (key: string, value: T | undefined) => void;
export type BagPopulatedSubscriptionFunction<T = any> = (store: Map<string, T> | undefined) => void;

export interface Subscription {
    unsubscribe(): void
}

export interface Bag<T = any> {
    set(key: string, value: T): void;

    get(key: string): T | undefined;

    populate(data: Map<string, T>): void

    export(): Map<string, T>

    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription;

    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription;

    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription;

    reset(): void;
}

