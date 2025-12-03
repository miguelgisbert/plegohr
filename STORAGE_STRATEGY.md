# Storage Strategy for PlegoHR

## Storage Requirements Analysis

### Expected Storage per Employee
- **Contracts:** 2-3 files × 200 KB = 400-600 KB
- **Payslips:** 12/year × 150 KB = 1.8 MB/year
- **ID Documents:** 2-3 files × 300 KB = 600-900 KB
- **Other:** Miscellaneous documents = 500 KB

**Total per employee/year:** ~3-4 MB

### Scaling Projections

| Companies | Employees | Storage Needed | Supabase Plan | Monthly Cost |
|-----------|-----------|----------------|---------------|--------------|
| 1-10      | 20-200    | 0.6-0.8 GB     | Free          | $0           |
| 10-50     | 200-1,000 | 0.8-4 GB       | Pro           | $25          |
| 50-500    | 1K-10K    | 4-40 GB        | Pro           | $25          |
| 500-2000  | 10K-40K   | 40-160 GB      | Pro + extra   | $25-50       |
| 2000+     | 40K+      | 160+ GB        | Team/Enterprise| $599+       |

## File Optimization Strategies

### 1. Image Compression on Upload

Implement client-side compression before upload:

```typescript
// src/utils/imageCompression.ts
export async function compressImage(file: File): Promise<File> {
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 1200;
  const QUALITY = 0.85;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob!], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          QUALITY
        );
      };
    };
  });
}
```

**Savings:** 80-90% reduction on images (2 MB → 200-300 KB)

### 2. PDF Size Limits

Enforce maximum file sizes:

```typescript
const MAX_FILE_SIZES = {
  'application/pdf': 5 * 1024 * 1024, // 5 MB
  'image/jpeg': 2 * 1024 * 1024, // 2 MB
  'image/png': 2 * 1024 * 1024, // 2 MB
};

export function validateFileSize(file: File): boolean {
  const maxSize = MAX_FILE_SIZES[file.type] || 5 * 1024 * 1024;
  return file.size <= maxSize;
}
```

### 3. Storage Lifecycle Policies

Implement automatic archival:

```sql
-- Archive documents older than 3 years
CREATE OR REPLACE FUNCTION archive_old_documents()
RETURNS void AS $$
BEGIN
  UPDATE documents
  SET archived = true
  WHERE created_at < NOW() - INTERVAL '3 years'
    AND archived = false;
END;
$$ LANGUAGE plpgsql;

-- Run monthly via pg_cron or edge function
```

### 4. File Type Restrictions

Only allow necessary formats:

```typescript
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export function isAllowedFileType(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type);
}
```

### 5. Deduplication Strategy

For documents that might be uploaded multiple times (e.g., company policies):

```typescript
// Generate file hash before upload
async function getFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check if file already exists before uploading
async function uploadWithDeduplication(file: File) {
  const hash = await getFileHash(file);

  // Check if file with this hash exists
  const { data: existing } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('file_hash', hash)
    .maybeSingle();

  if (existing) {
    // Reuse existing file
    return existing.storage_path;
  }

  // Upload new file
  // ... upload logic
}
```

## Cost Optimization

### Storage Costs Comparison

| Provider | Storage | Monthly Cost | Cost per GB |
|----------|---------|--------------|-------------|
| **Supabase Pro** | 100 GB | $25 | $0.25/GB |
| **AWS S3** | 100 GB | $2.30 | $0.023/GB |
| **Cloudflare R2** | 100 GB | $1.50 | $0.015/GB |
| **Backblaze B2** | 100 GB | $0.60 | $0.006/GB |

### Hybrid Storage Strategy (Advanced)

For maximum cost efficiency at scale:

**Tier 1: Hot Storage (Supabase)**
- Recent documents (< 6 months)
- Frequently accessed
- Fast access required

**Tier 2: Warm Storage (Cloudflare R2)**
- Documents 6 months - 2 years old
- Occasional access
- 90% cost savings

**Tier 3: Cold Storage (Backblaze B2)**
- Documents > 2 years old
- Rare access (compliance/legal)
- 95% cost savings

```typescript
// Automatic tiering based on age
async function tierDocument(documentId: string) {
  const { data: doc } = await supabase
    .from('documents')
    .select('created_at, storage_path')
    .eq('id', documentId)
    .single();

  const age = Date.now() - new Date(doc.created_at).getTime();
  const monthsOld = age / (1000 * 60 * 60 * 24 * 30);

  if (monthsOld > 24) {
    // Move to cold storage (Backblaze)
    await moveToBackblaze(doc);
  } else if (monthsOld > 6) {
    // Move to warm storage (R2)
    await moveToR2(doc);
  }
  // Otherwise keep in Supabase
}
```

## Implementation Timeline

### Phase 1: Launch (Now)
- ✅ Use Supabase Free (1 GB)
- ✅ Basic file validation
- ✅ File size limits

### Phase 2: First 10 Customers
- Upgrade to Supabase Pro ($25/mo)
- Implement image compression
- Add file type restrictions

### Phase 3: 50+ Customers
- Implement deduplication
- Add storage monitoring
- Consider archival strategy

### Phase 4: 500+ Customers
- Implement tiered storage
- Migrate old files to R2/B2
- Advanced analytics on storage usage

## Monitoring & Alerts

Set up alerts for storage usage:

```typescript
// Check storage usage weekly
async function checkStorageUsage() {
  const { data } = await supabase
    .from('documents')
    .select('file_size');

  const totalSize = data?.reduce((sum, doc) => sum + doc.file_size, 0) || 0;
  const totalGB = totalSize / (1024 * 1024 * 1024);

  if (totalGB > 80) { // 80% of 100GB
    // Send alert to admin
    console.warn(`Storage usage: ${totalGB.toFixed(2)} GB`);
  }
}
```

## Recommended Approach

### For Your Scale (100 companies, 2000 employees):

**Year 1:**
- Start: Supabase Free (testing)
- Month 2-3: Upgrade to Supabase Pro ($25/mo)
- Implement image compression
- **Cost: $25/month = $300/year**

**Year 2+:**
- Stay on Supabase Pro (100 GB is plenty)
- Implement archival for documents >2 years
- **Cost: $25/month = $300/year**

**If You Grow to 10,000 employees:**
- Supabase Pro + tiered storage
- Hot: 20 GB on Supabase
- Warm: 50 GB on Cloudflare R2 ($0.75/mo)
- Cold: 100 GB on Backblaze ($0.60/mo)
- **Total cost: $26.35/month**

## Bottom Line

✅ **Supabase Pro ($25/mo) handles your entire projected scale**
✅ **100 GB is enough for 2,000-4,000 companies with optimization**
✅ **File compression can 10x your capacity**
✅ **At scale, tiered storage reduces costs by 90%**

**Your storage is NOT a bottleneck or significant cost!**
