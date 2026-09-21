"use client"

import { LoaderCircleIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type AuthSubmitButtonProps = Omit<ComponentProps<typeof Button>, "disabled" | "type"> & {
  disabled?: boolean
  pendingLabel: string
}

export function AuthSubmitButton({
  children,
  disabled = false,
  pendingLabel,
  ...props
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={disabled || pending} aria-disabled={disabled || pending} {...props}>
      {pending ? (
        <>
          <LoaderCircleIcon className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
