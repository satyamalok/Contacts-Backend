import { FastifyRequest, FastifyReply } from 'fastify';
import { AgentModel } from '../models/AgentModel';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    agent?: {
      agent_code: string;
      agent_name: string;
      id: string;
    };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = request.headers['x-api-key'] as string || request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: 'Missing API key. Provide via X-API-Key header or Authorization Bearer token',
      });
    }

    const agent = await AgentModel.findByApiKey(apiKey);

    if (!agent) {
      logger.warn('Invalid API key attempt', { apiKey: apiKey.substring(0, 10) + '...' });
      return reply.status(401).send({
        success: false,
        error: 'Invalid API key',
      });
    }

    if (!agent.is_active) {
      return reply.status(403).send({
        success: false,
        error: 'Agent is inactive',
      });
    }

    // Update last seen timestamp
    await AgentModel.updateLastSeen(agent.agent_code);

    // Attach agent info to request
    request.agent = {
      agent_code: agent.agent_code,
      agent_name: agent.agent_name,
      id: agent.id,
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Authentication failed',
    });
  }
}

export function optionalAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  authenticate(request, reply)
    .catch(() => {
      // If auth fails, continue without agent
      done();
    })
    .then(() => done());
}
