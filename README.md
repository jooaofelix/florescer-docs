# Contratos — Florescer Cerimônias

Sistema web para gerar os contratos da Florescer. Você preenche um formulário,
o contrato se monta ao lado com o padrão e a identidade de sempre, e sai em PDF.

Não precisa instalar nada, não precisa de internet, não precisa de servidor:
é só abrir o `index.html` no navegador.

---

## Usando no dia a dia

Abra o `index.html` (duplo clique) e:

| O que fazer | Como |
|---|---|
| Fazer um contrato novo | **Novo**, preencha o formulário à esquerda |
| Ver como está ficando | O contrato se atualiza sozinho enquanto você digita |
| Guardar | **Salvar** (ou `Ctrl+S`) — fica salvo no navegador |
| Reabrir um contrato antigo | Clique nele em **Contratos salvos**, no fim do formulário |
| Fazer um contrato parecido | Abra um antigo → **Duplicar** → troque o cliente |
| Gerar o PDF | **Gerar PDF** → na janela de impressão escolha *Salvar como PDF* |
| Levar para outro computador | **Exportar** gera um `.json`; **Importar** abre esse `.json` |

Coisas que o sistema faz sozinho:

- **Entrada e restante** se calculam a partir do valor total e da % de entrada.
  Se você digitar um valor à mão, ele passa a mandar — o selo `auto` ao lado do
  campo volta ao cálculo automático.
- **Valores por extenso** (`dois mil e setecentos reais`) e **datas por extenso**
  (`24 de setembro de 2025`).
- **Máscaras** de CPF, CEP e telefone.
- A faixa em cima do contrato avisa **o que ainda falta preencher**. Campo em
  branco vira uma linha para preencher à mão no papel.

> Ao gerar o PDF, desmarque "Cabeçalhos e rodapés" na janela de impressão —
> assim não sai a URL nem a data do navegador na folha.

### Onde ficam os contratos salvos

No navegador daquele computador (`localStorage`). Isso quer dizer:

- Limpar os dados de navegação apaga tudo.
- Outro computador/navegador não enxerga a mesma lista.

Para guardar de verdade, use **Exportar** e salve o `.json` junto do PDF.

---

## Mudando o contrato

Tudo que é o contrato em si mora em **um arquivo só**:
[`assets/js/modelo.js`](assets/js/modelo.js).

**Mudar o texto de uma cláusula** — ache a cláusula na parte `corpo:` e edite
como se fosse um documento de texto. Salve, recarregue a página.

**Criar um campo novo** — duas coisas:

```js
// 1) em "campos", declare o campo:
{ grupo: 'Evento', id: 'cerimonialista', rotulo: 'Cerimonialista',
  tipo: 'texto', padrao: '' },
```

```html
<!-- 2) em "corpo", use o marcador onde quiser: -->
<p>O evento será conduzido por <b class="dado">{{cerimonialista}}</b>.</p>
```

Tipos de campo: `texto`, `area`, `cpf`, `telefone`, `cep`, `data`, `hora`,
`moeda`, `numero`, `lista`.

Marcadores que aparecem sozinhos, sem precisar de campo:

| Marcador | Vira |
|---|---|
| `{{evento_data}}` | `07/11/2026` |
| `{{evento_data_extenso}}` | `07 de novembro de 2026` |
| `{{valor_total}}` | `R$ 2.700,00` |
| `{{valor_total_extenso}}` | `dois mil e setecentos reais` |
| `{{multa_percentual_extenso}}` | `trinta` |
| `{{formacao}}` | `02 Cantores, 01 Violino e 01 Teclado` |

Qualquer `_extenso` funciona para campos de data, moeda e número —
`{{entrada_valor_extenso}}`, `{{restante_data_extenso}}`, e assim por diante.

**Mudar a aparência** (fonte, margens, tamanho do logo, negrito dos dados) —
está em [`assets/css/contrato.css`](assets/css/contrato.css), nas primeiras linhas.

---

## Fazendo um modelo de contrato diferente

Copie `modelo.js`, troque o texto e os campos, e aponte o `index.html` para o
arquivo novo. A interface, os cálculos e o PDF continuam funcionando igual —
eles não sabem nada sobre qual contrato está carregado.

---

## Os arquivos

```
index.html                              a tela
wrangler.jsonc                          publicação no Cloudflare Workers
assets/
  img/logo-florescer.png                logo (extraído do contrato original)
  css/app.css                           aparência do sistema (não sai no PDF)
  css/contrato.css                      aparência do contrato (é o que vira PDF)
  js/modelo.js                          ← o contrato: campos + texto das cláusulas
  js/formatadores.js                    máscaras, datas, dinheiro, por extenso
  js/app.js                             motor (formulário, cálculos, salvar, PDF)
```

No dia a dia você mexe em `modelo.js`. Os outros podem ficar quietos.
