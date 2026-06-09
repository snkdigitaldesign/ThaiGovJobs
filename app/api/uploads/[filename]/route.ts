import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Clean to prevent directory traversal
    const safeFilename = path.basename(filename);
    
    const filePaths = [
      path.join(process.cwd(), 'public', 'uploads', safeFilename),
      path.join('/tmp', 'uploads', safeFilename)
    ];
    
    let fileBuffer: Buffer | null = null;
    let foundPath = '';
    
    for (const filePath of filePaths) {
      try {
        fileBuffer = await fs.readFile(filePath);
        foundPath = filePath;
        break;
      } catch (err) {
        // Try next path
      }
    }
    
    if (!fileBuffer) {
      return new NextResponse('File not found (ไม่พบไฟล์อัปโหลด)', { status: 404 });
    }
    
    // Determine Content-Type based on extension
    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    }
    
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Serve inline preview or attachment
    if (ext === '.pdf') {
      responseHeaders.set('Content-Disposition', 'inline; filename="' + encodeURIComponent(safeFilename) + '"');
    } else {
      responseHeaders.set('Content-Disposition', 'inline');
    }
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Dynamic file serving error:', error);
    return new NextResponse('Internal server error: ' + error.message, { status: 500 });
  }
}
