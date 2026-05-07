# Design System: The Kinetic Architect

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Architect"**
In lead management, data is static until it is acted upon. This design system rejects the "flat dashboard" trope in favor of a high-performance, editorial environment. We view the UI not as a collection of boxes, but as a series of intentional, architectural planes. 

The aesthetic is **Precise, Professional, and Kinetic**. We achieve this by breaking the rigid 12-column grid with intentional white space, using "Display" typography as a structural element, and utilizing tonal depth rather than lines to define boundaries. This is about movement through precision—where every pixel serves a function and every transition feels like a well-oiled machine.

---

## 2. Colors & The Surface Philosophy
The palette is built on high-contrast tension: vibrant action points cutting through deep, architectural slates.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders for sectioning or layout containment. 
*   **The Method:** Define boundaries solely through background shifts. For example, a `surface-container-low` section sitting on a `surface` background.
*   **The Goal:** A seamless, sophisticated interface that feels "carved" rather than "outlined."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create depth:
*   **Layer 0 (Base):** `surface` (#faf8ff)
*   **Layer 1 (Sections):** `surface-container-low` (#f2f3ff)
*   **Layer 2 (Feature Cards):** `surface-container` (#eaedff)
*   **Layer 3 (Floating Actions):** `surface-container-highest` (#dae2fd)

### The "Glass & Gradient" Rule
To escape the "SaaS-in-a-box" look:
*   **CTAs:** Use a subtle linear gradient from `primary` (#0058be) to `primary_container` (#2170e4) at a 135° angle. This adds "soul" and weight.
*   **Floating Navigation:** Apply `surface_variant` with 70% opacity and a `24px` backdrop-blur to create a "frosted glass" effect for persistent headers or sidebars.

---

## 3. Typography: The Editorial Engine
We pair the structural strength of **Manrope** for headlines with the functional clarity of **Inter** for data.

*   **Display (Manrope):** Use `display-lg` (3.5rem) with negative letter-spacing (-0.02em). This is your architectural anchor. Use it for "Hero" lead counts or major section headers.
*   **Headline (Manrope):** `headline-md` (1.75rem) should be used for card titles. It conveys authority and precision.
*   **Body & Labels (Inter):** `body-md` (0.875rem) is our workhorse. For lead data and CRM tables, use `label-md` in all-caps with +0.05em tracking to ensure high-performance readability.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "muddy." We use **Tonal Layering** and **Ambient Light** to convey hierarchy.

### The Layering Principle
Instead of a drop shadow, elevate a card by placing a `surface-container-lowest` (#ffffff) element on top of a `surface-container-low` (#f2f3ff) background. The 2% shift in brightness provides a cleaner, more modern "lift."

### Ambient Shadows
When a component must float (e.g., a Modal or Popover):
*   **Shadow:** `0px 20px 40px rgba(19, 27, 46, 0.06)`
*   **The Logic:** The shadow is tinted with `on_surface` (#131b2e) rather than pure black. It is extra-diffused to mimic natural light in a professional studio.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., Input fields):
*   Use `outline_variant` at **20% opacity**. It should feel like a suggestion of a line, not a hard stop.

---

## 5. Components: Precision Primitives

### Buttons (The Kinetic Action)
*   **Primary:** Gradient of `primary` to `primary_container`. 8px (`md`) radius. Text: `label-md` bold.
*   **Secondary:** Ghost style. No background, `outline` token at 20% opacity.
*   **Kinetic State:** On hover, the primary button should shift 2px up with an increased ambient shadow, simulating physical "readiness."

### Lead Cards & Lists
*   **Strict Rule:** No dividers. Use `24px` (xl) vertical spacing to separate lead entries.
*   **Structure:** Use a `surface-container-low` background for the entire list, and individual `surface-container-lowest` tiles for each lead to create a "floating" effect without lines.

### Inputs (The Data Entry)
*   **Default:** `surface_container_lowest` background. No border.
*   **Active:** 1px "Ghost Border" using `primary`.
*   **Focus:** A subtle `primary` outer glow (4px blur, 10% opacity).

### Kinetic-Specific Components
*   **Performance Metric Chips:** High-contrast `tertiary` (#924700) text on `tertiary_fixed` (#ffdcc6) background to highlight "hot" leads or urgent tasks.
*   **The "Architect" Timeline:** A vertical stepper for lead history using the `outline_variant` as a 2px track, but only connecting active nodes to emphasize momentum.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Place lead metrics off-center to create a dynamic, editorial feel.
*   **Embrace High Contrast:** Let the "Deep Slates" provide the gravity and the "Electric Blue" provide the energy.
*   **Layer Surfaces:** Think in 3D. Always ask: "Is this element sitting on or cut into the surface?"

### Don’t:
*   **Don't use 1px Dividers:** They clutter the "Kinetic" flow. Use space and color shifts.
*   **Don't use Rounded-Full on Buttons:** Keep the `0.75rem` (md) radius. It feels more "Architectural" and less "Social Media."
*   **Don't use standard Grey Shadows:** Always tint shadows with the `on_surface` color for a premium, integrated look.