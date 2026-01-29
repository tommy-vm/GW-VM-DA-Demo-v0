# Modes & UI Rules (Admin vs Technician)

## Modes
We support two modes:
- Admin Mode: back-office, dense tables, filters, detailed views
- Technician Mode: shop-floor, large text, minimal input, action-first

## Entry Points
- Admin default: /builds
- Technician default: /floor

## Mode Switch
- Always visible on sidebar header as a segmented control: Admin / Technician
- Persist selection (localStorage or cookie)
- Switching mode changes:
  - navigation menu set
  - typography scale
  - component density (cards vs tables)

## Technician Mode UI Tokens
- Base font >= 18px
- Headings 28–36px
- Buttons height 52–64px
- Tap targets >= 44px
- Cards have generous padding (20–24px)
- Avoid tables when possible; use cards and lists
- “Next Action” must be visible above the fold

## Technician Mode Navigation
- /floor (Today Board)
- /floor/build/[id] (Build Station View)
- /floor/log (Quick Log)

## Action Buttons (Technician Mode)
- Start / Pause / Resume / Complete / Block
- Block requires preset reason selection (no typing required)