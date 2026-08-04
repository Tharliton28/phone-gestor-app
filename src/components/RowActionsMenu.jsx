import { Settings, ChevronDown } from 'lucide-react';
import './rowActionsMenu.css';

/**
 * Botão + dropdown padronizado para ações de linha em tabelas ERP.
 * Coluna sempre à direita; ícone Settings + chevron.
 */
export default function RowActionsMenu({
  open,
  onToggle,
  children,
  label = 'Ações do registro',
}) {
  return (
    <div className="row-actions-menu">
      <button
        type="button"
        className="row-actions-menu__btn"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
      >
        <Settings size={14} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="row-actions-menu__dropdown" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

export function RowActionsItem({ children, onClick, style, className = '' }) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={`row-actions-menu__item ${className}`.trim()}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      {children}
    </div>
  );
}
