---
title: "Vision"
description: "Um framework de observabilidade estruturada para Node.js que trata o monitoramento de produção como cidadão de primeira classe, não como uma reflexão tardia."
tags: ["TypeScript", "Observabilidade", "Node.js", "Monitoramento", "Produção", "Framework"]
github: "https://github.com/rodrigopsasaki/vision"
featured: true
order: 2
---

# Vision: Observabilidade Production-First

Vision é um framework de observabilidade estruturada para aplicações Node.js. É construído sobre uma premissa simples: **observabilidade não deveria ser uma reflexão tardia**. Quando você está construindo sistemas que importam, você precisa entender o que está acontecendo dentro deles — não apenas quando as coisas quebram, mas o tempo todo.

## A Filosofia: Observabilidade Zero-Setup

Todos nós já passamos por isso. Você entrega uma funcionalidade, ela funciona bem em desenvolvimento, e então... algo estranho acontece em produção. Talvez seja lento às vezes. Talvez falhe de maneiras que você nunca antecipou. Talvez você simplesmente não consiga descobrir o porquê.

Abordagens tradicionais adicionam monitoramento depois — depois que a arquitetura está definida, depois que os padrões estão estabelecidos, depois que se torna uma batalha árdua. Vision adota uma abordagem diferente: **e se a observabilidade fosse automática?**

```typescript
// Configure uma vez na sua aplicação (geralmente em server.ts ou app.ts)
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';
import { createDatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

// Configuração única
vision.init({
  exporters: [createDatadogExporter({ apiKey: "...", service: "minha-api" })]
});
app.use(visionMiddleware()); // Isso é tudo - todo endpoint agora é rastreado

// Agora seu código regular automaticamente ganha observabilidade
async function processPayment(paymentId: string) {
  // O contexto já existe da requisição HTTP
  vision.set("payment_id", paymentId);
  
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  vision.set("amount", payment.amount);
  vision.set("currency", payment.currency);
  
  const result = await stripe.charges.create({ amount: payment.amount });
  vision.set("charge_id", result.id);
  vision.set("status", "completed");
  
  await db.payment.update({ 
    where: { id: paymentId }, 
    data: { status: 'completed' } 
  });
  
  return result;
}
```

Isso é tudo. Sem envolver todas as funções. Sem criação manual de contexto. Apenas adicione dados ao contexto que já existe. Quando algo dá errado, você obtém a história completa: qual endpoint foi chamado, quais dados estavam envolvidos, quanto tempo cada passo demorou e exatamente onde falhou.

## Integrações com Frameworks

Vision integra perfeitamente com todos os principais frameworks Node.js através de pacotes dedicados:

### Integração Express.js

O framework Node.js mais popular, com observabilidade de configuração zero:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Configure uma vez
vision.init({
  exporters: [/* seus exportadores */]
});

// Adicione middleware - toda rota agora é rastreada
app.use(visionMiddleware({
  captureBody: true,
  captureHeaders: true,
  performance: {
    slowOperationThreshold: 1000
  }
}));

// Rotas automaticamente ganham contexto Vision
app.get('/api/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Integração Fastify

Framework de alta performance com arquitetura nativa de plugin:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-fastify
```

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify();

// Registre como plugin
await fastify.register(visionPlugin, {
  captureBody: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500
  },
  extractUser: (request) => request.headers['x-user-id']
});

fastify.get('/users/:id', async (request, reply) => {
  // Acesse o contexto Vision
  const ctx = request.visionContext;
  
  vision.set('user_id', request.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(request.params.id);
  return user;
});
```

### Integração Koa

Middleware elegante async/await para Node.js moderno:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-koa
```

```typescript
import Koa from 'koa';
import { createVisionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

// Adicione middleware Vision
app.use(createVisionMiddleware({
  captureBody: true,
  captureKoaMetadata: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000
  }
}));

app.use(async (ctx) => {
  // Contexto Vision está automaticamente disponível
  vision.set('user_id', ctx.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(ctx.params.id);
  ctx.body = user;
});
```

### Integração NestJS

Framework enterprise com configuração baseada em decorators:

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-nestjs
```

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [/* seus exportadores */],
      captureBody: true,
      captureHeaders: true
    })
  ]
})
export class AppModule {}

