# ETAPA 14.1 — Interactive Front/Back Viewer

Implement a specialized viewer within the existing lightbox to allow users to toggle between front and back views for the official tournament uniforms (TSHIRT-01 and TANK-01).

## Technical Details

### 1. Unified Asset Mapping
- The `av-catalog` server route currently maps specific images to `TSHIRT-01` and `TANK-01`.
- I will prepare the frontend to handle `front_image_url` and `back_image_url` from the catalog data.
- Fallback logic: If a model only has `image_url` (or just `front_image_url`), the toggle controls will be hidden.

### 2. Lightbox Enhancement
- Modify `ModelGallery` in `src/components/ModelsSection.tsx` to:
    - Add a "Segmented Control" style toggle (FRENTE / COSTAS) when a back image is available.
    - Ensure smooth transitions between views using `AnimatePresence`.
    - Maintain the existing 2.5x zoom functionality for whichever side is active.

### 3. Data Normalization
- Update `av-catalog.ts` to explicitly provide `front_image_url` and `back_image_url` for the official models.
- For `TANK-01`, since the current image contains both front and back, I will investigate if individual assets exist. If not, I will preserve the composite image as the "Front" view and report the need for separate assets.

## Proposed Changes

### Components
- `src/components/ModelsSection.tsx`: Enhance `ModelGallery` component with the new toggle UI and multi-angle support.

### Server
- `src/routes/api/public/av-catalog.ts`: Update image mapping to separate front/back URLs where possible, ensuring backward compatibility.

### User Interface
- Modern toggle controls (Segmented Control) in the lightbox.
- Active view indicators.
- Responsive design for mobile (375px+) and desktop.
