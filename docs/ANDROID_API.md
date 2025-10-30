# Contacts Sync Backend - Android Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket Integration](#websocket-integration)
5. [Delta Sync Mechanism](#delta-sync-mechanism)
6. [Offline Support](#offline-support)
7. [Code Examples](#code-examples)

---

## Overview

This backend provides real-time contact synchronization across multiple Android devices using:
- **REST APIs** for CRUD operations
- **WebSocket (Socket.IO)** for real-time updates
- **Delta sync** for efficient bandwidth usage
- **Version-based sync** to track changes

### Base URL
```
Production: https://your-vps-domain.com
Development: http://localhost:3000
```

### WebSocket URL
```
Production: wss://your-vps-domain.com
Development: ws://localhost:3000
```

---

## Authentication

All API requests require authentication using an API key.

### Register a New Agent

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "agent_code": "AGENT001",
  "agent_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_code": "AGENT001",
    "agent_name": "John Doe",
    "api_key": "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Agent registered successfully. Save your API key securely."
}
```

**Important:** Save the API key securely. It cannot be retrieved later.

### Authentication Headers

Include the API key in all authenticated requests:

```http
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or alternatively:
```http
Authorization: Bearer sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Device Identification

For tracking purposes, include device ID in requests:

```http
X-Device-ID: your-unique-device-id
```

---

## REST API Endpoints

### 1. Get All Contacts

**Endpoint:** `GET /api/contacts`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 1000)
- `q` or `search` (optional): Search query (searches name and phone)
- `sort_by` (optional): Field to sort by (default: "updated_at")
- `sort_order` (optional): "asc" or "desc" (default: "desc")

**Example Request:**
```http
GET /api/contacts?page=1&limit=50&q=John&sort_by=first_name&sort_order=asc
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "first_name": "John",
      "last_name": "Doe",
      "phone_primary": "+1234567890",
      "phone_secondary": "+0987654321",
      "created_by_agent": "AGENT001",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "version": 42
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```

### 2. Get Contact by ID

**Endpoint:** `GET /api/contacts/:id`

**Example Request:**
```http
GET /api/contacts/123e4567-e89b-12d3-a456-426614174000
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "first_name": "John",
    "last_name": "Doe",
    "phone_primary": "+1234567890",
    "phone_secondary": "+0987654321",
    "created_by_agent": "AGENT001",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "version": 42
  }
}
```

### 3. Create Contact

**Endpoint:** `POST /api/contacts`

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_primary": "+1234567890",
  "phone_secondary": "+0987654321"
}
```

**Note:** `phone_primary` and `phone_secondary` are optional but at least one is recommended.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "234e5678-e89b-12d3-a456-426614174001",
    "first_name": "Jane",
    "last_name": "Smith",
    "phone_primary": "+1234567890",
    "phone_secondary": "+0987654321",
    "created_by_agent": "AGENT001",
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:00:00Z",
    "version": 43
  },
  "message": "Contact created successfully"
}
```

### 4. Update Contact

**Endpoint:** `PUT /api/contacts/:id`

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone_primary": "+1234567890"
}
```

