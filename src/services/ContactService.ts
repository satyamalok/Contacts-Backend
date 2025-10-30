import { ContactModel } from '../models/ContactModel';
import { SyncLogModel } from '../models/SyncLogModel';
import {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  SearchParams,
  SyncRequest,
  SyncResponse,
  ContactChange,
  BulkImportRequest,
  BulkImportResponse,
} from '../types';
import { validateContact, sanitizeName } from '../utils/helpers';
import { logger } from '../utils/logger';

export class ContactService {
  /**
   * Get all contacts with pagination and search
   */
  static async getContacts(params?: SearchParams) {
    return await ContactModel.findAll(params);
  }

  /**
   * Get a single contact by ID
   */
  static async getContactById(id: string): Promise<Contact | null> {
    return await ContactModel.findById(id);
  }

  /**
   * Create a new contact
   */
  static async createContact(
    data: CreateContactRequest,
    agentCode: string
  ): Promise<{ contact: Contact; error?: string }> {
    // Validate data
    const validation = validateContact(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Sanitize names
    const sanitizedData = {
      ...data,
      first_name: sanitizeName(data.first_name),
      last_name: sanitizeName(data.last_name),
    };

    const contact = await ContactModel.create(sanitizedData, agentCode);
    logger.info('Contact created', { contactId: contact.id, agentCode });

    return { contact };
  }

  /**
   * Update an existing contact
   */
  static async updateContact(
    id: string,
    data: UpdateContactRequest,
    agentCode: string
  ): Promise<Contact | null> {
    // Sanitize names if provided
    const sanitizedData = { ...data };
    if (data.first_name) {
      sanitizedData.first_name = sanitizeName(data.first_name);
    }
    if (data.last_name) {
      sanitizedData.last_name = sanitizeName(data.last_name);
    }

    const contact = await ContactModel.update(id, sanitizedData, agentCode);
    if (contact) {
      logger.info('Contact updated', { contactId: id, agentCode });
    }

    return contact;
  }

  /**
   * Delete a contact (soft delete)
   */
  static async deleteContact(id: string): Promise<boolean> {
    const deleted = await ContactModel.delete(id);
    if (deleted) {
      logger.info('Contact deleted', { contactId: id });
    }
    return deleted;
  }

  /**
   * Get delta sync changes since a version
   */
  static async getDeltaSync(syncRequest: SyncRequest): Promise<SyncResponse> {
    const { device_id, agent_code, last_known_version } = syncRequest;

    // Get current version
    const currentVersion = await ContactModel.getCurrentVersion();

    // Get all changes since last known version
    const changes = await ContactModel.getChangesSinceVersion(last_known_version, 1000);

    // Transform to ContactChange format
    const contactChanges: ContactChange[] = changes.map((contact) => ({
      action: contact.is_deleted ? 'DELETE' : (last_known_version === 0 ? 'CREATE' : 'UPDATE'),
      contact,
      version: parseInt(contact.version as any, 10),
    }));

    // Update sync log
    await SyncLogModel.upsertSyncLog(
      device_id,
      agent_code,
      currentVersion,
      contactChanges.length
    );

    logger.info('Delta sync completed', {
      deviceId: device_id,
      agentCode: agent_code,
      fromVersion: last_known_version,
      toVersion: currentVersion,
      changesCount: contactChanges.length,
    });

    return {
      current_version: currentVersion,
      changes: contactChanges,
      has_more: changes.length >= 1000,
    };
  }

  /**
   * Bulk import contacts
   */
  static async bulkImport(
    data: BulkImportRequest,
    agentCode: string
  ): Promise<BulkImportResponse> {
    const { contacts } = data;
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Validate all contacts first
    const validContacts: CreateContactRequest[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const validation = validateContact(contact);

      if (validation.valid) {
        validContacts.push({
          first_name: sanitizeName(contact.first_name),
          last_name: sanitizeName(contact.last_name),
          phone_primary: contact.phone_primary,
          phone_secondary: contact.phone_secondary,
        });
        successCount++;
      } else {
        errors.push({
          row: i + 1,
          error: validation.errors.join(', '),
        });
        failedCount++;
      }
    }

    // Bulk create valid contacts
    if (validContacts.length > 0) {
      await ContactModel.bulkCreate(validContacts, agentCode);
      logger.info('Bulk import completed', {
        agentCode,
        total: contacts.length,
        success: successCount,
        failed: failedCount,
      });
    }

    return {
      total: contacts.length,
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get contact statistics
   */
  static async getStats() {
    return await ContactModel.getStats();
  }

  /**
   * Export all contacts
   */
  static async exportContacts(params?: SearchParams): Promise<Contact[]> {
    const result = await ContactModel.findAll({ ...params, limit: 100000 });
    return result.data;
  }
}
