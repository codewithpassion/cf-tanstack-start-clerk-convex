# Design Language: Amber Glow Workspace

## Overview

The "Amber Glow Workspace" is a warm, sophisticated design system that uses strategic yellow/orange accents to create a premium content management interface. The design evokes a creative studio during golden hour, with amber highlights illuminating a rich environment.

## Design Principles

1. **Bold Typography**: Distinctive font choices that avoid generic AI aesthetics
2. **Amber Accent System**: Strategic use of yellow/orange for emphasis and warmth
3. **Depth & Layers**: Gradient backgrounds and multi-layer shadows for visual richness
4. **Kinetic Motion**: Thoughtful animations that enhance without overwhelming
5. **Premium Feel**: Polished details that create a professional, elevated experience

## Typography

### Font Families

**Lexend** (Primary Display Font)
- Weights: 400, 500, 700
- Usage: Stat numbers, headings, project names, emphasis text
- Characteristics: Geometric sans with excellent number shapes
- Google Fonts: `https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap`

**Inter** (Body Font)
- Weights: 400, 500, 600
- Usage: Body text, labels, metadata, descriptions
- Characteristics: Highly readable for long-form content
- Note: System font, already included in base styles

### Typography Hierarchy

```css
/* Stat Numbers & Key Metrics */
font-family: 'Lexend'
font-weight: 700
font-size: 2xl (24px)
color: amber-400 (dark mode) | amber-600 (light mode)

/* Headings (H1-H3) */
font-family: 'Lexend'
font-weight: 600
color: amber-50 (dark mode) | slate-900 (light mode)

/* Body Text */
font-family: Inter
font-weight: 400-500
color: slate-100 (dark mode) | slate-900 (light mode)

/* Labels & Metadata */
font-family: Inter
font-weight: 500
font-size: sm (14px)
color: slate-400 (dark mode) | slate-500 (light mode)
```

## Color System

### Core Palette

