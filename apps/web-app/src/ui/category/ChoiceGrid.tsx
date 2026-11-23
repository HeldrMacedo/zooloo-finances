import { t } from '@zooloo/i18n';
import { CATEGORY_COLOR_KEYS, categoryColor, categoryColorKey } from '@zooloo/ui-tokens';
import { Check } from 'lucide-react';
import { useId } from 'react';
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from './category-icons.js';
import styles from './ChoiceGrid.module.css';

interface PickerProps {
  readonly legend: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

/**
 * Escolha de ícone por grade de rádios nativos: setas trocam a opção e o grupo é uma parada de Tab.
 * O nome acessível de cada ícone vem do catálogo de mensagens.
 */
export function IconPicker({ legend, value, onChange, disabled }: PickerProps) {
  const name = useId();
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {CATEGORY_ICON_NAMES.map((icon) => {
          const Icon = CATEGORY_ICONS[icon];
          return (
            <label key={icon} className={styles.option} title={t(`category.icons.${icon}`)}>
              <input
                type="radio"
                name={name}
                value={icon}
                checked={value === icon}
                onChange={() => onChange(icon)}
                className="visually-hidden"
              />
              <span className={styles.icon}>
                <Icon aria-hidden="true" size={18} />
              </span>
              <span className="visually-hidden">{t(`category.icons.${icon}`)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Paleta fixa de categorias (doc 13 §2.5), com contraste validado nos dois temas. */
export function ColorPicker({ legend, value, onChange, disabled }: PickerProps) {
  const name = useId();
  const selected = categoryColorKey(value);
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {CATEGORY_COLOR_KEYS.map((key) => (
          <label key={key} className={styles.option} title={t(`category.colors.${key}`)}>
            <input
              type="radio"
              name={name}
              value={key}
              checked={selected === key}
              onChange={() => onChange(categoryColor[key].light)}
              className="visually-hidden"
            />
            <span className={styles.swatch} data-category-color={key}>
              {selected === key && <Check aria-hidden="true" size={16} strokeWidth={3} />}
            </span>
            <span className="visually-hidden">{t(`category.colors.${key}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
