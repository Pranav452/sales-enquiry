"use client"

import NextLink from "next/link"
import { useRouter } from "next/navigation"
import type { ComponentProps, MouseEvent } from "react"

/**
 * Link tuned for perceived speed (pattern from NextFaster):
 *  - prefetches the route as soon as the pointer hovers / the link is focused
 *  - navigates on mousedown instead of click, saving the ~100 ms between press
 *    and release
 * Modified clicks (ctrl/cmd/shift/middle) keep normal browser behaviour.
 */
export function FastLink({ href, onMouseDown, onMouseEnter, onFocus, prefetch, ...props }: ComponentProps<typeof NextLink>) {
  const router = useRouter()
  const url = typeof href === "string" ? href : (href.pathname ?? "/")

  const warm = () => { if (prefetch !== false) router.prefetch(url) }

  return (
    <NextLink
      href={href}
      prefetch={prefetch}
      onMouseEnter={(e) => { warm(); onMouseEnter?.(e) }}
      onFocus={(e) => { warm(); onFocus?.(e) }}
      onMouseDown={(e: MouseEvent<HTMLAnchorElement>) => {
        onMouseDown?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (props.target && props.target !== "_self") return
        e.preventDefault()
        router.push(url)
      }}
      {...props}
    />
  )
}
