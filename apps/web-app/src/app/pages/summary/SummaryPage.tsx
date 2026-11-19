import { type Money, negateMoney } from '@zooloo/domain';
import { formatLocalDate, t } from '@zooloo/i18n';
import {
  ChartColumn,
  CreditCard,
  FlaskConical,
  type LucideIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Amount } from '../../../ui/amount/Amount.js';
import { Card } from '../../../ui/card/Card.js';
import { useSelectedMonth } from '../../shell/SelectedMonth.js';
import { BudgetRing, chartColor, DonutChart, WeeklyBars } from './charts.js';
import { type EntryKind, type SummaryBill, summaryFixture } from './fixture.js';
import { type BudgetStatus, summaryMetrics } from './metrics.js';
import styles from './SummaryPage.module.css';

type Tone = 'info' | 'income' | 'expense' | 'warning';

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  note,
}: {
  readonly label: string;
  readonly value: Money;
  readonly icon: LucideIcon;
  readonly tone: Tone;
  readonly note?: ReactNode;
}) {
  return (
    <article className={styles.kpi}>
      <div className={styles.kpiTop}>
        <h2 className={styles.kpiLabel}>{label}</h2>
        <span className={[styles.kpiIcon, styles[tone]].join(' ')} aria-hidden="true">
          <Icon size={16} />
        </span>
      </div>
      <Amount value={value} size="lg" />
      {note && <p className={[styles.kpiNote, styles[`${tone}Text`]].join(' ')}>{note}</p>}
    </article>
  );
}

