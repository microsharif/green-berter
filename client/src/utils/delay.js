/** Minimum time to show auth “completing” UI before redirect (ms). */
export const AUTH_COMPLETION_DELAY_MS = 1000;

export function delay(ms = AUTH_COMPLETION_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
