import { db } from '../config/database';
import { Agent } from '../types';

export class AgentModel {
  static async findByApiKey(apiKey: string): Promise<Agent | null> {
    const result = await db.query('SELECT * FROM agents WHERE api_key = $1', [apiKey]);
    return result.rows[0] || null;
  }

  static async findByAgentCode(agentCode: string): Promise<Agent | null> {
    const result = await db.query('SELECT * FROM agents WHERE agent_code = $1', [agentCode]);
    return result.rows[0] || null;
  }

  static async create(
    agentCode: string,
    agentName: string,
    apiKey: string
  ): Promise<Agent> {
    const result = await db.query(
      `INSERT INTO agents (agent_code, agent_name, api_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [agentCode, agentName, apiKey]
    );
    return result.rows[0];
  }

  static async updateLastSeen(agentCode: string): Promise<void> {
    await db.query(
      'UPDATE agents SET last_seen = CURRENT_TIMESTAMP WHERE agent_code = $1',
      [agentCode]
    );
  }

  static async findAll(): Promise<Agent[]> {
    const result = await db.query('SELECT * FROM agents ORDER BY created_at DESC');
    return result.rows;
  }

  static async findActive(): Promise<Agent[]> {
    const result = await db.query(
      'SELECT * FROM agents WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async setActive(agentCode: string, isActive: boolean): Promise<void> {
    await db.query(
      'UPDATE agents SET is_active = $1 WHERE agent_code = $2',
      [isActive, agentCode]
    );
  }
}
