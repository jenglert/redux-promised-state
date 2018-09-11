import isPromise from 'is-promise'
import { Middleware } from 'redux'

export enum PromiseOptionState {
  Running,
  Finished,
  Failed
}

export interface ApplyFuncParams<T, R> {
  running: () => R
  finished: (apiResult: T) => R
  failed: () => R
}

type ApplyFunc<T, R> = (callbacks: ApplyFuncParams<T, R>) => R

export interface PromiseOption<T, R> {
  unsafeResult: T
  state: PromiseOptionState
  apply: ApplyFunc<T, R>
}

export const promiseOptionMiddleware: Middleware<any, any> = (store: any) => (next: any) => (
  action: any
) => {
  if (!action.promise) {
    next(action)
    return
  }

  if (action.promise && action.payload) {
    throw new Error('Either "promise" or "payload" may be provided in an action')
  }

  if (!isPromise(action.promise)) {
    throw new Error('Action property "promise" must be a promise or undefined')
  }

  const { promise, ...actionWithoutPromise } = action

  next({
    ...actionWithoutPromise,
    payload: {
      unsafeResult: null,
      state: PromiseOptionState.Running,
      onTransition: (callbacks: ApplyFuncParams<any, any>) => callbacks.running()
    }
  })

  action.promise
    .then((result: any) => {
      store.dispatch({
        ...actionWithoutPromise,
        payload: {
          unsafeResult: result,
          state: PromiseOptionState.Finished,
          onTransition: (callbacks: ApplyFuncParams<any, any>) => callbacks.finished(result)
        }
      })
    })
    .catch(() => {
      store.dispatch({
        ...actionWithoutPromise,
        payload: {
          unsafeResult: null,
          state: PromiseOptionState.Failed,
          onTransition: (callbacks: ApplyFuncParams<any, any>) => callbacks.failed()
        }
      })
    })
}
