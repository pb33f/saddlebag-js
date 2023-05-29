import {describe, expect, it} from 'vitest'
import {CreateBagManager, GetBagManager} from "./bag.manager";
import {Bag} from "./saddlebag";

describe('bag manager basics', () => {

    it('create a new bag manager and a bag', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
        expect(bag.get('foo')).toBeUndefined();
        bag.set('foo', 'bar');
        expect(bag.get('foo')).toEqual('bar');
    })

    it('ensure two bad managers always have the same bag', () => {

        const bagManager1 = CreateBagManager();
        const bagManager2 = CreateBagManager();
        const bagManager3 = GetBagManager();

        const bag: Bag<string> = bagManager1.createBag<string>('foo');
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
        expect(bag.get('foo')).toBeUndefined();

        const sameBag = bagManager2.getBag<string>('foo');
        expect(bag).toEqual(sameBag);

        const stillSameBag = bagManager3.getBag<string>('foo');
        expect(bag).toEqual(stillSameBag);

    })

    it('get a bag, even if it does not exist', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        bag.set("foo", "bar");
        expect(bag.get("foo")).toEqual("bar");
        expect(bagManager.getBag<string>('shoes')).toBeDefined();

    })


    it('reset a bag', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        bag.set("foo", "bar");
        expect(bag.get("foo")).toEqual("bar");
        bagManager.resetBags();
        expect(bag.get("foo")).toBeUndefined();

    })


})