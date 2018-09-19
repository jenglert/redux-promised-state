import { Action } from 'redux';
import { FluxStandardAction } from 'flux-standard-action';

export enum PromisedStateEnum {
  Idle,
  Running,
  Finished,
  Failed
}

export interface WhenStateIsParams<T, R> {
  idle: () => R;
  running: () => R;
  finished: (apiResult: T) => R;
  failed: () => R;
}

export interface IPromisedState<T> {
  unsafeResult: T | null;
  state: PromisedStateEnum;
  whenStateIs: <R>(callbacks: WhenStateIsParams<T, R>) => R;
}

export interface PromiseAction<T> extends Action<string> {
  promise: Promise<T>;
}

export interface PromisedStateAction<T> extends Action<string> {
  promisedState: IPromisedState<T>;
}

export type InActionTypes<P, M = undefined> = PromiseAction<P> | FluxStandardAction<P, M>;
export type OutActionTypes<P, M = undefined> = PromisedStateAction<P> | FluxStandardAction<P, M>;
