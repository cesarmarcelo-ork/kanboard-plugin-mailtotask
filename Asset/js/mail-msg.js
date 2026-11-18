/*! K-OrkFlowTech — Copyright (c) 2026 OrkFlowTech. Todos os direitos reservados.
 *  Software proprietário. Uso permitido; redistribuição, obra derivada e
 *  remoção deste aviso não são autorizadas. Ver LICENSE.
 *  https://www.orkflowtech.com.br/
 */
/* K-OrkFlowTech — K-Mail2Task: leitor de .msg (core/mail-msg.js)
 *
 * [1.13.0] Um .msg não é texto: é um Compound File Binary — o mesmo contêiner
 * OLE dos antigos .doc. Dentro dele, cada propriedade da mensagem é um fluxo
 * com nome codificado: `__substg1.0_0037001F` é o assunto em UTF-16, e
 * `__attach_version1.0_#00000000` é um depósito com o primeiro anexo.
 *
 * POR QUE VALEU IMPLEMENTAR
 *
 * A versão anterior recusava .msg e pedia para o usuário salvar como .eml.
 * Num ambiente Exchange com Outlook Desktop isso é um passo manual por e-mail —
 * e, pior, arrastar a mensagem do Outlook para o navegador entrega justamente
 * um .msg. Sem ler esse formato, o gesto mais natural do fluxo não funcionava.
 *
 * O QUE ESTE ARQUIVO FAZ
 *
 *   1. Lê o cabeçalho CFB, a FAT, a mini-FAT e a árvore de diretórios.
 *   2. Monta os fluxos, do setor normal ou do mini-fluxo conforme o tamanho.
 *   3. Traduz as propriedades que interessam para a mesma estrutura `Mensagem`
 *      que o .eml e a colagem produzem — nenhum consumidor sabe a diferença.
 *
 * Quando o .msg traz os cabeçalhos de internet (`007D`), data e Message-ID saem
 * de lá, reusando o analisador de cabeçalhos do mail-core. É o caminho mais
 * fiel: é o cabeçalho original da mensagem, não uma reconstrução.
 */
