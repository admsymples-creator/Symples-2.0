"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

function ChartContainer({
  config,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}) {
  const colorVars = Object.entries(config)
    .filter(([, c]) => c.color)
    .reduce(
      (acc, [key, item]) => ({
        ...acc,
        [`--color-${key}`]: item.color,
      }),
      {} as React.CSSProperties
    )

  return (
    <div
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
        className
      )}
      style={colorVars}
      {...props}
    >
      {children}
    </div>
  )
}

interface TooltipPayloadItem {
  dataKey?: string
  name?: string
  value?: number | string
  color?: string
  fill?: string
}

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  className,
  hideLabel = false,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  labelFormatter?: (label: string, payload: TooltipPayloadItem[]) => React.ReactNode
  className?: string
  hideLabel?: boolean
}) {
  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label || "", payload) : label}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color || item.fill }}
              />
              <span className="text-muted-foreground">
                {item.name}
              </span>
            </div>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltipContent }
