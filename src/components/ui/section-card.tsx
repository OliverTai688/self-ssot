import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardProps extends React.ComponentProps<typeof Card> {
  title?: string
  description?: string
  footer?: React.ReactNode
}

export function SectionCard({
  title,
  description,
  children,
  footer,
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm", className)} {...props}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-xl">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && (
        <div className="bg-muted/50 px-6 py-3 border-t">
          {footer}
        </div>
      )}
    </Card>
  )
}
