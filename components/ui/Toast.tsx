'use client';

import toast from 'react-hot-toast';

const customToast = {
  success: (message: string) =>
    toast.success(message, {
      style: { background: '#0C1017', color: '#F0F2F5', border: '1px solid rgba(255,255,255,0.08)' },
      iconTheme: { primary: '#00D4AA', secondary: '#0C1017' },
    }),
  error: (message: string) =>
    toast.error(message, {
      style: { background: '#0C1017', color: '#F0F2F5', border: '1px solid rgba(255,255,255,0.08)' },
      iconTheme: { primary: '#EF4444', secondary: '#0C1017' },
    }),
  loading: (message: string) =>
    toast.loading(message, {
      style: { background: '#0C1017', color: '#F0F2F5', border: '1px solid rgba(255,255,255,0.08)' },
    }),
  dismiss: toast.dismiss,
};

export { customToast as toast };
export default customToast;
