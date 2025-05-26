// src/components/ui/calendar.tsx

"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

export interface CalendarProps {
  className?: string
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  mode?: "single" | "multiple" | "range"
  initialFocus?: boolean
}

function Calendar({
  className,
  selected,
  onSelect,
  mode = "single",
  initialFocus = false,
}: CalendarProps) {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected}
      className={cn("p-3", className)}
      initialFocus={initialFocus}
    />
  )
}

export { Calendar }
