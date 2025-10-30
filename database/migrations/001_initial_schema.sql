-- Initial database schema for contacts sync backend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_code VARCHAR(50) UNIQUE NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agents_agent_code ON agents(agent_code);
CREATE INDEX idx_agents_api_key ON agents(api_key);
CREATE INDEX idx_agents_is_active ON agents(is_active);

-- Create global version counter table
CREATE TABLE IF NOT EXISTS global_version (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_version BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial version
INSERT INTO global_version (id, current_version) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    created_by_agent VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    FOREIGN KEY (created_by_agent) REFERENCES agents(agent_code) ON DELETE CASCADE
);

CREATE INDEX idx_contacts_version ON contacts(version);
CREATE INDEX idx_contacts_created_by ON contacts(created_by_agent);
CREATE INDEX idx_contacts_is_deleted ON contacts(is_deleted);
CREATE INDEX idx_contacts_updated_at ON contacts(updated_at);
CREATE INDEX idx_contacts_name ON contacts(first_name, last_name);
CREATE INDEX idx_contacts_phone ON contacts(phone_primary, phone_secondary);

-- Create sync_log table
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL,
    agent_code VARCHAR(50) NOT NULL,
    last_sync_version BIGINT NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'success',
    changes_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    FOREIGN KEY (agent_code) REFERENCES agents(agent_code) ON DELETE CASCADE
);

CREATE INDEX idx_sync_log_device_id ON sync_log(device_id);
CREATE INDEX idx_sync_log_agent_code ON sync_log(agent_code);
CREATE INDEX idx_sync_log_last_sync_at ON sync_log(last_sync_at);
CREATE UNIQUE INDEX idx_sync_log_device_agent ON sync_log(device_id, agent_code);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID,
    agent_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    changes JSONB,
    version BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_code) REFERENCES agents(agent_code) ON DELETE CASCADE
);

CREATE INDEX idx_audit_log_contact_id ON audit_log(contact_id);
CREATE INDEX idx_audit_log_agent_code ON audit_log(agent_code);
CREATE INDEX idx_audit_log_version ON audit_log(version);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Function to get and increment global version
CREATE OR REPLACE FUNCTION get_next_version()
RETURNS BIGINT AS $$
DECLARE
    next_ver BIGINT;
BEGIN
    UPDATE global_version
    SET current_version = current_version + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING current_version INTO next_ver;
    RETURN next_ver;
END;
$$ LANGUAGE plpgsql;

-- Function to update contact updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER contact_updated_at_trigger
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_timestamp();

-- Function to log contact changes to audit_log
CREATE OR REPLACE FUNCTION log_contact_change()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(20);
    change_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
        change_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        change_data := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        change_data := to_jsonb(OLD);
    END IF;

    INSERT INTO audit_log (contact_id, agent_code, action, changes, version)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.created_by_agent, OLD.created_by_agent),
        action_type,
        change_data,
        COALESCE(NEW.version, OLD.version)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log contact changes
CREATE TRIGGER contact_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION log_contact_change();

-- Create view for active contacts only
CREATE OR REPLACE VIEW active_contacts AS
SELECT * FROM contacts WHERE is_deleted = false;

-- Create view for device status
CREATE OR REPLACE VIEW device_status AS
SELECT
    sl.device_id,
    a.agent_code,
    a.agent_name,
    a.is_active as agent_active,
    sl.last_sync_version,
    sl.last_sync_at,
    sl.sync_status,
    (SELECT current_version FROM global_version WHERE id = 1) as current_version,
    (SELECT current_version FROM global_version WHERE id = 1) - sl.last_sync_version as versions_behind,
    CASE
        WHEN a.last_seen > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN a.last_seen > NOW() - INTERVAL '1 hour' THEN 'idle'
        ELSE 'offline'
    END as connection_status
FROM sync_log sl
JOIN agents a ON sl.agent_code = a.agent_code
ORDER BY sl.last_sync_at DESC;

-- Create view for sync statistics
CREATE OR REPLACE VIEW sync_statistics AS
SELECT
    COUNT(DISTINCT device_id) as total_devices,
    COUNT(DISTINCT agent_code) as total_agents,
    COUNT(DISTINCT CASE WHEN sync_status = 'success' THEN device_id END) as synced_devices,
    AVG(changes_count) as avg_changes_per_sync,
    MAX(last_sync_at) as last_sync_time
FROM sync_log;

COMMENT ON TABLE agents IS 'Stores agent/device information and API keys';
COMMENT ON TABLE contacts IS 'Main contacts table with version tracking';
COMMENT ON TABLE sync_log IS 'Tracks sync status for each device';
COMMENT ON TABLE audit_log IS 'Audit trail for all contact changes';
COMMENT ON TABLE global_version IS 'Global version counter for delta sync';
