import { NextResponse } from 'next/server';
import { queryOne, getDatabaseConfig } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  try {
    const config = getDatabaseConfig();
    const dbType = config.isRemote
      ? 'Managed Distributed libSQL / Turso Cluster'
      : 'Local libSQL File Engine';

    // Verify live DB connectivity
    const ping = await queryOne('SELECT 1 as alive');
    if (!ping) throw new Error('Database ping query returned no response');

    let fileSizeKb = 0;
    // Only inspect local filesystem size when running locally in development
    if (!config.isRemote && !config.isNetlify && !config.isProduction) {
      try {
        const dbPath = path.resolve(process.cwd(), 'data/portal.sqlite');
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          fileSizeKb = Math.round(stats.size / 1024);
        }
      } catch {
        // Safe ignore
      }
    }

    const clientRow = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM clients');
    const paymentRow = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM payments');
    const adminRow = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM administrators');
    const auditRow = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM audit_logs');
    const assetsRow = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM uploaded_assets');

    const storageBackend = config.isNetlify
      ? 'Netlify Blobs (Edge Object Storage)'
      : 'Managed Database Asset Storage';

    return NextResponse.json({
      status: 'healthy',
      database: dbType,
      connected: true,
      storageEngine: storageBackend,
      databaseSizeKb: fileSizeKb,
      counts: {
        clients: clientRow ? Number(clientRow.c) : 0,
        payments: paymentRow ? Number(paymentRow.c) : 0,
        administrators: adminRow ? Number(adminRow.c) : 0,
        auditLogs: auditRow ? Number(auditRow.c) : 0,
        uploadedAssets: assetsRow ? Number(assetsRow.c) : 0,
      },
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        connected: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
