import { idlePromisedState } from '../PromisedState';
import waitUntil from 'async-wait-until';
import { AnyAction, Dispatch, Action, MiddlewareAPI } from 'redux';
import { createStandardAction, ActionType } from 'typesafe-actions';
import {
  PromiseAction,
  WhenStateIsParams,
  OutActionTypes,
  PromisedStateEnum,
  PromisedStateAction
} from '../types';
import { promisedStateMiddleware } from '../promisedStateMiddleware';

/**
 * Types used for test actions.
 */
const standardPayloadAction = createStandardAction('SOME_TYPE')<string>();
type StandardPayloadActionType = ActionType<typeof standardPayloadAction>;

type RootAction = StandardPayloadActionType | PromiseAction<string>;

/**
 * Mocks + helpers
 */

let onRunning: () => {};
let onFinished: () => {};
let onFailed: () => {};
let onIdle: () => {};
let whenStateIsArgs: WhenStateIsParams<any, any>;

let actionToNext: OutActionTypes<string> | undefined;
let dispatchedActions: any[] = [];
const mockStore: MiddlewareAPI = {
  dispatch: <A extends Action = AnyAction>(action: A) => {
    dispatchedActions.push(action);
    return action;
  },
  getState: () => {
    throw new Error('not implemented');
  }
};

const mockNext: Dispatch<Action> = <A extends Action = AnyAction>(action: A) => {
  actionToNext = action;
  return action;
};

const runMiddleware = (action: RootAction) => {
  promisedStateMiddleware(mockStore)(mockNext)(action);
};

const validateRunningActionDispatched = () => {
  expect(actionToNext).toMatchObject({
    type: 'PROMISE_TYPE',
    promisedState: {
      unsafeResult: null,
      state: PromisedStateEnum.Running
    }
  });
  (actionToNext as PromisedStateAction<string>).promisedState.whenStateIs(whenStateIsArgs);
  expect(onFailed).toHaveBeenCalledTimes(0);
  expect(onFinished).toHaveBeenCalledTimes(0);
  expect(onRunning).toHaveBeenCalledTimes(1);
};

/**
 * Actual tests
 */

describe('redux-promised-state', () => {
  it('should not mutate action w/o a promise', () => {
    const action = standardPayloadAction('some_payload');

    runMiddleware(action);

    expect(actionToNext).toEqual(action);
  });

  it('should throw an exception if "promise" is not a promise', () => {
    const action: any = {
      type: 'SOME_TYPE',
      promise: 'not-a-promise'
    };

    expect(() =>
      promisedStateMiddleware(mockStore)(mockNext)(action)
    ).toThrowErrorMatchingSnapshot();
  });

  it('should throw an exception if both payload and promise exist in action', () => {
    const action: any = {
      type: 'SOME_TYPE',
      payload: 'SOME_PAYLOAD',
      promise: new Promise(() => 'str')
    };

    expect(() => runMiddleware(action)).toThrowError();
  });

  it('should dispatch an initial Running action', () => {
    const action: PromiseAction<string> = {
      type: 'PROMISE_TYPE',
      promise: new Promise<string>(() => null)
    };

    runMiddleware(action);

    validateRunningActionDispatched();
  });

  it('should dispatch a failed action', async () => {
    const action: PromiseAction<string> = {
      type: 'PROMISE_TYPE',
      promise: new Promise((resolve, reject) => reject('It went bad'))
    };

    runMiddleware(action);

    await waitUntil(() => dispatchedActions.length === 1, 100);

    dispatchedActions[0].promisedState.whenStateIs(whenStateIsArgs);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledTimes(0);
    expect(onRunning).toHaveBeenCalledTimes(0);
  });

  it('should dispatch a success action', async () => {
    const action: PromiseAction<string> = {
      type: 'PROMISE_TYPE',
      promise: new Promise(resolve => resolve('it went well'))
    };

    runMiddleware(action);

    await waitUntil(() => dispatchedActions.length === 1, 100);
    dispatchedActions[0].promisedState.whenStateIs(whenStateIsArgs);
    expect(dispatchedActions[0].promisedState.unsafeResult).toEqual('it went well');
    expect(onFailed).toHaveBeenCalledTimes(0);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onRunning).toHaveBeenCalledTimes(0);
  });

  it('should throw an exception on invalid state', () => {
    const promisedState: any = idlePromisedState();
    promisedState.state = 'badbadbad';

    expect(() => promisedState.WhenStateIs(whenStateIsArgs)).toThrowError();
  });

  describe('idlePromisedState', () => {
    it('should be in the idle state', () => {
      const promisedState = idlePromisedState();

      promisedState.whenStateIs(whenStateIsArgs);

      expect(onIdle).toHaveBeenCalledTimes(1);
    });
  });

  beforeEach(() => {
    dispatchedActions = [];
    actionToNext = undefined;
    onRunning = jest.fn();
    onFinished = jest.fn();
    onFailed = jest.fn();
    onIdle = jest.fn();
    whenStateIsArgs = {
      idle: onIdle,
      running: onRunning,
      failed: onFailed,
      finished: onFinished
    };
  });
});
