// Type definitions for the application

export interface Agent {
  id: string;
  agent_code: string;
  agent_name: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  last_seen?: Date;
  metadata?: Record<string, any>;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone_primary?: string;
  phone_secondary?: string;
  created_by_agent: string;
  created_at: Date;
  updated_at: Date;
  version: number;
  is_deleted: boolean;
  deleted_at?: Date;
  metadata?: Record<string, any>;
}

export interface SyncLog {
  id: string;
  device_id: string;
  agent_code: string;
  last_sync_version: number;
  last_sync_at: Date;
  sync_status: string;
  changes_count: number;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  contact_id?: string;
  agent_code: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes?: Record<string, any>;
  version: number;
  timestamp: Date;
}

export interface DeviceStatus {
  device_id: string;
  agent_code: string;
  agent_name: string;
  agent_active: boolean;
  last_sync_version: number;
  last_sync_at: Date;
  sync_status: string;
  current_version: number;
  versions_behind: number;
  connection_status: 'online' | 'idle' | 'offline';
}

export interface SyncRequest {
  device_id: string;
  agent_code: string;
  last_known_version: number;
}

export interface SyncResponse {
  current_version: number;
  changes: ContactChange[];
  has_more: boolean;
}

export interface ContactChange {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  contact: Contact;
  version: number;
}

export interface CreateContactRequest {
  first_name: string;
  last_name: string;
  phone_primary?: string;
  phone_secondary?: string;
}

export interface UpdateContactRequest {
  first_name?: string;
  last_name?: string;
  phone_primary?: string;
  phone_secondary?: string;
}

export interface BulkImportRequest {
  contacts: CreateContactRequest[];
}

export interface BulkImportResponse {
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ row: number; error: string }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  agent_code?: string;
  created_after?: Date;
  created_before?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// WebSocket event types
export interface WSAuthPayload {
  api_key: string;
  agent_code: string;
  device_id: string;
}

export interface WSContactCreated {
  contact: Contact;
  version: number;
}

export interface WSContactUpdated {
  contact: Contact;
  version: number;
}

export interface WSContactDeleted {
  contact_id: string;
  version: number;
}