// Use nos seus controllers
@Controller('users')
export class UsersController {
  @Get(':id')
  @UseVision('get_user') // Criação automática de contexto
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    return await this.usersService.getUser(id);
  }
}
```

## Variantes de Performance

Cada integração oferece variantes pré-configuradas para diferentes casos de uso:

### Minimal (Ultra-Rápido)

```typescript
import { createMinimalVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createMinimalVisionPlugin({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 10, // Limite muito rápido
    trackMemoryUsage: false
  }
}));
```

### Comprehensive (Observabilidade Completa)

```typescript
import { createComprehensiveVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createComprehensiveVisionPlugin({
  captureHeaders: true,
  captureBody: true,
  captureQuery: true,
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500,
    trackMemoryUsage: true
  },
  errorHandling: {
    captureErrors: true,
    captureStackTrace: true
  }
}));
```

### Performance-Optimized (Otimizado para Performance)

```typescript
import { createPerformanceVisionPlugin } from '@rodrigopsasaki/vision-fastify';

await fastify.register(createPerformanceVisionPlugin({
  captureHeaders: false,
  captureBody: false,
  redactSensitiveData: false, // Pula redação para velocidade
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 100
  }
}));
```

## Como Funciona: Contextos Estruturados

No seu núcleo, Vision é sobre **contextos** — unidades de trabalho com escopo que carregam metadados estruturados. Todo contexto tem um nome, contém dados chave-valor e rastreia tempo automaticamente.

```typescript
await vision.observe(
  "user.authenticate",
  {
    scope: "http-server",
    source: "auth-service",
  },
  async () => {
    vision.set("user_email", email);
    vision.set("auth_method", "password");
    vision.set("ip_address", req.ip);

    // Sua lógica de autenticação aqui
    const user = await verifyCredentials(email, password);

    vision.set("user_id", user.id);
    vision.set("user_role", user.role);
    vision.set("login_success", true);
  }
);
```

Quando este contexto completa, Vision envia o quadro completo para seus exportadores configurados: o tempo, os metadados, sucesso ou falha, e quaisquer erros que ocorreram.

## Recursos Avançados

### Segurança & Redação de Dados

Vision automaticamente redaciona dados sensíveis de cabeçalhos, parâmetros de query e corpos de requisição:

```typescript
app.use(visionMiddleware({
  redactSensitiveData: true,
  redactHeaders: [
    'authorization',
    'cookie',
    'x-api-key'
  ],
  redactQueryParams: [
    'token',
    'key',
    'secret',
    'password'
  ],
  redactBodyFields: [
    'password',
    'ssn',
    'creditCard'
  ]
}));
```

### Extração Customizada de Usuário

Extraia informações de usuário das requisições usando funções customizadas:

```typescript
app.use(visionMiddleware({
  extractUser: (req) => {
    // Extrair de JWT, sessão ou cabeçalhos
    return req.user || req.headers['x-user-id'];
  },
  extractTenant: (req) => {
    return req.headers['x-tenant-id'];
  },
  extractCorrelationId: (req) => {
    return req.headers['x-correlation-id'] || 
           req.headers['x-request-id'];
  }
}));
```

### Monitoramento de Performance

Rastreie tempo de execução, uso de memória e identifique operações lentas:

```typescript
app.use(visionMiddleware({
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 1000, // Marcar operações > 1s como lentas
    trackMemoryUsage: true
  }
}));
```

### Exclusão de Rotas

Exclua health checks e rotas internas do rastreamento:

```typescript
app.use(visionMiddleware({
  excludeRoutes: ['/health', '/metrics', '/favicon.ico'],
  shouldExcludeRoute: (req) => {
    return req.url.startsWith('/internal/');
  }
}));
```

## Exportadores Production-Ready

### Integração Datadog

O exportador Datadog transforma contextos Vision em traces distribuídos compatíveis com OpenTelemetry:

```bash
npm install @rodrigopsasaki/vision-datadog-exporter
```

```typescript
import { createDatadogExporter } from '@rodrigopsasaki/vision-datadog-exporter';

