import { API } from './api.js';
import { Auth } from './auth.js';

export const AdminModule = {
  async initDashboard() {
    if (!Auth.requireRole(['ADMIN'])) return;

    try {
      const stats = await API.get('/admin/statistics');

      if (document.getElementById('stat-total-users')) document.getElementById('stat-total-users').innerText = stats.totalUsers || 0;
      if (document.getElementById('stat-businesses')) document.getElementById('stat-businesses').innerText = stats.totalBusinesses || 0;
      if (document.getElementById('stat-truck-owners')) document.getElementById('stat-truck-owners').innerText = stats.totalTruckOwners || 0;
      if (document.getElementById('stat-trucks')) document.getElementById('stat-trucks').innerText = stats.totalTrucks || 0;
      if (document.getElementById('stat-cargo')) document.getElementById('stat-cargo').innerText = stats.totalCargo || 0;
      if (document.getElementById('stat-active-bookings')) document.getElementById('stat-active-bookings').innerText = stats.activeBookings || 0;
      if (document.getElementById('stat-completed-deliveries')) document.getElementById('stat-completed-deliveries').innerText = stats.completedDeliveries || 0;
      if (document.getElementById('stat-return-matched')) document.getElementById('stat-return-matched').innerText = stats.returnLoadsMatched || 0;
      if (document.getElementById('stat-empty-reduced')) document.getElementById('stat-empty-reduced').innerText = stats.estimatedEmptyTripsReduced || 0;
    } catch (err) {
      console.error("Error loading admin stats:", err);
    }

    this.loadUsers();
    this.loadComplaints();
  },

  async loadUsers() {
    if (!Auth.requireRole(['ADMIN'])) return;
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    try {
      const users = await API.get('/admin/users');
      container.innerHTML = users.map(u => `
        <tr>
          <td><strong>#${u.id}</strong></td>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td>${u.companyName || '-'}</td>
          <td><span class="pill-badge" style="margin:0;">${u.role}</span></td>
          <td>
            <span class="pill-badge" style="margin:0; ${u.status === 'BLOCKED' ? 'background:#FEE2E2; color:#991B1B; border-color:#EF4444;' : ''}">${u.status}</span>
          </td>
          <td>
            <button onclick="AdminModule.toggleBlockUser(${u.id})" class="btn btn-sm ${u.status === 'BLOCKED' ? 'btn-outline-dark' : 'btn-outline-danger'}">
              ${u.status === 'BLOCKED' ? 'Unblock Account' : 'Block User 🚫'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading users: ${err.message}</td></tr>`;
    }
  },

  async toggleBlockUser(userId) {
    try {
      await API.put(`/admin/users/${userId}/toggle-block`, {});
      alert("User status updated successfully.");
      this.loadUsers();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  },

  async loadTrucks() {
    if (!Auth.requireRole(['ADMIN'])) return;
    const container = document.getElementById('admin-trucks-list');
    if (!container) return;

    try {
      const trucks = await API.get('/admin/trucks');
      container.innerHTML = trucks.map(t => `
        <tr>
          <td><strong>#T${t.id}</strong></td>
          <td><strong>${t.vehicleNumber}</strong></td>
          <td>${t.vehicleType}</td>
          <td>${t.ownerName || 'Independent Transporter'}</td>
          <td>${t.currentLocation} → ${t.destination}</td>
          <td>${t.availableCapacity} / ${t.maxCapacity} Tons</td>
          <td><span class="pill-badge" style="margin:0;">${t.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading trucks: ${err.message}</td></tr>`;
    }
  },

  async loadCargo() {
    if (!Auth.requireRole(['ADMIN'])) return;
    const container = document.getElementById('admin-cargo-list');
    if (!container) return;

    try {
      const cargoList = await API.get('/admin/cargo');
      container.innerHTML = cargoList.map(c => `
        <tr>
          <td><strong>#C00${c.id}</strong></td>
          <td><strong>${c.cargoName}</strong></td>
          <td>${c.businessName || 'Independent Business'}</td>
          <td>${c.pickupLocation} → ${c.destination}</td>
          <td>${c.weight} Tons</td>
          <td><span class="pill-badge" style="margin:0;">${c.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading cargo: ${err.message}</td></tr>`;
    }
  },

  async loadBookings() {
    if (!Auth.requireRole(['ADMIN'])) return;
    const container = document.getElementById('admin-bookings-list');
    if (!container) return;

    try {
      const bookings = await API.get('/admin/bookings');
      container.innerHTML = bookings.map(b => `
        <tr>
          <td><strong>${b.bookingCode}</strong></td>
          <td>${b.businessName || 'Business'}</td>
          <td>${b.vehicleNumber || 'Truck'}</td>
          <td>${b.pickupLocation} → ${b.destination}</td>
          <td>₹${b.totalCost?.toLocaleString('en-IN')}</td>
          <td>
            <span class="pill-badge" style="margin:0;">${b.status}</span>
            ${b.isReturnLoad ? '<span class="return-load-badge">RETURN LOAD</span>' : ''}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading bookings: ${err.message}</td></tr>`;
    }
  },

  async loadComplaints() {
    if (!Auth.requireRole(['ADMIN'])) return;
    const container = document.getElementById('admin-complaints-list');
    if (!container) return;

    try {
      const complaints = await API.get('/complaints');
      if (complaints.length === 0) {
        container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748B;">No complaints filed.</td></tr>`;
        return;
      }

      container.innerHTML = complaints.map(c => `
        <tr>
          <td><strong>#CMP-${c.id}</strong></td>
          <td>${c.userName || 'User'}</td>
          <td><strong>${c.subject}</strong></td>
          <td>${c.description}</td>
          <td><span class="pill-badge" style="margin:0;">${c.status}</span></td>
          <td>
            ${c.status === 'PENDING' ? `<button onclick="AdminModule.resolveComplaint(${c.id})" class="btn btn-sm btn-success">Resolve</button>` : '<span style="color:#15803D; font-weight:700;">Resolved</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading complaints: ${err.message}</td></tr>`;
    }
  },

  async resolveComplaint(id) {
    try {
      await API.put(`/complaints/${id}/resolve`, {});
      alert("Complaint resolved.");
      this.loadComplaints();
    } catch (err) {
      alert(`Error resolving complaint: ${err.message}`);
    }
  }
};

window.AdminModule = AdminModule;
