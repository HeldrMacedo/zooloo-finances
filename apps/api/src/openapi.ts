import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { Env } from './config/env.js';

/** Documento OpenAPI gerado dos controllers e schemas Zod; fonte do `@zooloo/api-client`. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Zooloo Finanças API')
    .setDescription('API REST do Zooloo Finanças. Erros em application/problem+json (RFC 9457).')
    .setVersion('1')
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** A interface web carrega scripts: só fora de produção. */
export function isOpenApiUiEnabled(env: Env): boolean {
  return env.OPENAPI_UI && env.NODE_ENV !== 'production';
}

export function setupOpenApi(app: INestApplication, env: Env): void {
  SwaggerModule.setup('api/v1/docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/v1/openapi.json',
    yamlDocumentUrl: 'api/v1/openapi.yaml',
    ui: isOpenApiUiEnabled(env),
  });
}
