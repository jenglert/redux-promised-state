import isPromise from 'is-promise'
import { Middleware } from 'redux'

export interface PromiseOption<T> {
  isPresent: boolean
  value?: T
}

export const toPromiseOption = (action: any): PromiseOption<any> => ({
  isPresent: action.isPresent,
  value: action.value
})

export const promiseOptionMiddleware: Middleware<any, any> = (store: any) => (next: any) => (
  action: any
) => {
  if (!isPromise(action.promise)) {
    next(action)
    return
  }

  next({
    ...action,
    promise: undefined,
    isPresent: false,
    value: null
  })

  action.promise.then((result: any) => {
    store.dispatch({
      type: action.type,
      isPresent: true,
      value: result
    })
  })
}
