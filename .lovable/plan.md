# Implementation Plan - 9º Torneio Amigos do Vôlei Landing Page

Create a premium, modern, and futuristic landing page for the 9th Amigos do Vôlei Tournament, focusing on visual foundation, design system, and navigation.

## User Review Required

> [!IMPORTANT]
> The request mentions a logo was sent, but I don't have access to external files not uploaded to this chat. I will use a placeholder or a text-based logo for now.

- **Logo:** Are there specific images or assets I should use for the shirts or the tournament logo?
- **3D Model:** I will create a placeholder "Product Stage" as requested. Should it be a simple 3D-looking card or a CSS-animated silhouette?

## Proposed Changes

### Design System & Identity
- Update `src/styles.css` with the specified color tokens:
  - Azul Royal (#0332AD), Azul Profundo (#071F66), Amarelo Ouro (#FCC307), Ouro Escuro (#C38812), Branco Gelo (#F4F2F1).
- Configure typography using Sora/Space Grotesk for headings and Inter for body.
- Apply a "Future Arena" aesthetic: dark navy background, subtle glow, grids, and court-like markings.

### Components
- **Header:** Transparent with glassmorphism on scroll, desktop/mobile navigation.
- **HeroSection:** 50/50 layout with high-impact typography, badges, and a "Product Stage" for the future 3D model.
- **ProductStage:** Elegant placeholder area with floating/lighting animations.
- **ModelsSection:** Tabbed interface (Camiseta/Regata) with large model cards.
- **ModelCard:** Premium card with hover effects, prepared for future image/3D data.
- **CustomizationPreview:** Mockup of the jersey configurator (size, name, number).
- **HowItWorks:** Modern 4-step process section.
- **FinalCTA:** High-impact call to action section.
- **Footer:** Simple branding and info.

### Structure & Data
- Define a central `shirtModels` mock data structure in `src/lib/constants.ts`.
- Set up a conceptual `/admin` route.
- Ensure "Mobile First" responsiveness and smooth micro-interactions.

## Technical Details

- **Tailwind v4:** Using `@theme` for design tokens.
- **TanStack Start:** Component-based architecture with standard routing.
- **Lucide React:** For modern, discrete icons.
- **Framer Motion:** For premium animations and transitions.

## Security Considerations

- None for this stage as no backend, auth, or forms are being implemented.
- RLS and Auth will be handled in future stages as requested.
