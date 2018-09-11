import {
  promiseOptionMiddleware,
  PromiseOptionState,
  ApplyFuncParams
} from '../redux-promise-option'
import waitUntil from 'async-wait-until'

describe('redux-promise-option', () => {
  it('should not mutate action w/o a promise', () => {
    const action = {
      type: 'SOME_TYPE',
      payload: 'SOME_PAYLOAD'
    }

    runMiddleware(action)

    expect(actionToNext).toEqual(action)
  })

  it('should throw an exception if "promise" is not a promise', () => {
    const action = {
      type: 'SOME_TYPE',
      promise: 'not-a-promise'
    }

    expect(() => runMiddleware(action)).toThrowError()
  })

  it('should throw an exception if both payload and promise exist in action', () => {
    const action = {
      type: 'SOME_TYPE',
      payload: 'SOME_PAYLOAD',
      promise: new Promise(() => false)
    }

    expect(() => runMiddleware(action)).toThrowError()
  })

  it('should dispatch an initial Running action', () => {
    const action = {
      type: 'SOME_TYPE',
      promise: new Promise(() => false)
    }

    runMiddleware(action)

    validateRunningActionDispatched()
  })

  it('should dispatch a failed action', async () => {
    const action = {
      type: 'SOME_TYPE',
      promise: new Promise((resolve, reject) => reject('It went bad'))
    }

    runMiddleware(action)

    await waitUntil(() => dispatchedActions.length === 1, 100)

    dispatchedActions[0].payload.onTransition(applyArgs)
    expect(applyFailed).toHaveBeenCalledTimes(1)
    expect(applyFinished).toHaveBeenCalledTimes(0)
    expect(applyRunning).toHaveBeenCalledTimes(0)
  })

  it('should dispatch a success action', async () => {
    const action = {
      type: 'SOME_TYPE',
      promise: new Promise(resolve => resolve('it went well'))
    }

    runMiddleware(action)

    await waitUntil(() => dispatchedActions.length === 1, 100)
    dispatchedActions[0].payload.onTransition(applyArgs)
    expect(dispatchedActions[0].payload.unsafeResult).toEqual('it went well')
    expect(applyFailed).toHaveBeenCalledTimes(0)
    expect(applyFinished).toHaveBeenCalledTimes(1)
    expect(applyRunning).toHaveBeenCalledTimes(0)
  })

  // Mocks & Helpers

  const validateRunningActionDispatched = () => {
    expect(actionToNext).toMatchObject({
      type: 'SOME_TYPE',
      payload: {
        unsafeResult: null,
        state: PromiseOptionState.Running
      }
    })

    actionToNext.payload.onTransition(applyArgs)
    expect(applyFailed).toHaveBeenCalledTimes(0)
    expect(applyFinished).toHaveBeenCalledTimes(0)
    expect(applyRunning).toHaveBeenCalledTimes(1)
  }

  let actionToNext: any = null
  let dispatchedActions: any[] = []
  const mockStore: any = {
    dispatch: (action: any) => {
      dispatchedActions.push(action)
    }
  }

  let applyRunning: any
  let applyFinished: any
  let applyFailed: any
  let applyArgs: ApplyFuncParams<any, any>

  const mockNext: any = (action: any) => {
    actionToNext = action
  }

  beforeEach(() => {
    dispatchedActions = []
    actionToNext = null
    applyRunning = jest.fn()
    applyFinished = jest.fn()
    applyFailed = jest.fn()
    applyArgs = {
      running: applyRunning,
      failed: applyFailed,
      finished: applyFinished
    }
  })

  const runMiddleware = (action: any) => {
    promiseOptionMiddleware(mockStore)(mockNext)(action)
  }
})
