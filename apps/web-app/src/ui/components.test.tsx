import { money } from '@zooloo/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations, withProviders } from '../testing/render.js';
import { Amount } from './amount/Amount.js';
import { ZoolooLogo } from './brand/ZoolooLogo.js';
import { Button } from './button/Button.js';
import { Card } from './card/Card.js';
import { TextField } from './field/TextField.js';
import { PrivacyProvider, usePrivacy } from './privacy/PrivacyContext.js';

describe('Button', () => {
  it('é type="button" por padrão e dispara o clique', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveProperty('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('só ícone: texto vira nome acessível e tooltip', () => {
    render(
      <Button iconOnly icon={Plus}>
        Nova despesa
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Nova despesa' });
    expect(button.getAttribute('title')).toBe('Nova despesa');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('ocupado: desabilita e anuncia aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick} variant="primary" size="sm">
        Salvando
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Salvando' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button).toHaveProperty('disabled', true);
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('liga rótulo, dica e erro ao campo', () => {
    render(<TextField label="Nome" hint="Até 60 caracteres." error="Informe o nome." />);
    const input = screen.getByLabelText('Nome');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = (input.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Até 60 caracteres.', 'Informe o nome.']);
  });

  it('sem dica nem erro não tem descrição; rótulo pode ficar só para leitor de tela', () => {
    render(<TextField label="Busca" hideLabel />);
    const input = screen.getByLabelText('Busca');
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByText('Busca').className).toBe('visually-hidden');
  });
});

describe('Card', () => {
  it('título vira região nomeada; ação aparece no cabeçalho', () => {
    render(
      <Card title="Saldo atual" action={<Button size="sm">Ver</Button>} tone="highlight">
        conteúdo
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Saldo atual' });
    expect(region.className).toContain('highlight');
    expect(screen.getByRole('heading', { name: 'Saldo atual' })).toBeDefined();
  });

  it('sem título não cria cabeçalho', () => {
    const { container } = render(<Card>conteúdo</Card>);
    expect(container.querySelector('header')).toBeNull();
  });
});

describe('Amount (RNF-UX-02, RNF-UX-03)', () => {
  it('lançamento positivo: sinal +, cor de entrada e nome acessível com "entrada"', () => {
    const { container } = render(
      withProviders(<Amount value={money(845_000, 'BRL')} kind="signed" />),
    );
    // O normalizador do Testing Library troca o espaço sem quebra por espaço comum.
    expect(screen.getByText('+R$ 8.450,00, entrada')).toBeDefined();
    expect(container.firstElementChild?.className).toContain('income');
    expect(container.textContent).toContain('+');
  });

  it('negativo usa o sinal de menos tipográfico e cor de saída', () => {
    const { container } = render(withProviders(<Amount value={money(-38_790, 'BRL')} />));
    expect(container.firstElementChild?.className).toContain('expense');
    expect(container.textContent).toContain('−');
    expect(screen.getByText(/saída$/)).toBeDefined();
  });

  it('saldo positivo é neutro e sem sinal', () => {
    const { container } = render(
      withProviders(<Amount value={money(100, 'BRL')} size="display" />),
    );
    expect(container.firstElementChild?.className).toContain('neutral');
    expect(container.textContent).not.toMatch(/[+−]/);
  });

  it('modo privado oculta o valor também para leitor de tela', async () => {
    function Toggle() {
      const privacy = usePrivacy();
      return <button onClick={privacy.toggle}>alternar</button>;
    }
    const { container } = render(
      <PrivacyProvider>
        <Toggle />
        <Amount value={money(123_456, 'BRL')} />
      </PrivacyProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'alternar' }));
    expect(container.textContent).not.toContain('1.234');
    expect(screen.getByText('Valor oculto')).toBeDefined();
    expect(localStorage.getItem('zl-privacy')).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: 'alternar' }));
    expect(container.textContent).toContain('1.234,56');
  });
});

describe('ZoolooLogo', () => {
  it('é uma imagem com o nome do produto nas duas variantes', () => {
    render(
      <>
        <ZoolooLogo />
        <ZoolooLogo variant="mark" />
      </>,
    );
    expect(screen.getAllByRole('img', { name: 'Zooloo Finanças' })).toHaveLength(2);
  });
});

describe('acessibilidade dos componentes', () => {
  it('sem violações axe', async () => {
    const { container } = render(
      withProviders(
        <main>
          <Card title="Exemplo">
            <TextField label="Descrição" hint="Dica" error="Erro" />
            <Button icon={Plus} iconOnly>
              Adicionar
            </Button>
            <Amount value={money(-100, 'BRL')} kind="signed" />
            <ZoolooLogo />
          </Card>
        </main>,
      ),
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
