import {describe, expect, it} from 'vitest'
import {CreateBagManager, GetBagManager} from "./bag.manager";

describe('bag manager basics', () => {
    it('should create multiple instances of the same bag', () => {
      const bagKey = 'bag-key';

      const changeKey = 'changed-key';

      let allChangesCounter = 0;
      let subscriptionCounter = 0;

      const createInstance = () => {
        let bm = CreateBagManager(true);
        let bag = bm.createBag(bagKey)!;

        bag.onAllChanges(() => {
          allChangesCounter++;
        });

        bag.subscribe(changeKey, () => {
          subscriptionCounter++;
        });
      };

      createInstance();
      createInstance();
      createInstance();

      let bm = CreateBagManager(true);
      let bag = bm.createBag(bagKey)!;
      bag.set(changeKey, 'ok');

      expect(allChangesCounter).toEqual(3);
      expect(subscriptionCounter).toEqual(3);
    });

    it('create a new bag manager and a bag', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
<<<<<<< Updated upstream
        expect(bag.get('foo')).toBeUndefined();
        bag.set('foo', 'bar');
        expect(bag.get('foo')).toEqual('bar');

        bag?.reset()
=======
        expect(bag?.get('foo')).toBeUndefined();
        bag?.set('foo', 'bar');
        expect(bag?.get('foo')).toEqual('bar');
>>>>>>> Stashed changes
    })

    it('ensure two bad managers always have the same bag', () => {

        const bagManager1 = CreateBagManager();
        const bagManager2 = CreateBagManager();
        const bagManager3 = GetBagManager();

        const bag = bagManager1.createBag<string>('foo');
        expect(bag).toBeDefined();
        expect(bag).not.toBeNull();
        expect(bag?.get('foo')).toBeUndefined();

        const sameBag = bagManager2.getBag<string>('foo');
        expect(bag).toEqual(sameBag);

        const stillSameBag = bagManager3.getBag<string>('foo');
        expect(bag).toEqual(stillSameBag);

    })

    it('get a bag, even if it does not exist', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        bag?.set("foo", "bar");
        expect(bag?.get("foo")).toEqual("bar");
        expect(bagManager.getBag<string>('shoes')).toBeDefined();

    })


    it('reset a bag', () => {

        const bagManager = CreateBagManager();
        const bag = bagManager.createBag<string>('foo');
        bag?.set("foo", "bar");
        expect(bag?.get("foo")).toEqual("bar");
        bagManager.resetBags();
        expect(bag?.get("foo")).toBeUndefined();

    })


})