vision.init({
  exporters: [
    createDatadogExporter({
      apiKey: process.env.DATADOG_API_KEY,
      service: "payment-service",
      env: "production",
      
      // Recursos de produção incluídos
      batchSize: 100,
      retries: 3,
      timeout: 10000,
    })
  ]
});
```

Isso não é apenas um cliente HTTP simples. Inclui:
- **Circuit breaker**: Protege sua aplicação quando Datadog está indisponível
- **Batching inteligente**: Reduz chamadas de API e melhora performance  
- **Lógica de retry**: Backoff exponencial com classificação de erro
- **Compatibilidade OpenTelemetry**: Relacionamentos adequados trace/span
- **Detecção automática de span kind**: Mapeia contextos para tipos de span apropriados

### Exportadores Personalizados

Construir seu próprio exportador é direto:

```typescript
const slackExporter: VisionExporter = {
  name: "slack-alerts",
  
  error(context, error) {
    // Só alertar sobre falhas de pagamento
    if (context.name.startsWith("payment.") && context.data.amount > 1000) {
      sendSlackAlert({
        text: `Pagamento de alto valor falhou: ${context.name}`,
        fields: {
          "Payment ID": context.data.payment_id,
          "Valor": context.data.amount,
          "Erro": error.message,
          "Duração": `${context.duration}ms`
        }
      });
    }
  }
};
```

## Microserviços & Sistemas Distribuídos

Vision se destaca em arquiteturas de microserviços com suporte built-in para:

### Integração Service Mesh

```typescript
// Rastreamento automático de cadeia de serviços
fastify.addHook('preHandler', async (request, reply) => {
  const correlationId = request.headers['x-correlation-id'] || generateId();
  const serviceChain = request.headers['x-service-chain'] || 'gateway';
  
  // Adicionar serviço atual à cadeia
  const updatedChain = `${serviceChain}->${SERVICE_NAME}`;
  
  reply.header('X-Correlation-ID', correlationId);
  reply.header('X-Service-Chain', updatedChain);
});
```

### Padrão Circuit Breaker

```typescript
async function callExternalService(serviceName: string, url: string) {
  const circuitState = getCircuitBreakerState(serviceName);
  
  if (circuitState === 'open') {
    vision.set('circuit_breaker_open', true);
    throw new Error(`Circuit breaker aberto para ${serviceName}`);
  }
  
  try {
    vision.set(`${serviceName}_call_start`, Date.now());
    const response = await fetch(url);
    vision.set(`${serviceName}_call_success`, true);
    resetCircuitBreaker(serviceName);
    return response;
  } catch (error) {
    vision.set(`${serviceName}_call_failed`, true);
    recordServiceFailure(serviceName);
    throw error;
  }
}
```

### Comunicação Inter-Serviços

```typescript
// Propagar contexto Vision através de serviços
async function callDownstreamService(endpoint: string, data: any) {
  return await vision.observe('downstream.call', async () => {
    vision.set('downstream_service', endpoint);
    vision.set('request_size', JSON.stringify(data).length);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Correlation-ID': vision.get('correlation_id'),
        'X-Service-Chain': vision.get('service_chain'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    vision.set('response_status', response.status);
    vision.set('response_size', response.headers.get('content-length'));
    
    return response.json();
  });
}
```

## Exemplos do Mundo Real

### Fluxo de Autenticação

```typescript
await vision.observe("user.login", async () => {
  vision.set("auth_method", "email");
  vision.set("ip_address", req.ip);
  vision.set("user_agent", req.headers['user-agent']);
  
  // Verificação de rate limiting
  await vision.observe("auth.rate_limit_check", async () => {
    const attempts = await redis.get(`login_attempts:${req.ip}`);
    vision.set("previous_attempts", attempts || 0);
    
    if (attempts > 5) {
      vision.set("rate_limited", true);
      throw new Error("Muitas tentativas de login");
    }
  });
  
  // Verificação de credenciais
  const user = await vision.observe("auth.verify_credentials", async () => {
    vision.set("password_check_start", Date.now());
    const isValid = await bcrypt.compare(password, hashedPassword);
    vision.set("password_valid", isValid);
    
    if (!isValid) {
      await redis.incr(`login_attempts:${req.ip}`);
      throw new Error("Credenciais inválidas");
    }
    
    return user;
  });
  
  // Criação de sessão
  await vision.observe("auth.create_session", async () => {
    const sessionId = generateId();
    await redis.set(`session:${sessionId}`, JSON.stringify(user));
    vision.set("session_id", sessionId);
    vision.set("session_ttl", 3600);
  });
  
  vision.set("login_successful", true);
  vision.set("user_id", user.id);
  vision.set("user_role", user.role);
});
```

### Processamento de Pedidos E-commerce

```typescript
await vision.observe("order.process", async () => {
  vision.set("order_id", orderId);
  vision.set("customer_id", customerId);
  vision.set("items_count", items.length);
  
  // Verificação de estoque
  const inventory = await vision.observe("inventory.check", async () => {
    const results = await Promise.all(
      items.map(item => checkInventory(item.productId, item.quantity))
    );
    
    const unavailable = results.filter(r => !r.available);
    vision.set("inventory_issues", unavailable.length);
    
    if (unavailable.length > 0) {
      vision.set("unavailable_items", unavailable.map(r => r.productId));
      throw new Error("Estoque insuficiente");
    }
    
    return results;
  });
  
  // Processamento de pagamento
  const payment = await vision.observe("payment.process", async () => {
    vision.set("payment_method", paymentData.method);
    vision.set("amount", paymentData.amount);
    vision.set("currency", paymentData.currency);
    
    const result = await stripe.charges.create({
      amount: paymentData.amount,
      currency: paymentData.currency,
      source: paymentData.token
    });
    
    vision.set("charge_id", result.id);
    vision.set("payment_status", result.status);
    
    return result;
  });
  
  // Cumprimento do pedido
  await vision.observe("fulfillment.create", async () => {
    const fulfillment = await createFulfillment({
      orderId,
      items,
      shippingAddress: order.shippingAddress
    });
    
    vision.set("fulfillment_id", fulfillment.id);
    vision.set("estimated_delivery", fulfillment.estimatedDelivery);
  });
  
  // Notificação
  await vision.observe("notification.send", async () => {
    await sendOrderConfirmation({
      email: customer.email,
      orderId,
      items,
      total: payment.amount
    });
    
    vision.set("notification_sent", true);
  });
  
  vision.set("order_completed", true);
});
```

### Processamento de Jobs em Background

```typescript
// Worker de fila com Vision
export async function processEmailJob(job: EmailJob) {
  await vision.observe(`email.job.${job.type}`, {
    scope: "background-job",
    source: "worker-service"
  }, async () => {
    vision.set("job_id", job.id);
    vision.set("job_type", job.type);
    vision.set("queue", job.queue);
    vision.set("attempts", job.attempts);
    vision.set("recipient", job.data.email);
    
    // Processamento de template
    const content = await vision.observe("email.template.render", async () => {
      vision.set("template_name", job.data.template);
      vision.set("template_data_size", Object.keys(job.data.templateData).length);
      
      const rendered = await renderEmailTemplate(
        job.data.template, 
        job.data.templateData
      );
      
      vision.set("content_length", rendered.html.length);
      vision.set("has_attachments", rendered.attachments?.length > 0);
      
      return rendered;
    });
    
    // Entrega de email
    const result = await vision.observe("email.delivery", async () => {
      vision.set("provider", "sendgrid");
      
      const response = await sendgrid.send({
        to: job.data.email,
        from: job.data.from,
        subject: content.subject,
        html: content.html,
        attachments: content.attachments
      });
      
      vision.set("message_id", response[0].headers['x-message-id']);
      vision.set("delivery_status", "queued");
      
      return response;
    });
    
    vision.set("job_completed", true);
    vision.set("processing_time_ms", Date.now() - job.startedAt);
  });
}
```

## Normalização de Chaves

Vision automaticamente normaliza chaves de contexto para garantir casing consistente em todos os seus dados de observabilidade:

```typescript
vision.init({
  normalization: {
    enabled: true,
    keyCasing: "snake_case", // snake_case, camelCase, kebab-case, PascalCase
    deep: true // Normalizar objetos aninhados
  }
});

await vision.observe("user.registration", async () => {
  // Você escreve chaves da forma que se sente natural
  vision.set("userId", "user123");
  vision.set("firstName", "John");
  vision.set("lastLoginAt", "2023-01-01");
  
  // Exportadores recebem chaves normalizadas:
  // user_id, first_name, last_login_at
});
```

## Exemplos de Produção

Confira exemplos abrangentes e executáveis no repositório:

### Exemplos Fastify
- **[Uso Básico](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/basic-usage.ts)** - Integração simples com configurações padrão
- **[Uso Avançado](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/advanced-usage.ts)** - Autenticação, multi-tenant, extratores customizados
- **[Otimizado para Performance](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/performance-optimized.ts)** - Configurações de alta throughput
- **[Exemplo de Microserviço](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-fastify/examples/microservice-example.ts)** - Circuit breakers, service mesh, tracing distribuído

### Exemplos Koa
- **[Uso Básico](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/basic-usage.ts)** - Padrões de middleware async/await
- **[Uso Avançado](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/advanced-usage.ts)** - Gerenciamento de sessão, workflows de negócio
- **[Otimizado para Performance](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-koa/examples/performance-optimized.ts)** - Processamento de stream, operações em lote

### Exemplos Express
- **[Uso Básico](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-express/examples/basic-usage.ts)** - Integração padrão Express.js
- **[Uso Avançado](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-express/examples/advanced-usage.ts)** - Lógica de negócio complexa com Vision

### Exemplos NestJS
- **[Uso Básico](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-nestjs/examples/basic-usage.ts)** - Configuração baseada em decorators
- **[Uso Avançado](https://github.com/rodrigopsasaki/vision/blob/main/packages/vision-nestjs/examples/advanced-usage.ts)** - Padrões enterprise com injeção de dependência

## Começando

Escolha seu framework e siga o início rápido:

### Express.js (Mais Popular)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

```typescript
import express from 'express';
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Configure uma vez
vision.init({
  exporters: [
    {
      name: 'console',
      success: (ctx) => console.log('✓', ctx.name, `${ctx.duration}ms`),
      error: (ctx, err) => console.error('✗', ctx.name, err.message)
    }
  ]
});

app.use(visionMiddleware());

// Toda rota agora é rastreada
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  const user = await getUser(req.params.id);
  res.json(user);
});
```

### Fastify (Alta Performance)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-fastify
```

