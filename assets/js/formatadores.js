/* ===========================================================================
   FORMATADORES — máscaras, datas, moeda e números por extenso (pt-BR)
   Não precisa mexer aqui no dia a dia.
   =========================================================================== */

window.Fmt = (function () {
  'use strict';

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const DEZ_ESP = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze',
    'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
    'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const soNumeros = (v) => String(v == null ? '' : v).replace(/\D/g, '');

  /* ---------- máscaras ---------------------------------------------------- */

  function mascaraCPF(v) {
    const n = soNumeros(v).slice(0, 11);
    if (n.length <= 3) return n;
    if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
    if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  }

  function mascaraCEP(v) {
    const n = soNumeros(v).slice(0, 8);
    return n.length <= 5 ? n : `${n.slice(0, 5)}-${n.slice(5)}`;
  }

  function mascaraTelefone(v) {
    const n = soNumeros(v).slice(0, 11);
    if (n.length <= 2) return n;
    if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  }

  /* ---------- moeda ------------------------------------------------------- */

  /* "R$ 2.700,00" */
  function moeda(n) {
    const v = Number(n);
    if (!isFinite(v)) return '';
    return 'R$ ' + v.toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  /* "2.700,00" — usado dentro dos inputs */
  function moedaSimples(n) {
    const v = Number(n);
    if (!isFinite(v)) return '';
    return v.toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  /* Lê "R$ 2.700,00", "2700", "2.700,5" -> 2700 / 2700.5 */
  function lerMoeda(txt) {
    if (typeof txt === 'number') return txt;
    const limpo = String(txt || '').replace(/[^\d,.-]/g, '');
    if (!limpo) return 0;
    // Se tem vírgula, ela é o separador decimal e o ponto é milhar.
    const normalizado = limpo.includes(',')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo;
    const n = parseFloat(normalizado);
    return isFinite(n) ? n : 0;
  }

  /* ---------- datas ------------------------------------------------------- */

  /* "2026-11-07" -> "07/11/2026" */
  function dataBR(iso) {
    const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return p ? `${p[3]}/${p[2]}/${p[1]}` : '';
  }

  /* "2026-11-07" -> "07 de novembro de 2026" */
  function dataExtenso(iso) {
    const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!p) return '';
    return `${p[3]} de ${MESES[Number(p[2]) - 1]} de ${p[1]}`;
  }

  /* ---------- números por extenso ---------------------------------------- */

  function tresDigitos(n) {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    const partes = [];
    if (c) partes.push(CEM[c]);
    if (resto < 10) { if (u) partes.push(UNI[u]); }
    else if (resto < 20) partes.push(DEZ_ESP[resto - 10]);
    else { partes.push(DEZ[d]); if (u) partes.push(UNI[u]); }
    return partes.join(' e ');
  }

  const ESCALAS = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];

  function porExtenso(valor) {
    let n = Math.floor(Math.abs(Number(valor) || 0));
    if (n === 0) return 'zero';

    const grupos = [];
    while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000); }
    if (grupos.length > ESCALAS.length) return String(valor);

    const partes = [];
    for (let i = grupos.length - 1; i >= 0; i--) {
      const g = grupos[i];
      if (!g) continue;
      let txt = (i === 1 && g === 1) ? 'mil' : tresDigitos(g);
      if (i >= 2) txt += ' ' + ESCALAS[i][g === 1 ? 0 : 1];
      else if (i === 1 && g !== 1) txt += ' mil';
      partes.push(txt);
    }

    if (partes.length === 1) return partes[0];

    // O último grupo entra com "e" quando é menor que 100 ou centena redonda.
    const ultimo = grupos.find((g) => g > 0);
    const ligacao = (ultimo < 100 || ultimo % 100 === 0) ? ' e ' : ', ';
    return partes.slice(0, -1).join(', ') + ligacao + partes[partes.length - 1];
  }

  /* 2700 -> "dois mil e setecentos reais" */
  function moedaExtenso(valor) {
    const v = Math.abs(Number(valor) || 0);
    const inteiro = Math.floor(v);
    const centavos = Math.round((v - inteiro) * 100);

    const partes = [];
    if (inteiro > 0) partes.push(`${porExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`);
    if (centavos > 0) partes.push(`${porExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
    if (!partes.length) return 'zero real';
    return partes.join(' e ');
  }

  return {
    soNumeros, mascaraCPF, mascaraCEP, mascaraTelefone,
    moeda, moedaSimples, lerMoeda,
    dataBR, dataExtenso,
    porExtenso, moedaExtenso
  };
})();
