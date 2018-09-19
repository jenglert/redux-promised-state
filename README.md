[![Build Status](https://travis-ci.com/jenglert/redux-promised-state.svg?branch=master)](https://travis-ci.com/jenglert/redux-promised-state)

# Redux Promise State

`redux-promised-state` is a redux middleware that maps Promise semantics to state semantics.  A promise is excellent for representing in-process API calls.  Promises aren't great for making rendering decisions.  `redux-promised-state` converts a dispatched promise action into an object representing the current state of the promise.

## Installation

```
npm i redux-promise-state
```

## Usage

Get started with three simple steps.  You can checkout a complete working example [here](https://github.com/jenglert/redux-promised-state-typescript-example).

### Install the middleware

Check out redux's documentation on [middleware](https://redux.js.org/advanced/middleware) for more information.

```
import { promisedStateMiddleware } from 'redux-promised-state';

const store = createStore(rootReducer, applyMiddleware(promisedStateMiddleware));
```

### Dispatch a Promise action

Dispatch a redux action with `type` and `promise` properties.  The middleware will convert this action into a `PromisedStateAction`.

```
export const anActionWithAPromise = somePromise => ({
    promise: somePromise,
    type: SOME_ACTION_WITH_A_PROMISE_KEY,
});
```

### Handle PromisedState actions

You can then use your dispatched promise action as an action with `PromisedState`.  For example:


export const randomDogReducer = (state, action) => {
    if (action.type === SOME_ACTION_WITH_A_PROMISE_KEY) {
        console.log(action.promisedState);  // An instance of PromisedState
    }

    return state;
}

### The PromisedState Class

The `PromisedState` class represents the current state of a promise.  It can be in one of four states: 

- Idle
- Running
- Failed
- Finished

The `PromisedState` class offers the following API:

- *unsafeResult*: Provides unsafe access to the result of the promise.  It is "unsafe" because there is no check to ensure that the promise has actually completed.  You should avoid using this method.
- *state*: The current state. One of Idle, Running, Failed, or Finished.
- *whenStateIs*: Method that accepts a callback allowing you to handle all potential states in a typesafe manner. Example usage below:

```
const promisedState = ... // Finished Promised State w/ result 'hello world'.

const result = promisedState.whenStateIs({
    running: () => 'it is going',
    failed: () => 'it failed',
    idle: () => 'it has not started',
    finished: (result) => `done with result = '${result}'`,
});  

// result: done with result = 'hello world'
```