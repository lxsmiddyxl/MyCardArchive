import {
  memo as reactMemo,
  useCallback as reactUseCallback,
  useMemo as reactUseMemo,
  type DependencyList,
} from "react";

/** Typed re-export of React.memo */
export const memo = reactMemo;

export function useMemo<T>(factory: () => T, deps: DependencyList): T {
  return reactUseMemo(factory, deps);
}

export function useCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: DependencyList
): T {
  return reactUseCallback(callback, deps);
}

export function shallowEqual(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) {
      return false;
    }
  }
  return true;
}
