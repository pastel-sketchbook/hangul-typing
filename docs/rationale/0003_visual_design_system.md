# Visual Design System

This document explains the visual design rationale for hangul-typing, covering the 60:30:10 color rule, typography choices, and full-viewport layout philosophy.

## Design Philosophy

The interface prioritizes **focus and clarity** for language learners. Every design decision serves the goal: help users concentrate on learning Hangul without visual distractions.

## 60:30:10 Color Rule

A classic interior design principle applied to UI for visual harmony:

| Proportion | Role | Colors | Usage |
|------------|------|--------|-------|
| **60%** | Dominant | Warm cream `#faf8f5`, `#f3f0eb` | Page background, recessed areas |
| **30%** | Secondary | White `#ffffff`, dark text `#1a1a1a` | Cards, content surfaces |
| **10%** | Accent | Soft teal `#5eb3b3` | CTAs, level badges, highlights, active states |

### Why This Palette?

- **Warm cream (60%)** - Reduces eye strain during extended practice sessions. Feels approachable, like paper.
- **White cards (30%)** - Creates clear content boundaries. Elevates interactive elements.
- **Soft teal (10%)** - Draws attention without aggression. Used sparingly for maximum impact.

### Accent Usage Guidelines

The 10% accent appears only in:
- Level number badges (always visible accent)
- Primary action buttons
- Keyboard key highlights (during typing)
- Progress bar fill
- Game area border (subtle tint `rgba(94, 179, 179, 0.1)`)
- Active/focus states

## Typography

### Font Stack

| Purpose | Font | Fallback |
|---------|------|----------|
| UI Text | IBM Plex Sans | System sans-serif |
| Code/Mono | IBM Plex Mono | System monospace |
| Level Titles | IBM Plex Serif | System serif |
| Korean (UI) | Noto Sans KR | Nanum Gothic |
| Korean (Display) | Nanum Gothic | Noto Sans KR |

### Why These Fonts?

- **IBM Plex family** - Professional, highly legible, consistent across weights
- **Noto Sans KR** - Google's comprehensive Korean font with excellent jamo rendering
- **Nanum Gothic** - Softer, friendlier appearance for large display text (targets)

### Korean Font Loading

Korean fonts use unicode-range subsetting via @fontsource. The browser only downloads character subsets as needed, keeping initial load fast while supporting the full Korean character set.

## Full-Viewport Layout

Both pages are designed to fit entirely within the viewport - no scrolling required.

### Level Selection Page

```
┌─────────────────────────────────────────┐
│              Header + Tagline           │
├─────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐             │
│  │  1  │  │  2  │  │  3  │             │
│  │Basic│  │Basic│  │Simpl│  Row 1      │
│  │Vowel│  │Cons │  │Sylla│             │
│  └─────┘  └─────┘  └─────┘             │
│  ┌─────┐  ┌─────┐  ┌─────┐             │
│  │  4  │  │  5  │  │  6  │             │
│  │Final│  │Doubl│  │Compl│  Row 2      │
│  │Cons │  │Cons │  │Vowel│             │
│  └─────┘  └─────┘  └─────┘             │
│  ┌─────┐  ┌─────┐  ┌─────┐             │
│  │  7  │  │  8  │  │  9  │             │
│  │Commo│  │Short│  │Full │  Row 3      │
│  │Words│  │Phras│  │Sent │             │
│  └─────┘  └─────┘  └─────┘             │
├─────────────────────────────────────────┤
│                Footer                   │
└─────────────────────────────────────────┘
```

**Layout rationale:**
- 3x3 grid fills available space (`grid-template-rows: repeat(3, 1fr)`)
- Cards use vertical stacking: badge, title, Hangul characters
- Centered content makes scanning easy
- Equal card sizes create visual rhythm

### Game Screen

```
┌─────────────────────────────────────────┐
│ [←] Level 1    Score: 0    100%         │  Header (cream, subtle)
├─────────────────────────────────────────┤
│                                         │
│                  ㅏ                      │  Target (large, centered)
│                                         │
│               [input]                   │  Input display
│                                         │
│              Correct!                   │  Feedback
│                                         │
│         ━━━━━━━━━━░░░░░░░░░░           │  Progress bar
├─────────────────────────────────────────┤  Game Area (teal tint, flex: 1)
│  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐ │
│  │ ㅂ│ ㅈ│ ㄷ│ ㄱ│ ㅅ│ ㅛ│ ㅕ│ ㅑ│ ㅐ│ ㅔ│ │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┴───┤ │
│  │ ㅁ│ ㄴ│ ㅇ│ ㄹ│ ㅎ│ ㅗ│ ㅓ│ ㅏ│ ㅣ    │ │
│  ├───┴┬──┴┬──┴┬──┴┬──┴┬──┴┬──┴┬──┴───────┤ │
│  │Shft│ ㅋ│ ㅌ│ ㅊ│ ㅍ│ ㅠ│ ㅜ│ ㅡ        │ │
│  └────┴───┴───┴───┴───┴───┴───┴──────────┘ │  Keyboard (cream, inset)
└─────────────────────────────────────────┘
```

**Layout rationale:**
- Three distinct visual zones with different backgrounds:
  - **Header** (cream) - Information bar, de-emphasized
  - **Game Area** (teal tint, `flex: 1`) - Primary focus, expands to fill
  - **Keyboard** (cream, inset shadow) - Input reference, recessed tray effect
- Game area uses `flex: 1` to consume available vertical space
- Content centered vertically and horizontally within game area
- Keyboard has inset shadow to feel "below" the game area

## Shadow System

| Shadow | CSS Variable | Effect | Usage |
|--------|--------------|--------|-------|
| Small | `--shadow-sm` | Subtle lift | Cards, buttons |
| Medium | `--shadow-md` | Elevated | Game area, hover states |
| Large | `--shadow-lg` | Prominent | Result screen |
| Inset | `--shadow-inset` | Recessed | Keyboard tray |
| Glow | `--shadow-glow` | Focus ring | Active input |

## Responsive Considerations

The layout uses CSS custom properties for all sizing, making it straightforward to adjust for different viewport sizes. The 3-column level grid and full-height game area work well on standard desktop/laptop screens (1280x720 and above).

## Anti-Patterns Avoided

- **No gradients on UI elements** - Solid colors maintain the 60:30:10 balance
- **No heavy shadows** - Keeps the paper-like aesthetic
- **No decorative animations** - Motion serves function only (feedback, transitions)
- **No scrolling on main pages** - Everything visible at once reduces cognitive load