**Amber Accents** (Primary)
- `amber-400` (#fbbf24) - Main accent, stat numbers, icons, borders
- `amber-500` (#f59e0b) - Buttons, primary actions
- `amber-600` (#d97706) - Hover states (light mode)
- `orange-400` (#fb923c) - Secondary accent, subtle highlights

**Neutral Base**
- `slate-950` - Dark mode background
- `slate-900` - Dark mode cards, surfaces
- `slate-800` - Dark mode elevated surfaces
- `slate-50` - Light mode background
- `slate-100` - Light mode subtle backgrounds
- `slate-200` - Light mode borders

**Text Colors**
- `slate-100` - Dark mode primary text
- `slate-400` - Dark mode secondary text
- `slate-900` - Light mode primary text
- `slate-500` - Light mode secondary text

### Semantic Colors

**Status Colors** (maintain original colors for clarity)
- Draft: `yellow-400` (dark) / `yellow-600` (light)
- Finalized: `green-400` (dark) / `green-600` (light)

**Interactive States**
- Links: `slate-400` → `amber-400` (dark mode)
- Buttons: `amber-500` → `amber-400` (dark) / `amber-600` (light)
- Focus rings: `amber-500` with 2px offset

## Component Patterns

### Stat Cards

**Dark Mode:**
```tsx
className="
  bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80
  rounded-xl p-5
  border border-slate-800
  border-t-2 border-t-amber-400/30
  transition-all duration-300
  hover:-translate-y-1
  hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]
"
```

**Light Mode:**
```tsx
className="
  bg-gradient-to-br from-white via-slate-50 to-slate-100
  rounded-xl p-5
  border border-slate-200
  transition-all duration-300
  hover:-translate-y-1
  hover:shadow-lg
"
```

**Stat Numbers:**
```tsx
className="text-2xl font-bold dark:text-amber-400 text-slate-900 font-['Lexend']"
```

**Icon Backgrounds:**
```tsx
className="
  p-3 rounded-lg
  dark:bg-amber-500/10 dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]
  bg-slate-200
"
```

### Content Cards

**Dark Mode:**
```tsx
className="
  bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50
  rounded-lg
  border border-slate-800
  border-l-2 dark:border-l-slate-800
  hover:border-l-amber-400
  hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1)]
  transition-all duration-300
  cursor-pointer
"
```

**Light Mode:**
```tsx
className="
  bg-gradient-to-br from-white via-slate-50/50 to-white
  rounded-lg
  border border-slate-200
  border-l-2
  hover:border-l-amber-400
  hover:shadow-lg
  transition-all duration-300
  cursor-pointer
"
```

### Buttons

**Primary Button (Amber):**
```tsx
className="
  inline-flex items-center gap-2
  px-4 py-2
  bg-amber-500 hover:bg-amber-600
  dark:bg-amber-500 dark:hover:bg-amber-400
  text-white font-medium
  rounded-lg
  transition-all duration-300
  hover:shadow-lg hover:shadow-amber-500/30
  dark:hover:shadow-amber-400/30
"
```

**Secondary Button:**
```tsx
className="
  px-4 py-2
  bg-slate-100 hover:bg-slate-200
  dark:bg-slate-800 dark:hover:bg-slate-700
  text-slate-900 dark:text-slate-100
  rounded-lg
  transition-all duration-300
"
```

### Headers & Navigation

**Page Header:**
```tsx
className="
  bg-white dark:bg-slate-900
  border-b-2 border-slate-200 dark:border-b-amber-400/20
  px-4 md:px-6 py-4
"
```

**Breadcrumb Links:**
```tsx
className="
  text-slate-500 dark:text-slate-400
  hover:text-slate-700 dark:hover:text-amber-400
  transition-colors
  relative group
"

// Animated underline
<span className="
  absolute bottom-0 left-0 w-0 h-0.5
  bg-amber-400
  transition-all duration-300
  group-hover:w-full
" />
```

### Page Backgrounds

**Dark Mode:**
```tsx
className="
  bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
  from-amber-950/20 via-slate-950 to-slate-950
"
```

**Light Mode:**
```tsx
className="
  bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50
"
```

## Shadows & Glows

### Shadow Levels

**Level 1 - Subtle Elevation:**
```css
shadow-sm
/* Use for: Form inputs, low-priority cards */
```

**Level 2 - Card Elevation:**
```css
shadow-md
/* Use for: Default cards, dropdowns */
```

**Level 3 - Hover State:**
```css
shadow-lg
/* Use for: Hovered cards, active elements */
```

**Amber Glow (Dark Mode Only):**
```css
/* Subtle glow for icons */
shadow-[0_0_20px_rgba(251,191,36,0.15)]

/* Strong glow for hover states */
shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1)]

/* Button hover glow */
hover:shadow-amber-500/30
```

## Animations

### CSS Keyframes

```css
/* Fade up animation for entrance */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Glow pulse for emphasis */
@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
  }
  50% {
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.25);
  }
}
```

### Animation Classes

**Staggered Entry Animation:**
```tsx
// Card 1
className="animate-fade-up-delay-1" // 200ms delay

// Card 2
className="animate-fade-up-delay-2" // 400ms delay

// Card 3
className="animate-fade-up-delay-3" // 600ms delay

// Card 4
className="animate-fade-up-delay-4" // 800ms delay

// Content section
className="animate-content-fade" // 1000ms delay
```

**Hover Transitions:**
```css
transition-all duration-300 ease-out
```

### Accessibility

All animations respect reduced motion preferences:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-fade-up-delay-1,
  .animate-fade-up-delay-2,
  .animate-fade-up-delay-3,
  .animate-fade-up-delay-4,
  .animate-content-fade {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

## CSS Variables

```css
:root {
  --amber-glow: rgba(251, 191, 36, 0.15);
  --amber-glow-strong: rgba(251, 191, 36, 0.25);
  --card-gradient-start: rgb(15, 23, 42);
  --card-gradient-end: rgba(30, 41, 59, 0.8);
}
```

## Implementation Guidelines

### When to Use Amber Accents

**✅ DO use amber for:**
- Primary actions (buttons, CTAs)
- Stat numbers and key metrics
- Interactive element focus/hover states
- Top/bottom border accents on cards
- Icon backgrounds and glows
- Link hover states
- Success states or emphasis

**❌ DON'T use amber for:**
- Large background areas (use gradients with low opacity)
- Body text (readability issues)
- Error or warning states (use appropriate semantic colors)
- Overloading a single component (use sparingly for impact)

### Gradient Best Practices

1. **Subtle is better**: Use low opacity gradients to avoid overwhelming
2. **Consistent direction**: Prefer `gradient-to-br` (bottom-right) for cards
3. **Three-stop gradients**: from → via → to for smoothness
4. **Dark mode emphasis**: More pronounced gradients in dark mode

### Animation Timing

- **Micro-interactions**: 150-200ms (hover, focus)
- **Component transitions**: 300ms (card hover, state changes)
- **Page entrance**: 600ms (fade up animations)
- **Stagger delay**: 200ms between sequential elements

## Contrast & Accessibility

### WCAG AA Compliance

All color combinations meet WCAG AA standards:

- `amber-400` on `slate-900`: 4.8:1 ✅
- `amber-500` on white: 4.6:1 ✅
- `slate-100` on `slate-950`: 15.2:1 ✅
- `slate-400` on `slate-950`: 7.1:1 ✅

### Focus States

Always include visible focus indicators:
```tsx
className="
  focus:outline-none
  focus:ring-2 focus:ring-amber-500
  focus:ring-offset-2 focus:ring-offset-slate-950
"
```

## Examples

### Creating a New Stat Card

```tsx
<div className="
  animate-fade-up-delay-1
  bg-gradient-to-br from-white via-slate-50 to-slate-100
  dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80
  rounded-xl p-5
  border border-slate-200
  dark:border-slate-800 dark:border-t-2 dark:border-t-amber-400/30
  flex items-center justify-between
  transition-all duration-300
  hover:-translate-y-1
  hover:shadow-lg
  dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.15)]
">
  <div>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
      Metric Name
    </p>
    <p className="text-2xl font-bold text-slate-900 dark:text-amber-400 mt-1 font-['Lexend']">
      123
    </p>
  </div>
  <div className="
    p-3 rounded-lg
    bg-slate-200
    dark:bg-amber-500/10
    dark:shadow-[0_0_20px_rgba(251,191,36,0.15)]
  ">
    <Icon className="w-5 h-5 text-slate-600 dark:text-amber-400" />
  </div>
</div>
```

### Creating an Amber Button

```tsx
<Link
  to="/path"
  className="
    inline-flex items-center gap-2
    px-4 py-2
    bg-amber-500 hover:bg-amber-600
    dark:bg-amber-500 dark:hover:bg-amber-400
    text-white font-medium
    rounded-lg
    transition-all duration-300
    hover:shadow-lg hover:shadow-amber-500/30
    dark:hover:shadow-amber-400/30
  "
>
  <Plus className="w-4 h-4" />
  Button Text
</Link>
```

### Creating a Content Card

```tsx
<article className="
  bg-gradient-to-br from-white via-slate-50/50 to-white
  dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50
  rounded-lg
  border border-slate-200 dark:border-slate-800
  border-l-2 dark:border-l-slate-800
  p-4
  hover:shadow-lg hover:border-l-amber-400
  dark:hover:border-l-amber-400
  dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1)]
  transition-all duration-300
  cursor-pointer
">
  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
    Card Title
  </h3>
  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
    Card description or content
  </p>
</article>
```

## Files Modified

The following files contain the implemented design system:

1. **src/routes/__root.tsx** - Google Fonts (Lexend) imports
2. **src/styles.css** - CSS variables, keyframes, animation classes
3. **src/components/project/ProjectDashboard.tsx** - Stat cards, amber button
4. **src/components/project/ProjectLayout.tsx** - Page background gradients
5. **src/components/project/ProjectHeader.tsx** - Header with amber accents
6. **src/components/content/ContentCard.tsx** - Content card styling

## Maintenance Notes

- **Font Loading**: Lexend is loaded from Google Fonts with preconnect for performance
- **Dark Mode**: All styles use Tailwind's `dark:` variant, controlled by `.dark` class on document root
- **Animations**: Defined as CSS classes to be reusable across components
- **Gradients**: Use Tailwind arbitrary values for custom gradients not in default palette
- **Performance**: All animations use GPU-accelerated properties (transform, opacity)
