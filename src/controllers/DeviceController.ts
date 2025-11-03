import { FastifyRequest, FastifyReply } from 'fastify';
import { DeviceService } from '../services/DeviceService';
import { logger } from '../utils/logger';

export class DeviceController {
  /**
   * GET /api/devices
   */
  static async getAllDevices(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const devices = await DeviceService.getAllDeviceStatus();

      return reply.send({
        success: true,
        data: devices,
        total: devices.length,
      });
    } catch (error) {
      logger.error('Get devices error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch devices',
      });
    }
  }

  /**
   * GET /api/devices/agent/:agentCode
   */
  static async getDevicesByAgent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { agentCode } = request.params as { agentCode: string };
      const devices = await DeviceService.getDeviceStatusByAgent(agentCode);

      return reply.send({
        success: true,
        data: devices,
        total: devices.length,
      });
    } catch (error) {
      logger.error('Get devices by agent error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch devices',
      });
    }
  }

  /**
   * GET /api/devices/outdated
   */
  static async getOutdatedDevices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const threshold = parseInt(query.threshold || '100', 10);

      const devices = await DeviceService.getOutdatedDevices(threshold);

      return reply.send({
        success: true,
        data: devices,
        total: devices.length,
      });
    } catch (error) {
      logger.error('Get outdated devices error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch outdated devices',
      });
    }
  }

  /**
   * GET /api/devices/stats
   */
  static async getDeviceStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await DeviceService.getSyncStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get device stats error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch device statistics',
      });
    }
  }

  /**
   * GET /api/devices/health
   */
  static async getDeviceHealth(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const health = await DeviceService.getDeviceHealthSummary();

      return reply.send({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Get device health error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch device health',
      });
    }
  }
}
