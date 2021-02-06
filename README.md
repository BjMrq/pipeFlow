# PipeFlow
### A little utility to process data in a pipe


This is a little utility to process data in pipe using node.js runtime.

Your pipe will receive some data that will be converted as an immutable context called "box", this "box" will flow thought your functions and can be extended thought a mutable state key. This box will be returned at the end of the pipe.

You will also find some little helpers to help you with error handling.

## Installation
With npm:
```
npm install @bjmrq/pipe-flow
```
With Yarn:
```
yarn add @bjmrq/pipe-flow
```

## Hello Word Example
Javascript:
```js
const handler = pipeFlow(
  (box) => {
    console.log(box.context.message) // "Hello world"
    return box; // returning the box is mandatory
  }
)();

handler({ message: "Hello world" })
```

Typescript:
```ts
const handler = pipeFlow(
  (box) => {
    console.log(box.context.message) // "Hello world"
    return box; // returning the box is mandatory
  }
)();

handler({ message: "Hello world" })
```
## How It Works
### Combine Functions

You can create a flow made of multiple functions that will execute one after an other from left to right, similar to a *pipe* function.
Those function can either be sync or async functions.

```js
const handler = pipeFlow(
  (box) => {
    console.log(box.context) // {id: 9}

    box.state = {
      status: "ok"
    };

    return box;
  },
  async (box) => {
    console.log(box.state.status) // "ok"

    return box;
  }
)()({ id: 9 });
```


### Move Data Around

If you want to move some data from one function to an other you have access to the state key of the box. You can attach any data you like to this state.

```js
const handler = pipeFlow(
  async (box) => {
    const product = await database("products").where(
      "id",
      box.context.productId // Access data from state
    );

    box.body = product;

    return box;
  },
  async (box) => {
    const productName = box.product.name // access the state

    return box;
  }
)()({ productId: 9 });
```
#### Those are the keys accessible inside the box:

- **context**: is the context of the Lambda function executing
- **state**: is a mutable key that you can use to pass data from one function to another
- **error**: you can attach an error to the error key, doing so will bypass other functions of the flow, only the error handler will be trigger, you can control wether you want to expose this error or not


### Control What is Returned

Data on the **state will never be return**, for this you need to attached data to the **body** key of the box.

```js
exports.handler = pipeFlow(
  (box) => {
    const body = JSON.parse(box.event.body);

    box.state.parsedBody = body;

    return box;
  },
  async (box) => {
    const product = await database("product").where(
      "id",
      box.state.parsedBody.requestId
    );

    box.body = product; // Request body that will be returned
    body.statusCode = 200; // HTTP status that will be returned

    return box;
  }
)();
```
####  The keys that will modify your response are the following

- **body**: will be the body that will be send by your HTTP response
- **statusCode**: will be the HTTP status code of your response
- **cookies**: will the the cookies attached to your response
- **headers**: will the the headers attached to your response
- **multiValueHeaders**: v1 support for multiValueHeaders
- **isBase64Encoded**: will indicate if your payload is Base64 encoded

### Simple Response Helper

You can use a ```simpleResponse``` function, only supply the HTTP response **status code** you like, the default is 200. The response body will stay ```status: "success"```

```js
exports.handler = pipeFlow(simpleResponse())();
```

Will result in a 200 response like
```
{
  status: "success"
}
```

## Error Handling

### How it Works
If you want to return an error to your user you need to attach it to the error key of the box. This will skip the execution of all other functions in your flow.
The error should be attach to the box and not **throw**, to control the flow in your application.

```js
exports.handler = pipeFlow(
  (box) => {
    const authorizationToken = box.event.headers.authorization;

    if (!authorizationToken) {
      box.error = {
        exposed: true,
        statusCode: 403,
        message: "Not Authorized"
      };

      return box;
    }

    const body = JSON.parse(box.event.body);

    box.state.parsedBody = body;

    return box;
  },
  // If an error has been attach in the previous function this one will not run
  async (box) => {
    const product = await database("product").where(
      "id",
      box.state.parsedBody.requestId
    );

    box.body = product;

    return box;
  }
)();
```
This will result in the following response with a HTTP status code of 403
```
{
  "status": "error",
  "message": "Not Authorized"
}
```

- The types of an error to attach to the error key of the box should looks like this:
  - **expose**: a boolean property that indicate if you want to expose this error or not in the response
  - **statusCode**: the error code, will be return as HTTP status code response
  - **error**: the error itself, it's message property will be used in the response
```ts
type FlowError = {
  expose: boolean;
  statusCode: number;
  message: string;
  error?: Error;
};
```
*(to help you with formatting errors see the error helpers section)*

- If an error is **not exposed** it will return an HTTP status code of 500 with a "Internal Error" message like this
```
{
  "status": "error",
  "message": "Internal Error"
}
```

- If an **unexpected error** happens during your flow and you did not catch it will return the following response with a HTTP status code of 500
```
{
  "status": "error",
  "message": "Internal Error"
}
```

