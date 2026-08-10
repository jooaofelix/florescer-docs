/* ===========================================================================
   MODELO DO CONTRATO — Florescer Cerimônias
   ---------------------------------------------------------------------------
   ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA MEXER PARA MUDAR O CONTRATO.

   Ele tem duas partes:

     1) CAMPOS  -> a lista de informações que aparecem no formulário.
     2) CORPO   -> o texto do contrato, com {{marcadores}} no lugar dos dados.

   COMO MUDAR O TEXTO DE UMA CLÁUSULA:
       Ache a cláusula lá embaixo em CORPO e edite normalmente. Salve. Pronto.

   COMO CRIAR UM CAMPO NOVO:
       a) adicione um item em CAMPOS, por exemplo:
              { grupo: 'Evento', id: 'evento_cidade', rotulo: 'Cidade do evento',
                tipo: 'texto', padrao: 'Jacareí/SP' }
       b) use {{evento_cidade}} onde quiser dentro do CORPO.

   TIPOS DE CAMPO DISPONÍVEIS:
       texto | area | cpf | telefone | cep | data | hora | moeda | numero | lista

   MARCADORES ESPECIAIS (calculados sozinhos, não precisam de campo):
       {{evento_data_extenso}}      07 de novembro de 2026
       {{assinatura_data_extenso}}  24 de setembro de 2025
       {{valor_total_extenso}}      dois mil e setecentos reais
       {{entrada_percentual_ext}}   vinte
       {{multa_percentual_extenso}} trinta
       {{formacao}}                 02 Cantores, 01 Violino e 01 Teclado

   Qualquer dado exibido no contrato deve vir embrulhado em <b class="dado">…</b>.
   É isso que dá o destaque das informações preenchidas. Para tirar o negrito de
   todos de uma vez, mexa em .dado no arquivo assets/css/contrato.css.
   =========================================================================== */

