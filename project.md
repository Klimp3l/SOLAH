# 🛍️ E-commerce de SOLAH (vestimenta moda praia feminina) (MVP)

---

## 🎯 Objetivo

Construir um e-commerce simples, escalável e bem estruturado, com:

* Boas práticas de engenharia
* Priorizando sempre a construção de testes antes das telas
* Arquitetura em camadas
* Suporte a múltiplas imagens por produto
* Checkout manual via WhatsApp
* Autenticação com Google

---

## 🧱 Stack Tecnológica

* Framework: Next.js (App Router)
* Deploy: Vercel
* Backend / DB / Auth / Storage: Supabase
* Estilo: TailwindCSS
* Email: Resend
* Banco: PostgreSQL

---

## 🔐 Autenticação

* Supabase Auth
* **Apenas Google OAuth**
* Sem email/senha

---

## 🧠 Arquitetura (Camadas)

```id="arc201"
UI (Pages / Components)
↓
Services (Regras de negócio)
↓
Repositories (Acesso a dados)
↓
Supabase
```

---

## 📁 Estrutura do Projeto

```id="arc202"
/app
  /(store)
  /(admin)

/components

/lib
  /services
    order.service.ts
    product.service.ts

  /repositories
    order.repository.ts
    product.repository.ts

  /adapters
    email.adapter.ts
    whatsapp.adapter.ts

  /events
    order.events.ts

  /factories
    order.factory.ts

  /guards
    auth.guard.ts

/types
```

---

## 🧠 Design Patterns Obrigatórios

* Service Layer
* Repository Pattern
* Adapter Pattern
* Event Pattern
* Guard Pattern
* Factory Pattern

---

## ⚠️ Regras de Arquitetura

### ❌ Proibido:

* Acessar banco direto na UI
* Lógica de negócio no frontend

### ✅ Obrigatório:

* UI → Services
* Services → Repositories
* Integrações → Adapters

---

## 🧠 Modelagem do Banco

### products

* id
* name
* description
* price
* active
* created_at

---

### product_images

* id
* product_id (FK)
* url
* position (ordem da imagem)
* created_at

---

### orders

* id
* user_id
* total
* status
* tracking_code
* created_at

---

### order_items

* id
* order_id
* product_id
* quantity
* price

---

### users

* id
* email
* name
* role (admin | user)
* created_at

---

## 🖼️ Imagens de Produto

### Regras:

* Produto deve ter **1 ou mais imagens**
* `position = 0` → imagem principal
* Ordenação deve ser respeitada

---

## 🧠 Repository Example (Produto com imagens)

```ts id="arc203"
export async function getProductWithImages(id: string) {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (*)
    `)
    .eq("id", id)
    .single()
}
```

---

## 🧱 Service Example (Criação com imagens)

```ts id="arc204"
export async function createProduct(data, images) {
  const product = await productRepository.insert(data)

  await productRepository.insertImages(product.id, images)

  return product
}
```

---

## 🔄 Status de Pedido

```id="arc205"
aguardando_pagamento
aguardando_comprovante
pago
em_producao
enviado
entregue
cancelado
```

---

## 🛒 Carrinho

* localStorage

### Regras:

* Validar no backend
* Recalcular total

---

## 💳 Checkout (Pix via WhatsApp)

### Regras:

* NÃO gerar QR Code
* NÃO usar gateway

---

## 🔁 Fluxo

1. Criar pedido
2. Status: `aguardando_pagamento`
3. Gerar link WhatsApp
4. Usuário envia comprovante
5. Admin valida

---

## 📲 WhatsApp Adapter

```ts id="arc206"
export function generateWhatsAppLink(orderId: string): string {
  return `https://wa.me/SEU_NUMERO?text=Olá,%20realizei%20o%20pedido%20#${orderId}%20e%20segue%20o%20comprovante.`
}
```

---

## 📧 Emails

Eventos:

* Pedido criado
* Pagamento confirmado
* Pedido enviado

---

## 🔔 Events

```ts id="arc207"
onOrderCreated(order)
onPaymentConfirmed(order)
onOrderShipped(order)
```

---

## 🔐 Guards

* Apenas admin acessa `/admin`

---

## 🚚 Rastreio

* Campo: `tracking_code`
* Atualiza status → `enviado`
* Dispara email

---

## 🚀 Etapas

### Fase 1

* Setup + Auth

### Fase 2

* Produtos + imagens

### Fase 3

* Carrinho

### Fase 4

* Checkout + WhatsApp

### Fase 5

* Admin

### Fase 6

* Emails

---

## ⚠️ Regras IMPORTANTES

* Login apenas Google
* Checkout manual
* Admin valida pagamento
* Produto deve ter imagem

---

## 💡 Futuro

* Gateway pagamento
* Abandono carrinho
* Analytics

---

## 🧠 Filosofia

* Simples
* Escalável
* Bem estruturado

---

## 📌 Regras para IA

* Seguir arquitetura
* Não quebrar camadas
* Não simplificar errado (ex: images em array)
* Manter código limpo
