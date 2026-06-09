import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract file extension and clean filename (remove spaces/special characters)
    const fileExtension = path.extname(file.name);
    const baseName = path.basename(file.name, fileExtension)
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, '_')
      .substring(0, 50);
    const uniqueFilename = `${Date.now()}-${baseName}${fileExtension}`;

    // Determine the target bucket based on parameter or file type
    const requestBucket = formData.get('bucket')?.toString();
    let targetBucket = 'uploads';
    if (requestBucket) {
      targetBucket = requestBucket;
    } else {
      const isPdfFile = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImageFile = file.type.startsWith('image/');
      if (isPdfFile) {
        targetBucket = 'pdfs';
      } else if (isImageFile) {
        targetBucket = 'logos';
      }
    }

    // --- STRATEGY 1: Attempt Durable Supabase Storage (Cloud CDN) ---
    try {
      const supabase = getSupabase();
      if (supabase) {
        console.log(`Attempting to upload file to Supabase [${targetBucket}] bucket...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(targetBucket)
          .upload(uniqueFilename, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from(targetBucket)
            .getPublicUrl(uniqueFilename);

          console.log(`Successfully uploaded to Supabase [${targetBucket}] bucket:`, publicUrl);
          return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: file.name,
            size: file.size,
            provider: 'supabase',
            bucket: targetBucket
          });
        }

        console.warn(`Supabase Storage upload failed under primary bucket [${targetBucket}]:`, uploadError?.message);

        // Fallback try other standard buckets (like 'jobs' or 'uploads') just in case
        const fallbacks = ['jobs', 'uploads', 'pdfs', 'logos'].filter(b => b !== targetBucket);
        for (const fbBucket of fallbacks) {
          try {
            const { data: fbData, error: fbError } = await supabase.storage
              .from(fbBucket)
              .upload(uniqueFilename, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true
              });
            if (!fbError && fbData) {
              const { data: { publicUrl } } = supabase.storage
                .from(fbBucket)
                .getPublicUrl(uniqueFilename);
              console.log(`Successfully uploaded to Supabase fallback [${fbBucket}] bucket:`, publicUrl);
              return NextResponse.json({
                success: true,
                url: publicUrl,
                filename: file.name,
                size: file.size,
                provider: 'supabase',
                bucket: fbBucket
              });
            }
          } catch (err) {
            // Ignore fallback bucket errors and try next
          }
        }
      }
    } catch (sbErr: any) {
      console.warn('Resilient fallback active: Supabase Storage bypassed or failed:', sbErr.message);
    }

    // --- STRATEGY 2: Fallback to Local Filesystem + Dynamic Route ---
    // Ensure both directories exist
    const uploadDirPublic = path.join(process.cwd(), 'public', 'uploads');
    const uploadDirTmp = path.join('/tmp', 'uploads');

    await fs.mkdir(uploadDirPublic, { recursive: true }).catch(() => {});
    await fs.mkdir(uploadDirTmp, { recursive: true }).catch(() => {});

    // Write file to filesystem (both public/uploads and /tmp/uploads)
    const filePathPublic = path.join(uploadDirPublic, uniqueFilename);
    const filePathTmp = path.join(uploadDirTmp, uniqueFilename);

    let writeSuccessful = false;
    try {
      await fs.writeFile(filePathPublic, buffer);
      writeSuccessful = true;
    } catch (e: any) {
      console.warn('Failed to write to public/uploads, trying /tmp/uploads:', e.message);
    }

    try {
      await fs.writeFile(filePathTmp, buffer);
      writeSuccessful = true;
    } catch (e: any) {
      if (!writeSuccessful) {
        throw new Error('ไม่สามารถเขียนไฟล์ลงบนไลบรารีสแตนด์อะโลนได้: ' + e.message);
      }
    }

    // Return the relative URL which our nextConfig.rewrites maps to the GET route
    const relativeUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename: file.name,
      size: file.size,
      provider: 'local'
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'อัปโหลดไฟล์ล้มเหลว' }, { status: 500 });
  }
}
