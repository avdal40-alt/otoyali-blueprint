# Media

## Image Variant Strategy

MEDIA-01 uses the existing `vehicle.profile_media` table and adds only missing metadata/path fields.

Image variants:

- `original`: source-safe browser-optimized original, max dimension about 2400 px.
- `large`: listing detail gallery image, max dimension about 1600 px.
- `card`: Home/Search/listing card image, max dimension about 800 px.
- `thumb`: gallery/admin thumbnail image, max dimension about 300 px.

Fallback order:

- Listing card: `card_url` -> `large_url` -> `url` -> `thumb_url` -> `original_url`.
- Listing detail main image: `large_url` -> `original_url` -> `url` -> `card_url` -> `thumb_url`.
- Gallery/admin thumbnail: `thumb_url` -> `card_url` -> `large_url` -> `url` -> `original_url`.

Legacy media rows with only `url` and `storage_path` continue to render.

## Upload Flow

`/sell` preprocesses images in the browser before upload:

- accepted formats: JPEG, PNG, WebP
- max source file size: 10 MB
- variants are generated through canvas APIs
- EXIF orientation is handled where `createImageBitmap` supports it
- object URLs are used for immediate preview and revoked after success/removal

New storage path convention:

```text
listing-media/
  {userId}/
    {vehicleProfileId}/
      {mediaId}/
        original/original.webp
        large/large.webp
        card/card.webp
        thumb/thumb.webp
```

If browser processing fails, publishing can still store the legacy fallback file and marks `processed_status = failed`.

## Database Fields

Current image fields:

- `url`, `storage_path`
- `original_url`, `large_url`, `card_url`, `thumb_url`
- `original_path`, `large_path`, `card_path`, `thumb_path`
- `width`, `height`, `aspect_ratio`, `mime_type`, `size_bytes`
- `processed_status`, `processing_error`, `processed_at`
- `blur_status`, `has_detected_plate`

Current `processed_status` values come from WEB-07:

- `pending`
- `processing`
- `processed`
- `failed`
- `skipped`

Current `blur_status` values come from WEB-07:

- `not_started`
- `processing`
- `blurred`
- `failed`
- `manual_required`
- `skipped`

MEDIA-01 does not perform plate blur or AI moderation.

## Public Views

- `ff_home_listings.cover_image_url` prefers `card_url`.
- `ff_listing_details.cover_image_url` prefers `large_url`.
- `ff_listing_media` exposes variant URL and metadata columns appended after existing columns.
- `ff_listing_media` is restricted to active, moderation-active listings.

Do not reorder existing public view columns.

## Security

- Owners upload/delete through existing `listing-media/{userId}/...` storage path policies.
- Owners can read their own pending media through RLS.
- Admins can read `vehicle.profile_media` through `profile_media_select_admin` for moderation.
- Public database views only expose media for active and moderation-approved listings.
- The storage bucket is currently public for backward compatibility; do not rely on obscurity for private data.

## Future Worker

Future MEDIA-02 can add a server-side worker for:

- legacy image backfill
- server-side compression
- duplicate hash
- plate/person detection
- automatic blur
- watermarking
- unsafe-content checks

Future task: `MEDIA-01B - Backfill legacy image variants`.

Do not implement FFmpeg, video transcoding, AI moderation, or automatic plate blur in the web app.

## Video

OTOYALI Video remains separate:

- no video files on Home/Search/SEO
- `/video` may load video elements with minimal preload
- WEB-07 future processing fields remain placeholders
