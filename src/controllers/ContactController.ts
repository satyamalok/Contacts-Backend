import { FastifyRequest, FastifyReply } from 'fastify';
import { ContactService } from '../services/ContactService';
import {
  CreateContactRequest,
  UpdateContactRequest,
  SearchParams,
  SyncRequest,
} from '../types';
import { logger } from '../utils/logger';
import Papa from 'papaparse';

export class ContactController {
  /**
   * GET /api/contacts
   */
  static async getContacts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const params: SearchParams = {
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        sort_by: query.sort_by || 'updated_at',
        sort_order: query.sort_order || 'desc',
        query: query.q || query.search,
        agent_code: query.agent_code,
      };

      const result = await ContactService.getContacts(params);

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get contacts error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch contacts',
      });
    }
  }

  /**
   * GET /api/contacts/:id
   */
  static async getContactById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const contact = await ContactService.getContactById(id);

      if (!contact) {
        return reply.status(404).send({
          success: false,
          error: 'Contact not found',
        });
      }

      return reply.send({
        success: true,
        data: contact,
      });
    } catch (error) {
      logger.error('Get contact error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch contact',
      });
    }
  }

  /**
   * POST /api/contacts
   */
  static async createContact(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreateContactRequest;
      const agentCode = request.agent!.agent_code;

      const { contact } = await ContactService.createContact(data, agentCode);

      return reply.status(201).send({
        success: true,
        data: contact,
        message: 'Contact created successfully',
      });
    } catch (error: any) {
      logger.error('Create contact error:', error);
      return reply.status(400).send({
        success: false,
        error: error.message || 'Failed to create contact',
      });
    }
  }

  /**
   * PUT /api/contacts/:id
   */
  static async updateContact(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateContactRequest;
      const agentCode = request.agent!.agent_code;

      const contact = await ContactService.updateContact(id, data, agentCode);

      if (!contact) {
        return reply.status(404).send({
          success: false,
          error: 'Contact not found',
        });
      }

      return reply.send({
        success: true,
        data: contact,
        message: 'Contact updated successfully',
      });
    } catch (error) {
      logger.error('Update contact error:', error);
      return reply.status(400).send({
        success: false,
        error: 'Failed to update contact',
      });
    }
  }

  /**
   * DELETE /api/contacts/:id
   */
  static async deleteContact(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const deleted = await ContactService.deleteContact(id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Contact not found',
        });
      }

      return reply.send({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      logger.error('Delete contact error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete contact',
      });
    }
  }

  /**
   * GET /api/sync/delta
   */
  static async getDeltaSync(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const agentCode = request.agent!.agent_code;

      const syncRequest: SyncRequest = {
        device_id: query.device_id || request.headers['x-device-id'] as string || 'unknown',
        agent_code: agentCode,
        last_known_version: parseInt(query.version || '0', 10),
      };

      const syncResponse = await ContactService.getDeltaSync(syncRequest);

      return reply.send({
        success: true,
        data: syncResponse,
      });
    } catch (error) {
      logger.error('Delta sync error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to perform delta sync',
      });
    }
  }

  /**
   * POST /api/bulk/import
   */
  static async bulkImport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as any;
      const agentCode = request.agent!.agent_code;

      const result = await ContactService.bulkImport(data, agentCode);

      return reply.send({
        success: true,
        data: result,
        message: `Bulk import completed. ${result.success} successful, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Bulk import error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to import contacts',
      });
    }
  }

  /**
   * GET /api/bulk/export
   */
  static async bulkExport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const format = query.format || 'json';

      const contacts = await ContactService.exportContacts();

      if (format === 'csv') {
        const csv = Papa.unparse(contacts);
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename=contacts.csv');
        return reply.send(csv);
      }

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', 'attachment; filename=contacts.json');
      return reply.send({
        success: true,
        data: contacts,
        total: contacts.length,
      });
    } catch (error) {
      logger.error('Bulk export error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to export contacts',
      });
    }
  }

  /**
   * GET /api/contacts/stats
   */
  static async getStats(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await ContactService.getStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  }
}
