import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import './Modal.css';

/**
 * Accessible dialog: focus is moved in on open, trapped while open, and the
 * page behind is inert to scroll. Escape and backdrop click both close.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'center', // center | drawer
}) {
  const panelRef = useRef(null);
  const restoreFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocus.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const target =
        panelRef.current?.querySelector('[data-autofocus]') ||
        panelRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
      target?.focus();
    }, 40);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = [
        ...panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`modal modal--${variant}`} role="presentation">
          <motion.div
            className="modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            className={`modal__panel modal__panel--${size}`}
            initial={variant === 'drawer' ? { x: '100%' } : { opacity: 0, y: 12, scale: 0.985 }}
            animate={variant === 'drawer' ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={variant === 'drawer' ? { x: '100%' } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <header className="modal__head">
                <div className="grow">
                  <h2 className="modal__title">{title}</h2>
                  {description && <p className="muted modal__desc">{description}</p>}
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </header>
            )}
            <div className="modal__body">{children}</div>
            {footer && <footer className="modal__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
