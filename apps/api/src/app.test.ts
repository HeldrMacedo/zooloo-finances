import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoryCreateSchema, type CategoryCreate, ProblemSchema } from '@zooloo/validation';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from './providers/database/database.service.js';
import { startTestApi, type TestApi } from './testing/test-app.js';

const USER_A = '0196f3a2-0000-7000-8000-00000000000a';
const USER_B = '0196f3a2-0000-7000-8000-00000000000b';

let api: TestApi;

const request = (method: 'GET' | 'POST', url: string) => api.app.inject({ method, url });

beforeAll(async () => {
  api = await startTestApi();
});

afterAll(async () => {
  await api?.close();
});

describe('health', () => {
  it('liveness responde sem tocar no banco', async () => {
    const response = await request('GET', '/api/v1/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('readiness confirma o banco', async () => {
    const response = await request('GET', '/api/v1/health/ready');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});

describe('erros em problem+json (RFC 9457)', () => {
  it('rota inexistente devolve 404 problem+json sem query string no instance', async () => {
    const response = await request('GET', '/api/v1/nao-existe?token=segredo');
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    const body = ProblemSchema.parse(response.json());
    expect(body).toMatchObject({ status: 404, title: 'Recurso não encontrado' });
    expect(body.instance).toBe('/api/v1/nao-existe');
  });

  it('rota fora do prefixo /api/v1 não existe', async () => {
    expect((await request('GET', '/health')).statusCode).toBe(404);
  });
});

describe('cabeçalhos de segurança (doc 10 §7)', () => {
  it('CSP fechada, sem sniffing, sem framing e sem X-Powered-By', async () => {
    const { headers } = await request('GET', '/api/v1/health');
    expect(headers['content-security-policy']).toContain("default-src 'none'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});

describe('OpenAPI', () => {
  it('documento gerado com as rotas e schemas Zod convertidos', async () => {
    const response = await request('GET', '/api/v1/openapi.json');
    expect(response.statusCode).toBe(200);
    const document = response.json<{
      openapi: string;
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    }>();
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/api/v1/health', '/api/v1/health/ready']),
    );
    expect(JSON.stringify(document)).toContain('"ok"');
  });

  it('Swagger UI desligada por padrão', async () => {
    expect((await request('GET', '/api/v1/docs')).statusCode).toBe(404);
  });
});

describe('DatabaseService.withUser (ADR-0005)', () => {
  it('abre a transação no contexto da RLS do usuário', async () => {
    const database = api.app.get(DatabaseService);
    const insertUser = (id: string, email: string) =>
      database.withUser(id, (tx) =>
        tx.execute(
          sql`insert into users (id, email, name, wrapped_dek) values (${id}, ${email}, 'X', '\\x00')`,
        ),
      );
    await insertUser(USER_A, 'a@example.com');
    await insertUser(USER_B, 'b@example.com');

    const seenByA = await database.withUser(USER_A, (tx) =>
      tx.execute<{ id: string }>(sql`select id from users`),
    );
    expect(seenByA.rows.map((row) => row.id)).toEqual([USER_A]);
  });

  it('não grava em nome de outro usuário', async () => {
    const database = api.app.get(DatabaseService);
    await expect(
      database.withUser(USER_A, (tx) =>
        tx.execute(
          sql`insert into users (id, email, name, wrapped_dek) values (${'0196f3a2-0000-7000-8000-00000000000c'}, 'c@example.com', 'X', '\\x00')`,
        ),
      ),
    ).rejects.toThrow();
  });
});

describe('validação na fronteira com Zod (Standard Schema)', () => {
  @ApiTags('echo')
  @Controller('echo')
  class EchoController {
    @Post()
    echo(@Body({ schema: CategoryCreateSchema }) body: CategoryCreate): CategoryCreate {
      return body;
    }

    @Get('boom')
    boom(): never {
      throw new Error('falha interna para ana@example.com com token eyJa.eyJb.c2ln');
    }
  }

  @Module({ controllers: [EchoController] })
  class EchoModule {}

  let echo: TestApi;

  beforeAll(async () => {
    echo = await startTestApi({ OPENAPI_UI: true }, [EchoModule]);
  });

  afterAll(async () => {
    await echo?.close();
  });

  it('corpo válido chega normalizado ao controller', async () => {
    const response = await echo.app.inject({
      method: 'POST',
      url: '/api/v1/echo',
      payload: {
        id: '0196f3a2-7c1e-7b3a-9c2d-1234567890ab',
        type: 'expense',
        name: '  Mercado  ',
        icon: 'shopping-cart',
        color: '#16b89a',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: 'Mercado', color: '#16B89A', parentId: null });
  });

  it('corpo inválido vira 422 problem+json com o caminho de cada erro', async () => {
    const response = await echo.app.inject({
      method: 'POST',
      url: '/api/v1/echo',
      payload: { id: 'x', type: 'transfer', name: '', icon: 'a', color: '#fff', extra: 1 },
    });
    expect(response.statusCode).toBe(422);
    expect(response.headers['content-type']).toContain('application/problem+json');
    const body = ProblemSchema.parse(response.json());
    expect(body.errors?.map((error) => error.path)).toEqual(
      expect.arrayContaining(['id', 'type', 'name', 'color']),
    );
  });

  it('erro interno devolve 500 genérico e loga mascarado', async () => {
    const response = await echo.app.inject({ method: 'GET', url: '/api/v1/echo/boom' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ title: 'Erro interno', status: 500 });
    expect(response.body).not.toContain('ana@example.com');
    const logged = JSON.stringify(echo.logs.filter((record) => record.level === 'error'));
    expect(logged).toContain('a***@example.com');
    expect(logged).not.toContain('ana@example.com');
    expect(logged).not.toContain('eyJa.eyJb.c2ln');
  });

  it('Swagger UI ligada fora de produção quando OPENAPI_UI=true', async () => {
    const response = await echo.app.inject({ method: 'GET', url: '/api/v1/docs' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
  });

  it('corpo acima do limite é recusado com 413', async () => {
    const response = await echo.app.inject({
      method: 'POST',
      url: '/api/v1/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'x'.repeat(1_100_000) }),
    });
    expect(response.statusCode).toBe(413);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });
});