window.MODELO = {

  /* Nome do modelo — aparece no topo do sistema e no nome do arquivo exportado. */
  titulo: 'Contrato de Prestação de Serviços',
  subtitulo: 'Cerimonial de Casamento',

  /* Como o arquivo é nomeado ao salvar/exportar. */
  nomeArquivo: (d) => `CONTRATO_FLORESCER_${d.contratante_nome || 'SEM_NOME'}`,

  /* =========================================================================
     1) CAMPOS DO FORMULÁRIO
     ========================================================================= */
  campos: [

    /* ---------- CONTRATADA (dados fixos da Florescer) ---------------------- */
    { grupo: 'Contratada', id: 'servico', rotulo: 'Serviço prestado',
      tipo: 'texto', padrao: 'Cerimonial de Casamento' },

    { grupo: 'Contratada', id: 'contratada_nome', rotulo: 'Nome da contratada',
      tipo: 'texto', padrao: 'Julia de Andrade Leite',
      fixo: true },

    { grupo: 'Contratada', id: 'contratada_cpf', rotulo: 'CPF',
      tipo: 'cpf', padrao: '519.954.148-08', largura: 'meio',
      fixo: true },

    { grupo: 'Contratada', id: 'contratada_cep', rotulo: 'CEP',
      tipo: 'cep', padrao: '12305-000', largura: 'meio',
      fixo: true },

    { grupo: 'Contratada', id: 'contratada_endereco', rotulo: 'Endereço',
      tipo: 'texto', padrao: 'Avenida Getúlio Vargas, 1369 – Jardim California',
      fixo: true },

    { grupo: 'Contratada', id: 'contratada_cidade', rotulo: 'Cidade/UF',
      tipo: 'texto', padrao: 'Jacareí/SP',
      fixo: true },

    /* ---------- CONTRATANTE (muda a cada cliente) -------------------------- */
    { grupo: 'Contratante', id: 'contratante_nome', rotulo: 'Nome completo',
      tipo: 'texto', padrao: '', dica: 'Nome de quem está contratando' },

    { grupo: 'Contratante', id: 'contratante_cpf', rotulo: 'CPF',
      tipo: 'cpf', padrao: '', largura: 'meio' },

    { grupo: 'Contratante', id: 'contratante_cidade', rotulo: 'Cidade/UF',
      tipo: 'texto', padrao: 'São José dos Campos – SP', largura: 'meio' },

    { grupo: 'Contratante', id: 'contratante_endereco', rotulo: 'Endereço completo',
      tipo: 'area', padrao: '' },

    /* ---------- EVENTO ----------------------------------------------------- */
    { grupo: 'Evento', id: 'evento_local', rotulo: 'Local do evento',
      tipo: 'texto', padrao: '' },

    { grupo: 'Evento', id: 'evento_data', rotulo: 'Data',
      tipo: 'data', padrao: '', largura: 'meio' },

    { grupo: 'Evento', id: 'evento_hora', rotulo: 'Horário',
      tipo: 'hora', padrao: '16h00', largura: 'meio' },

    { grupo: 'Evento', id: 'evento_duracao', rotulo: 'Duração do cerimonial',
      tipo: 'texto', padrao: 'uma hora e trinta minutos (1 hora e 30 minutos)' },

    /* ---------- EXECUÇÃO --------------------------------------------------- */
    { grupo: 'Execução', id: 'atraso_tolerancia', rotulo: 'Tolerância de atraso',
      tipo: 'texto', padrao: '1 hora', largura: 'meio' },

    { grupo: 'Execução', id: 'atraso_valor_musico', rotulo: 'Adicional por músico (atraso)',
      tipo: 'moeda', padrao: 50, largura: 'meio' },

    { grupo: 'Execução', id: 'repertorio_prazo_dias', rotulo: 'Prazo p/ alterar repertório (dias)',
      tipo: 'numero', padrao: 15, largura: 'meio' },

    { grupo: 'Execução', id: 'formacao_banda', rotulo: 'Formação da banda',
      tipo: 'lista', padrao: [
        { qtd: '02', item: 'Cantores' },
        { qtd: '01', item: 'Violino' },
        { qtd: '01', item: 'Teclado' }
      ]},

    /* ---------- PAGAMENTO -------------------------------------------------- */
    { grupo: 'Pagamento', id: 'valor_total', rotulo: 'Valor total',
      tipo: 'moeda', padrao: 2700, largura: 'meio' },

    { grupo: 'Pagamento', id: 'entrada_percentual', rotulo: 'Entrada (%)',
      tipo: 'numero', padrao: 20, largura: 'meio' },

    { grupo: 'Pagamento', id: 'entrada_valor', rotulo: 'Valor da entrada',
      tipo: 'moeda', padrao: 540, largura: 'meio',
      calculo: (d) => (Number(d.valor_total) || 0) * (Number(d.entrada_percentual) || 0) / 100,
      dependeDe: ['valor_total', 'entrada_percentual'] },

    { grupo: 'Pagamento', id: 'entrada_data', rotulo: 'Vencimento da entrada',
      tipo: 'data', padrao: '', largura: 'meio' },

    { grupo: 'Pagamento', id: 'restante_valor', rotulo: 'Valor restante',
      tipo: 'moeda', padrao: 2160, largura: 'meio',
      calculo: (d) => (Number(d.valor_total) || 0) - (Number(d.entrada_valor) || 0),
      dependeDe: ['valor_total', 'entrada_percentual', 'entrada_valor'] },

    { grupo: 'Pagamento', id: 'restante_data', rotulo: 'Vencimento do restante',
      tipo: 'data', padrao: '', largura: 'meio' },

    { grupo: 'Pagamento', id: 'banco', rotulo: 'Banco',
      tipo: 'texto', padrao: 'Nubank', largura: 'meio',
      fixo: true },

    { grupo: 'Pagamento', id: 'pix', rotulo: 'Chave Pix (CPF)',
      tipo: 'cpf', padrao: '519.954.148-08', largura: 'meio',
      fixo: true },

    { grupo: 'Pagamento', id: 'titular', rotulo: 'Titular da conta',
      tipo: 'texto', padrao: 'Julia Andrade Leite',
      fixo: true },

    /* ---------- RESCISÃO E FORO -------------------------------------------- */
    { grupo: 'Rescisão e foro', id: 'multa_percentual', rotulo: 'Multa por rescisão (%)',
      tipo: 'numero', padrao: 30, largura: 'meio' },

    { grupo: 'Rescisão e foro', id: 'foro', rotulo: 'Foro',
      tipo: 'texto', padrao: 'São José dos Campos/SP', largura: 'meio' },

    /* ---------- ASSINATURA ------------------------------------------------- */
    { grupo: 'Assinatura', id: 'vias', rotulo: 'Nº de vias',
      tipo: 'texto', padrao: '02', largura: 'meio' },

    { grupo: 'Assinatura', id: 'assinatura_cidade', rotulo: 'Cidade da assinatura',
      tipo: 'texto', padrao: 'São José dos Campos', largura: 'meio' },

    { grupo: 'Assinatura', id: 'assinatura_data', rotulo: 'Data da assinatura',
      tipo: 'data', padrao: '' }
  ],

  /* =========================================================================
     2) CORPO DO CONTRATO
     -------------------------------------------------------------------------
     Texto normal = fixo.   {{marcador}} = dado do formulário.
     ========================================================================= */
  corpo: `

<h1 class="titulo">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>

<p>Este contrato tem por objetivo estabelecer uma prestação de serviço de
<b class="dado">{{servico}}</b> representada aqui por
<b class="dado">{{contratada_nome}}</b>, CPF nº <b class="dado">{{contratada_cpf}}</b>,
situado na <b class="dado">{{contratada_endereco}}</b> cep:
<b class="dado">{{contratada_cep}}</b> – em <b class="dado">{{contratada_cidade}}</b>,
doravante denominada <b>CONTRATADO</b> e
<b class="dado">{{contratante_nome}}</b>, CPF nº <b class="dado">{{contratante_cpf}}</b>,
residente e domiciliado na cidade de <b class="dado">{{contratante_cidade}}</b>,
<b class="dado">{{contratante_endereco}}</b>, doravante designado <b>CONTRATANTE</b>,
que responda às necessidades e interesses de ambas as Partes.</p>

<p><b>CLÁUSULA PRIMEIRA – OBJETO.</b> 1.1. Este contrato tem como objeto a
apresentação de músicas para o cerimonial e recepção de casamento a ser realizado
no espaço <b class="dado">{{evento_local}}</b>, no dia
<b class="dado">{{evento_data}}</b>, às <b class="dado">{{evento_hora}}</b>.</p>

<p><b>CLÁUSULA SEGUNDA – FORMA DE EXECUÇÃO.</b> 2.1. O cerimonial para casamento
terá duração de <b class="dado">{{evento_duracao}}</b>.</p>

<p><b>CLÁUSULA TERCEIRA – DURAÇÃO DO EVENTO.</b> 3.1. Caso a Banda ultrapasse o
tempo estabelecido na cláusula anterior, será de sua inteira responsabilidade, não
existindo nenhum acréscimo ao pagamento a ser efetuado pelo <b>CONTRATANTE</b>.</p>

<p>3.2. Caso a cerimônia tenha um atraso de a partir de
<b class="dado">{{atraso_tolerancia}}</b>, será cobrado um valor a mais do
<b>CONTRATANTE</b>, estipulado em <b class="dado">{{atraso_valor_musico}}</b> para
cada músico que tocará na cerimônia, ou cobrada uma alimentação para os músicos.
Isso será definido com o <b>CONTRATANTE</b> e <b>CONTRATADO</b> depois da cerimônia.</p>

<p><b>CLÁUSULA QUARTA – DO REPERTÓRIO.</b> 4.1. O repertório musical a ser
apresentado no dia da Cerimônia será escolhido em comum acordo entre o
<b>CONTRATANTE</b> e a <b>CONTRATADO</b>, mediante reunião previamente definida para
tratar da questão, devendo ambos assinar a Playlist com o repertório acertado. O
repertório poderá ser modificado com até
<b class="dado">{{repertorio_prazo_dias}}</b> dias de antecedência da cerimônia.</p>

<p><b>CLÁUSULA QUINTA – DOS EQUIPAMENTOS.</b> 5.1. O <b>CONTRATADO</b> fornecerá
todo equipamento (instrumentos musicais) necessário para a realização do evento,
comprometendo-se a <b>CONTRATANTE</b> a respeitar as condições fundamentais para o
bom funcionamento dos instrumentos musicais. O <b>CONTRATANTE</b> se compromete a
fornecer os equipamentos de som.</p>

<p>5.2. Formação da banda para cerimônia: <b class="dado">{{formacao}}</b>.</p>

<p><b>CLÁUSULA SEXTA – DAS DESPESAS.</b> 6.1. As despesas com alvarás, multas e
direitos autorais das entidades arrecadadoras serão de responsabilidade exclusiva
da <b>CONTRATANTE</b>.</p>

<p><b>CLÁUSULA SÉTIMA – DAS CONDIÇÕES.</b> 7.1. A <b>CONTRATANTE</b> compromete-se
a oferecer as seguintes condições fundamentais para a realização do evento:
policiamento, segurança, palco e suprimento de energia elétrica condizentes com o
equipamento, responsabilizando-se por qualquer risco que possa expor a terceiros.</p>

<p>7.2. Este contrato não é passível de transferência por nenhuma das partes
contratantes a outra empresa ou clube.</p>

<p><b>CLÁUSULA OITAVA – DO PAGAMENTO.</b> 8.1. A <b>CONTRATANTE</b> se compromete a
pagar a quantia de <b class="dado">{{valor_total}}</b>
(<b class="dado">{{valor_total_extenso}}</b>).</p>

<p>8.2. Podendo o <b>CONTRATANTE</b> dividir esse valor da melhor forma possível,
sendo que a entrada de <b class="dado">{{entrada_percentual}}%</b> será paga até a
data <b class="dado">{{entrada_data}}</b>, <b class="dado">{{entrada_valor}}</b>
(o atraso do pagamento dessa entrada anula o contrato). E o restante do valor,
<b class="dado">{{restante_valor}}</b>, será pago em até o dia
<b class="dado">{{restante_data}}</b>.</p>

<p>8.3. Os pagamentos deverão ser realizados via Pix, na chave abaixo:</p>

<table class="dados-bancarios">
  <tr><td>Banco</td><td><b class="dado">{{banco}}</b></td></tr>
  <tr><td>Chave Pix</td><td><b class="dado">{{pix}}</b> (CPF)</td></tr>
  <tr><td>Titular</td><td><b class="dado">{{titular}}</b></td></tr>
</table>

<p><b>CLÁUSULA NONA – DA RESCISÃO.</b> 9.1. O presente contrato será rescindido caso
uma das partes descumpra o pactuado nas cláusulas deste instrumento.</p>

<p>9.2. Caso ocorra algum impedimento à realização do evento, ligado a caso fortuito
ou a força maior, as partes deverão pactuar outra data ou proceder à devolução dos
valores e à reposição do que foi gasto nos preparativos.</p>

<p><b>CLÁUSULA DÉCIMA – DA MULTA.</b> 10.1. Se a <b>CONTRATANTE</b> der causa à
rescisão do presente contrato, o valor pago no aceite da contratação ficará retido
como forma de multa que fica estipulada em
<b class="dado">{{multa_percentual}}%</b>
(<b class="dado">{{multa_percentual_extenso}} por cento</b>) do valor total acordado.</p>

<p>10.2. Se o <b>CONTRATADO</b> der causa à rescisão do presente contrato, o valor
pago pela <b>CONTRATANTE</b> até a presente data será devolvido na integralidade.</p>

<p><b>CLÁUSULA DÉCIMA PRIMEIRA – DO FORO.</b> 11.1. O foro escolhido pelas partes
para quaisquer discussões é o da cidade de <b class="dado">{{foro}}</b>.</p>

<p class="fecho">E, por estarem justas e acordadas, lavram as Partes este instrumento
em <b class="dado">{{vias}}</b> vias de igual teor e forma, para um só efeito, na
presença das testemunhas abaixo indicadas.</p>

<p class="local-data"><b class="dado">{{assinatura_cidade}}</b>,
<b class="dado">{{assinatura_data_extenso}}</b>.</p>

<table class="assinaturas">
  <tr>
    <td><div class="linha"></div>CONTRATANTE</td>
    <td><div class="linha"></div>CONTRATADA</td>
  </tr>
</table>

<p class="rotulo-testemunhas">Testemunhas:</p>

<table class="testemunhas">
  <tr>
    <td>
      <div class="ordem">1ª</div>
      <div class="linha"></div>
      <div class="campo">Nome:</div>
      <div class="campo">RG:</div>
    </td>
    <td>
      <div class="ordem">2ª</div>
      <div class="linha"></div>
      <div class="campo">Nome:</div>
      <div class="campo">RG:</div>
    </td>
  </tr>
</table>

`
};
