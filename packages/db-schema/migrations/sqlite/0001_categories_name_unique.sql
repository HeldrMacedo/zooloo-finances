-- Nome único por (perfil, tipo, pai), sem diferenciar maiúsculas (RN-CAT-07), igual ao servidor.
-- Escrito à mão porque o drizzle-kit 0.31 gera este índice de expressão com SQL inválido (TD-005).
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`profile_id`, `type`, coalesce(`parent_id`, ''), lower(`name`)) WHERE `deleted_at` IS NULL;
