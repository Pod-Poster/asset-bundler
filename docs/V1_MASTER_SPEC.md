# V1 Master Specification

## Overview

A GitHub Actions cron worker that polls a Core API for `IMAGE_PROCESS` jobs, transforms images, uploads outputs to Cloudflare R2, and calls back job completion.

## Requirements

- Node.js + TypeScript
- Use `sharp` for image transforms
- Use AWS SDK S3 client configured for Cloudflare R2
- Runs every minute (cron)
- Never log secrets

## API Protocol

### Fetch Jobs

```
GET {CORE_BASE_URL}/jobs/next?type=IMAGE_PROCESS&limit=2
Header: X-WORKER-TOKEN: <token>
```

**Response:** Array of job items (or wrapped in `{ jobs: [] }`):

```json
[
  {
    "job_id": "string",
    "design_version_id": "string",
    "source_download_url": "string",
    "upload_prefix": "string",
    "callback_complete_url": "string"
  }
]
```

### Job Completion Callback

```
POST {callback_complete_url}
Header: X-WORKER-TOKEN: <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "bundle_prefix": "string",
  "manifest_json": {
    "generated_at": "ISO8601 timestamp",
    "files": [
      {
        "file": "print/shirt.png",
        "width": 4500,
        "height": 5400,
        "size": 12345
      }
    ]
  }
}
```

## Image Processing

### Input

- Download source image from `source_download_url`

### Outputs

All images are trimmed of transparency before resizing:

| File | Dimensions |
|------|------------|
| `print/shirt.png` | 4500 x 5400 |
| `print/sticker.png` | 2800 x 2800 |
| `print/hat.png` | 2400 x 2400 |

### Manifest

Generate `manifest.json` containing:
- `generated_at`: ISO8601 timestamp
- `files`: Array of file entries with `file`, `width`, `height`, `size`

## R2 Upload

Upload all outputs to Cloudflare R2 under the job's `upload_prefix`:

```
{upload_prefix}/print/shirt.png
{upload_prefix}/print/sticker.png
{upload_prefix}/print/hat.png
{upload_prefix}/manifest.json
```

Example prefix: `bundles/{design_version_id}/`

## Deliverables

| File | Purpose |
|------|---------|
| `.github/workflows/worker.yml` | Cron workflow (every minute) |
| `src/worker.ts` | Main worker entry point |
| `src/image.ts` | Image download and transformation |
| `src/r2.ts` | R2 client and upload logic |
| `docs/SECRETS.md` | Required secrets documentation |
| `package.json` | Scripts: `build`, `lint`, `start`, `run` |

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `CORE_BASE_URL` | Base URL of the Core API |
| `WORKER_TOKEN` | Authentication token for API requests |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key |
| `R2_BUCKET` | R2 bucket name |

## Security

- Secrets must only be referenced via environment variables
- Logs must never print secret values
- No secrets committed to the repository
