import {Reviver} from "../src/reviver";

test("revive(key, ISOString)", () => {
    let reviver = new Reviver();
    let date = new Date();

    expect(reviver.revive("foo", date.toISOString())).toEqual(date);
});

test("revive(heartbeat, number)", () => {
    let reviver = new Reviver();
    let date = new Date();

    expect(reviver.revive("heartbeat", date.getTime())).toEqual(date);
});

test("revive(key, string)", () => {
    let reviver = new Reviver();

    expect(reviver.revive("foo", "bar")).toEqual("bar");
});

test("revive(key, number)", () => {
    let reviver = new Reviver();

    expect(reviver.revive("foo", 123)).toEqual(123);
});
