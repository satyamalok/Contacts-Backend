import { db } from '../config/database';
import { SyncLog, DeviceStatus } from '../types';

export class SyncLogModel {
  static async upsertSyncLog(
    deviceId: string,
    agentCode: string,
    lastSyncVersion: number,
    changesCount: number,
    syncStatus: string = 'success'
  ): Promise<SyncLog> {
    const result = await db.query(
      `INSERT INTO sync_log (device_id, agent_code, last_sync_version, last_sync_at, sync_status, changes_count)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
       ON CONFLICT (device_id, agent_code)
       DO UPDATE SET
         last_sync_version = EXCLUDED.last_sync_version,
         last_sync_at = EXCLUDED.last_sync_at,
         sync_status = EXCLUDED.sync_status,
         changes_count = EXCLUDED.changes_count
       RETURNING *`,
      [deviceId, agentCode, lastSyncVersion, syncStatus, changesCount]
    );
    return result.rows[0];
  }

  static async getDeviceSync(deviceId: string, agentCode: string): Promise<SyncLog | null> {
    const result = await db.query(
      'SELECT * FROM sync_log WHERE device_id = $1 AND agent_code = $2',
      [deviceId, agentCode]
    );
    return result.rows[0] || null;
  }

  static async getAllDeviceStatus(): Promise<DeviceStatus[]> {
    const result = await db.query('SELECT * FROM device_status ORDER BY last_sync_at DESC');
    return result.rows;
  }

  static async getDeviceStatusByAgent(agentCode: string): Promise<DeviceStatus[]> {
    const result = await db.query(
      'SELECT * FROM device_status WHERE agent_code = $1 ORDER BY last_sync_at DESC',
      [agentCode]
    );
    return result.rows;
  }

  static async getOutdatedDevices(versionThreshold: number = 100): Promise<DeviceStatus[]> {
    const result = await db.query(
      'SELECT * FROM device_status WHERE versions_behind > $1 ORDER BY versions_behind DESC',
      [versionThreshold]
    );
    return result.rows;
  }

  static async getSyncStats() {
    const result = await db.query('SELECT * FROM sync_statistics');
    return result.rows[0];
  }
}
