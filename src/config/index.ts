import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'contacts_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  api: {
    keySalt: process.env.API_KEY_SALT || 'change-this-in-production',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  websocket: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
