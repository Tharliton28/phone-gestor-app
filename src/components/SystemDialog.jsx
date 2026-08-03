import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const TYPE_CONFIG = {
  info: { icon: Info, color: '#3b82f6', button: '#3b82f6' },
  success: { icon: CheckCircle, color: '#4ade80', button: '#3b82f6' },
  error: { icon: AlertCircle, color: '#ef4444', button: '#ef4444' },
  warning: { icon: AlertTriangle, color: '#fbbf24', button: '#f59e0b' },
};

export default function SystemDialog({ dialog, onClose }) {
  const config = TYPE_CONFIG[dialog.type] ?? TYPE_CONFIG.info;
  const Icon = config.icon;
  const isConfirm = dialog.kind === 'confirm';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose(isConfirm ? false : true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isConfirm, onClose]);

  const handleBackdropClick = () => {
    onClose(isConfirm ? false : true);
  };

  return createPortal(
    <div style={styles.overlay} onClick={handleBackdropClick} role="presentation">
      <div
        style={styles.content}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <Icon size={20} color={config.color} />
            <h3 id="system-dialog-title" style={styles.title}>
              {dialog.title}
            </h3>
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            aria-label="Fechar"
            onClick={() => onClose(isConfirm ? false : true)}
          >
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.message}>{dialog.message}</p>
        </div>

        <div style={styles.footer}>
          {isConfirm ? (
            <>
              <button
                type="button"
                style={styles.btnCancel}
                onClick={() => onClose(false)}
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                style={{
                  ...styles.btnConfirm,
                  backgroundColor: dialog.confirmVariant === 'danger' ? '#ef4444' : '#3b82f6',
                }}
                onClick={() => onClose(true)}
              >
                {dialog.confirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              style={{ ...styles.btnConfirm, backgroundColor: config.button, width: '100%' }}
              onClick={() => onClose(true)}
            >
              {dialog.confirmLabel ?? 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  content: {
    backgroundColor: '#11131c',
    border: '1px solid #2a2e3f',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.55)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'dialogFadeIn 0.18s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '20px 20px 0',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: '#e2e8f0',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    padding: '16px 20px 8px',
  },
  message: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 20px 20px',
    borderTop: '1px solid #1f2233',
    marginTop: '8px',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    border: '1px solid #2a2e3f',
    color: '#e2e8f0',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  btnConfirm: {
    color: '#fff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
  },
};
