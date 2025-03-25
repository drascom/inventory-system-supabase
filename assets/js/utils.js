/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast ('success', 'error', 'warning', 'info')
 * @param {number} [duration=3000] - How long to show the toast in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Define type-specific styles
    const typeStyles = {
        success: {
            bgClass: 'bg-success',
            icon: 'bi-check-circle'
        },
        error: {
            bgClass: 'bg-danger',
            icon: 'bi-x-circle'
        },
        warning: {
            bgClass: 'bg-warning',
            icon: 'bi-exclamation-triangle'
        },
        info: {
            bgClass: 'bg-info',
            icon: 'bi-info-circle'
        }
    };

    const style = typeStyles[type] || typeStyles.info;

    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    // Create toast content
    toastEl.innerHTML = `
        <div class="toast-header ${style.bgClass} text-white">
            <i class="bi ${style.icon} me-2"></i>
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    // Add toast to container
    toastContainer.appendChild(toastEl);

    // Initialize Bootstrap toast
    const toast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: duration
    });

    // Show toast
    toast.show();

    // Remove toast element after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}
