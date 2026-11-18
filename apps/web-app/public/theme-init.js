// Aplica o tema salvo antes da primeira pintura (arquivo externo: a CSP não libera script inline).
try {
  var theme = localStorage.getItem('zl-theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // Armazenamento bloqueado: fica o tema do sistema.
}