**Note:** Only include fields you want to update.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "234e5678-e89b-12d3-a456-426614174001",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone_primary": "+1234567890",
    "phone_secondary": "+0987654321",
    "created_by_agent": "AGENT001",
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z",
    "version": 44
  },
  "message": "Contact updated successfully"
}
```

### 5. Delete Contact

**Endpoint:** `DELETE /api/contacts/:id`

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

**Note:** This is a soft delete. The contact is marked as deleted but not removed from the database.

### 6. Delta Sync

**Endpoint:** `GET /api/sync/delta`

**Query Parameters:**
- `version`: Last known version number (required)
- `device_id`: Your device identifier (optional, can use X-Device-ID header)

**Example Request:**
```http
GET /api/sync/delta?version=40&device_id=device123
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current_version": 45,
    "changes": [
      {
        "action": "CREATE",
        "contact": {
          "id": "345e6789-e89b-12d3-a456-426614174002",
          "first_name": "Bob",
          "last_name": "Wilson",
          "phone_primary": "+1122334455",
          "phone_secondary": null,
          "created_by_agent": "AGENT002",
          "created_at": "2024-01-15T11:30:00Z",
          "updated_at": "2024-01-15T11:30:00Z",
          "version": 41,
          "is_deleted": false
        },
        "version": 41
      },
      {
        "action": "UPDATE",
        "contact": {
          "id": "234e5678-e89b-12d3-a456-426614174001",
          "first_name": "Jane",
          "last_name": "Doe",
          "phone_primary": "+1234567890",
          "phone_secondary": "+0987654321",
          "created_by_agent": "AGENT001",
          "created_at": "2024-01-15T11:00:00Z",
          "updated_at": "2024-01-15T12:00:00Z",
          "version": 44,
          "is_deleted": false
        },
        "version": 44
      },
      {
        "action": "DELETE",
        "contact": {
          "id": "456e7890-e89b-12d3-a456-426614174003",
          "version": 45,
          "is_deleted": true
        },
        "version": 45
      }
    ],
    "has_more": false
  }
}
```

### 7. Bulk Import

**Endpoint:** `POST /api/bulk/import`

**Request Body:**
```json
{
  "contacts": [
    {
      "first_name": "Alice",
      "last_name": "Brown",
      "phone_primary": "+1111111111"
    },
    {
      "first_name": "Charlie",
      "last_name": "Davis",
      "phone_primary": "+2222222222",
      "phone_secondary": "+3333333333"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "errors": []
  },
  "message": "Bulk import completed. 2 successful, 0 failed"
}
```

### 8. Export Contacts

**Endpoint:** `GET /api/bulk/export`

**Query Parameters:**
- `format`: "json" or "csv" (default: "json")

**Example Request:**
```http
GET /api/bulk/export?format=csv
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:** Downloads CSV or JSON file with all contacts.

---

## WebSocket Integration

### Connection Setup

Use Socket.IO client library for Android:

```gradle
dependencies {
    implementation 'io.socket:socket.io-client:2.1.0'
}
```

### Connecting to WebSocket

```kotlin
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

val socket: Socket = IO.socket("http://your-server-url:3000")

socket.connect()

socket.on(Socket.EVENT_CONNECT) {
    // Authenticate after connection
    authenticateSocket()
}
```

### Authentication

After connecting, you must authenticate:

```kotlin
fun authenticateSocket() {
    val authData = JSONObject()
    authData.put("api_key", "sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    authData.put("agent_code", "AGENT001")
    authData.put("device_id", "device123")

    socket.emit("auth", authData) { response ->
        val data = response[0] as JSONObject
        if (data.getBoolean("success")) {
            Log.d("WebSocket", "Authenticated successfully")
            // Start listening for events
            setupEventListeners()
        } else {
            Log.e("WebSocket", "Authentication failed: ${data.getString("error")}")
        }
    }
}
```

### Event Listeners

#### Listen for New Contacts

```kotlin
socket.on("contact_created") { args ->
    val data = args[0] as JSONObject
    val contact = data.getJSONObject("contact")
    val version = data.getLong("version")
    val createdBy = data.getString("created_by")

    // Update local database
    updateLocalContact(contact, version)
}
```

#### Listen for Contact Updates

```kotlin
socket.on("contact_updated") { args ->
    val data = args[0] as JSONObject
    val contact = data.getJSONObject("contact")
    val version = data.getLong("version")
    val updatedBy = data.getString("updated_by")

    // Update local database
    updateLocalContact(contact, version)
}
```

#### Listen for Contact Deletions

```kotlin
socket.on("contact_deleted") { args ->
    val data = args[0] as JSONObject
    val contactId = data.getString("contact_id")
    val deletedBy = data.getString("deleted_by")

    // Delete from local database
    deleteLocalContact(contactId)
}
```

#### Listen for Sync Complete

```kotlin
socket.on("sync_complete") { args ->
    val data = args[0] as JSONObject
    val currentVersion = data.getLong("current_version")
    val changesCount = data.getInt("changes_count")

    // Update local version
    saveLocalVersion(currentVersion)
}
```

### Emitting Events

#### Request Delta Sync

```kotlin
fun requestDeltaSync() {
    val syncRequest = JSONObject()
    syncRequest.put("device_id", "device123")
    syncRequest.put("agent_code", "AGENT001")
    syncRequest.put("last_known_version", getLocalVersion())

    socket.emit("sync_request", syncRequest) { response ->
        val data = response[0] as JSONObject
        if (data.getBoolean("success")) {
            val syncResponse = data.getJSONObject("data")
            processSync(syncResponse)
        }
    }
}
```

#### Create Contact via WebSocket

```kotlin
fun createContactViaWS(firstName: String, lastName: String, phonePrimary: String?) {
    val contactData = JSONObject()
    contactData.put("first_name", firstName)
    contactData.put("last_name", lastName)
    if (phonePrimary != null) {
        contactData.put("phone_primary", phonePrimary)
    }

    socket.emit("contact_create", contactData) { response ->
        val data = response[0] as JSONObject
        if (data.getBoolean("success")) {
            val contact = data.getJSONObject("data")
            // Contact created successfully
        }
    }
}
```

#### Update Contact via WebSocket

```kotlin
fun updateContactViaWS(contactId: String, updates: JSONObject) {
    val updateData = JSONObject()
    updateData.put("id", contactId)
    updateData.put("data", updates)

    socket.emit("contact_update", updateData) { response ->
        val data = response[0] as JSONObject
        if (data.getBoolean("success")) {
            // Contact updated successfully
        }
    }
}
```

#### Delete Contact via WebSocket

```kotlin
fun deleteContactViaWS(contactId: String) {
    val deleteData = JSONObject()
    deleteData.put("id", contactId)

    socket.emit("contact_delete", deleteData) { response ->
        val data = response[0] as JSONObject
        if (data.getBoolean("success")) {
            // Contact deleted successfully
        }
    }
}
```

---

## Delta Sync Mechanism

### How It Works

1. **Version Tracking**: Each change (create/update/delete) increments a global version number
2. **Device State**: Each device tracks the last version it synced
3. **Delta Sync**: Device requests all changes since its last known version
4. **Efficient Updates**: Only changed contacts are transmitted

### Sync Flow

```
1. App starts → Check last_known_version (stored locally)
2. Connect to WebSocket → Authenticate
3. Request delta sync with last_known_version
4. Server responds with all changes since that version
5. Apply changes to local database
6. Update last_known_version to current_version
7. Listen for real-time updates via WebSocket
```

### Implementation Example

```kotlin
class SyncManager(private val context: Context) {

    private val prefs = context.getSharedPreferences("sync", Context.MODE_PRIVATE)

    fun getLastKnownVersion(): Long {
        return prefs.getLong("last_version", 0)
    }

    fun saveLastKnownVersion(version: Long) {
        prefs.edit().putLong("last_version", version).apply()
    }

    suspend fun performDeltaSync() {
        val lastVersion = getLastKnownVersion()

        // Request delta sync via REST API
        val response = apiService.getDeltaSync(lastVersion, deviceId)

        if (response.success) {
            val syncData = response.data

            // Process changes
            for (change in syncData.changes) {
                when (change.action) {
                    "CREATE" -> insertContact(change.contact)
                    "UPDATE" -> updateContact(change.contact)
                    "DELETE" -> deleteContact(change.contact.id)
                }
            }

            // Update local version
            saveLastKnownVersion(syncData.current_version)

            Log.d("Sync", "Synced ${syncData.changes.size} changes. Now at version ${syncData.current_version}")
        }
    }
}
```

---

## Offline Support

### Handling Offline Scenarios

1. **Queue Operations**: Store create/update/delete operations locally when offline
2. **Detect Online**: Listen for network connectivity changes
3. **Upload Queue**: When online, upload queued operations
4. **Delta Sync**: After uploading, perform delta sync to get other changes

### Implementation Pattern

```kotlin
class OfflineQueueManager(private val db: Database) {

    fun queueOperation(operation: Operation) {
        // Store operation in local queue table
        db.operationQueue.insert(operation)
    }

    suspend fun processQueue() {
        val operations = db.operationQueue.getAll()

        for (operation in operations) {
            try {
                when (operation.type) {
                    "CREATE" -> apiService.createContact(operation.data)
                    "UPDATE" -> apiService.updateContact(operation.id, operation.data)
                    "DELETE" -> apiService.deleteContact(operation.id)
                }

                // Remove from queue on success
                db.operationQueue.delete(operation.id)
            } catch (e: Exception) {
                Log.e("Queue", "Failed to process operation: ${e.message}")
                // Keep in queue for retry
            }
        }
    }
}
```

### Reconnection Flow

```kotlin
socket.on(Socket.EVENT_RECONNECT) {
    Log.d("WebSocket", "Reconnected to server")

    // Re-authenticate
    authenticateSocket()

    // Process offline queue
    lifecycleScope.launch {
        offlineQueue.processQueue()
    }

    // Perform delta sync
    lifecycleScope.launch {
        syncManager.performDeltaSync()
    }
}
```

---

## Code Examples

### Complete Android Integration Example

```kotlin
class ContactSyncService(private val context: Context) {

    private lateinit var socket: Socket
    private val apiService: ContactApiService = RetrofitClient.create()
    private val syncManager: SyncManager = SyncManager(context)
    private val offlineQueue: OfflineQueueManager = OfflineQueueManager(db)

    // Initialize
    fun initialize() {
        connectWebSocket()
        setupNetworkMonitoring()
    }

    // WebSocket Connection
    private fun connectWebSocket() {
        socket = IO.socket("http://your-server-url:3000")

        socket.on(Socket.EVENT_CONNECT) {
            authenticateSocket()
        }

        socket.on(Socket.EVENT_DISCONNECT) {
            Log.d("WS", "Disconnected")
        }

        socket.on(Socket.EVENT_RECONNECT) {
            handleReconnect()
        }

        socket.connect()
    }

    // Authentication
    private fun authenticateSocket() {
        val authData = JSONObject().apply {
            put("api_key", getApiKey())
            put("agent_code", getAgentCode())
            put("device_id", getDeviceId())
        }

        socket.emit("auth", authData) { response ->
            val data = response[0] as JSONObject
            if (data.getBoolean("success")) {
                setupRealtimeListeners()
                requestInitialSync()
            }
        }
    }

    // Real-time Listeners
    private fun setupRealtimeListeners() {
        socket.on("contact_created") { args ->
            handleContactCreated(args[0] as JSONObject)
        }

        socket.on("contact_updated") { args ->
            handleContactUpdated(args[0] as JSONObject)
        }

        socket.on("contact_deleted") { args ->
            handleContactDeleted(args[0] as JSONObject)
        }
    }

    // Sync
    private fun requestInitialSync() {
        lifecycleScope.launch {
            syncManager.performDeltaSync()
        }
    }

    // Handle reconnection
    private fun handleReconnect() {
        authenticateSocket()

        lifecycleScope.launch {
            // Process offline queue first
            offlineQueue.processQueue()

            // Then sync
            syncManager.performDeltaSync()
        }
    }

    // Network monitoring
    private fun setupNetworkMonitoring() {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                handleReconnect()
            }
        }

        connectivityManager.registerDefaultNetworkCallback(networkCallback)
    }

    // Create contact (with offline support)
    suspend fun createContact(firstName: String, lastName: String, phonePrimary: String?) {
        if (isOnline()) {
            try {
                apiService.createContact(CreateContactRequest(firstName, lastName, phonePrimary))
            } catch (e: Exception) {
                // Queue for later if request fails
                offlineQueue.queueOperation(Operation("CREATE", data = ...))
            }
        } else {
            // Queue for later
            offlineQueue.queueOperation(Operation("CREATE", data = ...))
        }
    }
}
```

### Retrofit API Interface

```kotlin
interface ContactApiService {

    @GET("api/contacts")
    suspend fun getContacts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("q") query: String? = null
    ): ApiResponse<PaginatedResponse<Contact>>

    @GET("api/contacts/{id}")
    suspend fun getContact(@Path("id") id: String): ApiResponse<Contact>

    @POST("api/contacts")
    suspend fun createContact(@Body contact: CreateContactRequest): ApiResponse<Contact>

    @PUT("api/contacts/{id}")
    suspend fun updateContact(
        @Path("id") id: String,
        @Body updates: UpdateContactRequest
    ): ApiResponse<Contact>

    @DELETE("api/contacts/{id}")
    suspend fun deleteContact(@Path("id") id: String): ApiResponse<Unit>

    @GET("api/sync/delta")
    suspend fun getDeltaSync(
        @Query("version") lastKnownVersion: Long,
        @Query("device_id") deviceId: String
    ): ApiResponse<SyncResponse>
}
```

---

## Error Handling

### HTTP Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (agent inactive)
- `404` - Not Found
- `409` - Conflict (duplicate agent_code)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed description (development only)"
}
```

---

## Best Practices

1. **Store API Key Securely**: Use Android Keystore for API key storage
2. **Implement Exponential Backoff**: For retry logic on failed requests
3. **Use WorkManager**: For background sync operations
4. **Batch Operations**: When possible, use bulk import/export
5. **Monitor Battery**: Pause real-time sync when battery is low
6. **Handle Conflicts**: Implement last-write-wins or prompt user
7. **Log Sync Events**: For debugging and analytics
8. **Test Offline Mode**: Thoroughly test offline queue and reconnection

---

## Support

For issues or questions:
- Backend Repository: https://github.com/your-repo/contacts-backend
- API Documentation (Swagger): http://your-server-url:3000/docs
- Email: support@yourcompany.com
