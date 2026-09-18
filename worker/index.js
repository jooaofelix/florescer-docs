/* ===========================================================================
   TRAVA DE ACESSO — Florescer Cerimônias
   ---------------------------------------------------------------------------
   Este código roda no servidor da Cloudflare, ANTES de qualquer arquivo do
   site ser entregue. Sem sessão válida, o navegador não recebe nem o HTML,
   nem o JavaScript, nem o modelo do contrato — só a tela de login.

   É isso que diferencia uma trava de verdade de um "login" feito em
   JavaScript no navegador, que qualquer pessoa contorna vendo o código-fonte.

   QUEM ENTRA é definido por dois segredos configurados no painel da
   Cloudflare (Settings -> Variables and Secrets). Eles NÃO ficam no
   repositório:

     FLORESCER_USUARIOS        {"julia":"<hash>","joao":"<hash>"}
     FLORESCER_SESSAO_SEGREDO  um texto aleatório longo

   Para gerar os dois:  node ferramentas/gerar-usuario.mjs julia senhaDela

   Tirar o acesso de alguém = remover a linha dessa pessoa do
   FLORESCER_USUARIOS e salvar. Vale na hora, no próximo carregamento.
   =========================================================================== */

const COOKIE = 'florescer_sessao';
const DURACAO_SESSAO = 12 * 60 * 60;   // 12 horas, em segundos
const ATRASO_ERRO = 600;               // ms de espera após senha errada

/* Único arquivo entregue sem login: o logo, que a tela de login exibe. */
const PUBLICOS = new Set(['/assets/img/logo-florescer.png']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* Sem os segredos configurados, o site fica fechado — nunca aberto. */
    if (!env.FLORESCER_USUARIOS || !env.FLORESCER_SESSAO_SEGREDO) {
      return paginaAviso();
    }

    if (PUBLICOS.has(url.pathname)) return env.ASSETS.fetch(request);

    if (url.pathname === '/sair') return sair();

    if (url.pathname === '/entrar') {
      return request.method === 'POST'
        ? entrar(request, env)
        : telaLogin();
    }

    const sessao = await lerSessao(request, env);
    if (!sessao) return paraLogin();

    return entregarArquivo(request, env);
  }
};

/* =========================================================================
   ENTREGA DOS ARQUIVOS (só depois da sessão validada)
   ========================================================================= */

async function entregarArquivo(request, env) {
  const original = await env.ASSETS.fetch(request);
  const resposta = new Response(original.body, original);
  /* Conteúdo autenticado não pode ficar em cache compartilhado. */
  resposta.headers.set('Cache-Control', 'private, no-store');
  resposta.headers.set('X-Content-Type-Options', 'nosniff');
  resposta.headers.set('X-Frame-Options', 'DENY');
  resposta.headers.set('Referrer-Policy', 'same-origin');
  return resposta;
}

/* =========================================================================
   LOGIN E SESSÃO
   ========================================================================= */

