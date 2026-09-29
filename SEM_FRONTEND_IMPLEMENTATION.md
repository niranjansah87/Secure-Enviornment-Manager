# SEM v2 Frontend Implementation Plan

## Source of Truth

Before implementing any page:

1. Inspect the existing implementation.
2. Inspect the corresponding design in `reference_design/`.
3. Inspect required assets in `public/`.
4. Identify the existing API dependencies.
5. Implement using the shared design system.
6. Run and visually inspect the result.
7. Compare against the reference.
8. Fix discrepancies.
9. Test interactions.
10. Move to the next page.

## Implementation Order

### Foundation
- design tokens
- typography
- surfaces
- buttons
- inputs
- badges
- dialogs
- drawers
- tables
- navigation
- page headers
- skeletons
- empty states
- error states
- toast system

### Public
- landing
- login
- 404

### Application
- app shell
- dashboard
- projects
- project settings
- workspace/environment
- secrets
- secret details
- compare
- secret history
- global history
- audit logs
- templates
- analytics
- API keys
- users
- account/organization settings

### Supporting Workflows
- add/edit secret
- bulk import
- restore
- create API key
- API key reveal
- create/edit user
- reset password
- delete confirmations
- command palette
- workspace/environment switching

### Quality
- responsive
- accessibility
- SEO
- security review
- performance review
- error boundaries
- loading/empty/error states
- E2E/critical workflow testing

## Loop Engineering

For every implementation unit:

OBSERVE
→ PLAN
→ IMPLEMENT
→ RUN
→ INSPECT
→ TEST
→ FIX
→ RECHECK
→ CONTINUE

Never assume a page is complete because TypeScript compiles.

Check the browser result.

Check console errors.

Check network failures.

Check responsive behavior.

Check reference-design fidelity.

## Backend Coordination

The backend is being redesigned by another agent.

Do not redesign backend architecture from this frontend branch.

If an API is unavailable:
- isolate the dependency
- define the required frontend contract
- document the blocker
- continue with independent work

Do not silently replace missing production functionality with fake data.

## Completion Standard

The frontend is complete only when:
- every reference page is implemented
- navigation works
- API integration is centralized
- authentication works
- authorization-aware UI works
- sensitive workflows are protected
- loading/empty/error states exist
- error boundaries exist
- 404 exists
- public SEO is implemented
- private pages are protected from indexing
- responsive layouts work
- accessibility is checked
- animations are polished
- heavy visuals are performant
- production build succeeds
- no known console errors remain
- critical workflows are tested
- the UI matches the approved reference designs
