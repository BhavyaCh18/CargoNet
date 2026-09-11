import { API } from './api.js';
import { formatPickupSchedule } from './business.js';

const KNOWN_CORRIDORS = [
  {
    pair: ['hyderabad', 'bengaluru'],
    stops: ['Hyderabad', 'Jadcherla', 'Kurnool', 'Gooty', 'Anantapur', 'Penukonda', 'Bengaluru']
  },
  {
    pair: ['bengaluru', 'hyderabad'],
    stops: ['Bengaluru', 'Penukonda', 'Anantapur', 'Gooty', 'Kurnool', 'Jadcherla', 'Hyderabad']
  },
  {
    pair: ['hyderabad', 'bangalore'],
    stops: ['Hyderabad', 'Jadcherla', 'Kurnool', 'Gooty', 'Anantapur', 'Penukonda', 'Bengaluru']
  },
  {
    pair: ['bangalore', 'hyderabad'],
    stops: ['Bengaluru', 'Penukonda', 'Anantapur', 'Gooty', 'Kurnool', 'Jadcherla', 'Hyderabad']
  },
  {
    pair: ['mumbai', 'pune'],
    stops: ['Mumbai', 'Navi Mumbai', 'Lonavala', 'Pimpri-Chinchwad', 'Pune']
  },
  {
    pair: ['pune', 'mumbai'],
    stops: ['Pune', 'Pimpri-Chinchwad', 'Lonavala', 'Navi Mumbai', 'Mumbai']
  },
  {
    pair: ['delhi', 'jaipur'],
    stops: ['Delhi', 'Gurugram', 'Rewari', 'Kotputli', 'Shahpura', 'Jaipur']
  },
  {
    pair: ['jaipur', 'delhi'],
    stops: ['Jaipur', 'Shahpura', 'Kotputli', 'Rewari', 'Gurugram', 'Delhi']
  },
  {
    pair: ['chennai', 'bengaluru'],
    stops: ['Chennai', 'Kanchipuram', 'Vellore', 'Ambur', 'Hosur', 'Bengaluru']
  },
  {
    pair: ['bengaluru', 'chennai'],
    stops: ['Bengaluru', 'Hosur', 'Ambur', 'Vellore', 'Kanchipuram', 'Chennai']
  }
];

function getRouteStops(pickup, destination, currentLocation) {
  const pickupNorm = (pickup || '').trim().toLowerCase();
  const destNorm = (destination || '').trim().toLowerCase();

  for (const corridor of KNOWN_CORRIDORS) {
    if (pickupNorm.includes(corridor.pair[0]) && destNorm.includes(corridor.pair[1])) {
      return corridor.stops;
    }
  }

  // Fallback stops for dynamic routes
  const stops = [pickup || 'Pickup'];
  if (currentLocation && 
      !currentLocation.toLowerCase().includes(pickupNorm) && 
      !currentLocation.toLowerCase().includes(destNorm)) {
    stops.push(currentLocation);
  } else {
    stops.push('Route Checkpoint');
  }
  stops.push(destination || 'Destination');
  return stops;
}

