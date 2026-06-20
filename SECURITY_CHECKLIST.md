# SECURITY_CHECKLIST.md

## Scanner de Vulnerabilidades — Comandos

Execute estes comandos regularmente para manter o projeto seguro.

---

### 1. npm audit (já incluído — gratuito)

```bash
# Ver vulnerabilidades no projeto
npm audit

# Ver com detalhe
npm audit --audit-level=high

# Gerar relatório JSON (para CI/CD)
npm audit --json > audit-report.json

# Corrigir automaticamente o que dá
npm audit fix

# Atenção: rever SEMPRE o que o audit fix vai mudar
npm audit fix --dry-run
```

**Quando:** antes de cada deploy, ou no mínimo semanal.

**O que faz:** verifica se alguma das tuas dependências tem vulnerabilidades conhecidas na base de dados do npm.

---

### 2. Snyk (conta gratuita — mais completo)

```bash
# Instalar
npm install -g snyk

# Autenticar (criar conta em https://snyk.io)
snyk auth

# Testar o projeto
snyk test

# Monitor (receber alertas)
snyk monitor

# Testar sem fazer fetch do registry (offline)
snyk test --offline
```

**Quando:** semanal, e sempre que adicionar nova dependência.

**O que faz:** análise profunda, inclui vulnerabilidades no código aberto das tuas dependências (não só no package.json).

---

### 3. NSP (Node Security Platform)

```bash
# Alternativa ao Snyk
npm install -g nsp

# Ver vulnerabilidades
nsp check
```

---

### 4. Bundlephobia (tamanho das dependências)

```bash
# Ver tamanho de cada dependência
npx bundlephobia-cli react
npx bundlephobia-cli stripe

# Cuidado com packages > 1MB que fazem download no browser
```

---

## Comandos de Higiene de Segurança

```bash
# ── Verificar packages desatualizados ──────────────────────────────────
npm outdated

# ── Ver packages que não são usados ──────────────────────────────────
npm install -g depcheck
depcheck

# ── Remover packages órfãos ───────────────────────────────────────────
npm prune

# ── Ver todas as versões exatas no lock file ─────────────────────────
npm ls --depth=0

# ── Ver packages com licenças problemáticas ─────────────────────────
npx license-checker --onlyAllow="MIT;ISC;BSD-3-Clause;Apache-2.0"
```

---

## Checklist de Segurança — Antes de Deploy

- [ ] `npm audit` passa sem vulnerabilidades HIGH/CRITICAL
- [ ] `npm run build` passa
- [ ] Nenhum secret no código; validar com Gitleaks e `npm run security:public-secrets`
- [ ] CSP headers ativos em produção
- [ ] Rate limiting configurado
- [ ] `.env` não está no git (verificar .gitignore)
- [ ] Dependabot está ativo no repositório GitHub
- [ ] Última verificação Snyk foi feita há < 7 dias

---

## Configurar GitHub Secrets para CI/CD

No repositório GitHub → Settings → Secrets → Actions / Environments:

```text
STRIPE_SECRET_KEY=<configure-no-provider-secret-store>
STRIPE_WEBHOOK_SECRET=<configure-no-provider-secret-store>
NEXT_PUBLIC_APP_URL=<configure-no-provider-variable-store>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<configure-no-provider-variable-store>
AUTH_SECRET=<configure-no-provider-secret-store>
```

**Nunca ponha valores reais no código, em docs, em screenshots versionadas ou no .git.** Use apenas provider secret stores e evidências redigidas no repositório.

---

## GitHub Actions — Pipeline de Segurança

Criar ou manter workflow dedicado de segurança:

```yaml
name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # Audit de vulnerabilidades
      - run: npm audit --audit-level=high
        continue-on-error: true  # Não bloqueia, mas alerta

      # Build
      - run: npm run build

      # Snyk opcional. Configure o token apenas em GitHub Secrets.
      # - uses: snyk/actions/node@master
      #   env:
      #     SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## .gitignore — Verificar que não inclui secrets

O teu `.gitignore` deve incluir:

```text
# Environment
.env
.env.local
.env.development
.env.production
*.env*

# Logs
*.log
npm-debug.log*

# Secrets (se guardado em ficheiros)
*.pem
*.key
credentials.json
service-account.json
```
