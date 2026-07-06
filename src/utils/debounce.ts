/** A debounced function with a `cancel()` method. */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

/** Trailing-edge debounce. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: A): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, wait);
  };
  wrapped.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return wrapped;
}
