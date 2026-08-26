import { API } from './api.js';
import { Auth } from './auth.js';

export const MatchingModule = {
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const cargoId = urlParams.get('cargoId');

    const container = document.getElementById('matching-results-container');
    const headerContainer = document.getElementById('cargo-details-header');
    if (!container) return;

    if (!cargoId) {
      container.innerHTML = `<div class="card"><p style="color:#64748B;">Please select or create cargo first to find matching trucks.</p></div>`;
      return;
    }

    try {
      const data = await API.get(`/matching/cargo/${cargoId}`);
      const cargo = data.cargo;
      const rawMatches = data.matches || data.matchingTrucks || data.matching_trucks || [];
      const matches = rawMatches.map(m => m.truck ? m : {
        truck: m,
        matchScore: 100,
        bestMatch: true,
        routeScore: 40,
        capacityScore: 30,
        dateScore: 20
      });

      if (headerContainer && cargo) {
        headerContainer.innerHTML = `
          <div class="card" style="background:#0B1220; color:#FFFFFF; border-left:4px solid #F97316;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="pill-badge" style="background:#1E293B; color:#FFFFFF; border-color:rgba(255,255,255,0.2);">CARGO #C00${cargo.id}</span>
                <h2 style="font-size:1.5rem; font-weight:800; margin-top:8px;">${cargo.cargoName}</h2>
                <p style="color:#94A3B8; font-size:0.9rem;">📍 Route: <strong>${cargo.pickupLocation} → ${cargo.destination}</strong> | ⚖️ Weight: <strong>${cargo.weight} Tons</strong></p>
              </div>
              <div>
                <span style="font-size:1.2rem; font-weight:800; color:#F97316;">${matches.length} TRUCKS MATCHED</span>
              </div>
            </div>
          </div>
        `;
      }

      if (matches.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:40px;">
            <p style="font-size:1.1rem; color:#64748B;">No available trucks currently match your route and weight requirement.</p>
            <a href="create-cargo.html" class="btn btn-outline-dark" style="margin-top:16px;">Post Another Cargo</a>
          </div>
        `;
        return;
      }

      container.innerHTML = matches.map(m => {
        const truck = m.truck;
        const score = m.matchScore;
        const isBestMatch = m.bestMatch || score >= 90;

        return `
          <div class="card" style="border-left: ${isBestMatch ? '4px solid #F97316' : '1px solid #E2E8F0'}; transition:transform 0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:12px; margin-bottom:16px;">
              <div>
                <span class="pill-badge" style="margin-bottom:4px;">${truck.vehicleType}</span>
                <h3 style="font-size:1.2rem; font-weight:800; color:#0B1220;">🚚 Truck ${truck.vehicleNumber}</h3>
                <p style="font-size:0.85rem; color:#64748B;">Transporter: ${truck.ownerName || 'Independent Transporter'}</p>
              </div>
              <div style="text-align:right;">
                ${isBestMatch ? '<span class="return-load-badge" style="font-size:0.85rem; padding:6px 14px; display:inline-block; margin-bottom:6px;">🔥 100% BEST MATCH</span>' : `<span style="font-size:1.2rem; font-weight:800; color:#0B1220;">${score}% MATCH</span>`}
                <div style="font-size:0.75rem; color:#64748B;">Route: ${m.routeScore}/40 | Capacity: ${m.capacityScore}/30 | Date: ${m.dateScore}/20</div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:20px; font-size:0.9rem;">
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">CURRENT LOCATION</span>
                <strong>${truck.currentLocation}</strong>
              </div>
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">DESTINATION</span>
                <strong>${truck.destination}</strong>
              </div>
              <div>
                <span style="color:#64748B; font-size:0.75rem; display:block; font-weight:700;">AVAILABLE CAPACITY</span>
                <strong>${truck.availableCapacity} Tons / ${truck.maxCapacity} Tons</strong>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:0.75rem; color:#64748B;">ESTIMATED PRICE</span>
                <div style="font-size:1.3rem; font-weight:800; color:#0B1220;">₹${(cargo.weight * 1500).toLocaleString('en-IN')}</div>
              </div>
              <button onclick="MatchingModule.bookTruck(${cargo.id}, ${truck.id})" class="btn btn-solid-dark">
                BOOK TRUCK 🚚
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div class="card"><p style="color:red;">Error loading matches: ${err.message}</p></div>`;
    }
  },

  async bookTruck(cargoId, truckId) {
    if (!Auth.checkSession()) {
      if (window.NotificationSystem) {
        window.NotificationSystem.showWarning({
          title: 'Authentication Required',
          message: 'Please login first to book a truck.',
          buttonText: 'Go to Login',
          onConfirm: () => { window.location.href = 'login.html'; }
        });
      } else {
        window.location.href = 'login.html';
      }
      return;
    }

    try {
      const booking = await API.post('/bookings', { cargoId, truckId });
      if (window.NotificationSystem) {
        window.NotificationSystem.showSuccess({
          title: 'Booking Confirmed',
          message: `Your truck booking has been created successfully! Booking Code: ${booking.bookingCode}`,
          buttonText: 'Proceed to Payment',
          onConfirm: () => {
            window.location.href = `payment.html?bookingId=${booking.id}`;
          }
        });
      } else {
        window.location.href = `payment.html?bookingId=${booking.id}`;
      }
    } catch (err) {
      if (window.NotificationSystem) {
        window.NotificationSystem.showError({
          title: 'Booking Failed',
          message: `Unable to complete truck booking: ${err.message}`
        });
      }
    }
  }
};

window.MatchingModule = MatchingModule;
