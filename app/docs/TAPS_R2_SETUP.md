# TAPS — Cloudflare R2 setup

TAPS stores source files in a private R2 bucket and serves only processed, watermarked derivatives through authenticated application routes.

## 1. Create the bucket

1. Open Cloudflare Dashboard → Storage & databases → R2.
2. Create a bucket named `trampillera-private-assets` (or another private name).
3. Keep the bucket private. Do not enable public development URLs, public custom domains, or public bucket access.
4. Keep the bucket name for the Render environment.

## 2. Create a bucket-scoped API token

1. In R2 Overview, open Manage API Tokens.
2. Create an R2 API token with **Object Read & Write**.
3. Restrict it to this bucket only.
4. Copy the Access Key ID and Secret Access Key immediately. Cloudflare does not show the secret again.
5. Do not paste credentials into GitHub, source files, issues, or this chat.

TAPS needs object read/write access for upload and storage round-trip verification. It does not need account-wide bucket administration.

## 3. Add environment variables in Render

Open the TRAMPILLERA web service → Environment and add:

| Key | Value |
| --- | --- |
| `TAPS_S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `TAPS_S3_BUCKET` | Your private bucket name |
| `TAPS_S3_REGION` | `auto` |
| `TAPS_S3_ACCESS_KEY_ID` | R2 Access Key ID |
| `TAPS_S3_SECRET_ACCESS_KEY` | R2 Secret Access Key |

Use the account endpoint shown by Cloudflare. If the bucket was created in a jurisdiction, use that jurisdiction's endpoint instead.

Save the variables. Render will restart/redeploy the service.

## 4. Verify

After deployment, sign in as the administrator and request:

`GET /api/control/taps/status`

Expected storage fields:

- `configured: true`
- `reachable: true`
- `missingConfiguration: []`

Then upload a test image to:

`POST /api/control/assets/ingest`

Send the raw image bytes with an allowed Content-Type (`image/jpeg`, `image/png`, `image/webp`, or `image/avif`) and these headers:

- `X-Asset-Title` — required
- `X-Rights-Holder` — optional; defaults to `UNCONFIRMED`
- `X-Source-Credit` — optional
- `X-License-Label` — optional; defaults to `Permission required`

The upload limit is 20 MB and 40 megapixels. A successful response must report `pipelineState: VERIFIED` and `watermarkState: EMBEDDED`. The protected preview is available only through the authenticated application route returned in the response.

## Security notes

- Original objects are private by bucket policy and are never exposed through a public URL.
- The application writes a separate WebP derivative with a visible TRAMPILLERA watermark and asset identifier.
- TAPS reads the original and derivative back from R2 and compares SHA-256 hashes before marking the asset VERIFIED.
- Legacy files already present in the public web directory are not automatically moved or reclassified. They remain legacy/public until separately reviewed and migrated.
- Keep R2 credentials in Render environment variables only. Rotate the token if it is exposed.
