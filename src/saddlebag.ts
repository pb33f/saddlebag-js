export type BagValueSubscriptionFunction<T = any> = (value: T | undefined) => void;
export type BagAllChangeSubscriptionFunction<T = any> = (key: string, value: T | undefined) => void;
export type BagPopulatedSubscriptionFunction<T = any> = (store: Map<string, T> | undefined) => void;

/**
 * Subscription is a handle to a subscription that can be used to unsubscribe.
 */
export interface Subscription {
    /**
     * unsubscribe will remove the subscription from the bag.
     */
    unsubscribe(): void
}

/**
 * Bag is a collection of key/value pairs that can be subscribed to. The bag
 * can hold any type of value.
 */
export interface Bag<T = any> {

    /**
     * set will set the value of the key in the bag. If the key already exists
     * then the value will be overwritten.
     *
     * Any subscribers to the key will be notified of the change.
     * @param key of the item to store
     * @param value to be stored
     */
    set(key: string, value: T): void;

    /**
     * get will return the value of the key in the bag. If the key does not
     * exist then undefined will be returned.
     *
     * All subscribers will be notified of the change bia the onAllChanges call.
     * @param key to lookup
     * @return {T | undefined} the value of the key or undefined
     */
    get(key: string): T | undefined;

    /**
     * populate will replace the contents of the bag with the contents of the
     * supplied map.
     *
     * All subscribers will be notified of the change via the onPopulated call.
     * @param data {Map<string, T>>}to populate the bag with
     */
    populate(data: Map<string, T>): void

    /**
     * export will return a copy of the contents of the bag.
     * @return {Map<string, T>} the contents of the bag
     */
    export(): Map<string, T>

    /**
     * subscribe will add a subscription to the bag for a specific key. Any time that
     * key is changed, the callback will be called with the new value.
     * @param {string} key to be monitored
     * @param {BagValueSubscriptionFunction<T>} callback to fire on every change, updated value will be passed
     */
    subscribe(key: string, callback: BagValueSubscriptionFunction<T>): Subscription;

    /**
     * onAllChanges will add a subscription to the bag for all changes. Any time that
     * any value changes in the bag, subscribers will be notified.
     * @param {BagAllChangeSubscriptionFunction<T>} callback to fire on every change
     */
    onAllChanges(callback: BagAllChangeSubscriptionFunction<T>): Subscription;

    /**
     * onPopulated will add a subscription to the bag for when the bag is populated with
     * any data. The entire contents of the bag will be passed to the callback.
     * @param {BagPopulatedSubscriptionFunction<T>} callback
     */
    onPopulated(callback: BagPopulatedSubscriptionFunction<T>): Subscription;

    /**
     * reset will clear the contents of the bag and notify all subscribers of every change.
     * Be warned that this will cause a lot of notifications to be sent if the bag is very busy
     * and popular.
     */
    reset(): void;
}