- It is recommended to **use the error helper builder** (next chapter) but there is basic compatibility with ```http-errors``` package (it will forward expose, statusCode and message), so you can do
```js
box.error = new createHttpError.NotFound();
```
And it w ill return with an HTTP status code of 404
```
{
  "status": "error",
  "message": "Not Found"
}
```


### Error Helpers
You can use little error helper to format the errors attached to the box.

- **errorBuilder**: the error builder will help you build the error to be returned to the user, it is a curried function so you can pass it's parameter one at the time. 
  - expose (default to false): a boolean property that indicate if you want to expose this error or not
  - code (default to 500): the error code, will be return as HTTP status code response
  - message or error (default to "Internal Error" message): the message you will send in the response or the error itself if it is an error it's message property will be used in the response

exemple 1:
```js
box.error = errorBuilder()()()
```
Will return 
```
{
  exposed: false,
  code: 500,
  error: new Error()
}
```
Will result in this response with a HTTP status of 500
```
{
  "status": "error",
  "message": "Internal Error"
}
```
exemple 2:
```js
box.error = errorBuilder(true)(422)(new Error("Could not process data"))
// Same as
box.error = errorBuilder(true)(422)("Could not process data")
```
Will return 
```
{
  exposed: true,
  code: 422,
  error: new Error("Could not process data")
}
```
Will result in this response with a HTTP status of 422
```
{
  "status": "error",
  "message": "Could not process data"
}
```

Some predefined ones are derived from the builder but you can easaly create yours
- **simpleError**: ```expose=false``` and ```code=500``` provided
- **exposedError**: ```expose=true``` provided
- **nonExposedError**: ```expose=false``` provided
- **notFoundError**: ```expose=true``` and ```code=404``` provided
- **notAuthorizedError**: ```expose=true``` and ```code=403``` provided
- **unprocessableError**: ```expose=true``` and ```code=422``` provided

Error builder in action
```js
const notAuthorizedError = errorBuilder(true)(403);
```
```js
exports.handler = pipeFlow(
  (box) => {
    const authorizationToken = box.event.headers.authorization;

    if (!authorizationToken) {
      box.error = notAuthorizedError("You can't do that");

      return box;
    }

    const body = JSON.parse(box.event.body);

    box.state.parsedBody = body;

    return box;
  },
)();
```

### Extra Error Handler
If you wish to have extra logic triggered when an error occurre (send log to remote place, call an other AWS service..) you can provide ```pipeFlow``` with an extra function.
```js
exports.handler = pipeFlow(
  async (box) => {
    try{
      const product = await database("product").where(
        "id",
        box.state.parsedBody.requestId
      );

      box.body = product; // Request body that will be returned
      body.statusCode = 200; // HTTP status that will be returned
    } catch (error) {
      box.error = notFoundError(new Error("Could not find this product"));
    }
      return box;
    }
// Extra error handler
)((box) => {
  sendLogs(box.error)
});
```
- In the error handler you will have access to the whole box that caused the error and the error itself
- The box in the error handler is a copy of the box that will be return, mutating it will not change the response

## The Flow and it's Box Recap

A *flow* is similar to a pipe fonction in functional programming, you can combine your functions from left to right, and the *box* will flow thought them, you **need to return the box** at the end of your function so it can be passed on to the next function of the flow.

Those are the keys accessible inside the box

- **event**: is the event object generated by APIGateway
- **context**: is the context of the Lambda function executing
- **callback**: is a function that you can call in non-async lambda function handlers to send a response
- **state**: is a mutable key that you can use to pass data from one function to another
- **error**: you can attach an error to the error key, doing so will bypass other functions of the flow, only the error handler will be trigger, you can control wether you want to expose this error or not 

Those are the keys of the box that you can change on the box to modify your response

- **body**: will the body that will be send by your HTTP response
- **statusCode**: will be the HTTP status code of your response
- **cookies**: will the the cookies attached to your response
- **headers**: will the the headers attached to your response
- **multiValueHeaders**: v1 support for multiValueHeaders
- **isBase64Encoded**: will indicate if your payload is Base64 encoded

**If you want to pass data from one function to an other you can use the state key**

The types looks like this:
```ts
type FlowBox = {
  // For access
  event: APIGatewayProxyEventV2;
  context: Context;
  callback: Callback<APIGatewayProxyResultV2>;
  // For response
  statusCode: number;
  headers: {
    [header: string]: boolean | number | string;
  };
  body: any;
  multiValueHeaders: {
    [header: string]: Array<boolean | number | string>;
  };
  isBase64Encoded: boolean;
  cookies: string[];
  // For control
  state: any;
  error: FlowError;
};
```

### Typescript

By default the ```pipeFlow``` ```box``` event will have the types for the version 2 of APIGateway proxy, if you want to use types for version 1 you can do the following.
```ts
pipeFlow<APIGatewayProxyHandler>
```