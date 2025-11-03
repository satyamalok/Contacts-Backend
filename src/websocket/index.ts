import { Server as SocketIOServer, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { AgentModel } from '../models/AgentModel';
import { ContactService } from '../services/ContactService';
import {
  WSAuthPayload,
  CreateContactRequest,
  UpdateContactRequest,
  SyncRequest,
} from '../types';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  agentCode?: string;
  agentName?: string;
  deviceId?: string;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: FastifyInstance) {
    this.io = new SocketIOServer(server.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('New socket connection', { socketId: socket.id });

      // Authentication handler
      socket.on('auth', async (payload: WSAuthPayload, callback) => {
        try {
          const { api_key, agent_code, device_id } = payload;

          // Verify API key
          const agent = await AgentModel.findByApiKey(api_key);

          if (!agent || agent.agent_code !== agent_code) {
            logger.warn('WebSocket auth failed', { agentCode: agent_code });
            callback({ success: false, error: 'Invalid credentials' });
            socket.disconnect();
            return;
          }

          if (!agent.is_active) {
            callback({ success: false, error: 'Agent is inactive' });
            socket.disconnect();
            return;
          }

          // Authenticate socket
          socket.agentCode = agent.agent_code;
          socket.agentName = agent.agent_name;
          socket.deviceId = device_id;

          // Store authenticated socket
          const socketKey = `${agent_code}_${device_id}`;
          this.authenticatedSockets.set(socketKey, socket);

          // Join agent room
          socket.join(`agent_${agent_code}`);
          socket.join('all_agents');

          // Update last seen
          await AgentModel.updateLastSeen(agent.agent_code);

          logger.info('WebSocket authenticated', {
            agentCode: agent_code,
            deviceId: device_id,
          });

          callback({
            success: true,
            message: 'Authenticated successfully',
            agent_code: agent.agent_code,
            agent_name: agent.agent_name,
          });
        } catch (error) {
          logger.error('WebSocket auth error:', error);
          callback({ success: false, error: 'Authentication failed' });
        }
      });

      // Sync request handler
      socket.on('sync_request', async (payload: SyncRequest, callback) => {
        try {
          if (!socket.agentCode) {
            callback({ success: false, error: 'Not authenticated' });
            return;
          }

          const syncRequest: SyncRequest = {
            device_id: socket.deviceId || payload.device_id,
            agent_code: socket.agentCode,
            last_known_version: payload.last_known_version,
          };

          const syncResponse = await ContactService.getDeltaSync(syncRequest);

          callback({
            success: true,
            data: syncResponse,
          });

          socket.emit('sync_complete', {
            current_version: syncResponse.current_version,
            changes_count: syncResponse.changes.length,
          });
        } catch (error) {
          logger.error('Sync request error:', error);
          callback({ success: false, error: 'Sync failed' });
        }
      });

      // Contact create handler
      socket.on('contact_create', async (payload: CreateContactRequest, callback) => {
        try {
          if (!socket.agentCode) {
            callback({ success: false, error: 'Not authenticated' });
            return;
          }

          const { contact } = await ContactService.createContact(payload, socket.agentCode);

          // Broadcast to all other devices
          socket.broadcast.to('all_agents').emit('contact_created', {
            contact,
            version: contact.version,
            created_by: socket.agentCode,
          });

          callback({ success: true, data: contact });
        } catch (error: any) {
          logger.error('Contact create error:', error);
          callback({ success: false, error: error.message || 'Failed to create contact' });
        }
      });

      // Contact update handler
      socket.on('contact_update', async (payload: { id: string; data: UpdateContactRequest }, callback) => {
        try {
          if (!socket.agentCode) {
            callback({ success: false, error: 'Not authenticated' });
            return;
          }

          const contact = await ContactService.updateContact(
            payload.id,
            payload.data,
            socket.agentCode
          );

          if (!contact) {
            callback({ success: false, error: 'Contact not found' });
            return;
          }

          // Broadcast to all other devices
          socket.broadcast.to('all_agents').emit('contact_updated', {
            contact,
            version: contact.version,
            updated_by: socket.agentCode,
          });

          callback({ success: true, data: contact });
        } catch (error: any) {
          logger.error('Contact update error:', error);
          callback({ success: false, error: error.message || 'Failed to update contact' });
        }
      });

      // Contact delete handler
      socket.on('contact_delete', async (payload: { id: string }, callback) => {
        try {
          if (!socket.agentCode) {
            callback({ success: false, error: 'Not authenticated' });
            return;
          }

          const deleted = await ContactService.deleteContact(payload.id);

          if (!deleted) {
            callback({ success: false, error: 'Contact not found' });
            return;
          }

          // Broadcast to all other devices
          socket.broadcast.to('all_agents').emit('contact_deleted', {
            contact_id: payload.id,
            deleted_by: socket.agentCode,
          });

          callback({ success: true, message: 'Contact deleted' });
        } catch (error) {
          logger.error('Contact delete error:', error);
          callback({ success: false, error: 'Failed to delete contact' });
        }
      });

      // Ping handler
      socket.on('ping', (callback) => {
        callback({ pong: Date.now() });
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        if (socket.agentCode && socket.deviceId) {
          const socketKey = `${socket.agentCode}_${socket.deviceId}`;
          this.authenticatedSockets.delete(socketKey);

          logger.info('Socket disconnected', {
            agentCode: socket.agentCode,
            deviceId: socket.deviceId,
          });
        }
      });
    });
  }

  /**
   * Broadcast a message to all connected devices
   */
  public broadcastToAll(event: string, data: any) {
    this.io.to('all_agents').emit(event, data);
  }

  /**
   * Broadcast to specific agent
   */
  public broadcastToAgent(agentCode: string, event: string, data: any) {
    this.io.to(`agent_${agentCode}`).emit(event, data);
  }

  /**
   * Get connected devices count
   */
  public getConnectedDevicesCount(): number {
    return this.authenticatedSockets.size;
  }

  /**
   * Get IO instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
