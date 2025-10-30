import { SyncLogModel } from '../models/SyncLogModel';
import { DeviceStatus } from '../types';

export class DeviceService {
  /**
   * Get all device statuses
   */
  static async getAllDeviceStatus(): Promise<DeviceStatus[]> {
    return await SyncLogModel.getAllDeviceStatus();
  }

  /**
   * Get device status for a specific agent
   */
  static async getDeviceStatusByAgent(agentCode: string): Promise<DeviceStatus[]> {
    return await SyncLogModel.getDeviceStatusByAgent(agentCode);
  }

  /**
   * Get devices that are significantly behind (outdated)
   */
  static async getOutdatedDevices(versionThreshold: number = 100): Promise<DeviceStatus[]> {
    return await SyncLogModel.getOutdatedDevices(versionThreshold);
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats() {
    return await SyncLogModel.getSyncStats();
  }

  /**
   * Get device health summary
   */
  static async getDeviceHealthSummary() {
    const allDevices = await SyncLogModel.getAllDeviceStatus();

    const online = allDevices.filter((d) => d.connection_status === 'online').length;
    const idle = allDevices.filter((d) => d.connection_status === 'idle').length;
    const offline = allDevices.filter((d) => d.connection_status === 'offline').length;
    const outdated = allDevices.filter((d) => d.versions_behind > 10).length;

    return {
      total_devices: allDevices.length,
      online,
      idle,
      offline,
      outdated,
      health_percentage: allDevices.length > 0 ? (online / allDevices.length) * 100 : 100,
    };
  }
}
