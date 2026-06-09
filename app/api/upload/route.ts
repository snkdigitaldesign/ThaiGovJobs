import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    // Save destination: public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure public/uploads directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Extract file extension and clean filename (remove spaces/special characters)
    const fileExtension = path.extname(file.name);
    const baseName = path.basename(file.name, fileExtension)
      .replace(/[^a-zA-Z0-9ก-๙_-]/g, '_')
      .substring(0, 50);
    const uniqueFilename = `${Date.now()}-${baseName}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Write file to filesystem
    await fs.writeFile(filePath, buffer);

    // Return relative URL that Next.js serves from public/
    const relativeUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      filename: file.name,
      size: file.size
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'อัปโหลดไฟล์ล้มเหลว' }, { status: 500 });
  }
}
