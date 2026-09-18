/* ===========================================================================
   GERADOR DE USUÁRIO E SENHA
   ---------------------------------------------------------------------------
   Uso:   node ferramentas/gerar-usuario.mjs <usuario> <senha>
   Ex.:   node ferramentas/gerar-usuario.mjs julia umaSenhaBoaAqui

   Imprime o que colar no painel da Cloudflare. A senha em si não fica
   guardada em lugar nenhum — só o hash, que não volta a ser senha.
   =========================================================================== */

import { createHash, randomBytes } from 'node:crypto';

const [, , usuarioBruto, senha] = process.argv;

if (!usuarioBruto || !senha) {
  console.error('Uso: node ferramentas/gerar-usuario.mjs <usuario> <senha>');
  process.exit(1);
}

const usuario = usuarioBruto.trim().toLowerCase();

if (senha.length < 8) {
  console.error(`A senha tem ${senha.length} caracteres. Use pelo menos 8.`);
  process.exit(1);
}

const hash = createHash('sha256').update(`${usuario}:${senha}`).digest('hex');

console.log(`
Cole no painel da Cloudflare, em Settings -> Variables and Secrets:

  Nome do segredo:  FLORESCER_USUARIOS
  Valor:            {"${usuario}":"${hash}"}

Para mais de uma pessoa, junte todas no mesmo JSON:

  {"julia":"<hash da Julia>","joao":"<hash do João>"}

---

Se ainda não criou o segredo da sessão, use este valor (sorteado agora):

  Nome do segredo:  FLORESCER_SESSAO_SEGREDO
  Valor:            ${randomBytes(32).toString('base64url')}

Trocar esse valor desconecta todo mundo na hora.
`);
