# Guia de Migração JavaScript → TypeScript

## Situação Atual

O EuroComply AI é 100% TypeScript. Este guia serve para:
- Novos membros da equipa que precisam de migrar código JS herdado
- Quando se adiciona bibliotecas que usam `require` ou CommonJS
- Referência rápida de padrões de tipagem usados no projeto

---

## 1. tsconfig.json — O que cada opção faz

```jsonc
{
  "compilerOptions": {
    // Permite importar .js sem tipar imediatamente (primeiro passo)
    "allowJs": true,

    // NÃO verifica tipos em .js — só em .ts
    // Mude para true depois de tipar tudo
    "checkJs": false,

    // O modo strict completo (ative aos poucos):
    "strict": true,
    "strictNullChecks": true,  // null/undefined tratados como tais
    "noImplicitAny": true,     // nenhuma variável 'any' implícita
    "noImplicitThis": true,    // this não pode ser 'any'

    // Para modules: Next.js usa ESM
    "module": "esnext",
    "moduleResolution": "bundler",

    // Permite require() de módulos CommonJS
    "esModuleInterop": true,

    // TypeScript não compila, só verifica (Next.js faz o build)
    "noEmit": true,
    "incremental": true,
  }
}
```

---

## 2. Comandos para instalar TypeScript

```bash
# Já estão no package.json como devDependencies:
npm install --save-dev typescript @types/node

# Se usar Express:
npm install --save-dev @types/express

# Se usar React com DOM:
npm install --save-dev @types/react @types/react-dom

# Verificar versão instalada:
npx tsc --version
```

---

## 3. Script de Migração

```bash
# Dê permissão de execução:
chmod +x scripts/migrate-js-to-ts.sh

# Testar sem alterar nada (dry-run):
./scripts/migrate-js-to-ts.sh --dry-run

# Migrar só uma pasta:
./scripts/migrate-js-to-ts.sh --folder=src/lib

# Migrar tudo:
./scripts/migrate-js-to-ts.sh
```

---

## 4. Exemplo Completo — Tipar a Rota de Checkout

### Antes (JavaScript)

```js
// route.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const { plan, workspaceId } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  const { data: user } = await supabase.auth.getUser(token);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan, quantity: 1 }],
    metadata: { userId: user.id, workspaceId },
  });

  res.json({ url: session.url });
};
```

### Depois (TypeScript)

```ts
// route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/integrations/supabase/server';
import {
  CheckoutRequestBody,
  CheckoutResponse,
  Plan,
  isValidPlan,
} from '@/lib/stripe-types-example';

// ── 1. Tipar o price ID por plano ─────────────────────────────────
const PRICE_IDS: Record<Plan, string> = {
  starter:    process.env.STRIPE_STARTER_PRICE_ID!,
  growth:     process.env.STRIPE_GROWTH_PRICE_ID!,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
};

// ── 2. Função helper tipada para autenticar ───────────────────────
async function authenticate(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const token = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim();

  if (!token) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }

  return { userId: data.user.id };
}

// ── 3. Handler tipado ─────────────────────────────────────────────
export async function POST(
  request: NextRequest
): Promise<NextResponse<CheckoutResponse>> {
  // Validar body
  let body: CheckoutRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Body inválido' },
      { status: 400 }
    );
  }

  const { plan, workspaceId } = body;

  if (!isValidPlan(plan)) {
    return NextResponse.json(
      { error: 'Plano inválido' },
      { status: 400 }
    );
  }

  // Autenticar
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  // Lógica de negócio...
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    metadata: {
      userId: auth.userId,
      workspaceId: workspaceId ?? '',
      plan,
    },
  });

  return NextResponse.json({ url: session.url!, sessionId: session.id });
}
```

---

## 5. CommonJS vs ESM — Como Migrar

### O problema

```js
// ❌ CommonJS — funciona em .js mas não em .ts com ESM
const Stripe = require('stripe');
module.exports = handler;

// ✅ ESM — funciona em .ts
import Stripe from 'stripe';
export default handler;
```

### Padrão usado no EuroComply AI

Todos os ficheiros usam **import/export ESM** (padrão Next.js):

```ts
// imports
import Stripe from 'stripe';
import { supabase } from '@/integrations/supabase/client';
import { type Plan } from '@/lib/stripe-types-example';

// exports
export default function handler() { ... }
export function helper() { ... }
```

### Se tiver require() legado

```ts
// ❌ Evitar:
const fs = require('fs');

// ✅ Preferir:
import fs from 'fs';
```

### Para bibliotecas que só têm CommonJS

Com `esModuleInterop: true` no tsconfig:

```ts
// Funciona mesmo que a biblioteca use module.exports
import Stripe from 'stripe';  // mesmo que seja CommonJS internamente
```

---

## 6. Checklist de Validação

Execute depois de cada migração:

```bash
# 1. TypeScript compila sem erros
npx tsc --noEmit

# 2. Build passa
npm run build

# 3. Dev server inicia
npm run dev

# 4. Sem erros de тип в консоли (abra DevTools no browser)
#    Depois de fazer login e navegar nas páginas críticas:
#    - /dashboard
#    - /dashboard/inventario
#    - /dashboard/transparencia
```

### Checklist crítico — NÃO fazer merge se:

- `npx tsc --noEmit` mostra erros de tipo
- `npm run build` falha
- Erros `require is not defined` ou `Cannot use import`
- Erros 500 nas rotas API (verifique os logs do dev server)

### Como resolver problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `require is not defined` | Ficheiro .js a usar CommonJS | Renomeie para .ts e mude para `import` |
| `Cannot use import outside a module` | Sem `"type": "module"` no package.json ou import num .js | Adicione `import` ou renomeie para .ts |
| `Type error: Object is possibly 'null'` | `strictNullChecks: true` ativo | Use `?.` ou `!` só quando souber que existe |
| `Type error: Argument of type 'any'` | `noImplicitAny: true` ativo | Dê o tipo explícito |
| `Module not found` | Import com caminho errado | Use `@/` alias com paths no tsconfig |

---

## 7. Ordem Sugerida de Migração

Se tivesse código JS legacy, migre nesta ordem (prioridade):

1. **Rotas API** (`src/app/api/`) — mais críticas, tipar primeiro
2. **Funções de banco** (`src/lib/`) — usado em todo o lado
3. **Hooks** (`src/hooks/`) — usados em todo o lado
4. **Types** (`src/types/` ou `src/lib/`) — interfaces centrais
5. **Componentes UI** (`src/components/`) — mais trabalho, menos urgente
6. **Configurações** (`src/config/`) — globais

Regra: migre o que é mais chamado antes do que é mais complexo.
