/**
 * Textos oficiais do produto em pt-BR (D-03). Os textos da prancha de marca são ilustrativos e não
 * valem como fonte (doc 13). Mensagens com plural usam `zero`/`one`/`other` e o parâmetro `count`.
 */
export const ptBR = {
  app: {
    name: 'Zooloo Finanças',
    shortName: 'Zooloo',
    install: 'Instalar aplicativo Zooloo',
  },
  nav: {
    summary: 'Resumo',
    transactions: 'Lançamentos',
    accounts: 'Contas',
    cards: 'Cartões',
    budgets: 'Orçamentos',
    goals: 'Objetivos',
    reports: 'Relatórios',
    calendar: 'Calendário',
    categories: 'Categorias',
    settings: 'Configurações',
  },
  actions: {
    newExpense: 'Nova despesa',
    newIncome: 'Nova receita',
    newTransfer: 'Transferência',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    archive: 'Arquivar',
    search: 'Buscar',
  },
  transaction: {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
    pending: 'Pendente',
    settled: 'Efetivado',
  },
  category: {
    title: 'Categorias',
    income: 'Receitas',
    expense: 'Despesas',
    other: 'Outros',
    newCategory: 'Nova categoria',
    newSubcategory: 'Nova subcategoria',
  },
  sync: {
    synced: 'Sincronizado',
    syncing: 'Sincronizando…',
    offlinePending: {
      zero: 'Offline · nenhuma alteração pendente',
      one: 'Offline · {count} alteração pendente',
      other: 'Offline · {count} alterações pendentes',
    },
  },
  auth: {
    login: 'Entrar',
    logout: 'Sair',
    signup: 'Criar conta',
    forgotPassword: 'Esqueci a senha',
    keepDataOnDevice: 'Manter dados neste computador',
    verifyEmailBanner: 'Verifique seu e-mail: enviamos um link para {email}.',
    leakedPassword: 'Essa senha apareceu em vazamentos de dados. Escolha outra.',
  },
  privacy: {
    showValues: 'Mostrar valores',
    hideValues: 'Ocultar valores',
  },
} as const;

export type Messages = typeof ptBR;