function Bills({ bills }: { readonly bills: readonly SummaryBill[] }) {
  const [paid, setPaid] = useState<ReadonlySet<string>>(
    () => new Set(bills.filter((bill) => bill.paid).map((bill) => bill.id)),
  );
  return (
    <ul className={styles.bills}>
      {bills.map((bill) => (
        <li key={bill.id} className={styles.bill}>
          <div className={styles.billInfo}>
            <p className={styles.billName}>{bill.name}</p>
            <p className={styles.billMeta}>
              {t('summary.dueOn', { date: formatLocalDate(bill.due, 'dayMonth') })}
            </p>
          </div>
          <div className={styles.billActions}>
            <Amount value={bill.amount} size="xs" />
            {paid.has(bill.id) ? (
              <span className={styles.paidTag}>{t('summary.paid')}</span>
            ) : (
              <button
                type="button"
                className={styles.payButton}
                aria-label={t('summary.payBill', { name: bill.name })}
                onClick={() => setPaid((current) => new Set(current).add(bill.id))}
              >
                {t('summary.pay')}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type Filter = 'all' | EntryKind;

const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: 'all', label: t('summary.filterAll') },
  { value: 'income', label: t('summary.filterIncome') },
  { value: 'expense', label: t('summary.filterExpense') },
];

const BUDGET_TONE: Record<BudgetStatus, string> = {
  within: 'var(--zl-accent)',
  near: 'var(--zl-warning)',
  over: 'var(--zl-expense)',
};

const BUDGET_LABEL: Record<BudgetStatus, string> = {
  within: t('summary.budgetWithin'),
  near: t('summary.budgetNear'),
  over: t('summary.budgetOver'),
};

/**
 * Resumo (doc 06, painel de referência do doc 13 §5.1): KPIs do mês, despesas por categoria,
 * fluxo semanal, vencimentos, últimas movimentações e orçamento. Por ora com dados sintéticos.
 */
export function SummaryPage() {
  const { month } = useSelectedMonth();
  const data = useMemo(() => summaryFixture(month), [month]);
  const metrics = useMemo(() => summaryMetrics(data), [data]);
  const [filter, setFilter] = useState<Filter>('all');
  const rows = data.transactions.filter((tx) => filter === 'all' || tx.kind === filter);
  const monthKey = `${month.year}-${month.month}`;

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">{t('nav.summary')}</h1>
      <p className={styles.notice}>
        <FlaskConical aria-hidden="true" size={15} />
        {t('summary.syntheticNotice')}
      </p>

      <section className={styles.kpis} aria-label={t('summary.kpis')}>
        <Kpi
          label={t('summary.consolidatedBalance')}
          value={metrics.consolidated}
          icon={Wallet}
          tone="info"
          note={t('summary.balanceNote')}
        />
        <Kpi
          label={t('summary.monthIncome')}
          value={metrics.income}
          icon={TrendingUp}
          tone="income"
          note={t('summary.incomeCount', { count: metrics.incomeCount })}
        />
        <Kpi
          label={t('summary.monthExpenses')}
          value={metrics.expense}
          icon={TrendingDown}
          tone="expense"
          note={t('summary.expenseCount', { count: metrics.expenseCount })}
        />
        <Kpi
          label={t('summary.monthBalance')}
          value={metrics.balance}
          icon={ChartColumn}
          tone={metrics.savingsPercent >= 0 ? 'income' : 'expense'}
          note={
            metrics.savingsPercent >= 0
              ? t('summary.savingsRate', { percent: metrics.savingsPercent })
              : t('summary.overspentRate', { percent: -metrics.savingsPercent })
          }
        />
        <Kpi
          label={t('summary.openInvoices')}
          value={data.openInvoices}
          icon={CreditCard}
          tone="warning"
          note={t('summary.invoiceDue', { date: formatLocalDate(data.invoiceDue, 'dayMonth') })}
        />
      </section>

      <div className={styles.grid}>
        <Card title={t('summary.byCategory')} className={styles.span4}>
          <p className={styles.subtitle}>{t('summary.byCategorySubtitle')}</p>
          <div className={styles.donutLayout}>
            <div className={styles.donutWrap}>
              <DonutChart shares={metrics.byCategory} />
              <div className={styles.donutCenter}>
                <span className={styles.donutLabel}>{t('summary.total')}</span>
                <Amount value={metrics.expense} size="sm" />
              </div>
            </div>
            {metrics.byCategory.length === 0 ? (
              <p className={styles.subtitle}>{t('summary.noExpenses')}</p>
            ) : (
              <ul className={styles.legend}>
                {metrics.byCategory.map((share, index) => (
                  <li key={share.category} className={styles.legendRow}>
                    <span className={styles.legendName}>
                      <span
                        className={styles.dot}
                        style={{ background: chartColor(index) }}
                        aria-hidden="true"
                      />
                      {share.category}
                    </span>
                    <span className={styles.legendValues}>
                      <Amount value={share.total} size="xs" />
                      <span className={styles.legendPercent}>{share.percent}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card
          title={t('summary.weeklyFlow')}
          className={styles.span5}
          action={
            <span className={styles.barLegend}>
              <span>
                <span className={styles.dot} style={{ background: 'var(--zl-accent)' }} />
                {t('summary.inflow')}
              </span>
              <span>
                <span className={styles.dot} style={{ background: 'var(--zl-warning)' }} />
                {t('summary.outflow')}
              </span>
            </span>
          }
        >
          <p className={styles.subtitle}>{t('summary.weeklyFlowSubtitle')}</p>
          <WeeklyBars weeks={data.weeks} />
        </Card>

        <Card title={t('summary.upcomingBills')} className={styles.span3}>
          <p className={styles.subtitle}>{t('summary.upcomingBillsSubtitle')}</p>
          <Bills key={monthKey} bills={data.bills} />
        </Card>
      </div>

      <div className={styles.grid}>
        <Card
          title={t('summary.latest')}
          className={styles.span9}
          action={
            <div className={styles.pills} role="group" aria-label={t('summary.filter')}>
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={styles.pill}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          <p className={styles.subtitle}>{t('summary.latestSubtitle')}</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('summary.colDate')}</th>
                  <th scope="col">{t('summary.colDescription')}</th>
                  <th scope="col">{t('summary.colCategory')}</th>
                  <th scope="col">{t('summary.colAccount')}</th>
                  <th scope="col">{t('summary.colStatus')}</th>
                  <th scope="col" className={styles.amountCell}>
                    {t('summary.colAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td className={styles.muted}>{formatLocalDate(tx.date, 'dayMonth')}</td>
                    <td className={styles.strong}>{tx.description}</td>
                    <td>
                      <span className={styles.categoryBadge}>{tx.category}</span>
                    </td>
                    <td className={styles.muted}>{tx.account}</td>
                    <td>
                      <span
                        className={[
                          styles.statusBadge,
                          tx.settled ? styles.settled : styles.pending,
                        ].join(' ')}
                      >
                        {tx.settled ? t('transaction.settled') : t('transaction.pending')}
                      </span>
                    </td>
                    <td className={styles.amountCell}>
                      <Amount
                        value={tx.kind === 'income' ? tx.amount : negateMoney(tx.amount)}
                        kind="signed"
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t('summary.budget')} className={styles.span3}>
          <p className={styles.subtitle}>{t('summary.budgetSubtitle')}</p>
          <div className={styles.gaugeWrap}>
            <BudgetRing percent={metrics.budgetPercent} tone={BUDGET_TONE[metrics.budgetStatus]} />
            <div className={styles.gaugeCenter}>
              <span className={styles.gaugePercent}>
                <span className="visually-hidden">
                  {t('summary.budgetUsage', { percent: metrics.budgetPercent })}
                </span>
                <span aria-hidden="true">{metrics.budgetPercent}%</span>
              </span>
              <span className={styles.gaugeStatus}>{BUDGET_LABEL[metrics.budgetStatus]}</span>
            </div>
          </div>
          <dl className={styles.budgetStats}>
            <div className={styles.budgetStat}>
              <dt>{t('summary.budgetSpent')}</dt>
              <dd>
                <Amount value={metrics.budget.considered} size="sm" />
              </dd>
            </div>
            <div className={styles.budgetStat}>
              <dt>{t('summary.budgetCap')}</dt>
              <dd>
                <Amount value={metrics.budget.goal} size="sm" />
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
