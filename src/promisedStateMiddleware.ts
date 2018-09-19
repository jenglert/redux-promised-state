import { Dispatch, MiddlewareAPI, AnyAction } from 'redux';
import { OutActionTypes, InActionTypes, PromiseAction, PromisedStateEnum } from './types';
import isPromise from 'is-promise';
import { PromisedState } from './PromisedState';

function isPromiseAction(action: AnyAction): action is PromiseAction<any> {
  return action.promise !== undefined;
}

export const promisedStateMiddleware = <
  P,
  M = undefined,
  D extends Dispatch<OutActionTypes<P, M>> = Dispatch<OutActionTypes<P, M>>
>(
  store: MiddlewareAPI
) => (next: D) => (action: InActionTypes<P, M>) => {
  if (!isPromiseAction(action)) {
    next(action);
    return;
  }

  // Useless check if typescript is used - we have a guaranteed PromiseAction at this point.
  if (action.promise && (action as any).payload) {
    throw new Error('Either "promise" or "payload" may be provided in an action');
  }

  // Useless check if typescript is used - we have a guaranteed PromiseAction at this point.
  if (!isPromise(action.promise)) {
    throw new Error('Action property "promise" must be a promise or undefined');
  }

  const { promise, ...actionWithoutPromise } = action;

  next({
    ...actionWithoutPromise,
    promisedState: new PromisedState(PromisedStateEnum.Running, null)
  });

  promise
    .then((result: P) => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: new PromisedState(PromisedStateEnum.Finished, result)
      });
    })
    .catch(() => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: new PromisedState(PromisedStateEnum.Failed, null)
      });
    });
};
