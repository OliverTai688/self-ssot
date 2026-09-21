/**
 * The section nav data now lives in control-plane-nav.ts (plain data, no
 * "use client" boundary concerns) and is consumed via the AdminDetailShell
 * wrapper exported from control-plane-shell.tsx. This file re-exports for
 * any existing imports and keeps the historical module path stable.
 */
export { adminDetailNavItems } from "@/components/owneros/control-plane-nav"
