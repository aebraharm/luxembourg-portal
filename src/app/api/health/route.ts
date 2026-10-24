import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  try {
    const db = getDb();
    const dbPath = path.resolve(process.cwd(), 'data/portal.sqlite');
    let fileSizeKb = 0;
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      fileSizeKb = Math.round(stats.size / 1024);
    }

    const clientCount = (db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number }).c;
    const paymentCount = (db.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c;
    const adminCount = (db.prepare('SELECT COUNT(*) as c FROM administrators').get() as { c: number }).c;
    const auditCount = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number }).c;
    const assetsCount = (db.prepare('SELECT COUNT(*) as c FROM uploaded_assets').get() as { c: number }).c;

    return NextResponse.json({
      status: 'healthy',
      database: 'SQLite 3 (WAL Mode)',
      databaseFile: 'data/portal.sqlite',
      databaseSizeKb: fileSizeKb,
      counts: {
        clients: clientCount,
        payments: paymentCount,
        administrators: adminCount,
        auditLogs: auditCount,
        uploadedAssets: assetsCount,
      },
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'unhealthy', error: err.message }, { status: 500 });
  }
}
