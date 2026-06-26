# auth-permission-review

## Description

Review route guards, `requireUser()`, module permissions, client-visible boundaries, and service-layer authorization.

## When To Use

- Any auth, permission, Client Portal, or cross-user data task.
- Before making public routes DB-backed.
- When moving module permissions from localStorage to DB.

## Inputs

- `src/lib/services/auth.service.ts`
- `src/lib/services/project.service.ts`
- `src/lib/context/module-permissions-context.tsx`
- `src/components/layout/module-guard.tsx`
- `src/app/client/[token]/page.tsx`
- Related Prisma models and tasks

## Process

1. Identify the data being accessed.
2. Identify who can access it.
3. Verify route guard or service-layer authorization.
4. Check client-visible filters and public token behavior.
5. Mark ambiguous access as high risk.
6. Document approval requirements.

## Constraints

- Never relax auth boundaries silently.
- Never expose internal notes or private data through public routes.
- Treat Finance, Life, Company Strategy, Client Portal, Auth/Permission as high risk.

## Verification Checklist

- Access path has authorization.
- Public route filters visibility.
- Token behavior is documented.
- High-risk writes require approval.

## Expected Output

- Authorization review notes.
- Boundary checklist update.
- Scoped code change proposal if needed.
