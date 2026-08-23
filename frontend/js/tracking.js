import { API } from './api.js';

const CITY_COORDS = {
  'hyderabad': [17.3850, 78.4867],
  'bengaluru': [12.9716, 77.5946],
  'bangalore': [12.9716, 77.5946],
  'chennai': [13.0827, 80.2707],
  'mumbai': [19.0760, 72.8777],
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'kolkata': [22.5726, 88.3639],
  'pune': [18.5204, 73.8567],
  'jaipur': [26.9124, 75.7873],
  'ahmedabad': [23.0225, 72.5714],
  'surat': [21.1702, 72.8311],
  'visakhapatnam': [17.6868, 83.2185],
  'vizag': [17.6868, 83.2185],
  'vijayawada': [16.5062, 80.6480],
  'nagpur': [21.1458, 79.0882],
  'lucknow': [26.8467, 80.9462],
  'kochi': [9.9312, 76.2673],
  'cochin': [9.9312, 76.2673],
  'coimbatore': [11.0168, 76.9558],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'patna': [25.5941, 85.1376],
  'bhubaneswar': [20.2961, 85.8245]
};

function getCityCoordinates(location) {
  if (!location || typeof location !== 'string') return null;

  const normalized = location.trim().toLowerCase();
  if (CITY_COORDS[normalized]) {
    return CITY_COORDS[normalized];
  }

  // Handle location strings like "Hyderabad, Telangana"
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) {
      return coords;
    }
  }

  return null;
}

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

      this.initMap(
        tracking.latitude,
        tracking.longitude,
        tracking.currentLocation,
        booking.pickupLocation,
        booking.destination
      );
    } catch (err) {
      infoContainer.innerHTML = `<p style="color:red;">Error loading tracking details: ${err.message}</p>`;
    }
  },

  initMap(lat, lng, locationName, pickupLocation, destination) {
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement || typeof L === 'undefined') return;

    if (this.map) {
      this.map.remove();
    }

    const hasCoordinates =
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng));

    const trackingCoords = hasCoordinates
      ? [Number(lat), Number(lng)]
      : getCityCoordinates(locationName);

    const pickupCoords = getCityCoordinates(pickupLocation);
    const destCoords = getCityCoordinates(destination);

    // Fallback order for map center
    const centerCoords = trackingCoords || pickupCoords || destCoords || [17.3850, 78.4867];

    this.map = L.map('leaflet-map').setView(centerCoords, 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Add marker for current location
    const markerCoords = trackingCoords || centerCoords;
    this.marker = L.marker(markerCoords).addTo(this.map)
      .bindPopup(`<b>🚚 Truck Position</b><br>${locationName || 'In Transit'}`)
      .openPopup();

    // Draw route line dynamically
    const routePoints = [];
    if (pickupCoords) routePoints.push(pickupCoords);
    if (trackingCoords && (!pickupCoords || trackingCoords[0] !== pickupCoords[0] || trackingCoords[1] !== pickupCoords[1])) {
      routePoints.push(trackingCoords);
    }
    if (destCoords && (!trackingCoords || destCoords[0] !== trackingCoords[0] || destCoords[1] !== trackingCoords[1])) {
      routePoints.push(destCoords);
    }

    if (routePoints.length >= 2) {
      L.polyline(routePoints, {
        color: '#0B1220',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8'
      }).addTo(this.map);
    }
  }
};

window.TrackingModule = TrackingModule;