export const TrackingModule = {
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
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #E2E8F0; padding-bottom:12px; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <span class="pill-badge" style="margin:0; background:#0B1220; color:#FFFFFF;">BOOKING #${booking.bookingCode}</span>
            <h2 style="font-size:1.3rem; font-weight:800; margin-top:6px; color:#0B1220;">${booking.cargoName} (${booking.weight} Tons)</h2>
          </div>
          <div style="text-align:right;">
            <span class="pill-badge" style="margin:0; font-size:0.8rem; background:#F97316; color:#FFFFFF;">STATUS: ${booking.status}</span>
            ${booking.isReturnLoad ? '<span class="return-load-badge" style="margin-left:8px;">RETURN LOAD</span>' : ''}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; font-size:0.9rem; margin-bottom:16px;">
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block; text-transform:uppercase;">ROUTE</span>
            <strong>${booking.pickupLocation} &rrArr; ${booking.destination}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block; text-transform:uppercase;">CURRENT POSITION</span>
            <strong>${tracking.currentLocation || booking.pickupLocation}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block; text-transform:uppercase;">PICKUP SCHEDULE</span>
            <strong>${formatPickupSchedule(booking.pickupDate, booking.pickupStartTime, booking.pickupEndTime)}</strong>
          </div>
          <div>
            <span style="color:#64748B; font-size:0.75rem; font-weight:700; display:block; text-transform:uppercase;">TRANSPORTER DETAILS</span>
            <strong>👤 ${booking.truckOwnerName || 'Transporter'}</strong>
            <div style="font-size:0.8rem; color:#0B1220; font-weight:600;">📞 ${booking.truckOwnerPhone || 'Not provided'}</div>
            <div style="font-size:0.75rem; color:#64748B;">🚚 ${booking.vehicleNumber} (${booking.vehicleType})</div>
          </div>
        </div>
      `;

      this.renderJourney(
        tracking.currentLocation,
        booking.pickupLocation,
        booking.destination,
        booking.status
      );
    } catch (err) {
      infoContainer.innerHTML = `<p style="color:red;">Error loading tracking details: ${err.message}</p>`;
    }
  },

  renderJourney(currentLoc, pickup, destination, status) {
    const journeyContainer = document.getElementById('tracking-journey-container');
    if (!journeyContainer) return;

    const stops = getRouteStops(pickup, destination, currentLoc);
    const activeLocation = (currentLoc || pickup || '').trim();

    let activeIndex = 0;
    const statusUpper = (status || '').toUpperCase();

    if (statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED') {
      activeIndex = stops.length - 1;
    } else {
      const matchIndex = stops.findIndex(stop => 
        activeLocation.toLowerCase().includes(stop.toLowerCase()) || 
        stop.toLowerCase().includes(activeLocation.toLowerCase())
      );
      if (matchIndex !== -1) {
        activeIndex = matchIndex;
      } else if (statusUpper === 'IN_TRANSIT') {
        activeIndex = Math.max(1, Math.floor(stops.length / 2));
      } else if (statusUpper === 'PICKED_UP') {
        activeIndex = Math.min(1, stops.length - 1);
      } else {
        activeIndex = 0;
      }
    }

    const progressPercent = stops.length > 1 ? Math.round((activeIndex / (stops.length - 1)) * 100) : 0;

    journeyContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; border-bottom:1px solid #E2E8F0; padding-bottom:16px;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:800; color:#0B1220; margin:0; display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.3rem;">🚚</span> Shipment Journey & Route Checkpoints
          </h3>
          <p style="font-size:0.85rem; color:#64748B; margin:4px 0 0 0;">
            Live checkpoint tracking along the transit corridor
          </p>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:#64748B; font-weight:700; text-transform:uppercase;">Journey Progress</div>
            <div style="font-size:1.1rem; font-weight:800; color:#2563EB;">${progressPercent}%</div>
          </div>
        </div>
      </div>

      <!-- Timeline Stepper -->
      <div style="position:relative; margin: 32px 10px 32px 10px; overflow-x:auto; padding: 10px 0;">
        <div style="min-width: 680px; position:relative;">
          <!-- Background Bar -->
          <div style="position:absolute; top:22px; left:20px; right:20px; height:6px; background:#E2E8F0; border-radius:3px; z-index:1;"></div>
          <!-- Filled Progress Bar -->
          <div style="position:absolute; top:22px; left:20px; width:calc((100% - 40px) * ${progressPercent / 100}); height:6px; background:linear-gradient(90deg, #16A34A, #2563EB); border-radius:3px; z-index:2; transition: width 0.4s ease;"></div>

          <!-- Checkpoint Steps -->
          <div style="display:flex; justify-content:space-between; position:relative; z-index:3;">
            ${stops.map((stop, idx) => {
              const isPassed = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              
              let circleBg = '#F1F5F9';
              let circleBorder = '#CBD5E1';
              let iconContent = `<span style="font-size:0.75rem; color:#64748B; font-weight:700;">${idx + 1}</span>`;
              let labelColor = '#64748B';
              let statusText = 'Upcoming Checkpoint';

              if (isPassed) {
                circleBg = '#16A34A';
                circleBorder = '#16A34A';
                iconContent = `<span style="color:#FFFFFF; font-weight:800; font-size:0.85rem;">✓</span>`;
                labelColor = '#0B1220';
                statusText = 'Passed';
              } else if (isCurrent) {
                circleBg = '#2563EB';
                circleBorder = '#3B82F6';
                iconContent = `<span style="font-size:1rem;">🚚</span>`;
                labelColor = '#1E40AF';
                if (idx === 0) statusText = 'Pickup Location';
                else if (idx === stops.length - 1) statusText = 'Destination Reached';
                else statusText = 'Current Truck Position';
              } else if (idx === 0) {
                statusText = 'Pickup Location';
              } else if (idx === stops.length - 1) {
                statusText = 'Destination';
              }

              return `
                <div style="display:flex; flex-direction:column; align-items:center; text-align:center; flex:1; max-width:140px;">
                  <div style="width:44px; height:44px; border-radius:50%; background:${circleBg}; border:3px solid ${circleBorder}; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 6px rgba(0,0,0,0.1); margin-bottom:10px; transition: all 0.3s ease;">
                    ${iconContent}
                  </div>
                  <div style="font-weight:${isCurrent ? '800' : '700'}; font-size:0.85rem; color:${labelColor}; line-height:1.2; word-break:break-word;">
                    ${stop}
                  </div>
                  <div style="font-size:0.72rem; color:${isCurrent ? '#2563EB' : '#64748B'}; font-weight:${isCurrent ? '700' : '500'}; margin-top:4px;">
                    ${statusText}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Route details bar -->
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px 16px; margin-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem;">
          <span style="font-weight:700; color:#0B1220;">📍 Active Location:</span>
          <span style="color:#2563EB; font-weight:700; background:#EFF6FF; padding:2px 8px; border-radius:4px; border:1px solid #BFDBFE;">
            ${activeLocation}
          </span>
        </div>
        <div style="font-size:0.8rem; color:#64748B;">
          Corridor Checkpoints: <strong>${stops.length} Towns / Hubs</strong>
        </div>
      </div>
    `;
  }
};

window.TrackingModule = TrackingModule;
