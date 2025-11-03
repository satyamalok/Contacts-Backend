import { db } from '../config/database';
import { Contact, CreateContactRequest, UpdateContactRequest, SearchParams, PaginatedResponse } from '../types';

export class ContactModel {
  static async findById(id: string): Promise<Contact | null> {
    const result = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll(params?: SearchParams): Promise<PaginatedResponse<Contact>> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;
    const sortBy = params?.sort_by || 'updated_at';
    const sortOrder = params?.sort_order || 'desc';

    let whereClause = 'WHERE is_deleted = false';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params?.query) {
      queryParams.push(`%${params.query}%`);
      whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR phone_primary ILIKE $${paramIndex} OR phone_secondary ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (params?.agent_code) {
      queryParams.push(params.agent_code);
      whereClause += ` AND created_by_agent = $${paramIndex}`;
      paramIndex++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM contacts ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    queryParams.push(limit, offset);
    const result = await db.query(
      `SELECT * FROM contacts ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  static async create(data: CreateContactRequest, agentCode: string): Promise<Contact> {
    return await db.transaction(async (client) => {
      // Get next version
      const versionResult = await client.query('SELECT get_next_version() as version');
      const version = versionResult.rows[0].version;

      // Insert contact
      const result = await client.query(
        `INSERT INTO contacts (first_name, last_name, phone_primary, phone_secondary, created_by_agent, version)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.first_name, data.last_name, data.phone_primary, data.phone_secondary, agentCode, version]
      );

      return result.rows[0];
    });
  }

  static async update(id: string, data: UpdateContactRequest, _agentCode: string): Promise<Contact | null> {
    return await db.transaction(async (client) => {
      // Get next version
      const versionResult = await client.query('SELECT get_next_version() as version');
      const version = versionResult.rows[0].version;

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.first_name !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(data.first_name);
      }
      if (data.last_name !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(data.last_name);
      }
      if (data.phone_primary !== undefined) {
        updates.push(`phone_primary = $${paramIndex++}`);
        values.push(data.phone_primary);
      }
      if (data.phone_secondary !== undefined) {
        updates.push(`phone_secondary = $${paramIndex++}`);
        values.push(data.phone_secondary);
      }

      updates.push(`version = $${paramIndex++}`);
      values.push(version);

      values.push(id);

      const result = await client.query(
        `UPDATE contacts
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND is_deleted = false
         RETURNING *`,
        values
      );

      return result.rows[0] || null;
    });
  }

  static async delete(id: string): Promise<boolean> {
    return await db.transaction(async (client) => {
      // Get next version
      const versionResult = await client.query('SELECT get_next_version() as version');
      const version = versionResult.rows[0].version;

      const result = await client.query(
        `UPDATE contacts
         SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, version = $1
         WHERE id = $2 AND is_deleted = false
         RETURNING id`,
        [version, id]
      );

      return (result.rowCount ?? 0) > 0;
    });
  }

  static async getChangesSinceVersion(sinceVersion: number, limit = 1000): Promise<Contact[]> {
    const result = await db.query(
      `SELECT * FROM contacts
       WHERE version > $1
       ORDER BY version ASC
       LIMIT $2`,
      [sinceVersion, limit]
    );
    return result.rows;
  }

  static async getCurrentVersion(): Promise<number> {
    const result = await db.query('SELECT current_version FROM global_version WHERE id = 1');
    return result.rows[0]?.current_version || 0;
  }

  static async bulkCreate(contacts: CreateContactRequest[], agentCode: string): Promise<Contact[]> {
    return await db.transaction(async (client) => {
      const created: Contact[] = [];

      for (const contactData of contacts) {
        // Get next version
        const versionResult = await client.query('SELECT get_next_version() as version');
        const version = versionResult.rows[0].version;

        // Insert contact
        const result = await client.query(
          `INSERT INTO contacts (first_name, last_name, phone_primary, phone_secondary, created_by_agent, version)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [contactData.first_name, contactData.last_name, contactData.phone_primary, contactData.phone_secondary, agentCode, version]
        );

        created.push(result.rows[0]);
      }

      return created;
    });
  }

  static async getStats() {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_deleted = false) as total_active,
        COUNT(*) FILTER (WHERE is_deleted = true) as total_deleted,
        COUNT(DISTINCT created_by_agent) as total_agents,
        MAX(version) as latest_version
      FROM contacts
    `);
    return result.rows[0];
  }
}
