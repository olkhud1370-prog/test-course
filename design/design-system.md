# The Linden Bookshop — Visual design system

## Implementation brief
Restyle the existing Find Their Next Great Read course. Preserve its approved copy, screen order, branching, reader profile, feedback, and state. This guide governs presentation, not instructional changes. Use the accompanying brand-board.png as a visual reference, not as a flattened course screen.

## Brand
Contemporary independent bookshop; literary editorial, quietly confident, welcoming. Avoid faux vintage paper, generic SaaS dashboards, excessive cards, gradients and ornamental clutter.

## Tokens
- Canvas: #F5F0E6; paper: #FFFCF6; primary forest: #29483D; ink: #302B26; secondary ink: #625B52; sage: #A6B19A (decorative only); pale sage: #E5EADF; burgundy: #803F46; border: #D8D0C3.
- Headings: Lora, Georgia, serif; body: Source Sans 3, system-ui, sans-serif. Use local fonts if available; otherwise use fallbacks. Body 18px, line height 1.55; labels 13–14px; H1 clamp(36px,5vw,64px); H2 32–40px.
- Spacing: 8, 16, 24, 32, 48, 64px. Corners 4–8px. Fine rules instead of heavy shadows. Max content width 1120px.

## Layout and navigation
Persistent compact header with wordmark, module title and step indicator. Main content uses generous margins and a consistent footer with Back and Continue. On mobile stack columns and allow natural scrolling; never force fixed slide height. Primary buttons forest with white text; secondary buttons outlined forest. Visible focus ring with offset. Selected items use border plus text or check icon, not color alone.

## Screen direction
1. Welcome: asymmetrical editorial split, large serif title left, bookshop photography right; use assets/bookshop-interior.jpg. Keep the introduction and CTA prominent.
2. Ask / Listen / Match: horizontal numbered tabs with active underline; one content panel, short bullets and a pale sage example inset. Stack tabs or allow wrapping on small screens.
3. Conversation: two-column layout, dialogue on left with assets/alex-portrait.jpg, reader profile on right. Use restrained speech panels and clearly labeled response buttons. Profile resembles a bookseller's notes, with discovered preferences listed as text. Do not reveal undiscovered preferences. No fake chat typing delays.
4. Recommendation: four fictional covers in an editorial shelf grid; use supplied JPG covers. Each title and description remains readable outside the image. Keep reader profile visible. Selected book gets a forest outline and explicit Selected label. Feedback explains fit and allows revision.
5. Summary: spacious editorial layout, Ask / Listen / Match as three numbered principles and a highlighted example recommendation. Restart remains available.

## Icons and accessibility
Use simple 24px outline SVG icons, 1.7–2px stroke, rounded joins, consistent forest or ink. Icons accompany text; never rely on icon alone. Use semantic buttons and tabs, keyboard focus, accessible names, live feedback where appropriate, reduced-motion support, and WCAG AA contrast. Decorative SVGs use empty alt text; book cover titles are repeated in HTML. Verify contrast and keyboard behavior in the actual build.

## Assets
Use brand-board.png as the visual authority. Use assets/brand-lockup.jpg for the welcome brand treatment or assets/logo.svg for compact navigation. Use assets/bookshop-interior.jpg as a wide photographic banner (do not stretch into portrait). Use assets/alex-portrait.jpg as a small circular avatar. Use assets/lantern-house.jpg, last-witness.jpg, hollow-crown.jpg and secrets-ashwood.jpg as the four book covers, with object-fit: contain. Keep titles and descriptions in accessible HTML. These are crops from the approved generated brand board, not independent high-resolution photographs. Do not enlarge the portrait or covers excessively. Use inline outline SVG icons matching the board. No external image dependencies.

## Acceptance
Test all existing conversation and recommendation paths after restyling. Preserve instructional logic and progress. Verify desktop and mobile layout, no clipped text, keyboard navigation, visible focus, and working restart. Report any unresolved issues. Commit and push to the existing working branch.
