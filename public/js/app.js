// API Configuration
const API_BASE_URL = window.location.origin;
let API_KEY = localStorage.getItem('apiKey') || '';
let currentPage = 1;
let currentEditingId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (API_KEY) {
        showDashboard();
        loadContacts();
        loadDevices();
        loadStats();
    } else {
        showLogin();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Contacts
    document.getElementById('addContactBtn').addEventListener('click', () => openContactModal());
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 500));
    document.getElementById('exportBtn').addEventListener('click', exportContacts);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    // Modal
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeContactModal);
    document.querySelector('.close').addEventListener('click', closeContactModal);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('contactModal');
        if (e.target === modal) {
            closeContactModal();
        }
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const apiKey = document.getElementById('apiKey').value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = await response.json();

        if (data.success) {
            API_KEY = apiKey;
            localStorage.setItem('apiKey', apiKey);
            showDashboard();
            loadContacts();
            loadDevices();
            loadStats();
        } else {
            alert('Invalid API key. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to verify API key. Please check your connection.');
    }
}

function handleLogout() {
    API_KEY = '';
    localStorage.removeItem('apiKey');
    showLogin();
}

function showLogin() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    // Load data for the tab
    if (tabName === 'devices') {
        loadDevices();
    } else if (tabName === 'stats') {
        loadStats();
    }
}

// Contacts Management
async function loadContacts(page = 1, search = '') {
    currentPage = page;
    const tbody = document.getElementById('contactsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            ...(search && { q: search })
        });

        const response = await fetch(`${API_BASE_URL}/api/contacts?${params}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            renderContacts(data.data);
            renderPagination(data.pagination);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Failed to load contacts</td></tr>';
        }
    } catch (error) {
        console.error('Load contacts error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading contacts</td></tr>';
    }
}

function renderContacts(contacts) {
    const tbody = document.getElementById('contactsTableBody');

    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No contacts found</td></tr>';
        return;
    }

    tbody.innerHTML = contacts.map(contact => `
        <tr>
            <td>${escapeHtml(contact.first_name)}</td>
            <td>${escapeHtml(contact.last_name)}</td>
            <td>${escapeHtml(contact.phone_primary || '-')}</td>
            <td>${escapeHtml(contact.phone_secondary || '-')}</td>
            <td>${escapeHtml(contact.created_by_agent)}</td>
            <td>${formatDate(contact.updated_at)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editContact('${contact.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContact('${contact.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('contactsPagination');
    const { page, total_pages } = pagination;

    let html = '';

    // Previous button
    html += `<button ${page === 1 ? 'disabled' : ''} onclick="loadContacts(${page - 1})">Previous</button>`;

    // Page numbers
    for (let i = Math.max(1, page - 2); i <= Math.min(total_pages, page + 2); i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadContacts(${i})">${i}</button>`;
    }

    // Next button
    html += `<button ${page === total_pages ? 'disabled' : ''} onclick="loadContacts(${page + 1})">Next</button>`;

    container.innerHTML = html;
}

function handleSearch(e) {
    const query = e.target.value;
    loadContacts(1, query);
}

// Contact Modal
function openContactModal(contact = null) {
    const modal = document.getElementById('contactModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('contactForm');

    if (contact) {
        // Edit mode
        title.textContent = 'Edit Contact';
        currentEditingId = contact.id;
        document.getElementById('firstName').value = contact.first_name;
        document.getElementById('lastName').value = contact.last_name;
        document.getElementById('phonePrimary').value = contact.phone_primary || '';
        document.getElementById('phoneSecondary').value = contact.phone_secondary || '';
    } else {
        // Create mode
        title.textContent = 'Add Contact';
        currentEditingId = null;
        form.reset();
    }

    modal.classList.add('show');
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    modal.classList.remove('show');
    document.getElementById('contactForm').reset();
    currentEditingId = null;
}

async function handleContactSubmit(e) {
    e.preventDefault();

    const contactData = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        phone_primary: document.getElementById('phonePrimary').value.trim() || null,
        phone_secondary: document.getElementById('phoneSecondary').value.trim() || null
    };

    try {
        const url = currentEditingId
            ? `${API_BASE_URL}/api/contacts/${currentEditingId}`
            : `${API_BASE_URL}/api/contacts`;

        const response = await fetch(url, {
            method: currentEditingId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(contactData)
        });

        const data = await response.json();

        if (data.success) {
            closeContactModal();
            loadContacts(currentPage);
            alert(data.message);
        } else {
            alert(data.error || 'Failed to save contact');
        }
    } catch (error) {
        console.error('Save contact error:', error);
        alert('Failed to save contact');
    }
}

async function editContact(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            openContactModal(data.data);
        } else {
            alert('Failed to load contact');
        }
    } catch (error) {
        console.error('Load contact error:', error);
        alert('Failed to load contact');
    }
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
            method: 'DELETE',
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const data = await response.json();

        if (data.success) {
            loadContacts(currentPage);
            alert('Contact deleted successfully');
        } else {
            alert('Failed to delete contact');
        }
    } catch (error) {
        console.error('Delete contact error:', error);
        alert('Failed to delete contact');
    }
}

