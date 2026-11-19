import type { Money } from '@zooloo/domain';
import { formatMoney, t } from '@zooloo/i18n';
import { usePrivacy } from '../../../ui/privacy/PrivacyContext.js';
import type { WeekFlow } from './fixture.js';
import type { CategoryShare } from './metrics.js';
import styles from './SummaryPage.module.css';

/** Cor da categoria pela posição na sequência de gráficos do tema (doc 13 §2.4). */
export const chartColor = (index: number): string => `var(--zl-chart-${(index % 6) + 1})`;

const DONUT_RADIUS = 50;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

/** Rosca das despesas por categoria. Decorativa: a legenda ao lado traz nomes, valores e %. */
export function DonutChart({ shares }: { readonly shares: readonly CategoryShare[] }) {
  const total = shares.reduce((sum, share) => sum + share.total.cents, 0);
  let offset = 0;
  return (
    <svg className={styles.donut} viewBox="0 0 140 140" aria-hidden="true" focusable="false">
      <circle
        cx="70"
        cy="70"
        r={DONUT_RADIUS}
        fill="none"
        stroke="var(--zl-border)"
        strokeWidth="18"
      />
      {total > 0 &&
        shares.map((share, index) => {
          const length = (share.total.cents / total) * DONUT_CIRCUMFERENCE;
          const segment = (
            <circle
              key={share.category}
              cx="70"
              cy="70"
              r={DONUT_RADIUS}
              fill="none"
              stroke={chartColor(index)}
              strokeWidth="18"
              strokeDasharray={`${length} ${DONUT_CIRCUMFERENCE}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += length;
          return segment;
        })}
    </svg>
  );
}

const BAR = { width: 460, height: 190, top: 12, bottom: 28, left: 8, barWidth: 30, gap: 6 };
/** Escala do eixo em degraus de R$ 1.000 (centavos). */
const SCALE_STEP = 100_000;

/** Barras agrupadas de entradas e saídas por semana, com descrição textual para leitor de tela. */
export function WeeklyBars({ weeks }: { readonly weeks: readonly WeekFlow[] }) {
  const { hidden } = usePrivacy();
  const max = Math.max(SCALE_STEP, ...weeks.flatMap((w) => [w.income.cents, w.expense.cents]));
  const top = Math.ceil(max / SCALE_STEP) * SCALE_STEP;
  const plotHeight = BAR.height - BAR.top - BAR.bottom;
  const groupWidth = (BAR.width - BAR.left * 2) / Math.max(weeks.length, 1);
  const barHeight = (cents: number): number => (cents / top) * plotHeight;
  const baseline = BAR.top + plotHeight;
  const value = (amount: Money): string =>
    hidden ? t('privacy.hiddenValue') : formatMoney(amount);
  return (
    <>
      <svg
        className={styles.bars}
        viewBox={`0 0 ${BAR.width} ${BAR.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = BAR.top + (plotHeight / 3) * line;
          return (
            <line
              key={line}
              x1={BAR.left}
              x2={BAR.width - BAR.left}
              y1={y}
              y2={y}
              className={styles.gridLine}
            />
          );
        })}
        {weeks.map((week, index) => {
          const center = BAR.left + groupWidth * index + groupWidth / 2;
          const incomeHeight = barHeight(week.income.cents);
          const expenseHeight = barHeight(week.expense.cents);
          return (
            <g key={week.week}>
              <rect
                x={center - BAR.barWidth - BAR.gap / 2}
                y={baseline - incomeHeight}
                width={BAR.barWidth}
                height={incomeHeight}
                rx="6"
                fill="var(--zl-accent)"
              />
              <rect
                x={center + BAR.gap / 2}
                y={baseline - expenseHeight}
                width={BAR.barWidth}
                height={expenseHeight}
                rx="6"
                fill="var(--zl-warning)"
              />
              <text x={center} y={BAR.height - 8} textAnchor="middle" className={styles.barLabel}>
                {t('summary.weekLabel', { week: week.week })}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="visually-hidden">
        {weeks.map((week) => (
          <li key={week.week}>
            {t('summary.weekDetail', {
              week: week.week,
              income: value(week.income),
              expense: value(week.expense),
            })}
          </li>
        ))}
      </ul>
    </>
  );
}

const GAUGE_RADIUS = 56;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/** Anel de consumo do orçamento; o percentual e o status ficam em texto no centro. */
export function BudgetRing({ percent, tone }: { readonly percent: number; readonly tone: string }) {
  const filled = (Math.min(Math.max(percent, 0), 100) / 100) * GAUGE_CIRCUMFERENCE;
  return (
    <svg className={styles.gauge} viewBox="0 0 140 140" aria-hidden="true" focusable="false">
      <circle
        cx="70"
        cy="70"
        r={GAUGE_RADIUS}
        fill="none"
        stroke="var(--zl-border)"
        strokeWidth="12"
      />
      <circle
        cx="70"
        cy="70"
        r={GAUGE_RADIUS}
        fill="none"
        stroke={tone}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={GAUGE_CIRCUMFERENCE}
        strokeDashoffset={GAUGE_CIRCUMFERENCE - filled}
        transform="rotate(-90 70 70)"
        className={styles.gaugeFill}
      />
    </svg>
  );
}
