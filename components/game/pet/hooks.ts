"use client"

import { useCallback, useSyncExternalStore } from "react"

/** matchMedia as a hydration-safe external store (false on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Live prefers-reduced-motion (framer's hook only reads it once). */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)")
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb)
  return () => document.removeEventListener("visibilitychange", cb)
}

/** True while the tab is visible. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  )
}

// ─── Modal detection ─────────────────────────────────────────
// Radix dialogs lock the body (pointer-events: none / data-scroll-locked)
// and portal a role="dialog" node into <body>; other dialogs mark
// themselves aria-modal. When one is open the pet ducks below the modal
// layer so it never covers or intercepts it.

function subscribeModal(cb: () => void) {
  // Body attribute changes are rare: react immediately.
  const bodyAttrs = new MutationObserver(cb)
  bodyAttrs.observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked", "class"] })
  // Node insertions anywhere are frequent: coalesce to one check per frame.
  let raf = 0
  const tree = new MutationObserver(() => {
    if (raf) return
    raf = requestAnimationFrame(() => { raf = 0; cb() })
  })
  tree.observe(document.body, { childList: true, subtree: true })
  return () => {
    bodyAttrs.disconnect()
    tree.disconnect()
    cancelAnimationFrame(raf)
  }
}

function modalSnapshot(): boolean {
  const b = document.body
  if (b.style.pointerEvents === "none") return true
  if (b.hasAttribute("data-scroll-locked")) return true
  const nodes = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"]')
  for (const n of nodes) {
    if (!n.closest("[data-pet-root]")) return true
  }
  return false
}

export function useModalOpen(): boolean {
  return useSyncExternalStore(subscribeModal, modalSnapshot, () => false)
}