async function exportContacts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bulk/export?format=csv`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export contacts');
    }
}

// Device Monitoring
async function loadDevices() {
    const tbody = document.getElementById('devicesTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const [devicesRes, healthRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/devices`, {
                headers: { 'X-API-Key': API_KEY }
            }),
            fetch(`${API_BASE_URL}/api/devices/health`, {
                headers: { 'X-API-Key': API_KEY }
            })
        ]);

        const devicesData = await devicesRes.json();
        const healthData = await healthRes.json();

        if (devicesData.success && healthData.success) {
            renderDevices(devicesData.data);
            renderDeviceStats(healthData.data);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load devices</td></tr>';
        }
    } catch (error) {
        console.error('Load devices error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading devices</td></tr>';
    }
}

function renderDevices(devices) {
    const tbody = document.getElementById('devicesTableBody');

    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No devices found</td></tr>';
        return;
    }

    tbody.innerHTML = devices.map(device => `
        <tr>
            <td>${escapeHtml(device.device_id)}</td>
            <td>${escapeHtml(device.agent_name)} (${escapeHtml(device.agent_code)})</td>
            <td><span class="status-badge status-${device.connection_status}">${device.connection_status}</span></td>
            <td>${formatDate(device.last_sync_at)}</td>
            <td>${device.last_sync_version}</td>
            <td>${device.versions_behind}</td>
        </tr>
    `).join('');
}

function renderDeviceStats(stats) {
    document.getElementById('devicesOnline').textContent = stats.online;
    document.getElementById('devicesIdle').textContent = stats.idle;
    document.getElementById('devicesOffline').textContent = stats.offline;
    document.getElementById('devicesOutdated').textContent = stats.outdated;
}

// Statistics
async function loadStats() {
    try {
        const [contactsRes, devicesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/contacts/stats`, {
                headers: { 'X-API-Key': API_KEY }
            }),
            fetch(`${API_BASE_URL}/api/devices/stats`, {
                headers: { 'X-API-Key': API_KEY }
            })
        ]);

        const contactsData = await contactsRes.json();
        const devicesData = await devicesRes.json();

        if (contactsData.success && devicesData.success) {
            document.getElementById('totalContacts').textContent = contactsData.data.total_active;
            document.getElementById('totalAgents').textContent = contactsData.data.total_agents;
            document.getElementById('currentVersion').textContent = contactsData.data.latest_version;
            document.getElementById('totalDevices').textContent = devicesData.data.total_devices;
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Refresh Data
function refreshData() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    if (activeTab === 'contacts') {
        loadContacts(currentPage);
    } else if (activeTab === 'devices') {
        loadDevices();
    } else if (activeTab === 'stats') {
        loadStats();
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text?.toString().replace(/[&<>"']/g, m => map[m]) || '';
}
