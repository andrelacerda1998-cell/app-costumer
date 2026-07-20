# iOS Production Build Guide - Piquet Customer App

Guia passo-a-passo para gerar o build iOS de **produção** localmente, usando o **Xcode** (sem EAS).

---

## ⚙️ Como o ambiente é escolhido

O `app.config.ts` decide o ambiente pelo `APP_ENV`:

| Ambiente | Nome do App | Bundle Identifier | API Endpoint |
|----------|-------------|-------------------|--------------|
| Production | Piquet | `com.piquetapp.customer` | `app.piquetapp.com` |
| Preview | Piquet Preview | `com.piquetapp.customer.preview` | `piquet.rwinteractive.net` |
| Development | Piquet Development | `com.piquetapp.customer.development` | Do teu `.env` |

⚠️ **Precedência dos ficheiros `.env` (Expo):** `.env.local` ganha ao `.env.production`. Se o `.env.local` tiver `APP_ENV=preview`, o Archive no Xcode embute a API de preview no bundle JS **mesmo com o bundle id de produção correto**. Foi esta a causa de builds "de produção" saírem apontando para preview. O `APP_ENV` foi removido do `.env.local` — não o voltes a adicionar lá.

---

## 🛠 Pré-requisitos

1. **Xcode** atualizado (via App Store)
2. **Conta Apple Developer** no team `Z7V222283F` (definido em `app.config.ts`), com certificado de distribuição e acesso ao App Store Connect
3. **CocoaPods** instalado (`pod --version`)
4. **Dependências instaladas**: `yarn install`

---

## 🚀 Passo a passo

### Passo 1 — Confirmar o ambiente resolvido

Antes de gerar qualquer coisa, valida que a config de produção está correta:

```bash
cd app-costumer
APP_ENV=production npx expo config --type public | grep -E '"name"|bundleIdentifier|API_URL'
```

**Esperado:**
- `"name": "Piquet"` (sem "Preview")
- `"bundleIdentifier": "com.piquetapp.customer"` (sem sufixo)
- `"API_URL": "app.piquetapp.com"`

Se aparecer "Piquet Preview" ou `piquet.rwinteractive.net`, verifica se o `.env.local` tem um `APP_ENV` a mais.

### Passo 2 — Prebuild de produção

```bash
yarn build-local:ios:production
```

Este comando regenera a pasta `ios/` com a configuração de produção (`expo prebuild --platform ios --clean`, que também corre `pod install`) e abre o `ios/Piquet.xcworkspace` no Xcode.

**Validar:**
```bash
grep -m1 PRODUCT_BUNDLE_IDENTIFIER ios/Piquet.xcodeproj/project.pbxproj
# Esperado: PRODUCT_BUNDLE_IDENTIFIER = com.piquetapp.customer;
```

### Passo 3 — Versão e build number

- **Versão (Marketing Version)**: vem do `version` no `package.json` (ex.: `2026.7.2`). Atualiza lá antes do prebuild se necessário.
- **Build number**: ⚠️ o prebuild reseta o `CURRENT_PROJECT_VERSION` para `1`. Antes de submeter, incrementa no Xcode: target **Piquet** → **General** → **Identity** → campo **Build**. O App Store Connect rejeita uploads com versão+build duplicados.

### Passo 4 — Archive no Xcode

1. Abre o `ios/Piquet.xcworkspace` (⚠️ sempre o `.xcworkspace`, nunca o `.xcodeproj`)
2. Seleciona o scheme **Piquet** e o destino **Any iOS Device (arm64)**
3. Target Piquet → **Signing & Capabilities**: team `Z7V222283F` com **Automatically manage signing** ativo
4. Menu **Product → Archive** e aguarda (o bundling JS acontece nesta fase — é aqui que o `APP_ENV` importa)

### Passo 5 — Distribuir

1. Quando o Archive termina, abre o **Organizer** (Window → Organizer)
2. Seleciona o archive → **Distribute App**
3. Escolhe **App Store Connect** → **Upload**
4. Segue o wizard (signing automático) e conclui o upload
5. O build aparece no App Store Connect → TestFlight em ~10-30 min (processamento da Apple)

---

## ✅ Validação pós-build

Confirma que o build é mesmo de produção:

1. **No Organizer**: bundle id `com.piquetapp.customer` e nome **Piquet** (sem "Preview")
2. **No TestFlight/dispositivo**: o ícone chama-se "Piquet"; faz login e confirma que os dados são os de produção (API `https://app.piquetapp.com`)

**Sintomas de build de preview** (algo correu mal):
- Nome "Piquet Preview" ou bundle id com `.preview`
- Login mostra dados do servidor de teste (`piquet.rwinteractive.net`)

---

## 🐛 Troubleshooting

### Build aponta para preview
- Verifica se o `.env.local` (ou `.env`) tem `APP_ENV=preview` — remove-o
- ⚠️ Exportar `APP_ENV` no terminal **não** afeta o Archive feito pela GUI do Xcode; são os ficheiros `.env` que mandam na fase de bundling. Com `NODE_ENV=production` (Release), o `.env.production` aplica-se — desde que o `.env.local` não o sobreponha
- Refaz o prebuild: `yarn build-local:ios:production`

### Erros de signing
- Confirma que estás autenticado no Xcode com a conta do team `Z7V222283F` (Xcode → Settings → Accounts)
- Ativa "Automatically manage signing" e deixa o Xcode criar o provisioning profile

### Erros de pods
```bash
cd ios && pod install && cd ..
```

### Limpar tudo e recomeçar
```bash
yarn prebuild:clean          # remove android/ e ios/
yarn build-local:ios:production
```

---

## 📋 Comandos disponíveis

```bash
# Produção (regenera ios/ e abre o Xcode)
yarn build-local:ios:production

# Preview (para testes com o servidor de preview)
yarn build-local:ios:preview

# Só o prebuild, com o ambiente que estiver nos .env
yarn prebuild:ios
```

---

**Para builds Android, ver `BUILD_GUIDE.md` e `QUICK_BUILD_REFERENCE.md`.**
