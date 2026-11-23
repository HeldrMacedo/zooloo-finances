import { categoryColor } from '@zooloo/ui-tokens';
import { Archive, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../ui/button/Button.js';
import { Card } from '../../ui/card/Card.js';
import { CategoryChip } from '../../ui/category/CategoryChip.js';
import { ColorPicker, IconPicker } from '../../ui/category/ChoiceGrid.js';
import { Dialog } from '../../ui/dialog/Dialog.js';
import { SelectField } from '../../ui/field/SelectField.js';
import { SwitchField } from '../../ui/field/SwitchField.js';
import { ActionMenu } from '../../ui/menu/ActionMenu.js';
import { SyncStatus } from '../../ui/sync/SyncStatus.js';
import { Tabs } from '../../ui/tabs/Tabs.js';
import styles from './DesignSystemPage.module.css';

const CHIPS = [
  { icon: 'utensils', key: 'terracotta' },
  { icon: 'house', key: 'midnight' },
  { icon: 'bus', key: 'blue' },
  { icon: 'heart-pulse', key: 'rose' },
  { icon: 'graduation-cap', key: 'purple' },
  { icon: 'party-popper', key: 'amber' },
  { icon: 'briefcase', key: 'green' },
  { icon: 'wallet', key: 'teal' },
  { icon: 'circle-ellipsis', key: 'slate' },
] as const;

/** Componentes da tela de categorias na vitrine (`/app/design`). Textos fixos, só desenvolvimento. */
export function DesignCategoryShowcase() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('utensils');
  const [color, setColor] = useState<string>(categoryColor.terracotta.light);
  const [archived, setArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const noop = (): void => undefined;

  return (
    <>
      <Card title="Categorias">
        <div className={styles.inline}>
          {CHIPS.map((chip) => (
            <CategoryChip key={chip.key} icon={chip.icon} color={categoryColor[chip.key].light} />
          ))}
          <CategoryChip icon="shopping-cart" color={categoryColor.terracotta.light} size="sm" />
          <ActionMenu
            label="Ações de Mercado"
            items={[
              { id: 'edit', label: 'Editar', icon: Pencil, onSelect: noop },
              { id: 'archive', label: 'Arquivar', icon: Archive, onSelect: noop },
              { id: 'delete', label: 'Excluir', icon: Trash2, tone: 'danger', onSelect: noop },
            ]}
          />
          <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
        </div>
        <Tabs
          label="Tipo de categoria"
          tabs={[
            { key: 'expense', label: 'Despesas' },
            { key: 'income', label: 'Receitas' },
          ]}
          selected={tab}
          onSelect={setTab}
        >
          <div className={styles.fields}>
            <SelectField
              label="Categoria mãe"
              hint="Só categorias de primeiro nível do mesmo tipo."
              options={[
                { value: '', label: 'Nenhuma (primeiro nível)' },
                { value: 'alimentacao', label: 'Alimentação' },
              ]}
            />
            <SwitchField
              label="Mostrar arquivadas"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
            />
          </div>
        </Tabs>
        <IconPicker legend="Ícone" value={icon} onChange={setIcon} />
        <ColorPicker legend="Cor" value={color} onChange={setColor} />
      </Card>

      <Card title="Sincronização">
        <div className={styles.inline}>
          <SyncStatus pending={0} phase="idle" />
          <SyncStatus pending={3} phase="idle" />
          <SyncStatus pending={1} phase="syncing" />
          <SyncStatus pending={2} phase="error" />
        </div>
      </Card>

      <Dialog
        open={dialogOpen}
        title={'Excluir "Alimentação"?'}
        description="A categoria some da lista. Esta ação não pode ser desfeita."
        onClose={() => setDialogOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Excluir categoria
            </Button>
          </>
        }
      >
        <p>2 subcategorias serão excluídas junto: Mercado, Restaurantes.</p>
      </Dialog>
    </>
  );
}
