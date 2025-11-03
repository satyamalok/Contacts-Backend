import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { db } from './config/database';
import { logger } from './utils/logger';
import { authenticate } from './middleware/auth';
import { WebSocketManager } from './websocket';

// Controllers
import { ContactController } from './controllers/ContactController';
import { DeviceController } from './controllers/DeviceController';
import { AuthController } from './controllers/AuthController';

const fastify = Fastify({
  logger: false, // We use Winston instead
  trustProxy: true,
});

// Register CORS
fastify.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

// Register Swagger
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Contacts Sync API',
      description: 'Real-time contacts synchronization backend for Android sales team',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'contacts', description: 'Contact management endpoints' },
      { name: 'sync', description: 'Synchronization endpoints' },
      { name: 'devices', description: 'Device monitoring endpoints' },
      { name: 'bulk', description: 'Bulk operations endpoints' },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
      },
    },
  },
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// Serve static files
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
});

// Health check
fastify.get('/health', async () => {
  const dbHealthy = await db.testConnection();

  return {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Auth routes (no authentication required)
fastify.post('/api/auth/register', AuthController.registerAgent);
fastify.get('/api/auth/verify', { preHandler: authenticate }, AuthController.verifyApiKey);
fastify.get('/api/auth/agents', AuthController.getAllAgents);

// Contact routes (authentication required)
fastify.get('/api/contacts', { preHandler: authenticate }, ContactController.getContacts);
fastify.get('/api/contacts/stats', { preHandler: authenticate }, ContactController.getStats);
fastify.get('/api/contacts/:id', { preHandler: authenticate }, ContactController.getContactById);
fastify.post('/api/contacts', { preHandler: authenticate }, ContactController.createContact);
fastify.put('/api/contacts/:id', { preHandler: authenticate }, ContactController.updateContact);
fastify.delete('/api/contacts/:id', { preHandler: authenticate }, ContactController.deleteContact);

// Sync routes
fastify.get('/api/sync/delta', { preHandler: authenticate }, ContactController.getDeltaSync);

// Bulk operations
fastify.post('/api/bulk/import', { preHandler: authenticate }, ContactController.bulkImport);
fastify.get('/api/bulk/export', { preHandler: authenticate }, ContactController.bulkExport);

// Device monitoring routes
fastify.get('/api/devices', DeviceController.getAllDevices);
fastify.get('/api/devices/stats', DeviceController.getDeviceStats);
fastify.get('/api/devices/health', DeviceController.getDeviceHealth);
fastify.get('/api/devices/outdated', DeviceController.getOutdatedDevices);
fastify.get('/api/devices/agent/:agentCode', DeviceController.getDevicesByAgent);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  reply.status(500).send({
    success: false,
    error: 'Internal server error',
    message: config.env === 'development' ? error.message : undefined,
  });
});

// Start server
const start = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize WebSocket manager
    await fastify.ready();
    const wsManager = new WebSocketManager(fastify);
    logger.info('WebSocket manager initialized');

    // Store WebSocket manager in Fastify instance
    fastify.decorate('wsManager', wsManager);

    // Start server
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server listening on http://${config.host}:${config.port}`);
    logger.info(`API Documentation: http://${config.host}:${config.port}/docs`);
    logger.info(`Environment: ${config.env}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  try {
    await fastify.close();
    await db.close();
    logger.info('Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();

export default fastify;