async function entrar(request, env) {
  let formulario;
  try { formulario = await request.formData(); }
  catch (e) { return telaLogin('Não consegui ler o formulário.', 400); }

  const usuario = String(formulario.get('usuario') || '').trim().toLowerCase();
  const senha = String(formulario.get('senha') || '');

  let usuarios;
  try { usuarios = JSON.parse(env.FLORESCER_USUARIOS); }
  catch (e) { return paginaAviso('O segredo FLORESCER_USUARIOS não é um JSON válido.'); }

  const esperado = usuarios && typeof usuarios === 'object' ? usuarios[usuario] : null;
  /* Calcula o hash mesmo com usuário inexistente: o tempo de resposta
     não revela se o nome existe. */
  const recebido = await sha256Hex(`${usuario}:${senha}`);
  const ok = typeof esperado === 'string' && iguais(recebido, esperado.trim().toLowerCase());

  if (!ok) {
    await espera(ATRASO_ERRO);
    return telaLogin('Usuário ou senha incorretos.', 401);
  }

  const cookie = await criarSessao(usuario, env);
  return new Response(null, {
    status: 303,
    headers: {
      'Location': '/',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE}=${cookie}; HttpOnly; Secure; SameSite=Strict; `
        + `Path=/; Max-Age=${DURACAO_SESSAO}`
    }
  });
}

function sair() {
  return new Response(null, {
    status: 303,
    headers: {
      'Location': '/entrar',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
    }
  });
}

function paraLogin() {
  return new Response(null, {
    status: 303,
    headers: { 'Location': '/entrar', 'Cache-Control': 'no-store' }
  });
}

async function criarSessao(usuario, env) {
  const expira = Math.floor(Date.now() / 1000) + DURACAO_SESSAO;
  const corpo = paraB64url(textoEmBytes(JSON.stringify({ u: usuario, exp: expira })));
  const assinatura = await assinar(env.FLORESCER_SESSAO_SEGREDO, corpo);
  return `${corpo}.${assinatura}`;
}

async function lerSessao(request, env) {
  const bruto = lerCookie(request, COOKIE);
  if (!bruto) return null;

  const corte = bruto.lastIndexOf('.');
  if (corte <= 0) return null;

  const corpo = bruto.slice(0, corte);
  const assinatura = bruto.slice(corte + 1);

  /* Assinatura conferida antes de olhar o conteúdo: cookie adulterado
     não chega a ser interpretado. */
  const esperada = await assinar(env.FLORESCER_SESSAO_SEGREDO, corpo);
  if (!iguais(assinatura, esperada)) return null;

  let dados;
  try { dados = JSON.parse(bytesEmTexto(deB64url(corpo))); }
  catch (e) { return null; }

  if (!dados || typeof dados.exp !== 'number') return null;
  if (dados.exp < Math.floor(Date.now() / 1000)) return null;

  return dados;
}

/* =========================================================================
   FERRAMENTAS DE CRIPTOGRAFIA
   ========================================================================= */

const textoEmBytes = (t) => new TextEncoder().encode(t);
const bytesEmTexto = (b) => new TextDecoder().decode(b);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function sha256Hex(texto) {
  const resumo = await crypto.subtle.digest('SHA-256', textoEmBytes(texto));
  return [...new Uint8Array(resumo)]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function assinar(segredo, dados) {
  const chave = await crypto.subtle.importKey(
    'raw', textoEmBytes(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const assinatura = await crypto.subtle.sign('HMAC', chave, textoEmBytes(dados));
  return paraB64url(new Uint8Array(assinatura));
}

/* Comparação em tempo constante: não entrega pistas pelo tempo de resposta. */
function iguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

function paraB64url(bytes) {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(texto) {
  let b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function lerCookie(request, nome) {
  const cabecalho = request.headers.get('Cookie');
  if (!cabecalho) return null;
  for (const parte of cabecalho.split(';')) {
    const igual = parte.indexOf('=');
    if (igual < 0) continue;
    if (parte.slice(0, igual).trim() === nome) return parte.slice(igual + 1).trim();
  }
  return null;
}

/* =========================================================================
   TELAS
   ========================================================================= */

const ESTILO = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;
       justify-content:center;padding:24px;background:#f6f3ef;color:#23201d;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .caixa{width:100%;max-width:370px;background:#fff;border:1px solid #e3ded7;
         border-radius:14px;padding:34px 30px;
         box-shadow:0 1px 3px rgba(0,0,0,.04),0 12px 32px rgba(0,0,0,.07)}
  .marca{text-align:center;margin-bottom:26px}
  .marca img{width:170px;height:auto}
  h1{margin:0 0 22px;font-size:14px;font-weight:600;text-align:center;color:#6d665f}
  label{display:block;font-size:12px;font-weight:550;color:#6d665f;margin-bottom:5px}
  input{width:100%;font:inherit;font-size:14px;padding:10px 12px;margin-bottom:16px;
        border:1px solid #e3ded7;border-radius:8px;background:#fdfcfa;color:#23201d}
  input:focus{outline:none;border-color:#8a6f4e;background:#fff;
              box-shadow:0 0 0 3px rgba(138,111,78,.13)}
  button{width:100%;font:inherit;font-size:14px;font-weight:550;padding:11px;
         border:0;border-radius:8px;background:#8a6f4e;color:#fff;cursor:pointer}
  button:hover{background:#796143}
  .erro{margin:0 0 18px;padding:9px 12px;border-radius:8px;background:#fdf3f2;
        border:1px solid #e8cfcc;color:#a8382f;font-size:13px;text-align:center}
  .rodape{margin:20px 0 0;font-size:11px;color:#a09689;text-align:center;line-height:1.5}
`;

function pagina(corpo, status) {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acesso — Florescer Cerimônias</title>
<link rel="icon" href="/assets/img/logo-florescer.png">
<style>${ESTILO}</style></head><body>${corpo}</body></html>`,
    {
      status: status || 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'same-origin'
      }
    }
  );
}

function telaLogin(erro, status) {
  return pagina(`
    <main class="caixa">
      <div class="marca">
        <img src="/assets/img/logo-florescer.png" alt="Florescer Cerimônias">
      </div>
      <h1>Sistema de contratos</h1>
      ${erro ? `<p class="erro">${escapar(erro)}</p>` : ''}
      <form method="POST" action="/entrar">
        <label for="usuario">Usuário</label>
        <input id="usuario" name="usuario" autocomplete="username"
               autocapitalize="none" spellcheck="false" required autofocus>
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password"
               autocomplete="current-password" required>
        <button type="submit">Entrar</button>
      </form>
      <p class="rodape">Acesso restrito à equipe da Florescer.</p>
    </main>`, status);
}

function paginaAviso(detalhe) {
  return pagina(`
    <main class="caixa">
      <h1>Acesso ainda não configurado</h1>
      <p class="erro">${escapar(detalhe || 'Faltam os segredos FLORESCER_USUARIOS e FLORESCER_SESSAO_SEGREDO.')}</p>
      <p class="rodape">
        O site está fechado até que a configuração seja concluída no painel da
        Cloudflare, em Settings &rarr; Variables and Secrets.
      </p>
    </main>`, 503);
}

const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
