import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// O `findBy*` espera o banco local abrir; o padrão de 1 s não basta com o `pnpm check` em paralelo.
configure({ asyncUtilTimeout: 10_000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset['theme'];
});
