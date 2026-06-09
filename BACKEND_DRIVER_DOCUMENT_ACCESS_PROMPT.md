# Backend Prompt: Admin Driver Document Access for KYC and Operations

Implement backend support so the admin portal can always list, view, and download uploaded driver documents from the Supabase storage bucket.

## Current Problem

The admin frontend is already wired to show driver documents, but the documents are not reliably visible in the UI even though the files exist in the Supabase bucket.

Current frontend expectations:

- driver queue list is fetched from `GET /drivers/admin/list`
- one driver profile is fetched from `GET /drivers/{driver_id}`
- document approve action uses `PATCH /drivers/{driver_id}/documents/{document_id}/approve`
- document reject action uses `PATCH /drivers/{driver_id}/documents/{document_id}/reject`

The frontend expects driver document metadata to be returned in the driver payload, but the backend response appears to be missing the document objects and/or usable file URLs for admin viewing.

## Goal

Make uploaded driver KYC documents accessible to authorized admin users in the admin portal.

Admins must be able to:

- see document completeness in the driver KYC queue
- open a driver and see all uploaded documents
- view each document inline in the admin UI
- open each document in a new tab
- download each document
- approve or reject individual documents

This is read-only for file access. Admins must not be able to overwrite or upload replacement files through the viewer endpoints unless an explicit upload endpoint already exists for that workflow.

## Required Data Source

The backend should use the existing Supabase storage bucket that already contains uploaded driver documents.

Known frontend storage assumptions:

- bucket name is `driver-documents`
- documents are associated to a `driver_id`
- each document should map to a `document_type`
- the admin frontend can consume either public URLs or short-lived signed URLs

If the bucket is private, the backend must generate signed URLs for admin use.

## Required Admin Roles

Allow document visibility only for admin roles that should perform KYC and operations work.

Minimum expectation:

- `super_admin`: full access
- `operations`: full access
- `support`: optional only if product/security approves
- `finance`: no KYC document access by default
- `readonly`: no KYC document access by default

The backend must enforce these rules server-side.

## Required Endpoints

Use the existing endpoints if possible and extend them to include document data.

### 1. Driver queue list

`GET /drivers/admin/list`

Required behavior:

- returns drivers for queue tabs such as `pending`, `under_review`, `approved`, `rejected`, `suspended`
- includes enough document metadata to show document completeness in the list
- should not require the frontend to guess from random raw fields

Required fields per driver row:

```json
{
  "id": "driver_123",
  "full_name": "Kin",
  "phone_number": "+243...",
  "verification_status": "approved",
  "document_count": 8,
  "required_document_count": 10,
  "documents": [
    {
      "id": "doc_1",
      "document_type": "national_id",
      "status": "approved",
      "file_url": "https://... or signed url",
      "file_name": "national_id_1712345678.jpg",
      "mime_type": "image/jpeg",
      "uploaded_at": "2026-06-09T09:15:00Z"
    }
  ]
}
```

If returning full `documents[]` in the list is too heavy, then at minimum return:

```json
{
  "document_count": 8,
  "required_document_count": 10,
  "document_types_present": [
    "national_id",
    "selfie_with_id",
    "drivers_license"
  ]
}
```

### 2. Driver detail

`GET /drivers/{driver_id}`

Required behavior:

- returns the full driver profile
- includes full document metadata for every uploaded file
- includes a usable viewer/download URL for each document
- works for approved drivers as well as pending drivers

Required document shape:

```json
{
  "documents": [
    {
      "id": "doc_abc",
      "document_type": "national_id",
      "status": "approved",
      "file_url": "https://signed-or-public-url",
      "open_url": "https://signed-or-public-url",
      "download_url": "https://signed-or-public-url",
      "file_name": "national_id_1712345678.jpg",
      "mime_type": "image/jpeg",
      "uploaded_at": "2026-06-09T09:15:00Z",
      "rejection_reason": null
    }
  ]
}
```

`file_url`, `open_url`, and `download_url` may point to the same URL if that is sufficient.

## Required Document Types

The admin UI is built around these required document types:

- `national_id`
- `selfie_with_id`
- `drivers_license`
- `vehicle_registration`
- `insurance`
- `profile_photo`
- `vehicle_photo_front`
- `vehicle_photo_back`
- `vehicle_photo_left`
- `vehicle_photo_right`

The backend should preserve these exact values in `document_type`.

## URL Requirements

The frontend needs URLs that can actually be rendered in-browser.

Required behavior:

- image documents must open directly in the browser
- PDF documents must open directly in the browser
- URLs must not immediately expire while the admin is reviewing the page
- if signed URLs are used, use a practical TTL such as 15 to 60 minutes
- URLs must be regenerated on each detail/list fetch if needed

If signed URLs expire quickly, the backend should document the TTL and return fresh URLs on every fetch.

## Content-Type Requirements

The admin UI needs to know whether a file is an image or PDF.

Please return:

- `mime_type`
- `file_name`
- optionally `file_extension`

Examples:

- `image/jpeg`
- `image/png`
- `application/pdf`

## Required Document Completeness Logic

The frontend should not have to infer completeness from arbitrary fields.

Please return:

- `document_count`
- `required_document_count`
- `document_types_present`
- optionally `missing_document_types`

Example:

```json
{
  "document_count": 7,
  "required_document_count": 10,
  "document_types_present": [
    "national_id",
    "selfie_with_id",
    "drivers_license"
  ],
  "missing_document_types": [
    "insurance",
    "vehicle_photo_right"
  ]
}
```

## Visibility Requirements in Admin UI

Backend work is successful when the frontend can do all of the following without extra storage logic on the client:

- show `8/10` or similar in the KYC queue list
- show documents for drivers in the `approved` tab, not only pending approvals
- open a driver from any queue tab and immediately see document metadata
- render uploaded images inline
- render PDFs inline or with a browser-native PDF viewer
- download any uploaded document

## Security and Privacy Requirements

- do not expose KYC document URLs to normal rider/driver tokens
- only admin-authorized roles may fetch document metadata or signed URLs
- document URLs should not be permanently public unless product/security has approved that model
- if using signed URLs, prefer short-lived signed URLs over globally public bucket access
- audit log access to document views if your backend already supports admin audit logging

## Failure Handling

Please return explicit signals instead of silently hiding documents.

Recommended behavior:

```json
{
  "documents": [],
  "document_count": 0,
  "required_document_count": 10,
  "document_access_error": null
}
```

If a document exists in the database but its storage object is missing, return a clear state such as:

```json
{
  "id": "doc_abc",
  "document_type": "insurance",
  "status": "pending",
  "file_url": null,
  "storage_status": "missing"
}
```

## Acceptance Criteria

Backend work is complete when:

- `GET /drivers/admin/list` returns document completeness data for each driver
- `GET /drivers/{driver_id}` returns full document metadata for every uploaded file
- approved drivers still return their documents
- returned URLs are viewable by admins in-browser
- returned URLs can be used for download
- the admin frontend can render image and PDF documents without direct bucket logic on the client
- unauthorized roles are denied server-side

## Requested Response From Backend Team

Please return:

- the exact endpoints updated or added
- the final driver list response schema
- the final driver detail response schema
- whether URLs are public or signed
- signed URL TTL if applicable
- the admin roles allowed to access driver documents
- how `document_count` and `required_document_count` are computed
- any blockers related to Supabase bucket policy, row-level security, or missing document records
