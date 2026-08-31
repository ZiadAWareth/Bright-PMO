"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("group/tabs flex flex-col gap-2", className)}
      {...props}
    />
  )
}

/**
 * Two tab-row shapes.
 *
 * `line` is the house style and should be used for every multi-tab view in the
 * app: a full-width transparent row with a bottom rule, where the active tab is
 * marked by a brand underline rather than a filled background. `default` — the
 * pill row on a filled track — is kept only so existing call sites keep
 * rendering; new screens should pass `variant="line"`.
 *
 * Underlines beat pills here because the row reads as part of the page rather
 * than as a control sitting on top of it, and because it keeps brand orange for
 * primary actions and the active nav item instead of spending it on a tab chip.
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted",
  {
    variants: {
      variant: {
        default: "h-9 bg-surface-2",
        line: "mb-6 h-auto w-full justify-start gap-6 rounded-none border-b border-line bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Shared: sizing, focus ring, disabled state, icon sizing.
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium text-ink-2 transition-[color,box-shadow] hover:text-ink focus-visible:border-bright focus-visible:outline-1 focus-visible:outline-bright focus-visible:ring-[3px] focus-visible:ring-bright-soft disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Pill variant: the active tab lifts onto its own surface.
        "data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm",
        // Line variant: no fill at all, active or not.
        "group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-1 group-data-[variant=line]/tabs-list:pb-2.5 group-data-[variant=line]/tabs-list:pt-1.5 group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-bright group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none",
        // The underline itself: a 2px bar that fades in under the active tab.
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-bright after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
