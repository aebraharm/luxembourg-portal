import { getStore } from '@netlify/blobs';
import { execute, queryOne } from './db';
import crypto from 'node:crypto';

export interface StoredAsset {
  id: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
  assetType: 'logo' | 'client_photo' | 'favicon' | 'doc';
  createdAt: string;
}

// Check if Netlify Blobs is available in runtime
function hasNetlifyBlobs(): boolean {
  return Boolean(
    process.env.NETLIFY ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.SITE_ID ||
    process.env.NETLIFY_SITE_ID
  );
}

function getUploadsStore() {
  try {
    return getStore('portal_uploads');
  } catch {
    return null;
  }
}

/**
 * Persists an uploaded asset to Netlify Blobs object storage and the managed database
 */
export async function saveAsset(params: {
  id?: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  assetType: 'logo' | 'client_photo' | 'favicon' | 'doc';
}): Promise<string> {
  const assetId = params.id || `${params.assetType}_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const base64Data = params.buffer.toString('base64');

  // 1. If running on Netlify, store in Netlify Blobs object storage
  if (hasNetlifyBlobs()) {
    try {
      const store = getUploadsStore();
      if (store) {
        await store.set(assetId, new Uint8Array(params.buffer) as any, {
          metadata: {
            filename: params.filename,
            mimeType: params.mimeType,
            assetType: params.assetType,
            createdAt: now,
          },
        });
      }
    } catch (blobErr) {
      console.warn('Netlify Blobs write notice:', blobErr);
    }
  }

  // 2. Persist in database uploaded_assets table (persistent in Turso/remote DB)
  await execute(
    `INSERT INTO uploaded_assets (id, filename, mime_type, data_base64, asset_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       filename = excluded.filename,
       mime_type = excluded.mime_type,
       data_base64 = excluded.data_base64,
       size_bytes = excluded.size_bytes`,
    [assetId, params.filename, params.mimeType, base64Data, params.assetType, params.buffer.length, now]
  );

  return assetId;
}

/**
 * Retrieves an uploaded asset from Netlify Blobs or managed database
 */
export async function getAsset(id: string): Promise<StoredAsset | null> {
  // 1. Try Netlify Blobs first if on Netlify
  if (hasNetlifyBlobs()) {
    try {
      const store = getUploadsStore();
      if (store) {
        const item = await store.getWithMetadata(id, { type: 'arrayBuffer' });
        if (item && item.data) {
          const buffer = Buffer.from(item.data);
          const meta = (item.metadata || {}) as Record<string, string>;
          return {
            id,
            filename: meta.filename || 'asset.bin',
            mimeType: meta.mimeType || 'application/octet-stream',
            buffer,
            sizeBytes: buffer.length,
            assetType: (meta.assetType as any) || 'logo',
            createdAt: meta.createdAt || new Date().toISOString(),
          };
        }
      }
    } catch (blobErr) {
      // Fall through to database
    }
  }

  // 2. Retrieve from database uploaded_assets table
  const row = await queryOne<{
    id: string;
    filename: string;
    mime_type: string;
    data_base64: string;
    asset_type: string;
    size_bytes: number;
    created_at: string;
  }>('SELECT * FROM uploaded_assets WHERE id = ?', [id]);

  if (!row) return null;

  const buffer = Buffer.from(row.data_base64, 'base64');
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    buffer,
    sizeBytes: row.size_bytes,
    assetType: row.asset_type as any,
    createdAt: row.created_at,
  };
}

/**
 * Deletes an asset from both Netlify Blobs and managed database
 */
export async function deleteAsset(id: string): Promise<void> {
  if (hasNetlifyBlobs()) {
    try {
      const store = getUploadsStore();
      if (store) {
        await store.delete(id);
      }
    } catch {}
  }

  await execute('DELETE FROM uploaded_assets WHERE id = ?', [id]);
}
