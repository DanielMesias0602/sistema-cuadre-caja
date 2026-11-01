export const notifyToast = (message, variant = 'error') => {
  if (typeof window === 'undefined' || !message) return;

  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: { message: String(message), variant }
  }));
};
