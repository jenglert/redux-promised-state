import isPromise from 'is-promise'
import { Dispatch, MiddlewareAPI, AnyAction } from 'redux'
import {
  PromisedStateEnum,
  PromisedStateAction,
  OnTransitionParams,
  PromiseAction,
  OutActionTypes,
  InActionTypes,
  IPromisedState
} from './types'

class PromisedState<T> implements IPromisedState<T> {
  unsafeResult: T | null = null
  state: PromisedStateEnum = PromisedStateEnum.Idle

  constructor(state: PromisedStateEnum, result: T | null) {
    this.unsafeResult = result
    this.state = state
  }

  onTransition = <R>(callbacks: OnTransitionParams<T, R>) => {
    switch (this.state) {
      case PromisedStateEnum.Idle:
        return callbacks.idle()

      case PromisedStateEnum.Running:
        return callbacks.running()

      case PromisedStateEnum.Finished:
        return callbacks.finished(this.unsafeResult as T)

      case PromisedStateEnum.Failed:
        return callbacks.failed()

      default:
        return unhandledState<R>(this.state)
    }
  }
}

export const idlePromisedState = <T>() => new PromisedState<T>(PromisedStateEnum.Idle, null)

function unhandledState<R>(state: never): R {
  throw new Error(`Unhandled state ${state}`)
}

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
    promisedState: new PromisedState(PromisedStateEnum.Running, null)
  })

  promise
    .then((result: P) => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: new PromisedState(PromisedStateEnum.Finished, result)
      })
    })
    .catch(() => {
      store.dispatch({
        ...actionWithoutPromise,
        promisedState: new PromisedState(PromisedStateEnum.Failed, null)
      })
    })
}

export {
  PromisedStateEnum,
  OnTransitionParams,
  PromiseAction,
  OutActionTypes,
  InActionTypes,
  PromisedStateAction
}
