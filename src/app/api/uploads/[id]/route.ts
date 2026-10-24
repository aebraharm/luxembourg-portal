import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return new NextResponse('Asset ID required', { status: 400 });
  }

  const db = getDb();
  const asset = db.prepare('SELECT * FROM uploaded_assets WHERE id = ?').get(id) as {
    mime_type: string;
    data_base64: string;
    filename: string;
  } | undefined;

  if (!asset) {
    return new NextResponse('Asset Not Found', { status: 404 });
  }

  const buffer = Buffer.from(asset.data_base64, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': asset.mime_type,
      'Content-Disposition': `inline; filename="${asset.filename}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  });
}
