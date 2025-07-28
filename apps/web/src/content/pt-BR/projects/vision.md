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

## O Sistema de Hooks: AOP para Observabilidade

O sistema de exportadores do Vision funciona como programação orientada a aspectos para observabilidade. Cada exportador pode se conectar ao ciclo de vida dos contextos:

```typescript
const myExporter: VisionExporter = {
  name: "my-custom-exporter",
  
  // Chamado antes da execução do contexto
  before(context) {
    console.log(`Iniciando: ${context.name}`);
  },
  
  // Chamado após execução bem-sucedida
  after(context) {
    console.log(`Completado: ${context.name} em ${context.duration}ms`);
  },
  
  // Chamado quando o contexto é bem-sucedido
  success(context) {
    // Enviar para sua plataforma de observabilidade
    sendTrace(context);
  },
  
  // Chamado quando o contexto falha
  error(context, error) {
    // Enviar erro com contexto completo
    sendError(context, error);
  }
};
```

Este design significa que você pode:
- Enviar traces para Datadog enquanto também loga no CloudWatch
- Transformar dados de forma diferente para cada destino  
- Adicionar hooks de lógica de negócio personalizados
- Construir exportadores de debug que só executam em desenvolvimento

## A Mágica: Middleware Express Faz Tudo

É aqui que Vision brilha. **Você configura uma vez e esquece.** O middleware Express cria automaticamente contextos para toda requisição HTTP — sem envolvimento manual, sem boilerplate, sem pensar.

```typescript
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

const app = express();

// Esta é literalmente toda a configuração que você precisa
app.use(visionMiddleware());

// Toda rota agora automaticamente ganha:
// ✓ Rastreamento completo de requisição/resposta
// ✓ Captura de erro com stack traces  
// ✓ Detecção de usuário de padrões de auth comuns
// ✓ Detecção de Correlation ID de cabeçalhos
// ✓ Tempo automático para toda a requisição
// ✓ Redação de segurança de dados sensíveis

app.get('/api/users/:id', async (req, res) => {
  // Nenhuma criação de contexto necessária - já existe!
  // Apenas adicione os dados que você se importa:
  vision.set('user_id', req.params.id);
  vision.set('operation', 'get_user');
  
  const user = await getUser(req.params.id);
  res.json(user);
  
  // Quando esta requisição termina (sucesso ou erro), 
  // tudo é enviado para seus exportadores automaticamente
});
```

**Isso é tudo.** Sem arquivos de configuração. Sem criação manual de trace. Sem configuração complexa. Instale o middleware, configure seus exportadores uma vez, e todo endpoint em toda sua aplicação se torna observável.

## Quando Você PRECISA de Contextos Manuais (Spoiler: Raramente)

Na maioria das vezes, você está apenas adicionando dados com `vision.set()` ao contexto que já existe. Mas às vezes você quer rastrear mais profundamente operações específicas:

```typescript
app.post('/api/payments', async (req, res) => {
  // Contexto principal já existe do middleware
  vision.set('payment_amount', req.body.amount);
  
  // Só crie sub-contextos para operações que você quer rastrear separadamente
  const payment = await vision.observe('payment.process', async () => {
    vision.set('provider', 'stripe');
    return await processStripePayment(req.body);
  });
  
  const email = await vision.observe('email.send', async () => {
    vision.set('template', 'payment_confirmation');
    return await sendConfirmationEmail(payment);
  });
  
  res.json({ payment, email });
});
```

Isso é **opcional**. Você poderia igualmente escrever:

```typescript
app.post('/api/payments', async (req, res) => {
  vision.set('payment_amount', req.body.amount);
  
  vision.set('provider', 'stripe');
  const payment = await processStripePayment(req.body);
  
  vision.set('template', 'payment_confirmation');
  const email = await sendConfirmationEmail(payment);
  
  res.json({ payment, email });
});
```

Ambas as abordagens funcionam. A primeira te dá tempo mais granular e a capacidade de rastrear sub-operações independentemente. A segunda é mais simples e frequentemente perfeitamente adequada.

## Exportadores Production-Ready

### Integração Datadog

O exportador Datadog transforma contextos Vision em traces distribuídos compatíveis com OpenTelemetry:

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

## 🙏 Agradecimentos

