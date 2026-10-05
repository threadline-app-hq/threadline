# Threadline: field notes, not a template

Working direction, Oct5. Original owner: the live screenshots still look AI-made; one week to improve them. This document is a design hypothesis, not permission or completion.

## Critique of current screenshots
- Rounded white panels, violet buttons, gradient initials and seven undifferentiated icons read like a starter social app.
- Marketing copy promises a feeling rather than showing actual use. Three numbered features and italic hero copy are familiar landing-page furniture.
- Same border radius across photo, control and dialog erases hierarchy.
- Feed forcibly crops every image4:5. A photographer's composition should matter more than a uniform card.
- Profile gives one photo a tiny third-width tile and a mostly empty page. Empty states need specific actions, not a floating generic symbol.
- Visible2.0 badges are implementation branding, not the identity of a social space.

## Original design hypothesis
A photographic field notebook. Warm paper, near-black ink, one rust accent. A stitched mark made from two open brackets, not a stock logo. Instrument Sans for tools/body; Instrument Serif only for a few editorial titles. Thin dividers, less container chrome, selective small-radius controls. Names, dates and captions align on an8px rhythm. Photos retain composition. Display headlines have breathing room without ornamental gradients or glass. No borrowed brand assets.

## Motion
Use150ms control feedback,200ms dialog arrival, short photo crossfade. No continuous glow, drifting cards, springy whole-page bounce, or animation to make an empty page look busy. Preserve OS reduced-motion preference. Story progress is functional and separately pauseable.

## References actually inspected
- Cosmos desktop public landing (Oct5): centered headline, sparse navigation, near-white canvas, black controls. https://www.cosmos.so/ . Lesson: eliminate competition with visual content, not copy its composition.
- Are.na Sander article (Nov1,2023): official goals are speed, accessibility and responsiveness. https://www.are.na/editorial/introducing-sander-our-new-web-client . Desktop pixels: austere type-led black page; embedded media was still loading, not evidence of finished interface quality.
- VSCO Blogs desktop public page: large image-led hero, compact uppercase navigation. Cookie banner obscured lower page; no claim about lower layout. https://www.vsco.co/features/blogs . Lesson: photographs can establish identity without decorative UI.
- Instrument typefaces: official specimens and OFL license. Fonts downloaded from google/fonts repository, license copies kept with them. https://fonts.google.com/specimen/Instrument+Sans ; https://fonts.google.com/specimen/Instrument+Serif ; https://github.com/Instrument/instrument-sans/blob/master/OFL.txt ; https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt . Self-host, no third-party font request.
- W3C motion guidance: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html . Nonessential interaction motion must be suppressible atAAA. WCAG22 normal text contrast target4.5:1 and large text3:1: https://www.w3.org/TR/WCAG22/ . Existing axe checks stay in the acceptance set; no manual certification claim.

## Acceptance
Phone320/390/430, tablet820, desktop1280/1440; all tabs and populated/empty/error/busy states. Check actual pixels, touch, keyboard focus, contrast, motion, long names and text scaling. Preserve existing auth/media/ownership/race protections. No production demo content except specifically approved and fully cleaned. No paid fonts or services.
