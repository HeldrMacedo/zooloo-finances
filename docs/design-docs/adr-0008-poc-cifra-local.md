# ADR-0008 — PoC 3: cifra do banco local do PWA

- Status: aceito (Chrome e Edge); Safari pendente (TD-017)
- Data: 2026-11-23
- Origem: SEC-CR-06, SEC-CR-08, RNF-SEG-13, RNF-PWA-05, doc 09 §8 (PoC 3), doc 11 §3

## Pergunta

Dá para cifrar o banco local do PWA mantendo o SQLite WASM no VFS `opfs-sahpool` (ADR-0006)? Qual das duas estratégias da SEC-CR-08 adotar?

## Decisão

1. **Estratégia 1 (adotada): arquivo inteiro cifrado com SQLite3 Multiple Ciphers.**
   - Build WASM oficial publicado pelo autor do SQLite3MC: release v2.7.1, SQLite 3.54.1, a mesma versão do `@sqlite.org/sqlite-wasm` usado até aqui. Só `sqlite3.mjs` e `sqlite3.wasm` foram copiados para `apps/web-app/vendor/sqlite3mc/`. O SHA256 do pacote confere com o `SHA256SUMS` da release, e um teste (`build/vendor-integrity.test.ts`) recusa qualquer alteração nos dois arquivos. Origem e passo a passo de atualização estão em `vendor/sqlite3mc/SOURCE.md`.
   - Usamos o pacote pronto em vez de compilar aqui. Assim não precisamos da toolchain Emscripten, e o código é o mesmo que compilaríamos. Nenhuma cifra escrita por nós nem por terceiro pequeno (SEC-CR-06). O `@evolu/sqlite-wasm` foi descartado: a cifra dele é implementação própria do pool OPFS, e a versão 2.2.4 teve bugs de journal e de chave.
   - A cifra entra como VFS por cima do pool: `sqlite3mc_vfs_create('zooloo-sahpool')` cria `multipleciphers-zooloo-sahpool`. Aba líder, Web Locks e BroadcastChannel não mudam.
   - Esquema **SQLCipher 4** (AES-256-CBC + HMAC-SHA512 por página, `PRAGMA cipher = 'sqlcipher'`, `legacy = 4`), o mesmo formato do SQLCipher do mobile (SEC-CR-07). A chave é bruta (`x'<64 hex>'`): já tem 256 bits aleatórios, então dispensa o PBKDF2.
   - Antes de usar o banco, `verifyCipher` confere `sqlite3mc_version()` e `PRAGMA cipher` e lê o esquema; se a cifra não estiver ativa, a abertura é recusada (equivalente ao `PRAGMA cipher_version` da SEC-CR-07).
2. **Chave** (`database-key.ts`, `indexeddb-key-vault.ts`):
   - 32 bytes de `crypto.getRandomValues`, guardados só cifrados com AES-GCM por uma `CryptoKey` **não exportável**, com dado autenticado fixo `zooloo/local-db-key/v1`. A `CryptoKey` e o texto cifrado ficam no IndexedDB `zooloo-keys`.
   - Apagar o banco (base do logout e do remote wipe) apaga também a chave.
   - Sem chave utilizável (primeira abertura, IndexedDB limpo, chave adulterada ou o arquivo da PoC 1 em claro), o arquivo antigo é apagado e recriado vazio, e o estado informa `recreated`. O sync baixa tudo de novo; o que estava só no outbox local se perde (TD-022).
3. **Estratégia 2 (só comparação): cifra por campo** (`field-cipher.ts`). AES-GCM do Web Crypto com IV aleatório por valor e AAD `tabela.coluna.id`: um valor copiado para outra linha ou coluna não decifra. Não vai para produção.

## Evidência

- Playwright em Chrome e Edge, contra o build de produção (22/22 com os testes de sync):
  - abre com `cifra sqlcipher (SQLite3 Multiple Ciphers 2.7.1)`;
  - os arquivos do OPFS, lidos crus de uma página da mesma origem sem o app, não contêm `SQLite format 3`, `CREATE TABLE` nem os nomes gravados;
  - sem a chave, o banco antigo não abre e é recriado vazio, com aviso;
  - apagar o banco remove a chave do IndexedDB;
  - aba líder, troca de líder, offline e Service Worker continuam passando.
- Unitários: `database-key` (chave não exportável, reabertura, adulteração), `cipher` (ordem dos PRAGMAs, chave fora do formato recusada, abortar sem cifra), `field-cipher` (propriedade de ida e volta, IV aleatório, AAD, outra chave) e integridade do vendor.
- Medição (`/app/dev/banco-local`, botão "Medir cifras"; 2.000 linhas gravadas numa transação e lidas, depois de uma rodada de aquecimento; três execuções no mesmo computador):

  | Navegador | Sem cifra | Banco cifrado | Cifra por campo |
  |---|---|---|---|
  | Chrome | 162–196 ms | 144–232 ms | 304–740 ms |
  | Edge | 134–265 ms | 143–318 ms | 309–471 ms |

  O banco cifrado custa o mesmo que o sem cifra, dentro do ruído da medição. A cifra por campo custa cerca de 2× e protege só as colunas escolhidas, sem busca nem ordenação por elas no SQL.

## Consequências e limites

- Protege contra cópia de arquivos do perfil e contra outro usuário do SO, não contra malware na sessão do usuário (SEC-CR-08). Por isso existem o modo sessão (RN-PWA-08) e o timeout.
- Atualizar o SQLite passa a depender da release do SQLite3MC. Na troca de versão, siga `vendor/sqlite3mc/SOURCE.md` e rode o E2E. O `@sqlite.org/sqlite-wasm` ficou só como dependência de desenvolvimento, para os tipos.
- Conferimos o SHA256 contra o `SHA256SUMS` da release, mas não a assinatura Sigstore desse arquivo (TD-023).
- Safari e WebKit seguem sem validação (TD-017).
