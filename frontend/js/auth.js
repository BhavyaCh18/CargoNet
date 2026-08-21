import { API } from './api.js';

export const Auth = {
  checkSession() {
    const user = API.getUser();
    const token = API.getToken();
    return user && token;
  },

  getUser() {
    return API.getUser();
  },

  requireRole(allowedRoles = []) {
    const user = API.getUser();
    if (!user || !API.getToken()) {
      window.location.href = 'login.html';
      return false;
    }
    const userRole = user.role;
    let normalizedUserRole = userRole;
    if (userRole === 'SHIPPER') normalizedUserRole = 'BUSINESS';
    if (userRole === 'TRANSPORTER') normalizedUserRole = 'TRUCK_OWNER';

    const normalizedAllowed = allowedRoles.map(r => {
      if (r === 'SHIPPER') return 'BUSINESS';
      if (r === 'TRANSPORTER') return 'TRUCK_OWNER';
      return r;
    });

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedUserRole)) {
      alert(`Access Restricted. Allowed roles: ${allowedRoles.join(', ')}`);
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  updateHeaderNav() {
    const navContainer = document.getElementById('header-nav-actions');
    if (!navContainer) return;

    const user = API.getUser();
    if (user) {
      const userRole = user.role;
      let dashUrl = 'business-dashboard.html';
      if (userRole === 'TRUCK_OWNER' || userRole === 'TRANSPORTER') dashUrl = 'truck-owner-dashboard.html';
      if (userRole === 'ADMIN') dashUrl = 'admin-dashboard.html';

      const isSubpage = window.location.pathname.includes('/pages/');
      const basePath = isSubpage ? '' : 'pages/';

      navContainer.innerHTML = `
        <span style="color: #94A3B8; font-size: 0.85rem; font-weight: 600;">👤 ${user.name} (${user.role})</span>
        <a href="${basePath}${dashUrl}" class="btn btn-ghost-light">Dashboard</a>
        <button id="logout-btn" class="btn btn-solid-white">Logout</button>
      `;

      document.getElementById('logout-btn')?.addEventListener('click', () => {
        API.clearAuth();
        window.location.href = isSubpage ? '../index.html' : 'index.html';
      });
    }
  }
};

window.Auth = Auth;
window.API = API;

document.addEventListener('DOMContentLoaded', () => {
  Auth.updateHeaderNav();
});
