import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  separate?: boolean
}

export function FormSection({
  title,
  description,
  separate = true,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="grid gap-1">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {separate && <Separator />}
      <div className="grid gap-4">
        {children}
      </div>
    </div>
  )
}