(() => {
  const ASSINATURA = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  const LIVRE = 0xffffffff;
  const FIM = 0xfffffffe;

  const ehMsg = bytes => {
    const b = new Uint8Array(bytes);
    return b.length > 512 && ASSINATURA.every((v, i) => b[i] === v);
  };

  /** Abre o contêiner e devolve um mapa caminho → Uint8Array. */
  function lerContainer(buffer) {
    const dados = new Uint8Array(buffer);
    const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
    if (!ehMsg(dados)) throw new Error('Arquivo não parece um .msg do Outlook.');

    const tamSetor = 1 << dv.getUint16(0x1e, true);
    const tamMini = 1 << dv.getUint16(0x20, true);
    const qtdFat = dv.getUint32(0x2c, true);
    const dirInicio = dv.getUint32(0x30, true);
    const corteMini = dv.getUint32(0x38, true);
    const miniFatInicio = dv.getUint32(0x3c, true);
    const qtdMiniFat = dv.getUint32(0x40, true);
    const difatInicio = dv.getUint32(0x44, true);
    const qtdDifat = dv.getUint32(0x48, true);

    const inicioDoSetor = s => 512 + s * tamSetor;
    const lerSetor = s => {
      const i = inicioDoSetor(s);
      if (i < 0 || i + tamSetor > dados.length) throw new Error('Setor fora do arquivo (.msg corrompido).');
      return dados.subarray(i, i + tamSetor);
    };

    // DIFAT: os 109 primeiros no cabeçalho, o resto encadeado.
    const setoresFat = [];
    for (let i = 0; i < 109 && setoresFat.length < qtdFat; i++) {
      const s = dv.getUint32(0x4c + i * 4, true);
      if (s !== LIVRE && s !== FIM) setoresFat.push(s);
    }
    let prox = difatInicio;
    for (let n = 0; n < qtdDifat && prox !== FIM && prox !== LIVRE; n++) {
      const bloco = new DataView(lerSetor(prox).buffer, lerSetor(prox).byteOffset, tamSetor);
      const cabem = tamSetor / 4 - 1;
      for (let i = 0; i < cabem && setoresFat.length < qtdFat; i++) {
        const s = bloco.getUint32(i * 4, true);
        if (s !== LIVRE && s !== FIM) setoresFat.push(s);
      }
      prox = bloco.getUint32(tamSetor - 4, true);
    }

    const fat = [];
    for (const s of setoresFat) {
      const bloco = lerSetor(s);
      const bdv = new DataView(bloco.buffer, bloco.byteOffset, bloco.byteLength);
      for (let i = 0; i < tamSetor / 4; i++) fat.push(bdv.getUint32(i * 4, true));
    }

    /* Trava contra cadeia circular: um arquivo truncado ou adulterado não pode
       prender o navegador num laço infinito. */
    const cadeia = (inicio, tabela) => {
      const saida = [];
      const vistos = new Set();
      let atual = inicio;
      while (atual !== FIM && atual !== LIVRE && atual < tabela.length) {
        if (vistos.has(atual)) break;
        vistos.add(atual);
        saida.push(atual);
        atual = tabela[atual];
        if (saida.length > 1048576) break;
      }
      return saida;
    };

    const juntar = (setores, leitor, tamanho) => {
      const total = new Uint8Array(setores.length * tamanho);
      setores.forEach((s, i) => total.set(leitor(s), i * tamanho));
      return total;
    };

    // Diretório
    const setoresDir = cadeia(dirInicio, fat);
    const dir = juntar(setoresDir, lerSetor, tamSetor);
    const ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    const entradas = [];
    for (let i = 0; i + 128 <= dir.length; i += 128) {
      const tamNome = ddv.getUint16(i + 0x40, true);
      let nome = '';
      for (let j = 0; j + 1 < Math.max(0, tamNome - 2); j += 2) {
        nome += String.fromCharCode(ddv.getUint16(i + j, true));
      }
      entradas.push({
        nome,
        tipo: dv.getUint8 ? ddv.getUint8(i + 0x42) : 0,
        esq: ddv.getInt32(i + 0x44, true),
        dir: ddv.getInt32(i + 0x48, true),
        filho: ddv.getInt32(i + 0x4c, true),
        inicio: ddv.getUint32(i + 0x74, true),
        tamanho: ddv.getUint32(i + 0x78, true),
      });
    }
    if (!entradas.length) throw new Error('Diretório vazio (.msg corrompido).');

    // Mini-FAT e mini-fluxo (o mini-fluxo vive na entrada raiz)
    const miniFat = [];
    for (const s of cadeia(miniFatInicio, fat).slice(0, Math.max(qtdMiniFat, 0) || undefined)) {
      const bloco = lerSetor(s);
      const bdv = new DataView(bloco.buffer, bloco.byteOffset, bloco.byteLength);
      for (let i = 0; i < tamSetor / 4; i++) miniFat.push(bdv.getUint32(i * 4, true));
    }
    const raiz = entradas[0];
    const miniFluxo = raiz.tamanho
      ? juntar(cadeia(raiz.inicio, fat), lerSetor, tamSetor).subarray(0, raiz.tamanho)
      : new Uint8Array(0);
    const lerMini = s => miniFluxo.subarray(s * tamMini, (s + 1) * tamMini);

    const conteudo = e => {
      if (!e.tamanho) return new Uint8Array(0);
      if (e.tamanho < corteMini) return juntar(cadeia(e.inicio, miniFat), lerMini, tamMini).subarray(0, e.tamanho);
      return juntar(cadeia(e.inicio, fat), lerSetor, tamSetor).subarray(0, e.tamanho);
    };

    /* A árvore de diretórios é rubro-negra; percorrer esquerda/direita/filho
       dá todos os nós sem depender da ordenação. */
    const arvore = new Map();
    const visitados = new Set();
    (function percorrer(indice, prefixo) {
      if (indice < 0 || indice >= entradas.length || visitados.has(indice)) return;
      visitados.add(indice);
      const e = entradas[indice];
      const caminho = prefixo ? `${prefixo}/${e.nome}` : e.nome;
      if (e.tipo === 2) arvore.set(caminho, conteudo(e));
      percorrer(e.esq, prefixo);
      percorrer(e.dir, prefixo);
      if (e.tipo === 1 || e.tipo === 5) percorrer(e.filho, e.tipo === 5 ? '' : caminho);
    })(0, '');

    return arvore;
  };

  // ---------------------------------------------------------- propriedades
  const utf16 = bytes => {
    let s = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return s.replace(/\0+$/, '');
  };
  const latin = bytes => String.fromCharCode(...bytes).replace(/\0+$/, '');
  const base64De = bytes => {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    /* eslint-disable-next-line no-undef -- Buffer só existe no Node dos testes. */
    return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  };

  /** Propriedade `tag` (4 dígitos hex) dentro de um prefixo de depósito. */
  function propriedade(arvore, tag, prefixo = '') {
    const base = prefixo ? `${prefixo}/` : '';
    const uni = arvore.get(`${base}__substg1.0_${tag}001F`);
    if (uni) return utf16(uni);
    const ansi = arvore.get(`${base}__substg1.0_${tag}001E`);
    if (ansi) return latin(ansi);
    return '';
  }
  const binario = (arvore, tag, prefixo = '') =>
    arvore.get(`${prefixo ? `${prefixo}/` : ''}__substg1.0_${tag}0102`) || null;

  /**
   * Converte um .msg na estrutura `Mensagem` do mail-core.
   * @param {ArrayBuffer|Uint8Array} buffer
   * @param {{lerCabecalhos:Function, lerEndereco:Function, lerEnderecos:Function}} apoio
   */
  function lerMsg(buffer, apoio) {
    const arvore = lerContainer(buffer);

    const assunto = propriedade(arvore, '0037') || propriedade(arvore, '0E1D');
    const nomeRemetente = propriedade(arvore, '0C1A') || propriedade(arvore, '0042');
    const emailRemetente = propriedade(arvore, '0C1F') || propriedade(arvore, '5D01') || propriedade(arvore, '0065');
    const para = propriedade(arvore, '0E04');
    const cc = propriedade(arvore, '0E03');
    const corpo = propriedade(arvore, '1000');
    const htmlBin = binario(arvore, '1013');
    const html = htmlBin ? latin(htmlBin) : propriedade(arvore, '1013');
    const cabecalhosBrutos = propriedade(arvore, '007D');

    /* Data e Message-ID saem dos cabeçalhos de internet quando existem: é o
       original da mensagem, não uma reconstrução a partir de FILETIME. */
    let data = null;
    let messageId = '';
    if (cabecalhosBrutos && apoio && typeof apoio.lerCabecalhos === 'function') {
      const cab = apoio.lerCabecalhos(cabecalhosBrutos);
      const d = cab.get('date') ? new Date(cab.get('date')) : null;
      if (d && !Number.isNaN(d.getTime())) data = d;
      messageId = String(cab.get('message-id') || '').replace(/^<|>$/g, '').trim();
    }
    if (!messageId) messageId = propriedade(arvore, '1035').replace(/^<|>$/g, '').trim();

    // Anexos: cada um num depósito __attach_version1.0_#XXXXXXXX
    const anexos = [];
    const depositos = new Set();
    for (const caminho of arvore.keys()) {
      const m = caminho.match(/^(__attach_version1\.0_#[0-9A-Fa-f]+)\//);
      if (m) depositos.add(m[1]);
    }
    for (const dep of [...depositos].sort()) {
      const dados = binario(arvore, '3701', dep);
      if (!dados || !dados.length) continue;
      const nome = propriedade(arvore, '3707', dep) || propriedade(arvore, '3704', dep) || 'anexo';
      const mime = propriedade(arvore, '370E', dep) || 'application/octet-stream';
      const cid = propriedade(arvore, '3712', dep);
      anexos.push({
        nome, mime, tamanho: dados.length, dados: base64De(dados),
        /* Imagem de assinatura tem Content-ID: é embutida, não anexo útil. */
        embutido: !!cid,
      });
    }

    const endereco = apoio && apoio.lerEndereco ? apoio.lerEndereco : (t => ({ nome: String(t || ''), email: '' }));
    const enderecos = apoio && apoio.lerEnderecos ? apoio.lerEnderecos : (t => (t ? [{ nome: String(t), email: '' }] : []));

    return {
      assunto: String(assunto || '').trim(),
      de: nomeRemetente || emailRemetente
        ? { nome: String(nomeRemetente || '').trim(), email: String(emailRemetente || '').trim() }
        : endereco(''),
      para: enderecos(para),
      cc: enderecos(cc),
      data,
      messageId,
      textoPlano: String(corpo || '').replace(/\r\n?/g, '\n').trim(),
      textoHtml: String(html || '').trim(),
      anexos,
      fonte: 'msg',
      bruto: '',
    };
  }

  const api = { version: '1.13.0', ehMsg, lerMsg, lerContainer };
  /* globalThis também: no Node dos testes não existe `self` nem `window`, e o
     mail-core precisa encontrar o leitor pelo mesmo caminho nos dois mundos. */
  if (typeof globalThis !== 'undefined') globalThis.oftMailMsg = api;
  if (typeof self !== 'undefined') self.oftMailMsg = api;
  if (typeof window !== 'undefined') window.oftMailMsg = api;
  /* eslint-disable-next-line no-undef -- `module` só existe no Node dos testes. */
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
