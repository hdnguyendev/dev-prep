# 📦 Cloudflare R2 Setup for File Uploads

## Quick Setup

### 1. Create R2 Bucket

```bash
cd server
wrangler r2 bucket create dev-prep-uploads
```

### 2. Update `wrangler.toml`

Uncomment and configure R2 binding:

```toml
[[r2_buckets]]
binding = "R2_STORAGE"
bucket_name = "dev-prep-uploads"
```

### 3. Deploy

```bash
bun run deploy
```

---

## Alternative: Use Public R2 Bucket

If you want public access to uploaded files:

1. Go to Cloudflare Dashboard → R2
2. Select your bucket → Settings
3. Enable "Public Access"
4. Configure custom domain (optional)

---

## Current Implementation

- **Upload endpoint**: `POST /upload/resume`
- **File serving**: `GET /files/*`
- **Max file size**: 5MB
- **Allowed types**: PDF, DOC, DOCX

---

## Testing

```bash
# Upload a file
curl -X POST https://dev-prep-api.hdnguyen-dev.workers.dev/upload/resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"

# Response:
# {
#   "success": true,
#   "url": "https://.../files/resumes/resume_123_abc.pdf",
#   "filename": "resumes/resume_123_abc.pdf",
#   "key": "resumes/resume_123_abc.pdf",
#   "size": 12345,
#   "type": "application/pdf"
# }
```
