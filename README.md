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

## Acesso ao site publicado

O site no endereço da Cloudflare é **fechado por login e senha**. A verificação
acontece no servidor, antes de qualquer arquivo ser entregue — sem entrar, o
navegador não recebe nem o HTML, nem o JavaScript, nem o modelo do contrato.

Um "login" escrito em JavaScript na página não serviria: bastaria abrir o
código-fonte para ver a senha ou baixar os arquivos direto.

### Liberar acesso para alguém

1. Gere o usuário e a senha:

   ```
   node ferramentas/gerar-usuario.mjs julia umaSenhaBoaAqui
   ```

2. No painel da Cloudflare, em **Workers & Pages → florescer-docs → Settings →
   Variables and Secrets**, crie (ou edite) os dois segredos que o comando imprime:

   | Segredo | Conteúdo |
   |---|---|
   | `FLORESCER_USUARIOS` | `{"julia":"<hash>","joao":"<hash>"}` |
   | `FLORESCER_SESSAO_SEGREDO` | um texto aleatório longo |

3. Salve. Vale no próximo carregamento da página.

Para mais de uma pessoa, junte todas no mesmo JSON de `FLORESCER_USUARIOS`.

### Tirar o acesso

Apague a linha da pessoa em `FLORESCER_USUARIOS` e salve. Para desconectar
**todo mundo** de uma vez, troque o `FLORESCER_SESSAO_SEGREDO` — todas as
sessões abertas param de valer na hora.

Só quem tem acesso ao painel da Cloudflare consegue liberar alguém. A senha
não fica no repositório, e o hash guardado não volta a ser senha.

### Detalhes

- A sessão dura 12 horas e fica num cookie assinado (`HttpOnly`, `Secure`,
  `SameSite=Strict`). Cookie adulterado é recusado.
- **Sem os segredos configurados, o site fica fechado**, nunca aberto: mostra
  um aviso de "acesso ainda não configurado" e não entrega arquivo nenhum.
- O botão **Sair** aparece na barra de cima só no site publicado.
- Abrindo o `index.html` direto do computador não há login — a trava protege o
  endereço público, não o arquivo local.

Para mudar quanto tempo a sessão dura, veja `DURACAO_SESSAO` em
[`worker/index.js`](worker/index.js).

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
.assetsignore                           o que NÃO vira arquivo público
worker/index.js                         trava de acesso (roda no servidor)
ferramentas/gerar-usuario.mjs           gera usuário e senha para a trava
assets/
  img/logo-florescer.png                logo (extraído do contrato original)
  css/app.css                           aparência do sistema (não sai no PDF)
  css/contrato.css                      aparência do contrato (é o que vira PDF)
  js/modelo.js                          ← o contrato: campos + texto das cláusulas
  js/formatadores.js                    máscaras, datas, dinheiro, por extenso
  js/app.js                             motor (formulário, cálculos, salvar, PDF)
```

No dia a dia você mexe em `modelo.js`. Os outros podem ficar quietos.
