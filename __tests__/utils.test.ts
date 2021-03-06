import {
  addToReturn,
  addToReturnOn,
  addToState,
  addToStateImmutableOn,
  addToStateOn,
  flowIf,
  pipeFlow,
  returnWith,
} from "../src";
import { pipeContext } from "./fixtures/data";

it("Should add data to the return property of the context", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToReturn(() => extraData)
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(JSON.stringify(extraData));
});

it("Should add data to the return property of the context on a certain property", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToReturnOn("object", () => extraData)
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(
    JSON.stringify({ object: extraData })
  );
});

it("Should add data to the state property of the context", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToState(() => extraData),
    (context) => {
      context.return = context.state;
    }
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(JSON.stringify(extraData));
});

it("Should add data to the state property of the context on a certain property", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToStateOn("object", () => extraData),
    (context) => {
      context.return = context.state;
    }
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(
    JSON.stringify({ object: extraData })
  );
});

it("Should return the data in the given path if path is string", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToState(() => extraData),
    returnWith("state")
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(JSON.stringify(extraData));
});

it("Should return the data in the given path if path is array", async () => {
  const extraData = { key: "test", value: true };

  const returnedFromFlow = await pipeFlow<typeof pipeContext>(
    addToStateOn("object", () => extraData),
    returnWith(["state", "object"])
  )()(pipeContext);

  expect(JSON.stringify(returnedFromFlow)).toBe(JSON.stringify(extraData));
});

it("Data added with the immutable utility should be immutable", async () => {
  const extraData = { key: "test", value: true, object: { val: true } };

  const returnedFromFlow = await pipeFlow<typeof pipeContext, typeof extraData>(
    addToStateImmutableOn("immutable", () => extraData),
    (context) => {
      // @ts-expect-error
      console.log(Object.isFrozen(context.state.immutable));
      // @ts-expect-error
      context.state.immutable.key = false;
    },
    (context) => {
      context.return = context.state;
    }
  )()(pipeContext);

  console.log(returnedFromFlow);

  // @ts-ignore
  expect(returnedFromFlow.message).toBe(
    "Cannot assign to read only property 'key' of object '#<Object>'"
  );
});

it("Should not execute middleware if predicate is false", async () => {
  const extraData = { key: "test", value: true, object: { val: true } };

  const returnedFromFlow = await pipeFlow<typeof pipeContext, typeof extraData>(
    addToStateImmutableOn("immutable", () => extraData),
    flowIf(
      () => true,
      (context) => {
        context.return = { hasExecuted: true };
      }
    )
  )()(pipeContext);

  console.log(returnedFromFlow);

  // @ts-ignore
  expect(returnedFromFlow.hasExecuted).toBe(true);
});

it("Should not execute middleware if predicate is false", async () => {
  const extraData = { key: "test", value: true, object: { val: true } };

  const returnedFromFlow = await pipeFlow<typeof pipeContext, typeof extraData>(
    addToStateImmutableOn("immutable", () => extraData),
    flowIf(
      (ignore) => false,
      (context) => {
        context.return = { hasExecuted: true };
      }
    )
  )()(pipeContext);

  console.log(returnedFromFlow);

  expect(returnedFromFlow).toBe(undefined);
});
