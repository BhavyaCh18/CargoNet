import { API } from './api.js';
import { Auth } from './auth.js';

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let hours = parseInt(parts[0], 10);
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = (parts[1] || '00').substring(0, 2);
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

export function formatPickupSchedule(dateStr, startTime, endTime) {
  if (!dateStr && !startTime && !endTime) return 'Not specified';
  
  let formattedDate = '';
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } else {
        formattedDate = String(dateStr);
      }
    } catch (e) {
      formattedDate = String(dateStr);
    }
  }

  if (startTime && endTime) {
    const slot = `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
    return formattedDate ? `${formattedDate} (${slot})` : slot;
  } else if (startTime) {
    const slot = formatTime12h(startTime);
    return formattedDate ? `${formattedDate} (${slot})` : slot;
  }
  return formattedDate || 'Not specified';
}

export const BusinessModule = {

  initDashboard() {
    if (!Auth.requireRole(['BUSINESS', 'SHIPPER'])) return;

    this.loadMyCargo();
    this.loadMyBookings();
  },

  async loadMyCargo() {
    const container = document.getElementById('my-cargo-list');

    if (!container) return;

    try {
      // User ID is taken securely from the JWT on the backend
      const cargoList = await API.get('/cargo');

      // Update Summary Metrics if present
      if (document.getElementById('stat-biz-cargo')) {
        document.getElementById('stat-biz-cargo').innerText = cargoList.length;
      }
      if (document.getElementById('stat-biz-active')) {
        const activeCount = cargoList.filter(c => c.status === 'SEARCHING' || c.status === 'ACTIVE' || c.status === 'BOOKED' || c.status === 'IN_TRANSIT').length;
        document.getElementById('stat-biz-active').innerText = activeCount;
      }
      if (document.getElementById('stat-biz-delivered')) {
        const deliveredCount = cargoList.filter(c => c.status === 'DELIVERED').length;
        document.getElementById('stat-biz-delivered').innerText = deliveredCount;
      }

      if (cargoList.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; color:#64748B;">
              No cargo posted yet. Click "Create Cargo" to post your first shipment.
            </td>
          </tr>
        `;
        return;
      }

      container.innerHTML = cargoList.map(c => `
        <tr>
          <td><strong>#C00${c.id}</strong></td>

          <td>
            <strong>${c.cargoName}</strong>
            <div style="font-size:0.75rem; color:#64748B; margin-top:2px;">
              Pickup: ${formatPickupSchedule(c.pickupDate, c.pickupStartTime, c.pickupEndTime)}
            </div>
          </td>

          <td>
            ${c.pickupLocation} → ${c.destination}
          </td>

          <td>
            <strong>${c.weight} Tons</strong>
          </td>

          <td>
            <span
              class="pill-badge"
              style="margin:0; font-size:0.7rem;"
            >
              ${c.status}
            </span>
          </td>

          <td>
            <a
              href="matching.html?cargoId=${c.id}"
              class="btn btn-sm btn-solid-dark"
            >
              Find Trucks →
            </a>
          </td>
        </tr>
      `).join('');

    } catch (err) {
      console.error("Error loading cargo:", err);

      container.innerHTML = `
        <tr>
          <td colspan="6" style="color:red;">
            Error loading cargo: ${err.message}
          </td>
        </tr>
      `;
    }
  },


  async loadMyBookings() {
    const container = document.getElementById('business-bookings-list');

    if (!container) return;

    try {
      const bookings = await API.get('/bookings/my-bookings');

      if (document.getElementById('stat-biz-spent')) {
        const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.totalCost) || Number(b.transportCost) || 0), 0);
        document.getElementById('stat-biz-spent').innerText = `₹${totalSpent.toLocaleString('en-IN')}`;
      }

      if (bookings.length === 0) {
        const colSpan = document.getElementById('stat-biz-cargo') ? 4 : 6;
        container.innerHTML = `
          <tr>
            <td colspan="${colSpan}" style="text-align:center; color:#64748B;">
              No active or past bookings.
            </td>
          </tr>
        `;
        return;
      }

      const isDashboard = !!document.getElementById('stat-biz-cargo');

      if (isDashboard) {
        container.innerHTML = bookings.map(b => `
          <tr>
            <td><strong>${b.bookingCode}</strong></td>
            <td>${b.pickupLocation} → ${b.destination}</td>
            <td><span class="pill-badge" style="margin:0; font-size:0.7rem;">${b.status}</span></td>
            <td><a href="tracking.html?bookingId=${b.id}" class="btn btn-sm btn-outline-dark">Track 📍</a></td>
          </tr>
        `).join('');
      } else {
        container.innerHTML = bookings.map(b => `
          <tr>
            <td><strong>${b.bookingCode}</strong></td>
            <td>
              ${b.cargoName} (${b.weight} Tons)
              <div style="font-size:0.75rem; color:#64748B; margin-top:2px;">
                Pickup: ${formatPickupSchedule(b.pickupDate, b.pickupStartTime, b.pickupEndTime)}
              </div>
            </td>
            <td>${b.pickupLocation} → ${b.destination}</td>
            <td>₹${(b.totalCost || b.transportCost)?.toLocaleString('en-IN')}</td>
            <td>
              <span class="pill-badge" style="margin:0; font-size:0.7rem;">${b.status}</span>
              ${b.isReturnLoad ? '<span class="return-load-badge">RETURN LOAD</span>' : ''}
            </td>
            <td>
              <a href="tracking.html?bookingId=${b.id}" class="btn btn-sm btn-outline-dark">Track 📍</a>
            </td>
          </tr>
        `).join('');
      }

    } catch (err) {
      console.error("Error loading bookings:", err);

      container.innerHTML = `
        <tr>
          <td colspan="6" style="color:red;">
            Error loading bookings: ${err.message}
          </td>
        </tr>
      `;
    }
  },


  initCreateForm() {
    if (!Auth.requireRole(['BUSINESS', 'SHIPPER'])) return;

    const form = document.getElementById('create-cargo-form');

    if (!form) return;

    form.addEventListener('submit', async (e) => {

      e.preventDefault();

      const pickupStartTime = document.getElementById('pickupStartTime')?.value;
      const pickupEndTime = document.getElementById('pickupEndTime')?.value;

      if (!pickupStartTime || !pickupEndTime) {
        if (window.NotificationSystem) {
          window.NotificationSystem.showError({
            title: 'Validation Error',
            message: 'Please select both pickup start time and end time.'
          });
        }
        return;
      }

      if (pickupStartTime >= pickupEndTime) {
        if (window.NotificationSystem) {
          window.NotificationSystem.showError({
            title: 'Invalid Time Slot',
            message: 'Pickup end time must be later than pickup start time.'
          });
        }
        return;
      }

      const cargoData = {
        cargoName:
          document.getElementById('cargoName').value,

        pickupLocation:
          document.getElementById('pickupLocation').value,

        destination:
          document.getElementById('destination').value,

        weight:
          parseFloat(document.getElementById('weight').value),

        description:
          document.getElementById('description').value,

        pickupDate:
          document.getElementById('pickupDate').value,

        pickupStartTime: pickupStartTime,

        pickupEndTime: pickupEndTime,

        requiredDeliveryDate:
          document.getElementById('requiredDeliveryDate').value,

        preferredVehicleType:
          document.getElementById('preferredVehicleType').value,

        specialHandling:
          document.getElementById('specialHandling').value
      };


      try {
        const saved = await API.post(
          '/cargo',
          cargoData
        );

        const scheduleText = formatPickupSchedule(saved.pickupDate, saved.pickupStartTime, saved.pickupEndTime);

        if (window.NotificationSystem) {
          window.NotificationSystem.showSuccess({
            title: 'Cargo Created Successfully',
            message: `Your cargo shipment (#C00${saved.id}) has been posted to the network.\nPickup Window: ${scheduleText}`,
            buttonText: 'Find Matching Trucks',
            onConfirm: () => {
              window.location.href = `matching.html?cargoId=${saved.id}`;
            }
          });
        } else {
          window.location.href = `matching.html?cargoId=${saved.id}`;
        }
      } catch (err) {
        console.error("Error creating cargo:", err);

        if (window.NotificationSystem) {
          window.NotificationSystem.showError({
            title: 'Unable to Create Cargo',
            message: `Something went wrong while creating your cargo: ${err.message}`
          });
        }
      }

    });
  }

};


window.BusinessModule = BusinessModule;