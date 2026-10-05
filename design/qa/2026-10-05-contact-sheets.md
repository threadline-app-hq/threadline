# Contact sheets, Oct 5

11:12 pixel review: populated desktop feed/profile and phone Explore/profile have restrained notebook spacing and clear image-first hierarchy. Contact-sheet thumbnails still cropped photographs, inconsistent with the uncropped feed and the design direction. Changed multi-photo index thumbnails to contain the whole image on a quiet matte. Retained two phone columns, three desktop columns, and the existing large single-photo layout. Disabled hover zoom that clipped thumbnail edges.

The first containment experiment exposed intrinsic grid-child sizing on extreme 1:3 portrait fixtures. Positioned thumbnails inside their already sized buttons instead. Direct pixel inspection of the final 390px mixed-ratio index shows all border edges preserved for square, portrait and landscape fixtures. Real photo phone index and desktop populated profile also inspected; photographs remain clear without decorative chrome.

Extended mixed-photos regression across 320/390/820/1440: object-fit contains, image stays bounded to tile height, no horizontal overflow. Whole feed and modal ratios remain intact. Photo-index 1-5 photos, failed-media placeholder and 24-state unrestricted populated axe pass. Pending local batch, no publish yet. These are local fixtures, not production demo content.