```typescript
import Fastify from 'fastify';
import { visionPlugin } from '@rodrigopsasaki/vision-fastify';

const fastify = Fastify();

await fastify.register(visionPlugin, {
  performance: {
    trackExecutionTime: true,
    slowOperationThreshold: 500
  }
});

fastify.get('/users/:id', async (request, reply) => {
  vision.set('user_id', request.params.id);
  const user = await getUser(request.params.id);
  return user;
});
```

### Koa (Async/Await Moderno)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-koa
```

```typescript
import Koa from 'koa';
import { createVisionMiddleware } from '@rodrigopsasaki/vision-koa';

const app = new Koa();

app.use(createVisionMiddleware({
  captureBody: true,
  performance: {
    trackExecutionTime: true
  }
}));

app.use(async (ctx) => {
  vision.set('user_id', ctx.params.id);
  const user = await getUser(ctx.params.id);
  ctx.body = user;
});
```

### NestJS (Enterprise)

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-nestjs
```

```typescript
import { Module } from '@nestjs/common';
import { VisionModule } from '@rodrigopsasaki/vision-nestjs';

@Module({
  imports: [
    VisionModule.forRoot({
      exporters: [/* seus exportadores */]
    })
  ]
})
export class AppModule {}

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseVision('get_user')
  async getUser(@Param('id') id: string) {
    vision.set('user_id', id);
    return await this.usersService.getUser(id);
  }
}
```

