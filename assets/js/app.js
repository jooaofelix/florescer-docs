/* ===========================================================================
   MOTOR DO SISTEMA
   Monta o formulário a partir do MODELO, preenche o contrato ao vivo,
   guarda os contratos no navegador e exporta/importa em JSON.

   Para mudar o CONTRATO, edite assets/js/modelo.js — não este arquivo.
   =========================================================================== */

(function () {
  'use strict';

  const M = window.MODELO;
  const F = window.Fmt;
  const CHAVE = 'florescer.contratos.v1';
  const CHAVE_RASCUNHO = 'florescer.rascunho.v1';

  /* Estado da aplicação. */
  let dados = {};          // { id_do_campo: valor }
  let manuais = {};        // campos calculados que o usuário editou à mão
  let contratoAtual = null; // id do contrato salvo que está aberto
  let sujo = false;         // tem alteração não salva?

  const campoPorId = {};
  M.campos.forEach((c) => { campoPorId[c.id] = c; });

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* =========================================================================
     VALORES
     ========================================================================= */

  function valoresPadrao() {
    const d = {};
    M.campos.forEach((c) => {
      d[c.id] = Array.isArray(c.padrao) ? JSON.parse(JSON.stringify(c.padrao))
        : (c.padrao !== undefined ? c.padrao : '');
    });
    return d;
  }

  /* Junta o que foi salvo por cima dos padrões do modelo.
     Um valor em branco no que foi salvo NÃO apaga o valor fixo do modelo.
     É isso que garante que CPF e dados bancários da contratada sempre
     apareçam, mesmo em rascunho ou contrato gravado antes deles existirem. */
  function mesclar(salvos) {
    const d = valoresPadrao();
    Object.keys(salvos || {}).forEach((id) => {
      const v = salvos[id];
      if (v === undefined || v === null) return;
      if (v === '' && d[id] !== '' && d[id] !== undefined) return;
      d[id] = v;
    });
    return d;
  }

  /* Texto de um campo já formatado, como aparece no contrato. */
  function textoDoCampo(id) {
    const campo = campoPorId[id];
    const v = dados[id];
    if (!campo) return v == null ? '' : String(v);

    switch (campo.tipo) {
      case 'data':     return F.dataBR(v);
      case 'moeda':    return (v === '' || v == null) ? '' : F.moeda(v);
      case 'cpf':      return F.mascaraCPF(v);
      case 'cep':      return F.mascaraCEP(v);
      case 'telefone': return F.mascaraTelefone(v);
      case 'numero':   return (v === '' || v == null) ? '' : String(v);
      case 'lista':    return listaEmTexto(v);
      default:         return v == null ? '' : String(v);
    }
  }

  /* [{qtd:'02',item:'Cantores'}, ...] -> "02 Cantores, 01 Violino e 01 Teclado" */
  function listaEmTexto(lista) {
    const itens = (lista || [])
      .filter((l) => l && (l.qtd || l.item))
      .map((l) => `${l.qtd || ''} ${l.item || ''}`.trim());
    if (!itens.length) return '';
    if (itens.length === 1) return itens[0];
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  /* Marcadores calculados sozinhos ({{valor_total_extenso}} e afins). */
  function marcadoresDerivados() {
    const d = { formacao: listaEmTexto(dados.formacao_banda) };

    M.campos.forEach((c) => {
      const v = dados[c.id];
      if (c.tipo === 'data') {
        d[c.id + '_extenso'] = F.dataExtenso(v);
      } else if (c.tipo === 'moeda') {
        d[c.id + '_extenso'] = (v === '' || v == null) ? '' : F.moedaExtenso(v);
      } else if (c.tipo === 'numero') {
        d[c.id + '_extenso'] = (v === '' || v == null) ? '' : F.porExtenso(v);
        d[c.id + '_ext'] = d[c.id + '_extenso'];
      }
    });

    return d;
  }

  const escapar = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* =========================================================================
     CÁLCULOS AUTOMÁTICOS (entrada e restante)
     ========================================================================= */

  function recalcular(idAlterado) {
    M.campos.forEach((c) => {
      if (!c.calculo) return;
      if (idAlterado && c.dependeDe && !c.dependeDe.includes(idAlterado)) return;
      if (manuais[c.id]) return;                 // usuário assumiu o controle
      dados[c.id] = Math.round(c.calculo(dados) * 100) / 100;
      atualizarInput(c.id);
    });
  }

  function atualizarInput(id) {
    const campo = campoPorId[id];
    const el = $(`[data-campo="${id}"]`);
    if (!el || !campo) return;
    el.value = campo.tipo === 'moeda' ? F.moedaSimples(dados[id]) : (dados[id] ?? '');
    const grupo = el.closest('.campo');
    if (grupo) grupo.classList.toggle('is-manual', !!manuais[id]);
  }

  /* =========================================================================
     FORMULÁRIO
     ========================================================================= */

  function montarFormulario() {
    const alvo = $('#formulario');
    const grupos = [];

    M.campos.forEach((c) => {
      let g = grupos.find((x) => x.nome === c.grupo);
      if (!g) { g = { nome: c.grupo, campos: [] }; grupos.push(g); }
      g.campos.push(c);
    });

    alvo.innerHTML = grupos.map((g) => `
      <section class="grupo" data-grupo="${escapar(g.nome)}">
        <header class="grupo-cab">
          <h2>${escapar(g.nome)}</h2>
          <span class="grupo-seta" aria-hidden="true"></span>
        </header>
        <div class="grupo-corpo">
          ${g.campos.map(montarCampo).join('')}
        </div>
      </section>
    `).join('');

    $$('.grupo-cab', alvo).forEach((cab) => {
      cab.addEventListener('click', () => cab.parentElement.classList.toggle('fechado'));
    });

    ligarEventos();
    M.campos.forEach((c) => { if (c.tipo === 'lista') desenharLista(c.id); });
  }

  function montarCampo(c) {
    const larg = c.largura === 'meio' ? ' campo--meio' : '';
    const dica = c.dica ? `<small class="dica">${escapar(c.dica)}</small>` : '';

    if (c.tipo === 'lista') {
      return `
        <div class="campo campo--lista">
          <label>${escapar(c.rotulo)}</label>
          <div class="lista" data-lista="${c.id}"></div>
          <button type="button" class="btn-linha" data-add-lista="${c.id}">+ adicionar item</button>
          ${dica}
        </div>`;
    }

    if (c.tipo === 'area') {
      return `
        <div class="campo${larg}">
          <label for="f_${c.id}">${escapar(c.rotulo)}</label>
          <textarea id="f_${c.id}" data-campo="${c.id}" rows="2"></textarea>
          ${dica}
        </div>`;
    }

    const tipoHtml = c.tipo === 'data' ? 'date' : 'text';
    const extra = c.tipo === 'moeda' ? ' inputmode="decimal" class="alinha-dir"'
      : c.tipo === 'numero' ? ' inputmode="numeric" class="alinha-dir"' : '';
    const auto = c.calculo
      ? `<button type="button" class="btn-auto" data-auto="${c.id}" title="Voltar ao cálculo automático">auto</button>`
      : '';
    const selo = c.fixo
      ? '<span class="selo-fixo" title="Dado fixo da Florescer: vem do modelo.js e já entra preenchido em todo contrato">fixo</span>'
      : '';
    const prefixo = c.tipo === 'moeda' ? '<span class="prefixo">R$</span>' : '';

    return `
      <div class="campo${larg}${c.calculo ? ' campo--calc' : ''}${c.fixo ? ' campo--fixo' : ''}">
        <label for="f_${c.id}">${escapar(c.rotulo)}${auto}${selo}</label>
        <div class="entrada">
          ${prefixo}
          <input id="f_${c.id}" type="${tipoHtml}" data-campo="${c.id}"${extra}>
        </div>
        ${dica}
      </div>`;
  }

  function ligarEventos() {
    $$('[data-campo]').forEach((el) => {
      const id = el.dataset.campo;
      const campo = campoPorId[id];

      el.addEventListener('input', () => {
        let v = el.value;

        if (campo.tipo === 'cpf') { v = F.mascaraCPF(v); el.value = v; }
        else if (campo.tipo === 'cep') { v = F.mascaraCEP(v); el.value = v; }
        else if (campo.tipo === 'telefone') { v = F.mascaraTelefone(v); el.value = v; }
        else if (campo.tipo === 'moeda') { v = F.lerMoeda(el.value); }
        else if (campo.tipo === 'numero') { v = el.value === '' ? '' : Number(F.soNumeros(el.value)); }

        dados[id] = v;
        if (campo.calculo) manuais[id] = true;
        recalcular(id);
        marcarSujo();
        renderizar();
      });

      /* Ao sair do campo, reformata o dinheiro para 1.234,56 */
      el.addEventListener('blur', () => {
        if (campo.tipo === 'moeda') el.value = F.moedaSimples(dados[id]);
      });
    });

    /* Botão "auto": devolve o campo ao cálculo automático. */
    $$('[data-auto]').forEach((b) => {
      b.addEventListener('click', () => {
        delete manuais[b.dataset.auto];
        recalcular();
        marcarSujo();
        renderizar();
      });
    });

    $$('[data-add-lista]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.addLista;
        dados[id] = dados[id] || [];
        dados[id].push({ qtd: '01', item: '' });
        desenharLista(id);
        marcarSujo();
        renderizar();
      });
    });
  }

  function desenharLista(id) {
    const caixa = $(`[data-lista="${id}"]`);
    if (!caixa) return;
    const itens = dados[id] || [];

    caixa.innerHTML = itens.map((l, i) => `
      <div class="lista-item">
        <input type="text" class="lista-qtd" value="${escapar(l.qtd || '')}"
               data-lista-id="${id}" data-i="${i}" data-chave="qtd" aria-label="Quantidade">
        <input type="text" class="lista-nome" value="${escapar(l.item || '')}"
               data-lista-id="${id}" data-i="${i}" data-chave="item"
               placeholder="Instrumento / função" aria-label="Item">
        <button type="button" class="btn-remover" data-remover="${id}" data-i="${i}"
                title="Remover" aria-label="Remover item">×</button>
      </div>
    `).join('');

    $$('[data-lista-id]', caixa).forEach((el) => {
      el.addEventListener('input', () => {
        dados[el.dataset.listaId][Number(el.dataset.i)][el.dataset.chave] = el.value;
        marcarSujo();
        renderizar();
      });
    });

    $$('[data-remover]', caixa).forEach((b) => {
      b.addEventListener('click', () => {
        dados[b.dataset.remover].splice(Number(b.dataset.i), 1);
        desenharLista(b.dataset.remover);
        marcarSujo();
        renderizar();
      });
    });
  }

  function preencherFormulario() {
    M.campos.forEach((c) => {
      if (c.tipo === 'lista') { desenharLista(c.id); return; }
      atualizarInput(c.id);
    });
  }

  /* =========================================================================
     CONTRATO (preview)
     ========================================================================= */

  function renderizar() {
    const derivados = marcadoresDerivados();
    const faltando = [];

    const html = M.corpo.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, chave) => {
      let texto;
      if (Object.prototype.hasOwnProperty.call(derivados, chave)) texto = derivados[chave];
      else if (Object.prototype.hasOwnProperty.call(campoPorId, chave)) texto = textoDoCampo(chave);
      else return `<span class="vazio" title="Marcador desconhecido: ${escapar(chave)}">{{${escapar(chave)}}}</span>`;

      if (texto === '' || texto == null) {
        const base = chave.replace(/_(extenso|ext)$/, '');
        const campo = campoPorId[base];
        if (campo && !faltando.includes(campo.rotulo)) faltando.push(campo.rotulo);
        return '<span class="vazio">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
      }
      return escapar(texto);
    });

    $('#conteudo-contrato').innerHTML = html;
    mostrarPendencias(faltando);
    ajustarZoom();
  }

  function mostrarPendencias(faltando) {
    const el = $('#pendencias');
    if (!faltando.length) {
      el.className = 'pendencias ok';
      el.textContent = 'Contrato completo — pronto para gerar o PDF.';
      return;
    }
    el.className = 'pendencias';
    el.textContent = `Falta preencher: ${faltando.join(', ')}.`;
  }

  /* =========================================================================
     ZOOM DO PREVIEW
     ========================================================================= */

  let modoZoom = 'ajustar';

  function ajustarZoom() {
    const palco = $('#palco');
    const folha = $('#folha');
    if (!palco || !folha) return;

    if (modoZoom !== 'ajustar') {
      folha.style.zoom = modoZoom;
      return;
    }
    const larguraA4 = 210 * (96 / 25.4);            // 210mm em px
    const disponivel = palco.clientWidth - 48;      // respiro lateral
    folha.style.zoom = Math.min(1, disponivel / larguraA4);
  }

  /* =========================================================================
     ARMAZENAMENTO
     ========================================================================= */

  const lerBiblioteca = () => {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
    catch (e) { return {}; }
  };
  const gravarBiblioteca = (b) => localStorage.setItem(CHAVE, JSON.stringify(b));

  function pacote() {
    return {
      versao: 1,
      modelo: M.titulo,
      dados: JSON.parse(JSON.stringify(dados)),
      manuais: JSON.parse(JSON.stringify(manuais))
    };
  }

  function rotuloContrato() {
    const nome = (dados.contratante_nome || '').trim() || 'Sem nome';
    const data = dados.evento_data ? ` · ${F.dataBR(dados.evento_data)}` : '';
    return nome + data;
  }

  function salvar() {
    const bib = lerBiblioteca();
    if (!contratoAtual) contratoAtual = 'c' + Date.now();
    bib[contratoAtual] = Object.assign(pacote(), {
      rotulo: rotuloContrato(),
      atualizadoEm: new Date().toISOString()
    });
    gravarBiblioteca(bib);
    sujo = false;
    atualizarBarra();
    listarContratos();
    aviso('Contrato salvo.');
  }

  function abrir(id) {
    const bib = lerBiblioteca();
    const c = bib[id];
    if (!c) return;
    if (!confirmarDescarte()) return;
    dados = mesclar(c.dados);
    manuais = c.manuais || {};
    contratoAtual = id;
    sujo = false;
    preencherFormulario();
    renderizar();
    atualizarBarra();
    listarContratos();
  }

  function novo() {
    if (!confirmarDescarte()) return;
    dados = valoresPadrao();
    manuais = {};
    contratoAtual = null;
    sujo = false;
    recalcular();
    preencherFormulario();
    renderizar();
    atualizarBarra();
    listarContratos();
  }

  function duplicar() {
    contratoAtual = null;
    dados.contratante_nome = '';
    dados.contratante_cpf = '';
    dados.contratante_endereco = '';
    dados.evento_local = '';
    dados.evento_data = '';
    marcarSujo();
    preencherFormulario();
    renderizar();
    atualizarBarra();
    aviso('Cópia criada — preencha os dados do novo cliente.');
  }

  function excluir() {
    if (!contratoAtual) return;
    if (!window.confirm('Excluir este contrato salvo? Essa ação não pode ser desfeita.')) return;
    const bib = lerBiblioteca();
    delete bib[contratoAtual];
    gravarBiblioteca(bib);
    contratoAtual = null;
    listarContratos();
    atualizarBarra();
    aviso('Contrato excluído.');
  }

  function listarContratos() {
    const bib = lerBiblioteca();
    const alvo = $('#lista-contratos');
    const itens = Object.entries(bib)
      .sort((a, b) => String(b[1].atualizadoEm).localeCompare(String(a[1].atualizadoEm)));

    if (!itens.length) {
      alvo.innerHTML = '<p class="vazio-lista">Nenhum contrato salvo ainda.</p>';
      return;
    }

    alvo.innerHTML = itens.map(([id, c]) => `
      <button type="button" class="item-contrato${id === contratoAtual ? ' ativo' : ''}"
              data-abrir="${id}">
        <strong>${escapar(c.rotulo || 'Sem nome')}</strong>
        <small>${new Date(c.atualizadoEm).toLocaleDateString('pt-BR')}</small>
      </button>
    `).join('');

    $$('[data-abrir]', alvo).forEach((b) => {
      b.addEventListener('click', () => abrir(b.dataset.abrir));
    });
  }

  /* =========================================================================
     EXPORTAR / IMPORTAR
     ========================================================================= */

  function exportar() {
    const blob = new Blob([JSON.stringify(pacote(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeSeguro(M.nomeArquivo(dados)) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importar(arquivo) {
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const c = JSON.parse(leitor.result);
        if (!c.dados) throw new Error('formato');
        dados = mesclar(c.dados);
        manuais = c.manuais || {};
        contratoAtual = null;
        marcarSujo();
        preencherFormulario();
        renderizar();
        atualizarBarra();
        aviso('Contrato importado.');
      } catch (e) {
        aviso('Arquivo inválido — esperado um .json exportado por este sistema.', true);
      }
    };
    leitor.readAsText(arquivo);
  }

  const nomeSeguro = (s) => String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').toUpperCase();

  /* =========================================================================
     BARRA / AVISOS / RASCUNHO
     ========================================================================= */

  function marcarSujo() {
    sujo = true;
    atualizarBarra();
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(pacote())); } catch (e) { /* cota cheia */ }
  }

  function atualizarBarra() {
    $('#nome-atual').textContent = rotuloContrato();
    $('#estado').textContent = sujo ? 'não salvo' : (contratoAtual ? 'salvo' : 'novo');
    $('#estado').className = 'estado' + (sujo ? ' sujo' : '');
    $('#btn-excluir').disabled = !contratoAtual;
    document.title = `${rotuloContrato()} — Florescer Cerimônias`;
  }

  let timerAviso;
  function aviso(texto, erro) {
    const el = $('#aviso');
    el.textContent = texto;
    el.className = 'aviso visivel' + (erro ? ' erro' : '');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.className = 'aviso'; }, 3200);
  }

  function confirmarDescarte() {
    if (!sujo) return true;
    return window.confirm('Há alterações não salvas. Continuar mesmo assim?');
  }

  function restaurarRascunho() {
    try {
      const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO));
      if (r && r.dados) {
        dados = mesclar(r.dados);
        manuais = r.manuais || {};
        return true;
      }
    } catch (e) { /* ignora */ }
    return false;
  }

  /* =========================================================================
     INÍCIO
     ========================================================================= */

  function iniciar() {
    $('#titulo-modelo').textContent = M.titulo;
    $('#subtitulo-modelo').textContent = M.subtitulo || '';

    dados = valoresPadrao();
    if (!restaurarRascunho()) recalcular();

    montarFormulario();
    preencherFormulario();
    renderizar();
    listarContratos();
    atualizarBarra();

    $('#btn-novo').addEventListener('click', novo);
    $('#btn-salvar').addEventListener('click', salvar);
    $('#btn-duplicar').addEventListener('click', duplicar);
    $('#btn-excluir').addEventListener('click', excluir);
    $('#btn-exportar').addEventListener('click', exportar);
    $('#btn-imprimir').addEventListener('click', () => window.print());
    $('#arquivo-importar').addEventListener('change', (e) => {
      if (e.target.files[0]) importar(e.target.files[0]);
      e.target.value = '';
    });

    $('#zoom').addEventListener('change', (e) => {
      modoZoom = e.target.value === 'ajustar' ? 'ajustar' : Number(e.target.value);
      ajustarZoom();
    });

    $('#btn-painel').addEventListener('click', () => {
      document.body.classList.toggle('painel-oculto');
      ajustarZoom();
    });

    window.addEventListener('resize', ajustarZoom);

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); salvar();
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (sujo) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
