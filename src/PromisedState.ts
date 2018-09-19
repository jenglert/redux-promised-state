import { PromisedStateEnum, OnTransitionParams, IPromisedState } from './types';

export class PromisedState<T> implements IPromisedState<T> {
  unsafeResult: T | null = null;
  state: PromisedStateEnum = PromisedStateEnum.Idle;

  constructor(state: PromisedStateEnum, result: T | null) {
    this.unsafeResult = result;
    this.state = state;
  }

  onTransition = <R>(callbacks: OnTransitionParams<T, R>) => {
    switch (this.state) {
      case PromisedStateEnum.Idle:
        return callbacks.idle();

      case PromisedStateEnum.Running:
        return callbacks.running();

      case PromisedStateEnum.Finished:
        return callbacks.finished(this.unsafeResult as T);

      case PromisedStateEnum.Failed:
        return callbacks.failed();

      default:
        return unhandledState<R>(this.state);
    }
  }
}

export const idlePromisedState = <T>() => new PromisedState<T>(PromisedStateEnum.Idle, null);

function unhandledState<R>(state: never): R {
  throw new Error(`Unhandled state ${state}`);
}
