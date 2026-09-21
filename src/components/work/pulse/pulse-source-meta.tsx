"use client"

import { useProductLanguage } from "@/lib/context/product-language-context"
import type { PulseSourceMeta } from "@/types/work"

interface PulseSourceMetaProps {
  meta: PulseSourceMeta
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export function PulseSourceMetaDisplay({ meta }: PulseSourceMetaProps) {
  const { copy, locale } = useProductLanguage()
  const pulseCopy = copy.work.pulseSourceMeta
  const dateLocale = locale === "zh-TW" ? "zh-TW" : "en-US"
  const generatedAt = new Date(meta.generatedAt).toLocaleString(dateLocale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <p className="text-xs text-muted-foreground/60 leading-relaxed">
      {pulseCopy.basedOn}{" "}
      <span className="text-muted-foreground">
        {formatCopy(pulseCopy.tasksTemplate, {
          count: meta.basedOnTaskIds.length,
        })}
      </span>
      {" · "}
      <span className="text-muted-foreground">
        {formatCopy(pulseCopy.notesTemplate, {
          count: meta.basedOnNoteIds.length,
        })}
      </span>
      {" · "}
      <span className="text-muted-foreground">
        {formatCopy(pulseCopy.deliverablesTemplate, {
          count: meta.basedOnDeliverableIds.length,
        })}
      </span>
      {" · "}
      {formatCopy(pulseCopy.generatedTemplate, { date: generatedAt })}
    </p>
  )
}
