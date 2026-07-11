# Media

## Current Media Architecture

Photos:

- Listing photos exist through Supabase Storage.
- Relevant tables/buckets include `vehicle.profile_media`, `vehicle-photos`, and `listing-media`.
- Listing cards use cover/card data from public views.

Videos:

- `marketplace.listing_videos` exists.
- `/video` is the OTOYALI Video route.
- The public video view is named `ff_akis_videos` for historical reasons.
- Home/Search/listing cards do not load actual video files; they may show lightweight video metadata or badges.

Known current warning:

- `SafeImage` uses `<img>` and Next.js warns about image optimization. This is accepted for now.

## Current Limits

- Video upload target: up to 60 seconds.
- Max video size: 100 MB.
- Recommended orientation: vertical.
- Supported MIME types in UI: mp4, webm, quicktime where supported.

## Future MEDIA-01: Image Compression And Thumbnails

Planned variants:

- `original_url`
- `large_url`
- `card_url`
- `thumb_url`

Rules:

- Cards should not load original large images.
- Detail pages can prefer large images.
- Keep existing `url` fields backward-compatible.

## Future MEDIA-02: Video Processing

Planned outputs:

- original
- processed 480p/720p
- poster
- `processing_status`

Do not implement FFmpeg/transcoding inside the web app.

## Future MEDIA-03: License Plate Blur For Photos

Future workflow:

- detect plate
- create blurred processed image
- keep manual fallback/moderation path

Do not claim plate blur is active today.

## Future MEDIA-04: License Plate Blur For Videos

Future workflow:

- detection
- tracking
- re-encode
- manual fallback

Do not claim video plate blur is active today.
