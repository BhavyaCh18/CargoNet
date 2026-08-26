/**
 * CargoNet Global Notification System
 * Reusable center-screen modals, top-right toasts, loading overlays, and payment UI feedback.
 * Supports both Options Object and Positional Argument signatures.
 */

(function () {
  if (window.NotificationSystem) return;

  let activeModal = null;
  let previousFocusedElement = null;

  function getToastContainer() {
    let container = document.getElementById('cn-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cn-toast-container';
      container.className = 'cn-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function getModalBackdrop() {
    let backdrop = document.getElementById('cn-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'cn-modal-backdrop';
      backdrop.className = 'cn-modal-backdrop notification-overlay';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function closeModal() {
    const backdrop = document.getElementById('cn-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('cn-active');
      backdrop.innerHTML = '';
    }
    document.body.classList.remove('cn-modal-open');
    if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
      try { previousFocusedElement.focus(); } catch (e) {}
    }
    previousFocusedElement = null;
    activeModal = null;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeModal && activeModal.allowEsc) {
      if (activeModal.onCancel) {
        activeModal.onCancel();
      }
      closeModal();
    }
  });

  const NotificationSystem = {
    // 1. SHOW SUCCESS MODAL (Supports both options object & positional parameters)
    showSuccess(arg1, arg2, arg3, arg4) {
      let title, message, buttonText, onConfirm, allowOutsideClick;
      if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title || 'Registration Successful!';
        message = arg1.message || 'Your account has been created successfully.';
        buttonText = arg1.buttonText || 'Continue';
        onConfirm = arg1.onConfirm || null;
        allowOutsideClick = arg1.allowOutsideClick || false;
      } else {
        title = arg1 || 'Registration Successful!';
        message = arg2 || 'Your account has been created successfully.';
        buttonText = arg3 || 'Continue';
        onConfirm = typeof arg4 === 'function' ? arg4 : null;
        allowOutsideClick = false;
      }

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();
        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-success" tabIndex="-1">
            <div class="cn-icon-badge cn-badge-success">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            <div class="cn-modal-actions">
              <button id="cn-modal-btn-confirm" class="cn-btn cn-btn-primary">${escapeHtml(buttonText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const confirmBtn = backdrop.querySelector('#cn-modal-btn-confirm');
        confirmBtn.focus();

        activeModal = { allowEsc: true, onCancel: null };

        confirmBtn.onclick = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
          resolve(true);
        };

        if (allowOutsideClick) {
          backdrop.onclick = (e) => {
            if (e.target === backdrop) {
              closeModal();
              if (typeof onConfirm === 'function') onConfirm();
              resolve(true);
            }
          };
        } else {
          backdrop.onclick = null;
        }
      });
    },

    // 2. SHOW ERROR MODAL (Supports both options object & positional parameters)
    showError(arg1, arg2, arg3, arg4) {
      let title, message, buttonText, onConfirm, allowOutsideClick;
      if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title || 'Error';
        message = arg1.message || 'Something went wrong. Please try again.';
        buttonText = arg1.buttonText || 'Try Again';
        onConfirm = arg1.onConfirm || null;
        allowOutsideClick = arg1.allowOutsideClick !== undefined ? arg1.allowOutsideClick : true;
      } else {
        title = arg1 || 'Error';
        message = arg2 || 'Something went wrong. Please try again.';
        buttonText = arg3 || 'Try Again';
        onConfirm = typeof arg4 === 'function' ? arg4 : null;
        allowOutsideClick = true;
      }

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();
        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-error" tabIndex="-1">
            <div class="cn-icon-badge cn-badge-error">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            <div class="cn-modal-actions">
              <button id="cn-modal-btn-confirm" class="cn-btn cn-btn-danger">${escapeHtml(buttonText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const confirmBtn = backdrop.querySelector('#cn-modal-btn-confirm');
        confirmBtn.focus();

        activeModal = { allowEsc: true, onCancel: null };

        const handleClose = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
          resolve(true);
        };

        confirmBtn.onclick = handleClose;
        if (allowOutsideClick) {
          backdrop.onclick = (e) => { if (e.target === backdrop) handleClose(); };
        } else {
          backdrop.onclick = null;
        }
      });
    },

    // 3. SHOW WARNING MODAL
    showWarning(arg1, arg2, arg3, arg4) {
      let title, message, buttonText, onConfirm;
      if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title || 'Notice';
        message = arg1.message || '';
        buttonText = arg1.buttonText || 'Understand';
        onConfirm = arg1.onConfirm || null;
      } else {
        title = arg1 || 'Notice';
        message = arg2 || '';
        buttonText = arg3 || 'Understand';
        onConfirm = typeof arg4 === 'function' ? arg4 : null;
      }

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();
        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-warning" tabIndex="-1">
            <div class="cn-icon-badge cn-badge-warning">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            <div class="cn-modal-actions">
              <button id="cn-modal-btn-confirm" class="cn-btn cn-btn-warning">${escapeHtml(buttonText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const confirmBtn = backdrop.querySelector('#cn-modal-btn-confirm');
        confirmBtn.focus();

        activeModal = { allowEsc: true, onCancel: null };

        confirmBtn.onclick = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
          resolve(true);
        };
      });
    },

    // 4. SHOW INFO MODAL
    showInfo(arg1, arg2, arg3, arg4) {
      return this.showWarning(arg1, arg2, arg3, arg4);
    },

    // 5. SHOW CONFIRMATION MODAL (Returns Promise<boolean>)
    showConfirmation(arg1, arg2, arg3, arg4, arg5) {
      let title, message, confirmText, cancelText, isDanger;
      if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title || 'Are you sure?';
        message = arg1.message || 'Please confirm this action.';
        confirmText = arg1.confirmText || 'Confirm';
        cancelText = arg1.cancelText || 'Cancel';
        isDanger = arg1.isDanger || false;
      } else {
        title = arg1 || 'Are you sure?';
        message = arg2 || 'Please confirm this action.';
        confirmText = arg3 || 'Confirm';
        cancelText = arg4 || 'Cancel';
        isDanger = arg5 || false;
      }

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();
        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-confirm" tabIndex="-1">
            <div class="cn-icon-badge ${isDanger ? 'cn-badge-error' : 'cn-badge-warning'}">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            <div class="cn-modal-actions cn-actions-split">
              <button id="cn-modal-btn-cancel" class="cn-btn cn-btn-ghost">${escapeHtml(cancelText)}</button>
              <button id="cn-modal-btn-confirm" class="cn-btn ${isDanger ? 'cn-btn-danger' : 'cn-btn-primary'}">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const confirmBtn = backdrop.querySelector('#cn-modal-btn-confirm');
        const cancelBtn = backdrop.querySelector('#cn-modal-btn-cancel');
        cancelBtn.focus();

        activeModal = {
          allowEsc: true,
          onCancel: () => resolve(false)
        };

        confirmBtn.onclick = () => {
          closeModal();
          resolve(true);
        };

        cancelBtn.onclick = () => {
          closeModal();
          resolve(false);
        };
      });
    },

    // 6. SHOW LOADING OVERLAY
    showLoading(arg1) {
      let message;
      if (typeof arg1 === 'object' && arg1 !== null) {
        message = arg1.message || 'Processing Payment... Please wait while we securely process your payment.';
      } else {
        message = arg1 || 'Processing... Please wait.';
      }
      closeModal();

      const backdrop = getModalBackdrop();
      backdrop.innerHTML = `
        <div class="cn-modal-card cn-modal-loading" tabIndex="-1">
          <div class="cn-spinner"></div>
          <h3 class="cn-modal-title" style="margin-top:16px;">${escapeHtml(message)}</h3>
        </div>
      `;

      document.body.classList.add('cn-modal-open');
      backdrop.classList.add('cn-active');

      activeModal = { allowEsc: false, onCancel: null };
    },

    hideLoading() {
      if (activeModal && !activeModal.allowEsc && document.querySelector('.cn-modal-loading')) {
        closeModal();
      }
    },

    // 7. SHOW TOAST NOTIFICATION
    showToast(arg1, arg2, arg3) {
      let message, type, duration;
      if (typeof arg1 === 'object' && arg1 !== null) {
        message = arg1.message || '';
        type = arg1.type || 'info';
        duration = arg1.duration !== undefined ? arg1.duration : 4000;
      } else {
        message = arg1 || '';
        type = arg2 || 'info';
        duration = arg3 !== undefined ? arg3 : 4000;
      }

      if (!message) return;

      const container = getToastContainer();
      const toast = document.createElement('div');
      toast.className = `cn-toast cn-toast-${type}`;

      let iconSvg = '';
      if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12.01" y2="16"></line><line x1="12" y1="8" x2="12" y2="12"></line></svg>`;
      }

      toast.innerHTML = `
        <div class="cn-toast-icon">${iconSvg}</div>
        <div class="cn-toast-body">${escapeHtml(message)}</div>
        <button class="cn-toast-close">&times;</button>
      `;

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('cn-toast-show');
      });

      const removeToast = () => {
        toast.classList.remove('cn-toast-show');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      };

      toast.querySelector('.cn-toast-close').onclick = removeToast;

      if (duration > 0) {
        setTimeout(removeToast, duration);
      }
    },

    // 8. SHOW PAYMENT SUCCESS MODAL
    showPaymentSuccess(options = {}) {
      const {
        title = 'Payment Successful',
        message = 'Your payment has been completed successfully.',
        amount = null,
        transactionId = null,
        bookingCode = null,
        buttonText = 'View Booking',
        onConfirm = null
      } = options;

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();

        let detailsHtml = '';
        if (amount || transactionId || bookingCode) {
          detailsHtml = `
            <div class="cn-payment-receipt">
              ${bookingCode ? `<div class="cn-receipt-row"><span>Booking Code:</span><strong>${escapeHtml(bookingCode)}</strong></div>` : ''}
              ${transactionId ? `<div class="cn-receipt-row"><span>Transaction ID:</span><strong>${escapeHtml(String(transactionId))}</strong></div>` : ''}
              ${amount ? `<div class="cn-receipt-row cn-receipt-total"><span>Amount Paid:</span><strong>₹${Number(amount).toLocaleString('en-IN')}</strong></div>` : ''}
            </div>
          `;
        }

        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-payment-success" tabIndex="-1">
            <div class="cn-icon-badge cn-badge-success">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            ${detailsHtml}
            <div class="cn-modal-actions">
              <button id="cn-modal-btn-confirm" class="cn-btn cn-btn-primary">${escapeHtml(buttonText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const confirmBtn = backdrop.querySelector('#cn-modal-btn-confirm');
        confirmBtn.focus();

        activeModal = { allowEsc: true, onCancel: null };

        confirmBtn.onclick = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
          resolve(true);
        };
      });
    },

    // 9. SHOW PAYMENT FAILURE MODAL
    showPaymentFailure(options = {}) {
      const {
        title = 'Payment Failed',
        message = 'We were unable to complete your payment.',
        reason = null,
        retryText = 'Try Again',
        cancelText = 'Cancel',
        onRetry = null,
        onCancel = null
      } = options;

      return new Promise((resolve) => {
        closeModal();
        previousFocusedElement = document.activeElement;

        const backdrop = getModalBackdrop();

        let reasonHtml = reason ? `<div class="cn-error-reason"><strong>Reason:</strong> ${escapeHtml(reason)}</div>` : '';

        backdrop.innerHTML = `
          <div class="cn-modal-card cn-modal-payment-failure" tabIndex="-1">
            <div class="cn-icon-badge cn-badge-error">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3 class="cn-modal-title">${escapeHtml(title)}</h3>
            <p class="cn-modal-message">${escapeHtml(message)}</p>
            ${reasonHtml}
            <div class="cn-modal-actions cn-actions-split">
              <button id="cn-modal-btn-cancel" class="cn-btn cn-btn-ghost">${escapeHtml(cancelText)}</button>
              <button id="cn-modal-btn-retry" class="cn-btn cn-btn-danger">${escapeHtml(retryText)}</button>
            </div>
          </div>
        `;

        document.body.classList.add('cn-modal-open');
        backdrop.classList.add('cn-active');

        const retryBtn = backdrop.querySelector('#cn-modal-btn-retry');
        const cancelBtn = backdrop.querySelector('#cn-modal-btn-cancel');
        retryBtn.focus();

        activeModal = { allowEsc: true, onCancel: () => resolve('cancel') };

        retryBtn.onclick = () => {
          closeModal();
          if (typeof onRetry === 'function') onRetry();
          resolve('retry');
        };

        cancelBtn.onclick = () => {
          closeModal();
          if (typeof onCancel === 'function') onCancel();
          resolve('cancel');
        };
      });
    },

    closeModal: closeModal
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.NotificationSystem = NotificationSystem;

  // Phase 5: Fail-Safe Global Native Alert & Confirm Compatibility Override
  window.__originalAlert = window.alert;
  window.__originalConfirm = window.confirm;

  window.alert = function (message) {
    const msgStr = String(message || '');
    if (
      msgStr.toLowerCase().includes('email verified') ||
      msgStr.toLowerCase().includes('registration complete') ||
      msgStr.toLowerCase().includes('verified successfully')
    ) {
      return NotificationSystem.showSuccess(
        'Registration Successful!',
        'Your email has been verified and your registration is complete.',
        'Continue'
      );
    }
    return NotificationSystem.showInfo(
      'Notification',
      msgStr,
      'OK'
    );
  };

  window.confirm = function (message) {
    const msgStr = String(message || '');
    NotificationSystem.showConfirmation({
      title: 'Confirmation Required',
      message: msgStr,
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
    return true;
  };
})();
