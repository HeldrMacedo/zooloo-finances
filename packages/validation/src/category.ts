import * as z from 'zod';
import { HexColorSchema, IdSchema, IsoDateTimeSchema } from './primitives.js';

/** Categorias são separadas por tipo (RN-CAT-01). */
export const CategoryTypeSchema = z.enum(['income', 'expense']);

const CONTROL_CHARS = /\p{Cc}/u;

/** Nome único por (perfil, tipo, pai) (RN-CAT-07); a unicidade é verificada no Service. */
export const CategoryNameSchema = z
  .string()
  .refine((value) => !CONTROL_CHARS.test(value), 'Nome não pode ter caracteres de controle.')
  .transform((value) => value.trim().replace(/ {2,}/g, ' '))
  .pipe(
    z.string().min(1, 'Informe o nome da categoria.').max(60, 'Nome pode ter até 60 caracteres.'),
  );

/** Nome de ícone Lucide em kebab-case (doc 13 §4). */
export const IconNameSchema = z
  .string()
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Ícone inválido.')
  .refine(
    (value) => !value.startsWith('-') && !value.endsWith('-') && !value.includes('--'),
    'Ícone inválido.',
  );

export const CategoryCreateSchema = z
  .strictObject({
    id: IdSchema,
    type: CategoryTypeSchema,
    name: CategoryNameSchema,
    parentId: IdSchema.nullable().default(null),
    icon: IconNameSchema,
    color: HexColorSchema,
  })
  .refine((category) => category.parentId !== category.id, {
    message: 'Categoria não pode ser pai de si mesma.',
    path: ['parentId'],
  });

/** O tipo não muda depois de criada: os lançamentos dependem dele. */
export const CategoryUpdateSchema = z
  .strictObject({
    name: CategoryNameSchema,
    parentId: IdSchema.nullable(),
    icon: IconNameSchema,
    color: HexColorSchema,
    sortOrder: z.int().min(0),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Informe ao menos um campo para alterar.');

export const CategorySchema = z.strictObject({
  id: IdSchema,
  profileId: IdSchema,
  type: CategoryTypeSchema,
  name: z.string(),
  parentId: IdSchema.nullable(),
  icon: IconNameSchema,
  color: HexColorSchema,
  isSystem: z.boolean(),
  archivedAt: IsoDateTimeSchema.nullable(),
  sortOrder: z.int().min(0),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type CategoryType = z.infer<typeof CategoryTypeSchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type Category = z.infer<typeof CategorySchema>;
