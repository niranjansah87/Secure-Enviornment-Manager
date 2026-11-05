# SEM v2 Frontend Design System

## Purpose

This document defines the visual and interaction direction for the Secure Environment Manager frontend redesign.

The reference designs in `reference_design/` are the visual source of truth.

## Product Character

SEM is a serious developer and security infrastructure product.

The UI should feel:
- premium
- technical
- precise
- restrained
- trustworthy
- information-dense
- modern
- interactive

It must not feel like a generic AI-generated SaaS dashboard.

Avoid:
- excessive gradients
- gradient text
- neon/glowing cards everywhere
- excessive purple
- decorative blobs
- meaningless glassmorphism
- excessive rounded cards
- generic metric-card grids
- decorative 3D with no product purpose
- excessive animation

Premium comes from typography, hierarchy, spacing, composition, interaction quality and consistency.

## Brand

Use the current approved SEM logo and assets from `public/`.

Do not recreate or replace approved branding without a specific reason.

## Visual System

Use a dark graphite/near-black foundation with restrained SEM accent colors.

Accent colors should communicate interaction, selection and important states rather than decorate every component.

Semantic colors:
- success: successful/healthy states
- warning: caution
- danger: destructive/security-critical states
- info: informational states

## Typography

Use a strong UI sans-serif hierarchy and monospace typography for technical values such as:
- secret keys
- environment names
- API key prefixes
- identifiers
- code/configuration

Typography should establish hierarchy instead of relying on color effects.

## Surfaces

Use a small number of surface levels:
1. application background
2. primary surface
3. elevated surface
4. overlay/dialog surface

Use subtle borders and restrained shadows.

Do not turn every section into a floating card.

## Layout

Application pages should prioritize:
- clear page headers
- contextual navigation
- strong alignment
- useful density
- predictable toolbars
- tables and split views where appropriate
- contextual actions

Marketing pages can use more whitespace and visual storytelling.

## Motion

Motion should explain state and hierarchy.

Use:
- page transitions
- drawer/dialog transitions
- hover/focus feedback
- list transitions
- tab transitions
- workspace switching
- loading transitions
- meaningful visualization animation

Do not animate everything.

Respect `prefers-reduced-motion`.

## 3D

Three.js is an accent, not a background for the entire application.

Good candidates:
- landing page
- login
- selected dashboard/security visualizations

Avoid heavy 3D on:
- secrets tables
- compare
- history
- audit
- API keys
- users
- forms

Lazy-load heavy scenes.

## Scrolling

Lenis may be used on long-form marketing pages when it improves the experience.

Do not force smooth scrolling into dense application workflows.

## Core Product Screens

The complete frontend includes:
- Landing
- Login
- Dashboard
- Projects
- Project Settings
- Workspace/Environment
- Secrets
- Secret Details
- Compare
- Secret History/Versions
- Global History/Versions
- Audit Logs
- Templates
- Analytics
- API Keys
- Users
- Account/Organization Settings

Supporting workflows must receive the same design language.

## Component Principles

Build reusable primitives for:
- buttons
- inputs
- selects
- dialogs
- drawers
- tabs
- tables
- badges
- status indicators
- breadcrumbs
- toolbars
- page headers
- empty states
- skeletons
- alerts
- command palette
- toast feedback

Do not duplicate equivalent components across pages.

## Security UX

Secrets must remain masked by default.

Reveal should be deliberate.

Never put secret values into:
- URLs
- logs
- analytics
- browser titles
- debug output

Sensitive actions require clear feedback and deliberate confirmation.

## Accessibility

All interfaces must support:
- keyboard navigation
- visible focus
- semantic markup
- accessible dialogs
- proper labels
- sufficient contrast
- reduced motion

## Responsive Design

Desktop is primary, but the product must remain usable on tablet and mobile.

Dense tables may use horizontal scrolling or dedicated responsive representations rather than simply stacking every column.

## Reference Design Rule

Always inspect `reference_design/` before changing a page.

The reference designs define the intended visual direction.

Do not replace them with generic SaaS patterns.
