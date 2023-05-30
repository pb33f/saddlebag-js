import {describe, expect, it } from 'vitest'
import {CreateBag} from "./saddlebag_engine";

describe('store basics', () => {

    it('create a new bag and add an item to it', () => {
        const bag = CreateBag<string>();
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
        expect(bag.get('foo')).toBeUndefined();
        bag.set('foo', 'bar');
        expect(bag.get('foo')).toEqual('bar');
    })

    it('subscribe and unsubscribe to a store', () => {
        const bag = CreateBag<string>();

        let counter = 0;

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
        const bag = CreateBag<string>();

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
        const bag = CreateBag<string>();

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
        const bag = CreateBag<string>();

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
        const bag = CreateBag();
        const bar = { sleepy: 'time' };

        bag.set('k', bar);
        expect(bag.get('k')).toEqual(bar);

        bar.sleepy = 'now';
        expect(bag.get('k')).not.toEqual(bar)
    });


    it('check population cannot be mutated after storing', () => {
        const bag = CreateBag();
        const bar = { sleepy: 'time' };


        const data = new Map<string,any>([['k',bar]]);

        bag.populate(data)
        expect(bag.get('k')).toEqual(bar);

        bar.sleepy = 'now';
        expect(bag.get('k')).not.toEqual(bar)
    });


})