## Pacotes Disponíveis

Vision é arquitetado como um ecossistema modular:

### Framework Principal
- **[@rodrigopsasaki/vision](https://www.npmjs.com/package/@rodrigopsasaki/vision)** - Framework de observabilidade principal

### Integrações de Framework
- **[@rodrigopsasaki/vision-express](https://www.npmjs.com/package/@rodrigopsasaki/vision-express)** - Middleware Express.js
- **[@rodrigopsasaki/vision-fastify](https://www.npmjs.com/package/@rodrigopsasaki/vision-fastify)** - Plugin Fastify
- **[@rodrigopsasaki/vision-koa](https://www.npmjs.com/package/@rodrigopsasaki/vision-koa)** - Middleware Koa
- **[@rodrigopsasaki/vision-nestjs](https://www.npmjs.com/package/@rodrigopsasaki/vision-nestjs)** - Módulo NestJS

### Exportadores
- **[@rodrigopsasaki/vision-datadog-exporter](https://www.npmjs.com/package/@rodrigopsasaki/vision-datadog-exporter)** - Traces, métricas e logs Datadog

## Por Que Esta Abordagem Funciona

**Overhead Mínimo**: Vision é projetado para ser leve. Contextos são apenas objetos com metadados. Sem instrumentação pesada ou impacto na performance.

**Integração Natural**: Não muda como você escreve código — ele o aprimora. As integrações específicas de framework são naturais e tornam seu código mais legível.

**Insights Poderosos**: Como toda operação é envolvida e enriquecida com contexto, você obtém traces incrivelmente detalhados que contam a história completa do que aconteceu.

**Segurança de Produção**: Recursos incorporados como circuit breakers, retries e redação de segurança significam que você pode confiar nele em produção desde o primeiro dia.

**Arquitetura Flexível**: O sistema de exportadores significa que você pode enviar dados para qualquer lugar — múltiplos destinos, transformações personalizadas, formatos diferentes.

## O Quadro Geral

Não estamos tentando reinventar observabilidade. Existem ferramentas fantásticas por aí — Datadog, New Relic, Honeycomb, Jaeger. O que estamos tentando fazer é tornar mais fácil obter dados de alta qualidade nessas ferramentas.

Vision é nossa melhor tentativa de resolver um problema que enfrentamos repetidamente: **como você constrói aplicações que são observáveis por design?** Não é perfeito, e não é mágica. É apenas o que aprendemos que funciona bem para construir sistemas que você pode entender e debuggar.

Se você está construindo aplicações Node.js que precisam funcionar de forma confiável em produção, dê uma chance ao Vision. Comece pequeno — escolha sua integração de framework, adicione um exportador, veja que insights você obtém. Pensamos que você descobrirá que torna debuggar e entender seus sistemas significativamente mais fácil.

## 🙏 Agradecimentos

Agradecimento especial ao [Ryan McGrath](https://github.com/zoltrain), o brilhante engenheiro conhecedor de Go que me apresentou pela primeira vez ao poder de propagar contexto estruturado através de serviços. Este projeto é um descendente direto dessas conversas — apenas portado para um novo ecossistema com o mesmo cuidado por clareza, pragmatismo e o valor de compartilhar boas ideias.

---

Porque no final do dia, todos nós estamos apenas tentando construir software que funciona. Vision é nossa tentativa de tornar isso um pouco mais fácil.