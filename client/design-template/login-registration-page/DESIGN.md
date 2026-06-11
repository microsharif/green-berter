# Design System Strategy: The Regenerative Exchange

## 1. Overview & Creative North Star: "Organic Editorial"
This design system rejects the "cookie-cutter" marketplace aesthetic in favor of **Organic Editorial**. While most community platforms feel like rigid spreadsheets, this system treats community sharing as a high-end, sustainable lifestyle magazine. 

The "Creative North Star" is to move from "utility" to "advocacy." We achieve this through **Intentional Asymmetry**—where images and text blocks slightly offset to create a rhythmic, human flow—and **Tonal Depth**, using stacked surfaces rather than lines to define space. The result is a platform that feels breathing and alive, mirroring the regenerative nature of a circular economy.

---

## 2. Colors & Surface Architecture
Color here is functional, not just decorative. We use a sophisticated Material 3-based palette to distinguish between types of community interaction.

### The Palette
*   **Primary (#0d631b):** The "Giving" signal. Used for donation-based CTA’s and "Free" badges.
*   **Secondary (#005faf):** The "Exchange" signal. Used for swap requests and trade interactions.
*   **Tertiary (#923357):** Reserved for "Impact" moments (e.g., carbon savings or community milestones).
*   **Surface System:** Ranging from `surface-container-lowest` (#ffffff) to `surface-dim` (#dcd9d9).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined solely through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation a modern eye needs. Lines create visual noise; tonal shifts create "zones."

### The "Glass & Gradient" Rule
To elevate the "Sustainability" vibe, use **Glassmorphism** for floating elements like the sticky header. Apply a backdrop-blur (12px-20px) to `surface-container-low` at 80% opacity. For primary CTAs, apply a subtle linear gradient from `primary` to `primary_container` to give the button a tactile, "gem-like" quality that flat hex codes lack.

---

## 3. Typography: The Curated Voice
We utilize a dual-typeface system to balance authority with accessibility.

*   **Display & Headlines (Manrope):** We use Manrope for all `display` and `headline` scales. Its geometric but slightly rounded nature feels modern and optimistic. 
    *   *Editorial Tip:* Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero sections to create a high-end magazine feel.
*   **Body & UI (Inter):** We use Inter for all `title`, `body`, and `label` scales. Inter is the industry standard for legibility at small sizes, ensuring the platform remains accessible to all community members.
*   **Hierarchy as Identity:** Large, bold headlines paired with generous `body-md` (0.875rem) text creates a sophisticated contrast that guides the user’s eye without the need for heavy icons.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "muddy." This system uses **Tonal Layering** and **Ambient Light** to convey hierarchy.

*   **The Layering Principle:** Stack surfaces to create importance. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift.
*   **Ambient Shadows:** If a "floating" element (like a FAB or Modal) requires a shadow, use a 32px blur with 6% opacity. The shadow color should be a tinted version of `on-surface` (#1b1c1c), never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline-variant` token at 15% opacity. It should be felt, not seen.

---

## 5. Components & Interface Patterns

### Cards (The Product Showcase)
*   **Style:** No borders. Use `surface-container-lowest` background. 
*   **Layout:** Image-first, with a 5% "inset" for the content padding to give the imagery room to breathe. 
*   **Interaction:** On hover, transition the background to `surface-container-high`.
*   **Rule:** Forbid divider lines within cards. Use `1.5` (0.375rem) and `4` (1rem) spacing shifts to separate the product title from the donor's name.

### Buttons (The Intentional Act)
*   **Primary (Give/Take):** High-radius (`full` - 9999px), using the `primary` gradient. 
*   **Secondary (Exchange):** Outlined with a "Ghost Border" or `secondary_fixed` background for a softer presence.
*   **Sizing:** Use `6` (1.5rem) vertical padding for hero buttons to ensure they feel "prominent" as per the creative brief.

### Chips (The Categorizers)
*   **Sustainability Badges:** Use `primary_fixed` with `on_primary_fixed` text for "Eco-Friendly" tags. 
*   **Status Badges:** Use `secondary_fixed` for "Swap Available" tags. 
*   **Shape:** Always use the `full` roundedness scale to keep the aesthetic "organic" and friendly.

### Sticky Header
*   **Treatment:** Use a semi-transparent `surface` with a 20px blur. The sticky header should feel like a pane of frosted glass moving over the content, maintaining the "No-Line" rule even when scrolling.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins (e.g., 8rem on the left, 4rem on the right) for hero text to break the "template" look.
*   **Do** prioritize white space. If a section feels crowded, double the spacing value (e.g., move from `10` to `20`).
*   **Do** use `primary_container` (#2e7d32) for large background blocks to create a "lush" sustainability feel.

### Don't:
*   **Don't** use 100% black (#000000). Use `on_surface` (#1b1c1c) for text to maintain a premium, softer contrast.
*   **Don't** use standard drop shadows with high opacity.
*   **Don't** use dividers or horizontal rules (`<hr>`). Use a 40px - 80px (Scale `10` to `20`) vertical gap to signify a new section.
*   **Don't** use sharp corners. Every container must use at least `DEFAULT` (0.5rem) or `lg` (1rem) roundedness to maintain the "Organic" North Star.