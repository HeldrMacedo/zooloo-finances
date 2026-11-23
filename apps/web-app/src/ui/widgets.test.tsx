import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog/Dialog.js';
import { SelectField } from './field/SelectField.js';
import { ActionMenu } from './menu/ActionMenu.js';
import { Tabs } from './tabs/Tabs.js';

function Menu({ onPick }: { readonly onPick: (id: string) => void }) {
  return (
    <>
      <ActionMenu
        label="Ações de Mercado"
        items={['Editar', 'Arquivar', 'Excluir'].map((label) => ({
          id: label,
          label,
          onSelect: () => onPick(label),
        }))}
      />
      <button type="button">Fora</button>
    </>
  );
}

describe('ActionMenu (WAI-ARIA menu button)', () => {
  it('setas, Home e End navegam com volta; Esc fecha e devolve o foco', async () => {
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    const trigger = screen.getByRole('button', { name: 'Ações de Mercado' });
    trigger.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement?.textContent).toBe('Excluir');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Editar');
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement?.textContent).toBe('Excluir');
    await userEvent.keyboard('{Home}');
    expect(document.activeElement?.textContent).toBe('Editar');
    await userEvent.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Excluir');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith('Arquivar');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Tab e clique fora fecham sem escolher', async () => {
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    const trigger = screen.getByRole('button', { name: 'Ações de Mercado' });
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });
});

function TypeTabs() {
  const [selected, setSelected] = useState<'a' | 'b' | 'c'>('a');
  return (
    <Tabs
      label="Tipos"
      tabs={[
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
      ]}
      selected={selected}
      onSelect={setSelected}
    >
      <p>Painel {selected}</p>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('setas dão a volta; End e clique trocam o painel', async () => {
    render(<TypeTabs />);
    screen.getByRole('tab', { name: 'A' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'C' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Painel c');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tabpanel').textContent).toBe('Painel c');
    await userEvent.keyboard('x');
    expect(screen.getByRole('tabpanel').textContent).toBe('Painel c');
    await userEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Painel b');
    expect(screen.getByRole('tab', { name: 'A' }).tabIndex).toBe(-1);
  });
});

describe('Dialog', () => {
  it('fecha pelo botão e pelo evento cancel; devolve o foco a quem abriu', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          <Dialog open={open} title="Título" onClose={() => setOpen(false)}>
            <input aria-label="Campo" data-autofocus />
          </Dialog>
        </>
      );
    }
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText('Campo'));
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);

    await userEvent.click(opener);
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SelectField', () => {
  it('liga dica e erro ao campo', () => {
    render(
      <SelectField
        label="Mãe"
        hint="Só primeiro nível"
        error="Inválida"
        defaultValue=""
        options={[{ value: '', label: 'Nenhuma' }]}
      />,
    );
    const select = screen.getByLabelText('Mãe');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    const described = select.getAttribute('aria-describedby') ?? '';
    const texts = described.split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(['Só primeiro nível', 'Inválida']);
  });
});
