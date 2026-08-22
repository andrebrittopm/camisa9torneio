# Plan: NAV-R2 — Return from Configurator to Landing Sections

Fix navigation from the Order Configurator (and other conditional steps) back to landing page sections (#inicio, #camisa, #como-funciona).

## User Review Required

> [!IMPORTANT]
> This fix uses a centralized navigation handler that resets the current view to the landing page before scrolling to the requested section.

- Do you prefer a smooth scroll or an immediate jump when returning to the landing page? (Default: smooth)

## Technical Details

### 1. Root Cause Analysis
The landing page components (`HeroSection`, `ModelsSection`, `HowItWorks`) are conditionally rendered only when `currentStep === 'idle'`. When the user is in the configurator, summary, or review steps, these components are unmounted, so anchor links (`href="#..."`) find no targets in the DOM.

### 2. Proposed Changes

#### A. Centralized Navigation Hook
Create `src/hooks/use-av-navigation.ts` to handle cross-view navigation:
- `navigateToSection(sectionId)`:
    - If `currentStep !== 'idle'`, set `currentStep = 'idle'`.
    - Set a "pending scroll" target in state or a ref.
    - Use `useEffect` in `src/routes/index.tsx` to detect the return to `idle` and scroll to the pending target once the DOM is ready.

#### B. Header & Footer Integration
- Update `Header.tsx` and `Footer.tsx` to use `useAvNavigation`.
- Replace direct `href="#..."` behavior with the hook's `navigateToSection` call, while keeping the `href` for accessibility/SEO.

#### C. Index Synchronization
- Update `src/routes/index.tsx` to listen for pending navigation targets and perform the scroll after remounting the landing sections.

### 3. Verification Plan

#### Automated Tests (Playwright)
- Navigate to the configurator.
- Click "Início" in the header.
- Verify view switches to landing and scrolls to hero.
- Repeat for "Camisa" and "Como funciona" from all steps (Summary, Review).
- Verify cart items are preserved during this navigation.

#### Manual Verification
- Check mobile menu navigation from configurator.
- Check footer navigation from configurator.
