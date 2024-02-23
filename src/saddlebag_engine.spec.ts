import {describe, expect, it } from 'vitest'
import {CreateBag} from "./saddlebag_engine";
import {BAG_OBJECT_STORE, CreateBagManager} from "./bag.manager";

import indexeddb from 'fake-indexeddb';

// @ts-ignore
globalThis.indexedDB = indexeddb;

describe('store basics', () => {

    it('create a new stateful bag and add an item to it, then check its still there', async (): Promise<void> => {

        const bm = CreateBagManager(true)
        expect(bm).toBeDefined();
        expect(bm.db).toBeNull();

        const p = new Promise<void>((resolve) => {

            bm.loadStatefulBags().then(() => {

                expect(bm.db).toBeDefined();

                const bag = bm.createBag<string>('foo');
                if (bag) {
                    expect(bag.id).toEqual('foo');
                    expect(bag.get('foo')).toBeUndefined();
                    bag.set('foo', 'bar');
                    expect(bag.get('foo')).toEqual('bar');
                }

                bm.db.transaction([BAG_OBJECT_STORE])
                    .objectStore(BAG_OBJECT_STORE).get('foo').onsuccess = (event: any) => {

                    const result = event.target.result;
                    expect(result).toBeDefined();
                    expect(result.get('foo')).toEqual('bar');

                    // create a new bag manager and then try again, should be the same result
                    const bm2 = CreateBagManager(true)
                    expect(bm2).toBeDefined();

                    bm2.loadStatefulBags().then(() => {
                        const bag2 = bm2.getBag<string>('foo');
                        if (bag2) {
                            expect(bag2.get('foo')).toEqual('bar');
                            resolve(result)
                        }
                    })
                }
            })
        })
        return p
    }, 500)


    it('create a new bag and add an item to it', () => {
        const bag = CreateBag<string>('boo');
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
        expect(bag.get('foo')).toBeUndefined();
        bag.set('foo', 'bar');
        expect(bag.get('foo')).toEqual('bar');
    })

    it('subscribe and unsubscribe to a store', () => {
        const bag = CreateBag<string>('foo');

        let counter = 0;

        // @ts-ignore
        const sub1 = bag.subscribe('foo', (value: string) => {
            counter++;
        })

        const sub2 = bag.subscribe('foo', () => {
            counter++;
        })

        const sub3 = bag.subscribe('chicken', () => {
            counter++;
        })

        bag.set('foo', 'bar');
        expect(counter).toEqual(2);

        sub1.unsubscribe();
        sub2.unsubscribe();
        sub3.unsubscribe();

        bag.set('foo', 'bar');
        expect(counter).toEqual(2);
    });

    it('subscribe and unsubscribe to a store for all changes', () => {
        const bag = CreateBag<string>('foo');

        let counter = 0;

        const sub1 = bag.onAllChanges(() => {
            counter++;
        })

        bag.set('foo', 'bar');
        expect(counter).toEqual(1);
        bag.set('cake', 'burger');
        expect(counter).toEqual(2);
        bag.set('nugget', 'bucket');
        expect(counter).toEqual(3);

        sub1.unsubscribe();

        bag.set('lager', 'lager');
        bag.set('hot','sausage')
        expect(counter).toEqual(3);
    });

    it('subscribe and unsubscribe to a store on population', () => {
        const bag = CreateBag<string>('foo');

        let counter = 0;

        const sub1 = bag.onPopulated(() => {
            counter++;
        })

        bag.set('chew', 'bar');
        expect(counter).toEqual(0);
        bag.set('cake', 'burger');
        expect(counter).toEqual(0);
        bag.set('nugget', 'bucket');
        expect(counter).toEqual(0);

        const data = new Map<string,string>([["foo","bar"],["cake","burger"],["nugget","bucket"]]);
        bag.populate(data);
        expect(counter).toEqual(1);
        sub1.unsubscribe();
        bag.populate(data);
        expect(counter).toEqual(1);

        const exported = bag.export();
        expect(exported).toEqual(data);

    });

    it('reset a bag', () => {
        const bag = CreateBag<string>('foo');

        let counter = 0;

        bag.subscribe('pizza', () => {
            counter++;
        })

        bag.set('pizza', 'bar');
        expect(counter).toEqual(1);
        bag.reset();
        expect(counter).toEqual(2);

    });

    it('check a get value cannot be mutated', () => {
        const bag = CreateBag('foo');
        const bar = { sleepy: 'time' };

        bag.set('k', bar);
        expect(bag.get('k')).toEqual(bar);

        bar.sleepy = 'now';
        expect(bag.get('k')).not.toEqual(bar)
    });


    it('check population cannot be mutated after storing', () => {
        const bag = CreateBag('foo');
        const bar = { sleepy: 'time' };


        const data = new Map<string,any>([['k',bar]]);

        bag.populate(data)
        expect(bag.get('k')).toEqual(bar);

        bar.sleepy = 'now';
        expect(bag.get('k')).not.toEqual(bar)
    });


})