import { API } from './api.js';
import { Auth } from './auth.js';

export const ReturnLoadsModule = {
  async init() {
    if (!Auth.requireRole(['TRUCK_OWNER', 'TRANSPORTER'])) return;

    const urlParams = new URLSearchParams(window.location.search);
    const truckIdParam = urlParams.get('truckId');

    const container = document.getElementById('return-loads-container');
    if (!container) return;

    try {
      const user = Auth.getUser();
      const myFleet = await API.get(`/trucks?ownerId=${user.id}`);
      
      const returnAvailableTrucks = myFleet.filter(t => t.status === 'RETURN_AVAILABLE' || t.status === 'AVAILABLE');

      if (returnAvailableTrucks.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:40px;">
            <div style="font-size:44px; margin-bottom:12px;">🚚</div>
            <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:8px;">NO RETURN LOADS AVAILABLE</h3>
            <p style="color:#64748B;">None of your trucks are currently in RETURN_AVAILABLE status. Once an outbound delivery is completed, your truck automatically enters return load matching mode.</p>
            <a href="truck-owner-dashboard.html" class="btn btn-solid-dark" style="margin-top:16px;">Back to Dashboard</a>
          </div>
        `;
        return;
      }

      let selectedTruck = returnAvailableTrucks[0];
      if (truckIdParam) {
        const found = returnAvailableTrucks.find(t => t.id === parseInt(truckIdParam));
        if (found) selectedTruck = found;
      }

      const matchData = await API.get(`/matching/return-load/${selectedTruck.id}`);
      const matchingCargoList = matchData.matchingCargo || [];

      container.innerHTML = `
        <!-- Truck Header Banner -->
        <div class="card" style="background:#0B1220; color:#FFFFFF; border-left:4px solid #F97316;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="return-load-badge">🔥 RETURN_AVAILABLE</span>
              <h2 style="font-size:1.4rem; font-weight:800; margin-top:8px;">TRUCK #${selectedTruck.vehicleNumber} (${selectedTruck.vehicleType})</h2>
              <p style="color:#94A3B8; font-size:0.9rem; margin-top:4px;">
                📍 Current Location: <strong>${matchData.pickupLocation}</strong> &rarr; Return Destination: <strong>${matchData.returnDestination}</strong> | ⚖️ Available Capacity: <strong>${matchData.availableCapacity} Tons</strong>
              </p>
            </div>
            <div>
              <span style="font-size:1.2rem; font-weight:800; color:#F97316;">${matchingCargoList.length} MATCHING CARGO</span>
            </div>
          </div>
        </div>

        <h2 class="section-title" style="margin-bottom:20px;">RETURN LOAD OPPORTUNITIES</h2>

        ${matchingCargoList.length === 0 ? `
          <div class="card" style="text-align:center; padding:32px;">
            <p style="font-size:1rem; color:#64748B;">NO RETURN LOADS AVAILABLE FOR THIS ROUTE (${matchData.pickupLocation} &rarr; ${matchData.returnDestination})</p>
            <p style="font-size:0.85rem; color:#94A3B8; margin-top:6px;">Other business shippers posting cargo on this corridor will appear here automatically.</p>
          </div>
        ` : matchingCargoList.map(c => `
          <div class="card" style="border-left:4px solid #F97316;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <span class="pill-badge" style="margin-bottom:4px;">CARGO #C00${c.id}</span>
                <h3 style="font-size:1.25rem; font-weight:800; color:#0B1220;">${c.cargoName}</h3>
                <p style="font-size:0.85rem; color:#64748B;">Shipper: <strong>${c.businessName || 'Independent Business'}</strong></p>
              </div>
              <div style="text-align:right;">
                <span class="return-load-badge">MATCHING RETURN ROUTE</span>
                <div style="font-size:1.4rem; font-weight:800; color:#0B1220; margin-top:6px;">₹${(c.weight * 1200).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:20px; font-size:0.9rem;">
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">ROUTE</span>
                <strong>${c.pickupLocation} → ${c.destination}</strong>
              </div>
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">CARGO WEIGHT</span>
                <strong>${c.weight} Tons</strong>
              </div>
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">SPECIAL HANDLING</span>
                <strong>${c.specialHandling || 'Standard Transport'}</strong>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end;">
              <button onclick="ReturnLoadsModule.acceptReturnCargo(${selectedTruck.id}, ${c.id})" class="btn btn-md btn-primary-orange">
                ACCEPT RETURN CARGO 🚚
              </button>
            </div>
          </div>
        `).join('')}
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color:red;">Error loading return loads: ${err.message}</p></div>`;
    }
  },

  async acceptReturnCargo(truckId, cargoId) {
    try {
      const booking = await API.post('/bookings/return-load', { truckId, cargoId });
      if (window.NotificationSystem) {
        window.NotificationSystem.showSuccess({
          title: 'Return Cargo Accepted',
          message: `Return Cargo Accepted Successfully! Return Booking Code: ${booking.bookingCode}`,
          buttonText: 'View My Bookings',
          onConfirm: () => {
            window.location.href = 'truck-bookings.html';
          }
        });
      } else {
        window.location.href = 'truck-bookings.html';
      }
    } catch (err) {
      if (window.NotificationSystem) {
        window.NotificationSystem.showError({
          title: 'Failed to Accept Return Cargo',
          message: err.message
        });
      }
    }
  }
};

window.ReturnLoadsModule = ReturnLoadsModule;
