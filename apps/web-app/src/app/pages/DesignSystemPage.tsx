import { money } from '@zooloo/domain';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Amount } from '../../ui/amount/Amount.js';
import { Button } from '../../ui/button/Button.js';
import { Card } from '../../ui/card/Card.js';
import { TextField } from '../../ui/field/TextField.js';
import pages from './pages.module.css';
import styles from './DesignSystemPage.module.css';

/**
 * Vitrine do design system, só em desenvolvimento (`/app/design`). Serve para pessoas e agentes
 * revisarem componentes nos dois temas e capturarem tela (doc 12 §4). Valores fictícios; textos
 * fixos porque a página não vai para produção.
 */
const SAMPLE_ROWS = [
  { description: 'Salário', category: 'Salário', value: money(845_000, 'BRL') },
  { description: 'Aluguel', category: 'Moradia', value: money(-210_000, 'BRL') },
  { description: 'Mercado da semana', category: 'Mercado', value: money(-38_790, 'BRL') },
  { description: 'Reembolso consulta', category: 'Saúde', value: money(12_000, 'BRL') },
] as const;

export function DesignSystemPage() {
  return (
    <div className={pages.page}>
      <h1 className={pages.title}>Design system</h1>

      <div className={styles.grid}>
        <Card title="Saldo atual" tone="highlight" className={styles.balance}>
          <Amount value={money(1_284_390, 'BRL')} size="display" />
          <dl className={styles.facts}>
            <div>
              <dt>Previsto no fim do mês</dt>
              <dd>
                <Amount value={money(986_120, 'BRL')} size="lg" />
              </dd>
            </div>
            <div>
              <dt>Pendências</dt>
              <dd>
                <Amount value={money(-298_270, 'BRL')} size="lg" />
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Últimas transações"
          action={
            <Button size="sm" variant="ghost">
              Ver todas
            </Button>
          }
        >
          <ul className={styles.rows}>
            {SAMPLE_ROWS.map((row) => (
              <li key={row.description} className={styles.row}>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{row.description}</span>
                  <span className={styles.rowMeta}>{row.category}</span>
                </span>
                <Amount value={row.value} kind="signed" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Botões">
        <div className={styles.inline}>
          <Button variant="primary" icon={Plus}>
            Nova despesa
          </Button>
          <Button icon={Download}>Exportar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger" icon={Trash2}>
            Excluir
          </Button>
          <Button variant="primary" busy>
            Salvando
          </Button>
          <Button size="sm">Pequeno</Button>
        </div>
      </Card>

      <Card title="Campos">
        <div className={styles.fields}>
          <TextField
            label="Descrição"
            placeholder="Ex.: Mercado"
            hint="Aparece na lista de transações."
          />
          <TextField
            label="Nome da categoria"
            defaultValue="Alimentação"
            error="Já existe uma categoria com esse nome neste nível. Escolha outro nome."
          />
        </div>
      </Card>
    </div>
  );
}
