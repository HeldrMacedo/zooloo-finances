import { type LocalDate, type Money, money, withDayClamped } from '@zooloo/domain';

/**
 * Dados SINTÉTICOS do Resumo (doc 12 §9), só até o módulo de transações existir. A tela avisa que
 * são de exemplo. Três variações se alternam por mês para a navegação de mês mostrar diferença.
 */
export type EntryKind = 'income' | 'expense';

export interface SummaryTransaction {
  readonly id: string;
  readonly date: LocalDate;
  readonly description: string;
  readonly category: string;
  readonly account: string;
  readonly kind: EntryKind;
  readonly settled: boolean;
  /** Sempre positivo; o sentido vem de `kind`. */
  readonly amount: Money;
}

export interface SummaryBill {
  readonly id: string;
  readonly name: string;
  readonly due: LocalDate;
  readonly amount: Money;
  readonly paid: boolean;
}

export interface WeekFlow {
  readonly week: number;
  readonly income: Money;
  readonly expense: Money;
}

export interface SummaryData {
  readonly openingBalance: Money;
  readonly budgetCap: Money;
  readonly openInvoices: Money;
  readonly invoiceDue: LocalDate;
  readonly weeks: readonly WeekFlow[];
  readonly bills: readonly SummaryBill[];
  readonly transactions: readonly SummaryTransaction[];
}

type TxRow = readonly [
  day: number,
  description: string,
  category: string,
  account: string,
  kind: EntryKind,
  settled: boolean,
  reais: number,
];
type BillRow = readonly [day: number, name: string, cents: number, paid: boolean];

interface Variant {
  readonly openingBalance: number;
  readonly budgetCap: number;
  readonly openInvoices: number;
  readonly weeks: readonly (readonly [income: number, expense: number])[];
  readonly bills: readonly BillRow[];
  readonly transactions: readonly TxRow[];
}

const NUBANK = 'Conta Nubank';
const INTER = 'Conta Inter';
const ITAU = 'Cartão Itaú Black';
const XP = 'Cartão XP Visa';

/** Valores em reais inteiros nas tabelas; viram centavos inteiros em `brl`. */
const VARIANTS: readonly Variant[] = [
  {
    openingBalance: 13_200,
    budgetCap: 7_600,
    openInvoices: 1_620,
    weeks: [
      [4_600, 2_150],
      [1_200, 1_420],
      [2_950, 1_280],
      [650, 1_190],
    ],
    bills: [
      [10, 'Aluguel residencial', 210_000, true],
      [18, 'Energia elétrica', 31_000, true],
      [22, 'Internet fibra', 13_990, true],
      [28, 'Fatura cartão Itaú', 162_000, false],
    ],
    transactions: [
      [24, 'Salário mensal', 'Salário', NUBANK, 'income', true, 7_400],
      [21, 'Supermercado Nordestão', 'Alimentação', ITAU, 'expense', true, 940],
      [18, 'Consultoria UI/UX', 'Renda extra', INTER, 'income', true, 2_000],
      [15, 'Aluguel + condomínio', 'Moradia', NUBANK, 'expense', true, 2_350],
      [12, 'Combustível e Uber', 'Transporte', XP, 'expense', true, 680],
      [8, 'Streaming e nuvem', 'Assinaturas', ITAU, 'expense', true, 340],
      [5, 'Restaurante fim de semana', 'Lazer', ITAU, 'expense', true, 520],
    ],
  },
  {
    openingBalance: 14_330,
    budgetCap: 8_000,
    openInvoices: 1_890,
    weeks: [
      [5_100, 2_350],
      [1_450, 1_290],
      [2_500, 1_180],
      [800, 940],
    ],
    bills: [
      [20, 'Aluguel residencial', 210_000, false],
      [22, 'Energia Cosern', 34_250, false],
      [24, 'Internet fibra 600 Mb', 13_990, false],
      [28, 'Fatura cartão Itaú', 189_000, false],
    ],
    transactions: [
      [19, 'Supermercado Carrefour', 'Alimentação', ITAU, 'expense', true, 1_180],
      [18, 'Projeto freelance web', 'Renda extra', INTER, 'income', true, 2_450],
      [15, 'Condomínio e IPTU', 'Moradia', NUBANK, 'expense', true, 2_480],
      [12, 'Posto e estacionamento', 'Transporte', XP, 'expense', true, 790],
      [10, 'Assinaturas digitais', 'Assinaturas', ITAU, 'expense', true, 490],
      [8, 'Cinema e jantar em família', 'Lazer', ITAU, 'expense', false, 820],
      [5, 'Salário mensal', 'Salário', NUBANK, 'income', true, 7_400],
    ],
  },
  {
    openingBalance: 18_420,
    budgetCap: 9_500,
    openInvoices: 2_450,
    weeks: [
      [7_400, 2_600],
      [3_700, 1_950],
      [1_200, 2_100],
      [500, 1_450],
    ],
    bills: [
      [10, 'Aluguel residencial', 210_000, false],
      [18, 'Energia Cosern', 39_000, false],
      [22, 'Internet fibra 600 Mb', 13_990, false],
      [28, 'Fatura cartão', 245_000, false],
    ],
    transactions: [
      [15, 'Bônus anual', 'Salário', NUBANK, 'income', true, 3_700],
      [12, 'Presentes e ceia', 'Lazer', ITAU, 'expense', false, 1_650],
      [10, 'Aluguel + condomínio', 'Moradia', NUBANK, 'expense', true, 2_480],
      [8, 'Supermercado e feira', 'Alimentação', ITAU, 'expense', true, 1_320],
      [6, 'Viagem e combustível', 'Transporte', XP, 'expense', true, 890],
      [5, 'Salário mensal', 'Salário', NUBANK, 'income', true, 7_400],
    ],
  },
];

const brl = (cents: number): Money => money(cents, 'BRL');
const reais = (value: number): Money => brl(value * 100);

/** Resumo sintético do mês de `month` (só ano e mês importam). */
export function summaryFixture(month: LocalDate): SummaryData {
  // Deslocamento só para outubro, novembro e dezembro caírem na ordem das variações.
  const variant = VARIANTS[(month.year * 12 + month.month + 2) % VARIANTS.length] ?? VARIANTS[0];
  if (!variant) {
    throw new Error('Sem variações de dados sintéticos.');
  }
  const day = (value: number): LocalDate => withDayClamped(month.year, month.month, value);
  const key = `${month.year}-${month.month}`;
  return {
    openingBalance: reais(variant.openingBalance),
    budgetCap: reais(variant.budgetCap),
    openInvoices: reais(variant.openInvoices),
    invoiceDue: day(28),
    weeks: variant.weeks.map(([income, expense], index) => ({
      week: index + 1,
      income: reais(income),
      expense: reais(expense),
    })),
    bills: variant.bills.map(([due, name, cents, paid], index) => ({
      id: `${key}-bill-${index}`,
      name,
      due: day(due),
      amount: brl(cents),
      paid,
    })),
    transactions: variant.transactions.map(
      ([date, description, category, account, kind, settled, value], index) => ({
        id: `${key}-tx-${index}`,
        date: day(date),
        description,
        category,
        account,
        kind,
        settled,
        amount: reais(value),
      }),
    ),
  };
}
