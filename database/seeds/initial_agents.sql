-- Seed data for initial agents
-- These are example agents for development/testing

INSERT INTO agents (agent_code, agent_name, api_key, is_active) VALUES
    ('AGENT001', 'Test Agent 1', 'test_api_key_001_change_in_production', true),
    ('AGENT002', 'Test Agent 2', 'test_api_key_002_change_in_production', true),
    ('AGENT003', 'Test Agent 3', 'test_api_key_003_change_in_production', true)
ON CONFLICT (agent_code) DO NOTHING;

-- Note: In production, generate secure API keys using a proper key generation mechanism
-- Example: Use nanoid, uuid, or crypto.randomBytes() with proper hashing
