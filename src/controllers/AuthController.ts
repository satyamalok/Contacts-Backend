import { FastifyRequest, FastifyReply } from 'fastify';
import { AgentModel } from '../models/AgentModel';
import { generateApiKey } from '../utils/helpers';
import { logger } from '../utils/logger';

interface RegisterAgentRequest {
  agent_code: string;
  agent_name: string;
}

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new agent
   */
  static async registerAgent(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { agent_code, agent_name } = request.body as RegisterAgentRequest;

      if (!agent_code || !agent_name) {
        return reply.status(400).send({
          success: false,
          error: 'agent_code and agent_name are required',
        });
      }

      // Check if agent already exists
      const existing = await AgentModel.findByAgentCode(agent_code);
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: 'Agent code already exists',
        });
      }

      // Generate API key
      const apiKey = generateApiKey();

      // Create agent
      const agent = await AgentModel.create(agent_code, agent_name, apiKey);

      logger.info('New agent registered', { agentCode: agent_code });

      return reply.status(201).send({
        success: true,
        data: {
          agent_code: agent.agent_code,
          agent_name: agent.agent_name,
          api_key: agent.api_key,
          created_at: agent.created_at,
        },
        message: 'Agent registered successfully. Save your API key securely.',
      });
    } catch (error) {
      logger.error('Register agent error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to register agent',
      });
    }
  }

  /**
   * GET /api/auth/verify
   * Verify API key
   */
  static async verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
    try {
      // If this endpoint is reached, the auth middleware has already verified the API key
      const agent = request.agent;

      return reply.send({
        success: true,
        data: {
          agent_code: agent!.agent_code,
          agent_name: agent!.agent_name,
          verified: true,
        },
        message: 'API key is valid',
      });
    } catch (error) {
      logger.error('Verify API key error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to verify API key',
      });
    }
  }

  /**
   * GET /api/auth/agents
   * Get all agents (for admin purposes)
   */
  static async getAllAgents(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const agents = await AgentModel.findAll();

      // Remove API keys from response
      const sanitizedAgents = agents.map((agent) => ({
        id: agent.id,
        agent_code: agent.agent_code,
        agent_name: agent.agent_name,
        is_active: agent.is_active,
        created_at: agent.created_at,
        last_seen: agent.last_seen,
      }));

      return reply.send({
        success: true,
        data: sanitizedAgents,
        total: sanitizedAgents.length,
      });
    } catch (error) {
      logger.error('Get agents error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch agents',
      });
    }
  }
}
