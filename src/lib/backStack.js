import { useEffect, useRef } from 'react'

/**
 * Android hardware-back routing.
 *
 * Capacitor 8's bridge does not handle the back button at all — it is delegated
 * entirely to @capacitor/app. With no listener registered, Android's default
 * onBackPressed finishes the activity, which is why every back press used to
 * close the whole app regardless of how deep you were.
 *
 * This app has no router: screens are conditional renders driven by state, so
 * there is no history to pop. Instead each dismissable layer registers what
 * "back" means for it, and the newest registration wins — which is the same
 * thing a navigation stack does, without pretending we have URLs.
 *
 * Registration order works out because React runs effects child-first: a screen
 * mounted inside another registers after it, and a sheet opened on top of a
 * screen registers after that. The deepest layer is always last in the array.
 */

const stack = []

/**
 * Register `handler` as the back action for as long as the component is mounted.
 * Pass `enabled: false` to keep the hook's position but stay out of the stack.
 */
export function useBackHandler(handler, enabled = true) {
  // The stack holds a stable entry whose `fn` is refreshed every render, so a
  // handler closing over fresh state never goes stale while registered.
  const entry = useRef({ fn: handler })
  entry.current.fn = handler

  useEffect(() => {
    if (!enabled) return
    const self = entry.current
    stack.push(self)
    return () => {
      const i = stack.lastIndexOf(self)
      if (i !== -1) stack.splice(i, 1)
    }
  }, [enabled])
}

/**
 * Run the innermost back action.
 * Returns false when nothing was registered, so the caller decides what a back
 * press at the very root should do.
 */
export function handleBack() {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.fn()
  return true
}