Agradecimento especial ao [Ryan McGrath](https://github.com/zoltrain), o brilhante engenheiro conhecedor de Go que me apresentou pela primeira vez ao poder de propagar contexto estruturado através de serviços. Este projeto é um descendente direto dessas conversas — apenas portado para um novo ecossistema com o mesmo cuidado por clareza, pragmatismo e o valor de compartilhar boas ideias.

## Padrões de Uso no Mundo Real

### Operações de Banco de Dados

```typescript
await vision.observe("user.create", { scope: "database" }, async () => {
  vision.set("operation", "INSERT");
  vision.set("table", "users");
  
  const user = await vision.observe("user.validate", async () => {
    vision.set("validator", "email_unique");
    return await validateEmailUnique(email);
  });
  
  vision.set("validation_passed", true);
  
  const result = await db.user.create({ data: userData });
  vision.set("user_id", result.id);
  vision.set("rows_affected", 1);
  
  return result;
});
```

### Chamadas de API Externa

```typescript
await vision.observe("github.user.fetch", { scope: "client" }, async () => {
  vision.set("provider", "github");
  vision.set("api_version", "v4");
  vision.set("username", username);
  
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${token}` }
    });
    
    vision.set("status_code", response.status);
    vision.set("rate_limit_remaining", response.headers.get('x-ratelimit-remaining'));
    
    if (!response.ok) {
      vision.set("error_type", "http_error");
      throw new Error(`GitHub API retornou ${response.status}`);
    }
    
    const user = await response.json();
    vision.set("user_id", user.id);
    vision.set("public_repos", user.public_repos);
    
    return user;
  } catch (error) {
    vision.set("error_type", "network_error");
    throw error;
  }
});
```

### Jobs em Background

```typescript
await vision.observe("email.send", { scope: "background-job" }, async () => {
  vision.set("job_type", "email");
  vision.set("queue", "high-priority");
  vision.set("recipient", email);
  vision.set("template", "welcome");
  
  const result = await vision.observe("sendgrid.send", async () => {
    vision.set("provider", "sendgrid");
    return await sendEmail({
      to: email,
      template: "welcome",
      data: templateData
    });
  });
  
  vision.set("message_id", result.messageId);
  vision.set("delivery_status", "queued");
});
```

## Por Que Esta Abordagem Funciona

**Overhead Mínimo**: Vision é projetado para ser leve. Contextos são apenas objetos com metadados. Sem instrumentação pesada ou impacto na performance.

**Integração Natural**: Não muda como você escreve código — ele o aprimora. O padrão `observe` é natural e torna seu código mais legível.

**Insights Poderosos**: Como toda operação é envolvida e enriquecida com contexto, você obtém traces incrivelmente detalhados que contam a história completa do que aconteceu.

**Segurança de Produção**: Recursos incorporados como circuit breakers, retries e redação de segurança significam que você pode confiar nele em produção desde o primeiro dia.

**Arquitetura Flexível**: O sistema de exportadores significa que você pode enviar dados para qualquer lugar — múltiplos destinos, transformações personalizadas, formatos diferentes.

## O Quadro Geral

Não estamos tentando reinventar observabilidade. Existem ferramentas fantásticas por aí — Datadog, New Relic, Honeycomb, Jaeger. O que estamos tentando fazer é tornar mais fácil obter dados de alta qualidade nessas ferramentas.

Vision é nossa melhor tentativa de resolver um problema que enfrentamos repetidamente: **como você constrói aplicações que são observáveis por design?** Não é perfeito, e não é mágica. É apenas o que aprendemos que funciona bem para construir sistemas que você pode entender e debuggar.

Se você está construindo aplicações Node.js que precisam funcionar de forma confiável em produção, dê uma chance ao Vision. Comece pequeno — envolva algumas operações críticas, adicione um exportador, veja que insights você obtém. Pensamos que você descobrirá que torna debuggar e entender seus sistemas significativamente mais fácil.

## Comece (Sério, É Assim Fácil)

Para aplicações Express (mais comum):

```bash
npm install @rodrigopsasaki/vision @rodrigopsasaki/vision-express
```

```typescript
// No seu server.ts ou app.ts
import { vision } from '@rodrigopsasaki/vision';
import { visionMiddleware } from '@rodrigopsasaki/vision-express';

// Configuração (faça isso uma vez)
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

// Isso é tudo! Todo endpoint agora é rastreado.
// Nas suas rotas, apenas adicione dados:
app.get('/users/:id', async (req, res) => {
  vision.set('user_id', req.params.id);
  const user = await getUser(req.params.id);
  res.json(user);
});
```

**Pronto.** Você agora está capturando dados de observabilidade estruturados para toda requisição HTTP. Nenhuma configuração adicional necessária. A partir daqui, você pode adicionar exportadores mais sofisticados (como Datadog), mas a funcionalidade central já está funcionando.

Porque no final do dia, todos nós estamos apenas tentando construir software que funciona. Vision é nossa tentativa de tornar isso um pouco mais fácil.