# Render Backend — 401 Fix

The backend at `https://admin-portal-backend-mgid.onrender.com` returns 401 on all
authenticated requests. The cause is that `SUPABASE_JWT_SECRET` is set on Render with
**literal quote characters** surrounding the value (e.g. `"qiDK9..."` instead of `qiDK9...`).

`app/core/dependencies.py` calls `base64.b64decode(settings.SUPABASE_JWT_SECRET)`.
When the value includes surrounding quotes, the decode fails silently and falls back to
using the raw quoted string as the HMAC key — which will never match any Supabase JWT → 401.

## Fix

In **Render Dashboard → your backend service → Environment**, update these values:

### 1. `SUPABASE_JWT_SECRET` — remove the surrounding quotes

Set the value to (no quotes):
```
qiDK9GSFaMksczvMh2SmmEBKnfue4hXtMbwNfDmbKcntIjJbW3etXkJ+fOa/n/8VKX4JEXykiNHxeKkX6+wsng==
```

### 2. `ALLOWED_ORIGINS` — add the frontend URL

```
http://localhost:3000,http://localhost:5173,https://<your-deployed-frontend-domain>
```

## After saving

Trigger a **manual redeploy** on Render (Dashboard → your service → **Manual Deploy**) to
apply the changes. After the redeploy, login should work without 401 errors.
