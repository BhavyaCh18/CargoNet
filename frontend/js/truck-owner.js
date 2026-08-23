import { API } from './api.js';
import { Auth } from './auth.js';

export const TruckOwnerModule = {
  initDashboard() {
    if (!Auth.requireRole(['TRUCK_OWNER', 'TRANSPORTER'])) return;
    this.loadMyFleet();
    this.loadMyBookings();
    this.loadNotifications();
  },

  async loadMyFleet() {
    const user = Auth.getUser();
    const container = document.getElementById('my-fleet-list');
    if (!container) return;

    try {
      const trucks = await API.get(`/trucks?ownerId=${user.id}`);
      if (trucks.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748B;">No trucks registered. Click "Register Truck" to add your fleet.</td></tr>`;
        return;
      }

      container.innerHTML = trucks.map(t => {
        let statusBadge = `<span class="pill-badge" style="margin:0; font-size:0.75rem;">${t.status}</span>`;
        if (t.status === 'RETURN_AVAILABLE') {
          statusBadge = `<span class="return-load-badge">🔥 RETURN_AVAILABLE</span>`;
        }

        return `
          <tr>
            <td><strong>#T${t.id}</strong></td>
            <td><strong>${t.vehicleNumber}</strong></td>
            <td>${t.vehicleType}</td>
            <td>${t.currentLocation} → ${t.destination}</td>
            <td>${t.availableCapacity} / ${t.maxCapacity} Tons</td>
            <td>${statusBadge}</td>
            <td>
              ${t.status === 'RETURN_AVAILABLE' ? `<a href="return-loads.html?truckId=${t.id}" class="btn btn-sm btn-primary-orange">View Return Cargo 🔥</a>` : ''}
              <button onclick="TruckOwnerModule.updateTruckStatus(${t.id}, 'AVAILABLE')" class="btn btn-sm btn-outline-dark">Make Available</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading fleet: ${err.message}</td></tr>`;
    }
  },

  async loadMyBookings() {
    const container = document.getElementById('truck-bookings-list');
    if (!container) return;

    try {
      const bookings = await API.get('/bookings/my-bookings');
      if (bookings.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748B;">No trip bookings currently.</td></tr>`;
        return;
      }

      container.innerHTML = bookings.map(b => `
        <tr>
          <td><strong>${b.bookingCode}</strong></td>
          <td>${b.vehicleNumber}</td>
          <td>${b.cargoName} (${b.weight} Tons)</td>
          <td>${b.pickupLocation} → ${b.destination}</td>
          <td>₹${b.transportCost?.toLocaleString('en-IN')}</td>
          <td>
            <span class="pill-badge" style="margin:0; font-size:0.7rem;">${b.status}</span>
            ${b.isReturnLoad ? '<span class="return-load-badge">RETURN LOAD</span>' : ''}
          </td>
          <td>
            ${this.renderStatusActionButtons(b)}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading bookings: ${err.message}</td></tr>`;
    }
  },

  renderStatusActionButtons(b) {
    if (b.status === 'CONFIRMED' || b.status === 'BOOKED' || b.status === 'RETURN_BOOKED' || b.status === 'PAID') {
      return `<button onclick="TruckOwnerModule.advanceBookingStatus(${b.id}, 'CARGO_PICKED_UP')" class="btn btn-sm btn-solid-dark">Cargo Picked Up 📦</button>`;
    }
    if (b.status === 'CARGO_PICKED_UP') {
      return `<button onclick="TruckOwnerModule.advanceBookingStatus(${b.id}, 'IN_TRANSIT')" class="btn btn-sm btn-solid-dark">In Transit 🚛</button>`;
    }
    if (b.status === 'IN_TRANSIT') {
      return `<button onclick="TruckOwnerModule.advanceBookingStatus(${b.id}, 'DELIVERED')" class="btn btn-sm btn-success">Complete Delivery ✅</button>`;
    }
    return `<span style="font-size:0.75rem; color:#15803D; font-weight:700;">Completed</span>`;
  },

  async advanceBookingStatus(bookingId, nextStatus) {
    try {
      await API.put(`/bookings/${bookingId}/status`, { status: nextStatus });
      alert(`Trip status updated to: ${nextStatus}`);
      this.loadMyBookings();
      this.loadMyFleet();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  },

  async updateTruckStatus(truckId, status) {
    try {
      await API.put(`/trucks/${truckId}/status`, { status });
      alert(`Truck status set to ${status}`);
      this.loadMyFleet();
    } catch (err) {
      alert(`Error updating truck status: ${err.message}`);
    }
  },

  async loadNotifications() {
    const container = document.getElementById('notifications-banner');
    if (!container) return;

    try {
      const notifications = await API.get('/notifications');
      const unread = notifications.filter(n => !n.readStatus);

      if (unread.length > 0) {
        container.innerHTML = unread.map(n => `
          <div style="background-color:#FFF7ED; border:1px solid #F97316; padding:12px 16px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${n.title}</strong> — ${n.message}
            </div>
            <button onclick="TruckOwnerModule.dismissNotification(${n.id})" class="btn btn-xs btn-outline-dark">Dismiss</button>
          </div>
        `).join('');
      } else {
        container.innerHTML = '';
      }
    } catch (err) {
      console.warn("Notification error:", err);
    }
  },

  async dismissNotification(id) {
    await API.put(`/notifications/${id}/read`, {});
    this.loadNotifications();
  },

  initRegisterForm() {
    if (!Auth.requireRole(['TRUCK_OWNER', 'TRANSPORTER'])) return;
    const form = document.getElementById('register-truck-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const truckData = {
        vehicleNumber: document.getElementById('vehicleNumber').value,
        vehicleType: document.getElementById('vehicleType').value,
        maxCapacity: parseFloat(document.getElementById('maxCapacity').value),
        currentLocation: document.getElementById('currentLocation').value,
        originalPickupLocation: document.getElementById('originalPickupLocation').value || document.getElementById('currentLocation').value,
        destination: document.getElementById('destination').value,
        availabilityDate: document.getElementById('availabilityDate').value,
        expectedDestinationDate: document.getElementById('expectedDestinationDate').value
      };

      try {
        const saved = await API.post('/trucks', truckData);
        alert(`Truck registered successfully! Vehicle: ${saved.vehicleNumber}`);
        window.location.href = 'truck-owner-dashboard.html';
      } catch (err) {
        alert(`Failed to register truck: ${err.message}`);
      }
    });
  }
};

window.TruckOwnerModule = TruckOwnerModule;
