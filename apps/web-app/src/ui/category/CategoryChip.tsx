import { categoryColorKey } from '@zooloo/ui-tokens';
import { CATEGORY_ICONS, isCategoryIcon } from './category-icons.js';
import styles from './CategoryChip.module.css';

export interface CategoryChipProps {
  /** Nome Lucide gravado na categoria. */
  readonly icon: string;
  /** Cor gravada (`#RRGGBB`); fora da paleta aparece como `slate` (doc 13 §2.5). */
  readonly color: string;
  readonly size?: 'md' | 'sm';
}

/**
 * Ícone da categoria num círculo da cor dela. A cor vem da paleta por tema (`--zl-category-*`),
 * por atributo e folha estática: a CSP não libera estilo inline. Decorativo: o nome vem ao lado.
 */
export function CategoryChip({ icon, color, size = 'md' }: CategoryChipProps) {
  const Icon = CATEGORY_ICONS[isCategoryIcon(icon) ? icon : 'tag'];
  return (
    <span
      className={[styles.chip, size === 'sm' && styles.sm].filter(Boolean).join(' ')}
      data-category-color={categoryColorKey(color)}
      aria-hidden="true"
    >
      <Icon size={size === 'sm' ? 14 : 18} strokeWidth={2} />
    </span>
  );
}
