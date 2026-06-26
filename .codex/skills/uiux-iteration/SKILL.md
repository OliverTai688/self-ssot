# uiux-iteration

## Description

Run small UIUX improvement cycles based on visual hierarchy, spacing, responsiveness, task clarity, and existing design rules.

## When To Use

- A screen is functionally present but unclear or visually rough.
- A component needs small polish after DB integration.
- Client Portal or Work CRUD flow needs UX review.

## Inputs

- Relevant route/component files.
- Existing design patterns in `src/components/ui`, `src/components/layout`, and module components.
- Task acceptance criteria.

## Process

1. Identify the user workflow and decision point.
2. Inspect the existing component hierarchy and spacing.
3. Make the smallest visual or interaction improvement.
4. Preserve existing design language.
5. Verify mobile/desktop layout by reasoning or browser testing when requested.

## Constraints

- No full redesign unless explicitly asked.
- Avoid decorative complexity.
- Keep operational tools dense, scannable, and predictable.
- Text must fit containers.

## Verification Checklist

- Main action is clear.
- Error/loading/empty states are not worsened.
- Layout remains responsive.
- No unrelated visual churn.

## Expected Output

- Small UI patch or review notes.
- Residual UX risks.
