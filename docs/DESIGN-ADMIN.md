# Design do painel administrativo

Guia visual do `apps/admin`. Vale para todos os clientes (é parte do **núcleo**). O visual do site público fica em `docs/DESIGN-WEB.md` e no `theme.css` de cada cliente.

**Referência:** o layout do template [TailwindAdmin React (versão gratuita)](https://react-free.tailwind-admin.com/), analisado em nov/2026. Mantemos a estrutura e o clima visual dele, com cores ajustadas para passar no contraste mínimo de acessibilidade (WCAG AA). Não copiamos marca, ilustrações nem textos do template.

**Base técnica:** componentes do [shadcn/ui](https://ui.shadcn.com/) sobre Tailwind CSS v4. As cores abaixo usam os nomes de variáveis do shadcn, então os componentes já saem no estilo certo sem classes extras.

## 1. Clima visual

- **Claro, limpo e plano.** Fundo branco, cartões brancos com borda fina, quase nenhuma sombra.
- **Um azul como cor de ação.** Botão principal, item ativo do menu, links e foco.
- **Cores de status em tons suaves.** Etiquetas e cartões de resumo usam fundo claro com texto escuro da mesma cor.
- **Menu lateral fixo** com grupos em caixa alta, e cabeçalho simples com busca e menu do usuário.
- **Densidade média.** O painel é ferramenta de trabalho: telas compactas, mas com respiro de 24px entre blocos.

## 2. Cores

### Tema claro (padrão)

| Variável (shadcn)              | Valor     | Uso                                               |
| ------------------------------ | --------- | ------------------------------------------------- |
| `--background`                 | `#ffffff` | Fundo das páginas                                 |
| `--foreground`                 | `#1c2536` | Texto principal e títulos                         |
| `--card`                       | `#ffffff` | Cartões                                           |
| `--card-foreground`            | `#1c2536` | Texto nos cartões                                 |
| `--popover`                    | `#ffffff` | Menus suspensos, seletores                        |
| `--popover-foreground`         | `#1c2536` |                                                   |
| `--primary`                    | `#3a66e8` | Botão principal, item ativo do menu, links, foco  |
| `--primary-foreground`         | `#ffffff` | Texto sobre o azul                                |
| `--secondary`                  | `#edf2fe` | Botão secundário (fundo azul bem claro)           |
| `--secondary-foreground`       | `#2f55c9` | Texto do botão secundário                         |
| `--muted`                      | `#f4f7fb` | Fundos neutros: cabeçalho de tabela, áreas vazias |
| `--muted-foreground`           | `#5a6a85` | Texto de apoio: subtítulos, datas, legendas       |
| `--accent`                     | `#edf2fe` | Fundo ao passar o mouse em itens de menu e listas |
| `--accent-foreground`          | `#2f55c9` |                                                   |
| `--destructive`                | `#dc2626` | Excluir, erros                                    |
| `--border`                     | `#dfe5ef` | Bordas de cartões, divisórias, linhas de tabela   |
| `--input`                      | `#8591a6` | Borda dos campos de formulário                    |
| `--ring`                       | `#3a66e8` | Anel de foco (usado a 50% de opacidade)           |
| `--sidebar`                    | `#ffffff` | Fundo do menu lateral                             |
| `--sidebar-foreground`         | `#2a3547` | Itens do menu                                     |
| `--sidebar-primary`            | `#3a66e8` | Item ativo                                        |
| `--sidebar-primary-foreground` | `#ffffff` |                                                   |
| `--sidebar-accent`             | `#edf2fe` | Item ao passar o mouse                            |
| `--sidebar-accent-foreground`  | `#2f55c9` |                                                   |
| `--sidebar-border`             | `#dfe5ef` |                                                   |

### Cores de status

Cada status tem uma cor de **destaque** (ícones, gráficos, bolinhas) e uma cor de **texto** (legível sobre branco e sobre o fundo claro do próprio status). Fundo claro = a cor de destaque a 12% de opacidade.

| Status   | Destaque  | Texto     | Exemplos de uso                        |
| -------- | --------- | --------- | -------------------------------------- |
| Sucesso  | `#13deb9` | `#0b7d68` | "Publicado", "Salvo"                   |
| Aviso    | `#f6b51e` | `#8a5a00` | "Rascunho", "Não lido"                 |
| Erro     | `#ef4444` | `#b91c1c` | Falha no envio, campo inválido         |
| Info     | `#8754ec` | `#6d3fd6` | "Agendado", dicas                      |
| Destaque | `#49beff` | `#0b6fa8` | Faixa de título das páginas, novidades |

> **Regra:** nunca use a cor de destaque como texto sobre fundo claro. `#13deb9` sobre branco tem contraste de 1,7, ilegível.

### Tema escuro (opcional)

Os valores ficam prontos para quando o painel ganhar a troca de tema. Não é prioridade.

| Variável                 | Valor     | Observação                                                                                                                |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--background`           | `#1c2536` |                                                                                                                           |
| `--foreground`           | `#f1f5f9` |                                                                                                                           |
| `--card`                 | `#1c2536` | Mesmo do fundo; o cartão se separa pela borda                                                                             |
| `--popover`              | `#2a3851` |                                                                                                                           |
| `--primary`              | `#7da0ff` | Azul mais claro, com texto escuro                                                                                         |
| `--primary-foreground`   | `#0f1a33` |                                                                                                                           |
| `--secondary`/`--accent` | `#2a3851` | Texto `#c7d5ff`                                                                                                           |
| `--muted`                | `#2a3851` |                                                                                                                           |
| `--muted-foreground`     | `#94a5c2` |                                                                                                                           |
| `--destructive`          | `#f87171` | Como texto. O botão do shadcn já usa o vermelho a 60% (`dark:bg-destructive/60`), o que dá contraste 5,4 com texto branco |
| `--border`               | `#333f55` |                                                                                                                           |
| `--input`                | `#6b7a96` |                                                                                                                           |
| `--sidebar`              | `#1c2536` | Itens em `#94a5c2`; ativo em `--primary`                                                                                  |

No escuro, as cores de status usam o **destaque** como texto (`#13deb9`, `#f6b51e`, `#f87171`…), com fundo a 20% de opacidade.

### O que mudou em relação ao template

| Template                                  | Aqui                   | Motivo                                         |
| ----------------------------------------- | ---------------------- | ---------------------------------------------- |
| Azul `#5d87ff` com texto branco (3,3)     | `#3a66e8` (4,95)       | Contraste mínimo para texto é 4,5              |
| Texto de apoio `#5a6a85` a 75% (3,3)      | `#5a6a85` sólido (5,5) | Idem                                           |
| Status como texto (1,7 a 3,8)             | Coluna "Texto" acima   | Idem                                           |
| Borda de campo `#dfe5ef` (1,3)            | `#8591a6` (3,0)        | A borda do campo precisa de 3:1 para ser vista |
| Foco a 12% de opacidade (quase invisível) | Anel de 3px a 50%      | Navegação por teclado                          |
| Campos de 40px e seletores de 36px        | Todos com 40px         | Consistência                                   |

## 3. Tipografia

- **Fonte:** DM Sans, para tudo. Instalada no próprio painel com `@fontsource-variable/dm-sans` (sem chamar o Google Fonts: o painel funciona offline e não expõe o usuário a terceiros).
- **Pesos:** 400 (texto), 500 (rótulos e botões), 600 (títulos). Nada de 700+, exceto nos rótulos de grupo do menu.
- **Tamanho base:** 14px. O painel é denso; 16px fica só para o texto do editor de posts.

| Papel                     | Tamanho | Peso | Altura de linha | Classe Tailwind               |
| ------------------------- | ------- | ---- | --------------- | ----------------------------- |
| Título da página          | 20px    | 600  | 28px            | `text-xl font-semibold`       |
| Título de cartão          | 18px    | 600  | 28px            | `text-lg font-semibold`       |
| Valor em cartão de resumo | 18px    | 600  | 28px            | `text-lg font-semibold`       |
| Texto padrão, células     | 14px    | 400  | 20px            | `text-sm`                     |
| Rótulo de campo, botão    | 14px    | 500  | 20px            | `text-sm font-medium`         |
| Cabeçalho de tabela       | 14px    | 500  | 20px            | `text-sm font-medium`         |
| Etiqueta (badge), legenda | 12px    | 500  | 16px            | `text-xs font-medium`         |
| Rótulo de grupo do menu   | 12px    | 700  | 16px            | `text-xs font-bold uppercase` |
| Texto do editor de posts  | 16px    | 400  | 28px            | `text-base leading-7`         |

## 4. Espaçamento e layout

- **Unidade base:** 4px (escala padrão do Tailwind).
- **Espaço entre blocos da página:** 24px (`gap-6`).
- **Respiro interno dos cartões:** 24px (`p-6`).
- **Margem da área de conteúdo:** 24px (`p-6`) no computador, 16px (`p-4`) no celular.
- **Grade:** 12 colunas com `gap-6`. Exemplos: formulário de 8 colunas + lateral de 4; cartões de resumo em 2 / 3 / 4 por linha.

### Estrutura da tela

```
┌──────────────┬───────────────────────────────────────────────┐
│ Logo         │ [Busca]                      [tema] [usuário] │ ← cabeçalho 72px
│              ├───────────────────────────────────────────────┤
│ SEÇÕES       │ ┌───────────────────────────────────────────┐ │
│ ▣ Hero       │ │ Título da página                          │ │ ← faixa de título
│ ▢ Sobre      │ │ Início • Seções • Hero                    │ │
│ BLOG         │ └───────────────────────────────────────────┘ │
│ ▢ Posts      │ ┌─────────────────────────┐ ┌───────────────┐ │
│ FORMULÁRIOS  │ │ Cartão principal        │ │ Cartão lateral│ │
│ ▢ Contato    │ │                         │ │               │ │
│ ARQUIVOS     │ └─────────────────────────┘ └───────────────┘ │
│ ▢ Mídia      │                                               │
│ ──────────── │                                               │
│ usuário@...  │                                               │
└──────────────┴───────────────────────────────────────────────┘
  menu 272px
```

### Telas pequenas

- **Abaixo de 1024px** (`lg`): a grade de 12 colunas vira uma coluna (o cartão lateral desce).
- **Abaixo de 768px** (`md`): o menu lateral vira uma gaveta (componente `Sidebar` do shadcn em modo `offcanvas`), aberta pelo botão de menu no cabeçalho; tabelas rolam na horizontal dentro do cartão.
- Alvos de toque com no mínimo 40px de altura.

## 5. Formas e elevação

| Raio            | Valor  | Uso                                                               |
| --------------- | ------ | ----------------------------------------------------------------- |
| `--radius`      | `10px` | Base do shadcn                                                    |
| `rounded-lg`    | `10px` | Cartões, faixa de título, caixas de diálogo                       |
| `rounded-md`    | `8px`  | Botões, campos, seletores, itens do menu, miniaturas              |
| `rounded-sm`    | `6px`  | Elementos internos pequenos                                       |
| `rounded-[4px]` | `4px`  | Caixa de seleção (checkbox)                                       |
| `rounded-full`  | —      | Etiquetas, avatares, botões só com ícone nas tabelas, interruptor |

- **Sem sombra** em cartões, menu e cabeçalho: a separação vem da borda `--border`.
- **Sombra só no que flutua:** menus suspensos, seletores e diálogos (`shadow-md`/`shadow-lg`, o padrão do shadcn).
- **Foco:** `ring-[3px] ring-ring/50` em todo elemento interativo (padrão do shadcn). Nunca remover o foco.

## 6. Componentes

Todos vêm do shadcn (`apps/admin/src/core/ui/`). Abaixo, só o que muda em relação ao padrão dele.

### Menu lateral (`Sidebar`)

- Largura 272px (`--sidebar-width: 17rem`), fundo `--sidebar`, borda direita `--sidebar-border`.
- Logo no topo, com 72px de altura (alinhado ao cabeçalho).
- **Rótulo de grupo:** 12px, peso 700, caixa alta, cor `--sidebar-foreground`, 20px acima de cada grupo. Grupos atuais: Seções do site, Blog, Formulários, Arquivos, Configurações.
- **Item:** altura 40px, `p-2.5`, `gap-3`, ícone de 18px, texto 14px, raio 8px.
  - Normal: texto `--sidebar-foreground`.
  - Mouse em cima: fundo `--sidebar-accent`, texto `--sidebar-accent-foreground`.
  - **Ativo:** fundo `--sidebar-primary` (azul cheio), texto branco.
- **Rodapé do menu:** e-mail do usuário (texto de apoio), "Trocar senha" e "Sair".

### Cabeçalho

- Altura 72px, fundo `--background`, sem borda nem sombra.
- Esquerda: botão do menu (só em telas pequenas). Quando o painel tiver busca: campo de 320px, altura 40px, raio 12px, ícone de lupa dentro.
- Direita: troca de tema (quando existir) e avatar de 36px com menu (`DropdownMenu`): e-mail, Trocar senha, Sair.
- Indicador de carregamento entre páginas: barra fina de 2px no topo, em `--primary`.

### Faixa de título da página

Abre toda página interna.

- Fundo: Destaque `#49beff` a 12% (`bg-[#49beff]/12`), raio 10px, `px-6 py-4`, sem borda.
- Título da página (20px/600) + trilha de navegação (`Breadcrumb`, 14px, `--muted-foreground`, separador "•").
- Ações da página (ex.: "Novo post") alinhadas à direita.
- **Sem ilustração**: o template usa uma figura 3D; aqui o espaço fica para as ações.

### Cartão (`Card`)

- Fundo `--card`, borda 1px `--border`, raio 10px, `p-6`, `gap-6`, sem sombra.
- Cabeçalho: título 18px/600 + subtítulo opcional 14px `--muted-foreground`; ações à direita.

### Cartão de resumo

Para números rápidos (posts publicados, mensagens novas, arquivos de mídia).

- Fundo da cor de status a 10–12%, sem borda, raio 10px, `p-6`, conteúdo centralizado.
- Ícone de 32px na cor de destaque, rótulo 14px/600 e valor 18px/600, os dois na cor de **texto** do status.

### Botão (`Button`)

- Altura 40px (`h-10`), `px-5`, raio 8px, texto 14px/500, ícone de 16px.
- Variantes:
  - `default`: azul cheio. **No máximo um por área** (ex.: "Salvar").
  - `secondary`: fundo azul claro, texto azul.
  - `outline`: borda `--border`, fundo transparente.
  - `ghost`: só texto, fundo no hover.
  - `destructive`: vermelho cheio, só dentro do diálogo de confirmação.
- Botão só com ícone: 40×40px (`size="icon"`), sempre com `aria-label`.
- Carregando: spinner no lugar do ícone, botão desabilitado, texto mantido ("Salvando…").

### Ações em linhas de tabela

- Botões redondos de 32px, só com ícone e fundo do status a 12%: editar em azul, excluir em vermelho.
- Sempre com `aria-label` e dica (`Tooltip`).
- Excluir sempre abre um `AlertDialog` de confirmação.

### Campos de formulário (`Input`, `Textarea`, `Select`)

- Altura 40px (textarea com no mínimo 96px), `px-3 py-2`, raio 8px, borda `--input`, fundo transparente, texto 14px.
- Texto de exemplo (placeholder) em `--muted-foreground`.
- **Rótulo** acima do campo, 14px/500, 8px de distância. Ajuda abaixo, 12px `--muted-foreground`.
- Foco: borda `--ring` + anel de 3px a 50%.
- Erro: borda `--destructive` + mensagem abaixo em `#b91c1c` (12px), com `aria-invalid` e `aria-describedby`.
- Espaço entre campos: 20px (`gap-5`).
- Grupo com ícone (e-mail, telefone, site): ícone de 16px dentro do campo, à esquerda, em `--muted-foreground`.

### Caixa de seleção e interruptor (`Checkbox`, `Switch`)

- Checkbox 16px, raio 4px; marcado em `--primary`.
- Interruptor 32×18px; ligado em `--primary`. Use para ligar e desligar algo na hora (ex.: "Seção visível no site").

### Tabela (`Table`)

- Fica dentro de um cartão, com borda 1px `--border` e raio 8px.
- Cabeçalho: 40px de altura, 14px/500, `--foreground`. Colunas ordenáveis com ícone de setas.
- Células: `p-4`, 14px; o texto secundário vai em `--muted-foreground`.
- Linhas: divisória `--border`; fundo `--accent` ao passar o mouse.
- Em cima: busca da tabela (40px) à esquerda e ações à direita. Embaixo: paginação ("Página 1 de 2" + Anterior/Próxima) e itens por página.
- **Sem resultados:** estado vazio dentro do cartão (ver abaixo).

### Etiqueta de status (`Badge`)

- Formato de pílula, `px-2 py-1`, texto 12px/500.
- Fundo da cor de destaque a 12% e texto na cor de **texto** do status.
- Mapeamento: Publicado = Sucesso; Rascunho = Aviso; Agendado = Info; Erro = Erro; Lido = neutro (`--muted` / `--muted-foreground`).

### Diálogos (`Dialog`, `AlertDialog`, `Sheet`)

- Raio 10px, `p-6`, sombra `shadow-lg`, fundo escurecido a 50%.
- `AlertDialog` para excluir: título direto ("Excluir este post?"), consequência em uma frase, botões "Cancelar" (`outline`) e "Excluir" (`destructive`).
- `Sheet` (painel lateral) para ver o detalhe de uma mensagem de formulário sem sair da lista.

### Avisos (`Sonner`)

- Canto inferior direito, raio 10px.
- Sucesso curto ("Post salvo"), some sozinho em 4s.
- Erro fica até ser fechado e diz o que fazer ("Não foi possível salvar. Verifique a conexão e tente de novo.").
- Para erros de campo, use a mensagem no próprio campo, não um aviso.

### Estado vazio

- Centralizado no cartão: ícone de 40px em `--muted-foreground`, título 16px/600, uma frase de apoio e, se fizer sentido, um botão de ação ("Criar primeiro post").

### Carregando

- Listas e tabelas: `Skeleton` com o formato do conteúdo (linhas de 20px, raio 6px).
- Nunca deixe a tela em branco nem use spinner de página inteira depois do primeiro carregamento.

## 7. Telas do projeto

| Tela                     | Como montar                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login / Trocar senha** | Fundo `--muted`. Cartão central de 400px com logo do site, título 20px, campos e um botão `default` de largura total.                                                                                      |
| **Seções do site**       | Faixa de título + cartão com o formulário da seção (8 colunas) + cartão lateral (4 colunas) com "Salvar", status e link "Ver no site". Abaixo de `lg`, o lateral desce.                                    |
| **Posts (lista)**        | Faixa de título com "Novo post" + tabela: título, status (badge), data, ações.                                                                                                                             |
| **Post (edição)**        | Coluna principal: título e editor de texto num cartão. Coluna lateral: publicar (status, data, "Salvar"), imagem de capa e SEO, cada um em seu cartão.                                                     |
| **Formulários**          | Tabela de mensagens (nome, e-mail, data, status Lido/Não lido). Clique abre um `Sheet` com o conteúdo completo.                                                                                            |
| **Mídia**                | Área de envio no topo (borda tracejada `--input`, raio 10px, "Arraste arquivos ou clique para enviar") + grade de miniaturas quadradas (raio 8px, 4 a 6 por linha). Selecionada = anel de 2px `--primary`. |
| **Seletor de mídia**     | Mesma grade dentro de um `Dialog` largo, com busca e o botão "Usar imagem".                                                                                                                                |

## 8. Ícones

- [Lucide](https://lucide.dev/) (`lucide-react`, o padrão do shadcn), traço 1,75.
- Tamanhos: 16px em botões e campos, 18px no menu, 32px nos cartões de resumo e 40px em estados vazios.
- Ícone sozinho sempre com `aria-label`; ícone ao lado de texto com `aria-hidden`.

## 9. Movimento

- Transições curtas: 150ms, `ease-out` (padrão do Tailwind), em cor, fundo e borda.
- Abrir e fechar menus, diálogos e gaveta: animações padrão do shadcn (cerca de 200ms).
- Respeite `prefers-reduced-motion`: sem deslocamentos, só troca de opacidade.

## 10. Faça e não faça

### Faça

- Use **sempre** as variáveis de cor (`bg-primary`, `text-muted-foreground`, `border-border`). Nada de `indigo-600`, `slate-700` ou cores soltas.
- Mantenha 40px de altura em botões, campos e seletores.
- Separe blocos com borda e espaço, não com sombra.
- Escreva textos de interface curtos, em português, com verbo de ação ("Salvar", "Enviar arquivo", "Excluir post").
- Teste cada tela com teclado (Tab até o fim) e no celular.

### Não faça

- Não use a cor de destaque do status como texto em fundo claro.
- Não coloque dois botões azuis cheios na mesma área.
- Não use sombra em cartões fixos.
- Não traga do template ilustrações 3D, avatares de exemplo, gráficos de vendas nem as telas de IA e loja: não fazem parte deste painel.
- Não crie componente próprio quando o shadcn já tem um equivalente.
- Não remova o anel de foco.

## 11. Tokens prontos para o CSS

Trecho para o `apps/admin/src/index.css`, no formato do shadcn com Tailwind v4:

```css
:root {
  --radius: 10px;
  --background: #ffffff;
  --foreground: #1c2536;
  --card: #ffffff;
  --card-foreground: #1c2536;
  --popover: #ffffff;
  --popover-foreground: #1c2536;
  --primary: #3a66e8;
  --primary-foreground: #ffffff;
  --secondary: #edf2fe;
  --secondary-foreground: #2f55c9;
  --muted: #f4f7fb;
  --muted-foreground: #5a6a85;
  --accent: #edf2fe;
  --accent-foreground: #2f55c9;
  --destructive: #dc2626;
  --border: #dfe5ef;
  --input: #8591a6;
  --ring: #3a66e8;
  --sidebar: #ffffff;
  --sidebar-foreground: #2a3547;
  --sidebar-primary: #3a66e8;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #edf2fe;
  --sidebar-accent-foreground: #2f55c9;
  --sidebar-border: #dfe5ef;
  --sidebar-ring: #3a66e8;

  /* Status: destaque (ícones, fundos a 12%) e texto */
  --success: #13deb9;
  --success-foreground: #0b7d68;
  --warning: #f6b51e;
  --warning-foreground: #8a5a00;
  --error: #ef4444;
  --error-foreground: #b91c1c;
  --info: #8754ec;
  --info-foreground: #6d3fd6;
  --highlight: #49beff;
  --highlight-foreground: #0b6fa8;

  /* Gráficos (se um dia houver) */
  --chart-1: #5d87ff;
  --chart-2: #49beff;
  --chart-3: #13deb9;
  --chart-4: #f6b51e;
  --chart-5: #ef4444;
}

.dark {
  --background: #1c2536;
  --foreground: #f1f5f9;
  --card: #1c2536;
  --card-foreground: #f1f5f9;
  --popover: #2a3851;
  --popover-foreground: #f1f5f9;
  --primary: #7da0ff;
  --primary-foreground: #0f1a33;
  --secondary: #2a3851;
  --secondary-foreground: #c7d5ff;
  --muted: #2a3851;
  --muted-foreground: #94a5c2;
  --accent: #2a3851;
  --accent-foreground: #c7d5ff;
  --destructive: #f87171;
  --border: #333f55;
  --input: #6b7a96;
  --ring: #7da0ff;
  --sidebar: #1c2536;
  --sidebar-foreground: #94a5c2;
  --sidebar-primary: #7da0ff;
  --sidebar-primary-foreground: #0f1a33;
  --sidebar-accent: #2a3851;
  --sidebar-accent-foreground: #c7d5ff;
  --sidebar-border: #333f55;
  --sidebar-ring: #7da0ff;

  --success-foreground: #13deb9;
  --warning-foreground: #f6b51e;
  --error-foreground: #f87171;
  --info-foreground: #b597ff;
  --highlight-foreground: #49beff;
}

@theme inline {
  --font-sans: 'DM Sans Variable', ui-sans-serif, system-ui, sans-serif;
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-error: var(--error);
  --color-error-foreground: var(--error-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-highlight: var(--highlight);
  --color-highlight-foreground: var(--highlight-foreground);
}
```

As demais variáveis do shadcn (`--color-primary`, `--color-sidebar`…) entram no `@theme inline` que o próprio comando de instalação do shadcn gera.
