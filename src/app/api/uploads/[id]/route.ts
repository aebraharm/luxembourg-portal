import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return new NextResponse('Asset ID required', { status: 400 });
  }

  const asset = await getAsset(id);
  if (!asset) {
    return new NextResponse('Asset Not Found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.buffer), {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Disposition': `inline; filename="${asset.filename}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  });
}
