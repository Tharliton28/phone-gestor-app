import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import SystemDialog from '../components/SystemDialog';

const DialogContext = createContext(null);

function normalizeAlertOptions(messageOrOptions, maybeOptions) {
  if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
    return messageOrOptions;
  }

  return {
    message: String(messageOrOptions ?? ''),
    ...(maybeOptions ?? {}),
  };
}

function normalizeConfirmOptions(messageOrOptions, maybeOptions) {
  if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
    return messageOrOptions;
  }

  return {
    message: String(messageOrOptions ?? ''),
    ...(maybeOptions ?? {}),
  };
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      current?.resolve?.(result);
      return null;
    });
  }, []);

  const showAlert = useCallback((options) => {
    const normalized = normalizeAlertOptions(options);

    return new Promise((resolve) => {
      setDialog({
        kind: 'alert',
        title: normalized.title ?? 'Aviso',
        message: normalized.message ?? '',
        type: normalized.type ?? 'info',
        confirmLabel: normalized.confirmLabel ?? 'OK',
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((options) => {
    const normalized = normalizeConfirmOptions(options);

    return new Promise((resolve) => {
      setDialog({
        kind: 'confirm',
        title: normalized.title ?? 'Confirmar',
        message: normalized.message ?? '',
        type: normalized.type ?? 'warning',
        confirmLabel: normalized.confirmLabel ?? 'Confirmar',
        cancelLabel: normalized.cancelLabel ?? 'Cancelar',
        confirmVariant: normalized.confirmVariant ?? 'danger',
        resolve,
      });
    });
  }, []);

  const alert = useCallback((message, options = {}) => {
    return showAlert(normalizeAlertOptions(message, options));
  }, [showAlert]);

  const confirm = useCallback((message, options = {}) => {
    return showConfirm(normalizeConfirmOptions(message, options));
  }, [showConfirm]);

  const value = useMemo(
    () => ({ alert, confirm, showAlert, showConfirm }),
    [alert, confirm, showAlert, showConfirm]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && <SystemDialog dialog={dialog} onClose={closeDialog} />}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error('useDialog deve ser usado dentro de DialogProvider.');
  }

  return context;
}
