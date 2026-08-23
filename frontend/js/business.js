import { API } from './api.js';
import { Auth } from './auth.js';

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

      if (bookings.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; color:#64748B;">
              No active or past bookings.
            </td>
          </tr>
        `;
        return;
      }

      container.innerHTML = bookings.map(b => `
        <tr>

          <td>
            <strong>${b.bookingCode}</strong>
          </td>

          <td>
            ${b.cargoName} (${b.weight} Tons)
          </td>

          <td>
            ${b.pickupLocation} → ${b.destination}
          </td>

          <td>
            ₹${b.totalCost?.toLocaleString('en-IN')}
          </td>

          <td>
            <span
              class="pill-badge"
              style="margin:0; font-size:0.7rem;"
            >
              ${b.status}
            </span>

            ${b.isReturnLoad
          ? '<span class="return-load-badge">RETURN LOAD</span>'
          : ''
        }
          </td>

          <td>
            <a
              href="tracking.html?bookingId=${b.id}"
              class="btn btn-sm btn-outline-dark"
            >
              Track 📍
            </a>
          </td>

        </tr>
      `).join('');

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

        alert(
          `Cargo created successfully! Search ID: C00${saved.id}`
        );

        window.location.href =
          `matching.html?cargoId=${saved.id}`;

      } catch (err) {

        console.error("Error creating cargo:", err);

        alert(
          `Failed to create cargo: ${err.message}`
        );
      }

    });
  }

};


window.BusinessModule = BusinessModule;