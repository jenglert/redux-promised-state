import isPromise from 'is-promise'
import { Dispatch, MiddlewareAPI, AnyAction, Action } from 'redux'
import FluxStandardAction from 'flux-standard-action'

export enum PromisedStateEnum {
  Running,
  Finished,
  Failed
}

export interface OnTransitionParams<T, R> {
  running: () => R
  finished: (apiResult: T) => R
  failed: () => R
}

export interface PromisedState<T> {
  unsafeResult: T | null
  state: PromisedStateEnum
  onTransition: (callbacks: OnTransitionParams<any, any>) => void
}

export interface PromiseAction<T> extends Action<string> {
  promise: Promise<T>
}

export interface PromisedStateAction<T> extends Action<string> {
  promisedState: PromisedState<T>
}

export type InActionTypes<P, M = undefined> = PromiseAction<P> | FluxStandardAction<P, M>
export type OutActionTypes<P, M = undefined> = PromisedStateAction<P> | FluxStandardAction<P, M>

function isPromiseAction(action: AnyAction): action is PromiseAction<any> {
  return action.promise !== undefined
}

export const promisedStateMiddleware = <
  P,
  M = undefined,
  D extends Dispatch<OutActionTypes<P, M>> = Dispatch<OutActionTypes<P, M>>
>(
  store: MiddlewareAPI
) => (next: D) => (action: InActionTypes<P, M>) => {
  if (!isPromiseAction(action)) {
    next(action)
    return
  }

  // Useless check if typescript is used - we have a guaranteed PromiseAction at this point.
  if (action.promise && (action as any).payload) {
    throw new Error('Either "promise" or "payload" may be provided in an action')
  }

  // Useless check if typescript is used - we have a guaranteed PromiseAction at this point.
  if (!isPromise(action.promise)) {
    throw new Error('Action property "promise" must be a promise or undefined')
  }

  const { promise, ...actionWithoutPromise } = action

  next({
    ...actionWithoutPromise,
    promisedState: {
      unsafeResult: null,
      state: PromisedStateEnum.Running,
      onTransition: (callbacks: OnTransitionParams<any, any>) => callbacks.running()
    }
  })

  promise
    .then((result: P) => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: {
          unsafeResult: result,
          state: PromisedStateEnum.Finished,
          onTransition: (callbacks: OnTransitionParams<any, any>) => callbacks.finished(result)
        }
      })
    })
    .catch(() => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: {
          unsafeResult: null,
          state: PromisedStateEnum.Failed,
          onTransition: (callbacks: OnTransitionParams<any, any>) => callbacks.failed()
        }
      })
    })
}
