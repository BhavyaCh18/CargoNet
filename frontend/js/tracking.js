import { API } from './api.js';

export const TrackingModule = {
  map: null,
  marker: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');

    const infoContainer = document.getElementById('tracking-info-card');
    if (!infoContainer || !bookingId) return;

    try {
      const data = await API.get(`/tracking/${bookingId}`);
      const booking = data.booking;
      const tracking = data.tracking;

      infoContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0B1220; padding-bottom:12px; margin-bottom:16px;">
          <div>
            <span class="pill-badge" style="margin:0;">BOOKING #${booking.bookingCode}</span>
            <h2 style="font-size:1.3rem; font-weight:800; margin-top:6px; color:#0B1220;">${booking.cargoName}</h2>
          </div>
          <div style="text-align:right;">
            <span class="pill-badge" style="margin:0; font-size:0.8rem; background:#0B1220; color:#FFFFFF;">STATUS: ${booking.status}</span>
            ${booking.isReturnLoad ? '<span class="return-load-badge" style="margin-left:8px;">RETURN LOAD</span>' : ''}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; font-size:0.9rem; margin-bottom:16px;">
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block;">ORIGIN PICKUP</span>
            <strong>${booking.pickupLocation}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block;">DESTINATION</span>
            <strong>${booking.destination}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block;">CURRENT LOCATION</span>
            <strong>${tracking.currentLocation}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block;">LAST UPDATED</span>
            <strong>Just Now</strong>
          </div>
        </div>
      `;

      this.initMap(tracking.latitude || 17.3850, tracking.longitude || 78.4867, tracking.currentLocation);
    } catch (err) {
      infoContainer.innerHTML = `<p style="color:red;">Error loading tracking details: ${err.message}</p>`;
    }
  },

  initMap(lat, lng, locationName) {
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement || typeof L === 'undefined') return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('leaflet-map').setView([lat, lng], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // City coordinates lookup for demonstration route rendering
    const cityCoords = {
      'hyderabad': [17.3850, 78.4867],
      'bengaluru': [12.9716, 77.5946],
      'bangalore': [12.9716, 77.5946],
      'chennai': [13.0827, 80.2707],
      'mumbai': [19.0760, 72.8777],
      'delhi': [28.6139, 77.2090]
    };

    // Add marker for current location
    this.marker = L.marker([lat, lng]).addTo(this.map)
      .bindPopup(`<b>🚚 Truck Position</b><br>${locationName}`)
      .openPopup();

    // Draw route line between Hyderabad and Bengaluru
    const hyd = cityCoords['hyderabad'];
    const blr = cityCoords['bengaluru'];
    L.polyline([hyd, blr], { color: '#0B1220', weight: 4, opacity: 0.7, dashArray: '8, 8' }).addTo(this.map);
  }
};

window.TrackingModule = TrackingModule;
