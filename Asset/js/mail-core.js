/*! Copyright (c) 2026 OrkFlowTech
 *  SPDX-License-Identifier: MIT
 *  Included in MailToTask under the MIT License (see LICENSE).
 *  Originally developed for the proprietary K-OrkFlowTech extension.
 *  This MIT grant applies to the MailToTask copy; the original extension
 *  retains its separate proprietary licensing terms.
 *  https://www.orkflowtech.com.br/
 */
/* K-OrkFlowTech — K-Mail2Task: núcleo (core/mail-core.js)
 *
 * [1.12.0] Lógica pura: sem DOM, sem rede, sem chrome.*. Roda no content
 * script e no Node dos testes, igual.
 *
 * O QUE A ANÁLISE DA SUÍTE MUDOU NO PLANO ORIGINAL
 *
 * O pedido fala em "capturar o e-mail selecionado no Outlook". Vale registrar o
 * limite técnico antes de qualquer linha de código:
 *
 *   Outlook Desktop  — inalcançável. Uma extensão do Chrome não lê a memória
 *                      nem o banco de um aplicativo Win32. Nenhuma arquitetura
 *                      resolve isso sem um agente instalado na máquina, que o
 *                      próprio enunciado proíbe.
 *   Outlook Web      — alcançável, mas exigiria um content script rodando em
 *                      outlook.office.com, lendo o painel de leitura. O DOM do
 *                      OWA muda sem aviso; seria o componente mais frágil da
 *                      suíte inteira.
 *   Arquivo e colagem— alcançável, estável e independente de fornecedor.
 *
 * Por isso o núcleo é de NORMALIZAÇÃO, não de captura: qualquer fonte entrega
 * texto ou bytes e este arquivo devolve sempre a mesma estrutura `Mensagem`.
 * Arrastar o e-mail do Outlook para a janela, salvar como .eml ou colar o
 * conteúdo são apenas três fontes da mesma porta. Acrescentar Gmail,
 * Thunderbird ou OWA depois é escrever uma fonte nova — nunca mexer aqui.
 *
 * ESTRUTURA `Mensagem` (contrato único entre fontes e conversor)
 *   { assunto, de:{nome,email}, para:[], cc:[], data:Date|null, messageId,
 *     textoPlano, textoHtml, anexos:[{nome,mime,tamanho,dados}], fonte, bruto }
 */
(() => {
  // ------------------------------------------------------- cabeçalhos MIME
  /** Junta linhas continuadas (RFC 5322 folding) e separa nome: valor. */
  function lerCabecalhos(bloco) {
    const linhas = String(bloco || '').split(/\r?\n/);
    const cabecalhos = new Map();
    let atual = null;
    for (const linha of linhas) {
      if (/^[ \t]/.test(linha) && atual) {
        cabecalhos.set(atual, `${cabecalhos.get(atual)} ${linha.trim()}`);
        continue;
      }
      const m = linha.match(/^([!-9;-~]+):\s?(.*)$/);
      if (!m) continue;
      atual = m[1].toLowerCase();
      // Cabeçalho repetido (Received, por exemplo): fica o primeiro.
      if (!cabecalhos.has(atual)) cabecalhos.set(atual, m[2]);
    }
    return cabecalhos;
  }

  /** Decodifica =?utf-8?B?...?= e =?iso-8859-1?Q?...?= de assunto e nomes. */
  function decodificarPalavras(texto) {
    return String(texto || '').replace(
      /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=(\s*)(?==\?|$|\S|\s)/g,
      (todo, charset, tipo, dados) => {
        try {
          let bytes;
          if (tipo.toLowerCase() === 'b') {
            bytes = base64ParaBytes(dados);
          } else {
            const q = dados.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            bytes = Uint8Array.from([...q].map(c => c.charCodeAt(0) & 0xff));
          }
          return decodificarBytes(bytes, charset);
        } catch (_) { return todo; }
      }
    ).replace(/\?=\s+=\?/g, '?==?');
  }

  function base64ParaBytes(b64) {
    const limpo = String(b64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
    const bin = typeof atob === 'function'
      ? atob(limpo)
      /* eslint-disable-next-line no-undef -- Buffer só existe no Node dos testes. */
      : Buffer.from(limpo, 'base64').toString('binary');
    return Uint8Array.from([...bin].map(c => c.charCodeAt(0) & 0xff));
  }

  function decodificarBytes(bytes, charset) {
    const cs = String(charset || 'utf-8').toLowerCase().replace(/['"]/g, '');
    try {
      if (typeof TextDecoder === 'function') return new TextDecoder(cs === 'us-ascii' ? 'utf-8' : cs).decode(bytes);
    } catch (_) { /* charset exótico: cai no latin1 abaixo */ }
    return [...bytes].map(b => String.fromCharCode(b)).join('');
  }

  function decodificarQuotedPrintable(texto) {
    return String(texto || '')
      .replace(/=\r?\n/g, '')                 // soft line break
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }

  /** Corpo de uma parte, já decodificado para texto conforme o encoding. */
  function corpoDaParte(corpo, encoding, charset) {
    const enc = String(encoding || '').toLowerCase();
    if (enc === 'base64') return decodificarBytes(base64ParaBytes(corpo), charset);
    if (enc === 'quoted-printable') {
      const bin = decodificarQuotedPrintable(corpo);
      return decodificarBytes(Uint8Array.from([...bin].map(c => c.charCodeAt(0) & 0xff)), charset);
    }
    return corpo;
  }

  const parametro = (valor, nome) => {
    const m = String(valor || '').match(new RegExp(`${nome}\\s*=\\s*"?([^";]+)"?`, 'i'));
    return m ? m[1].trim() : '';
  };

  // -------------------------------------------------------------- endereços
  /** "Fulano <f@x.com>", "f@x.com", '"Sobrenome, Nome" <n@x.com>'. */
  function lerEndereco(bruto) {
    const t = decodificarPalavras(String(bruto || '')).trim();
    const m = t.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
    if (m) {
      return { nome: m[1].replace(/^["']|["']$/g, '').trim(), email: m[2].trim() };
    }
    const soEmail = t.match(/[^\s<>,;]+@[^\s<>,;]+/);
    return { nome: soEmail && soEmail[0] === t ? '' : t.replace(/[<>]/g, '').trim(), email: soEmail ? soEmail[0] : '' };
  }

  /** Divide uma lista de destinatários respeitando vírgulas dentro de aspas. */
  function lerEnderecos(bruto) {
    const t = String(bruto || '');
    const partes = [];
    let atual = '';
    let aspas = false;
    for (const ch of t) {
      if (ch === '"') aspas = !aspas;
      if ((ch === ',' || ch === ';') && !aspas) { partes.push(atual); atual = ''; continue; }
      atual += ch;
    }
    partes.push(atual);
    return partes.map(lerEndereco).filter(e => e.email || e.nome);
  }

  // ------------------------------------------------------------- MIME
  function separarPartes(corpo, boundary) {
    const marca = `--${boundary}`;
    const bruto = String(corpo || '');
    const blocos = [];
    let i = bruto.indexOf(marca);
    if (i < 0) return blocos;
    i += marca.length;
    while (i < bruto.length) {
      if (bruto.startsWith('--', i)) break;                 // marca de fim
      const proximo = bruto.indexOf(`\n${marca}`, i);
      const fim = proximo < 0 ? bruto.length : proximo;
      blocos.push(bruto.slice(i, fim).replace(/^\r?\n/, ''));
      if (proximo < 0) break;
      i = proximo + 1 + marca.length;
    }
    return blocos;
  }

  function analisarParte(bruto, acumulador) {
    const corte = bruto.search(/\r?\n\r?\n/);
    const cabecalhos = lerCabecalhos(corte < 0 ? bruto : bruto.slice(0, corte));
    const corpo = corte < 0 ? '' : bruto.slice(corte).replace(/^\r?\n\r?\n/, '');
    const tipo = (cabecalhos.get('content-type') || 'text/plain').toLowerCase();
    const encoding = cabecalhos.get('content-transfer-encoding') || '';
    const disposicao = (cabecalhos.get('content-disposition') || '').toLowerCase();
    const charset = parametro(cabecalhos.get('content-type'), 'charset') || 'utf-8';

    if (tipo.startsWith('multipart/')) {
      const boundary = parametro(cabecalhos.get('content-type'), 'boundary');
      if (boundary) {
        for (const sub of separarPartes(corpo, boundary)) analisarParte(sub, acumulador);
        return;
      }
    }

    const nomeAnexo = decodificarPalavras(
      parametro(cabecalhos.get('content-disposition'), 'filename') ||
      parametro(cabecalhos.get('content-type'), 'name'));

    if (disposicao.startsWith('attachment') || (nomeAnexo && !tipo.startsWith('text/'))) {
      const dados = String(encoding).toLowerCase() === 'base64'
        ? String(corpo).replace(/\s+/g, '')
        : '';
      acumulador.anexos.push({
        nome: nomeAnexo || 'anexo',
        mime: tipo.split(';')[0].trim(),
        /* Tamanho estimado a partir do base64; o byte exato só existiria
           decodificando, e para escolher o que enviar a estimativa basta. */
        tamanho: dados ? Math.floor(dados.length * 3 / 4) : 0,
        dados,
        embutido: disposicao.startsWith('inline'),
      });
      return;
    }

    const texto = corpoDaParte(corpo, encoding, charset);
    if (tipo.startsWith('text/html')) acumulador.html.push(texto);
    else if (tipo.startsWith('text/')) acumulador.plano.push(texto);
  }

  /** HTML → texto legível, sem depender de DOM (roda no service worker e no Node). */
  function htmlParaTexto(html) {
    return String(html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ------------------------------------------------------------ fontes
  /** Fonte "eml": arquivo .eml ou qualquer RFC 5322 completo. */
  function lerEml(texto) {
    const bruto = String(texto || '');
    const acumulador = { plano: [], html: [], anexos: [] };
    analisarParte(bruto, acumulador);
    const corte = bruto.search(/\r?\n\r?\n/);
    const cabecalhos = lerCabecalhos(corte < 0 ? bruto : bruto.slice(0, corte));
    const data = cabecalhos.get('date') ? new Date(cabecalhos.get('date')) : null;
    return {
      assunto: decodificarPalavras(cabecalhos.get('subject') || '').trim(),
      de: lerEndereco(cabecalhos.get('from') || ''),
      para: lerEnderecos(cabecalhos.get('to') || ''),
      cc: lerEnderecos(cabecalhos.get('cc') || ''),
      data: data && !Number.isNaN(data.getTime()) ? data : null,
      messageId: String(cabecalhos.get('message-id') || '').replace(/^<|>$/g, '').trim(),
      textoPlano: acumulador.plano.join('\n').trim(),
      textoHtml: acumulador.html.join('\n').trim(),
      anexos: acumulador.anexos,
      fonte: 'eml',
      bruto,
    };
  }

  /**
   * Fonte "colagem": o que o usuário copia da janela do Outlook.
   * O Outlook copia um cabeçalho em português ou inglês antes do corpo; esta
   * função reconhece os dois e, se nada bater, joga tudo para o corpo em vez de
   * perder o conteúdo.
   */
  const ROTULOS = {
    assunto: ['assunto', 'subject'],
    de: ['de', 'from', 'remetente'],
    para: ['para', 'to'],
    cc: ['cc', 'cópia', 'copia'],
    data: ['enviada em', 'enviado em', 'enviada', 'enviado', 'sent', 'sent on', 'date', 'data'],
  };

  const MESES_PT = {janeiro:0,fevereiro:1,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11};
  function lerDataFlexivel(valor) {
    const bruto = String(valor || '').trim();
    if (!bruto) return null;
    const nativo = new Date(bruto);
    if (!Number.isNaN(nativo.getTime())) return nativo;
    const simples = bruto.match(/(?:^|\D)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
    if (simples) {
      const d = new Date(Number(simples[3]), Number(simples[2]) - 1, Number(simples[1]), Number(simples[4] || 0), Number(simples[5] || 0));
      if (!Number.isNaN(d.getTime())) return d;
    }
    const norm = bruto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const pt = norm.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})(?:[^0-9]+(\d{1,2}):(\d{2}))?/);
    if (pt) {
      const d = new Date(Number(pt[3]), MESES_PT[pt[2]], Number(pt[1]), Number(pt[4] || 0), Number(pt[5] || 0));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }

  function lerColagem(texto) {
    const linhas = String(texto || '').split(/\r?\n/);
    const achado = {};
    const indicesCabecalho = [];
    /* O Outlook pode inserir uma linha de separação/título antes dos cabeçalhos.
       Em vez de parar na primeira linha não reconhecida, procuramos um pequeno
       bloco de cabeçalhos nas primeiras 32 linhas. Isso cobre Outlook clássico,
       novo Outlook e cópias de mensagens encaminhadas sem confundir o corpo todo. */
    for (let i = 0; i < Math.min(linhas.length, 32); i++) {
      const m = linhas[i].match(/^\s*([A-Za-zÀ-ÿ ]{2,20})\s*:\s*(.+)$/);
      if (!m) continue;
      const chave = m[1].trim().toLowerCase();
      for (const [campo, nomes] of Object.entries(ROTULOS)) {
        if (nomes.includes(chave) && !achado[campo]) {
          achado[campo] = m[2].trim();
          indicesCabecalho.push(i);
          break;
        }
      }
    }
    /* Fallback conservador para remetente: se o bloco não trouxe "De", usa
       uma linha inicial que contenha um endereço de e-mail e não seja Para/Cc. */
    if (!achado.de) {
      for (let i = 0; i < Math.min(linhas.length, 16); i++) {
        const l = String(linhas[i] || '').trim();
        if (!/@/.test(l) || /^(para|to|cc|cópia|copia)\s*:/i.test(l)) continue;
        achado.de = l.replace(/^(de|from|remetente)\s*:\s*/i, '').trim();
        indicesCabecalho.push(i);
        break;
      }
    }
    const ultimoCabecalho = indicesCabecalho.length ? Math.max(...indicesCabecalho) : -1;
    const corpo = (ultimoCabecalho >= 0 ? linhas.slice(ultimoCabecalho + 1) : linhas)
      .join('\n').replace(/^\s*\n+/, '');
    const data = lerDataFlexivel(achado.data);
    return {
      assunto: (achado.assunto || '').trim(),
      de: lerEndereco(achado.de || ''),
      para: lerEnderecos(achado.para || ''),
      cc: lerEnderecos(achado.cc || ''),
      data: data && !Number.isNaN(data.getTime()) ? data : null,
      messageId: '',
      textoPlano: corpo.trim(),
      textoHtml: '',
      anexos: [],
      fonte: 'colagem',
      bruto: String(texto || ''),
    };
  }

  /** Escolhe a fonte pelo conteúdo, sem o usuário precisar dizer qual é. */
  function normalizar(texto, fonteSugerida) {
    const bruto = String(texto || '');
    if (fonteSugerida === 'eml') return lerEml(bruto);
    if (fonteSugerida === 'colagem') return lerColagem(bruto);
    const pareceEml = /^\s*(from|to|subject|date|message-id|received|mime-version|content-type)\s*:/im.test(bruto)
      && /\r?\n\r?\n/.test(bruto);
    return pareceEml ? lerEml(bruto) : lerColagem(bruto);
  }

  // ------------------------------------------------- conversão em cartão
  const dataBr = d => (d instanceof Date && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('pt-BR')
    : 'data não informada');

  function corpoLegivel(mensagem, limite = 4000) {
    const texto = mensagem.textoPlano || htmlParaTexto(mensagem.textoHtml);
    const limpo = String(texto || '')
      .replace(/\r/g, '')
      .replace(/^[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (limpo.length <= limite) return limpo;
    return `${limpo.slice(0, limite).trim()}\n\n[conteúdo truncado — a mensagem original tem ${limpo.length} caracteres]`;
  }

  /** Título sugerido: assunto sem os prefixos de resposta e encaminhamento. */
  function tituloSugerido(mensagem, limite = 120) {
    let t = String(mensagem.assunto || '').trim();
    let antes;
    do {
      antes = t;
      t = t.replace(/^\s*(re|res|enc|fw|fwd|encaminhad[ao])\s*(\[\d+\])?\s*:\s*/i, '');
    } while (t !== antes);
    t = t.replace(/\s+/g, ' ').trim();
    if (!t) return 'Demanda recebida por e-mail';
    return t.length > limite ? `${t.slice(0, limite - 1).trim()}…` : t;
  }

  const remetenteLegivel = de => {
    if (!de) return 'não identificado';
    if (de.nome && de.email) return `${de.nome} <${de.email}>`;
    return de.nome || de.email || 'não identificado';
  };

  /**
   * Descrição no padrão da suíte. Usa os mesmos marcadores do K-Situação em
   * volta da seção "Situação Atual", para que aquele módulo possa atualizá-la
   * depois sem reescrever o resto — os dois módulos passam a falar a mesma
   * língua dentro da descrição do cartão.
   */
  const MARCA_INICIO = '[status-report-start]: #';
  const MARCA_FIM = '[status-report-end]: #';

  function descricaoDe(mensagem, opcoes = {}) {
    const objetivo = String(opcoes.objetivo || '').trim() || tituloSugerido(mensagem);
    const partes = [
      '## Objetivo',
      '',
      objetivo,
      '',
      MARCA_INICIO,
      '',
      '## Situação Atual',
      '',
      `Demanda recebida por e-mail em ${dataBr(mensagem.data)}.`,
      '',
      MARCA_FIM,
      '',
      '## Origem da Demanda',
      '',
      String(opcoes.origem || 'E-mail'),
      '',
      '## Remetente',
      '',
      remetenteLegivel(mensagem.de),
      '',
      '## Assunto Original',
      '',
      String(mensagem.assunto || '(sem assunto)'),
    ];
    return partes.join('\n');
  }

  /**
   * Referência do cartão: identifica a mensagem, para detectar reconversão.
   * Message-ID vem entre < >, pode ter caracteres que o campo não aceita bem;
   * daí o resumo determinístico em vez do valor cru.
   */
  function referenciaDe(mensagem) {
    const semente = mensagem.messageId
      || `${mensagem.assunto}|${(mensagem.de && mensagem.de.email) || ''}|${mensagem.data ? mensagem.data.toISOString() : ''}`;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < semente.length; i++) {
      h1 = ((h1 ^ semente.charCodeAt(i)) * 0x01000193) >>> 0;
      h2 = ((h2 + semente.charCodeAt(i) * (i + 7)) * 0x85ebca6b) >>> 0;
    }
    return `kmt:${h1.toString(36)}${h2.toString(36)}`;
  }

  /** Campos do cartão sugeridos a partir da mensagem. Tudo editável depois. */
  function cartaoSugerido(mensagem, opcoes = {}) {
    return {
      titulo: tituloSugerido(mensagem),
      descricao: descricaoDe(mensagem, opcoes),
      referencia: '',
      dataInicio: mensagem.data ? mensagem.data.toISOString().slice(0, 10) : '',
      /* [1.15.0-BETA18] Um anexo tem bytes de duas formas: `dados` em Base64
         (arquivos .eml/.msg e o HTML que a suíte gera) ou `refId`, a chave do
         Blob guardado no IndexedDB pela captura de webmail. O que NÃO tem
         nenhuma das duas não é oferecido para envio — requisito 12. */
      anexos: (mensagem.anexos || []).filter(a => !a.embutido && (a.dados || a.refId)),
    };
  }

  function resumo(mensagem) {
    return {
      assunto: mensagem.assunto || '(sem assunto)',
      remetente: remetenteLegivel(mensagem.de),
      destinatarios: (mensagem.para || []).map(remetenteLegivel).join('; '),
      data: mensagem.data ? mensagem.data.toLocaleString('pt-BR') : 'não informada',
      messageId: mensagem.messageId || '',
      anexos: (mensagem.anexos || []).filter(a => !a.embutido).length,
      caracteres: corpoLegivel(mensagem, Infinity).length,
      fonte: mensagem.fonte,
    };
  }

  /**
   * [1.13.0] Porta única para QUALQUER fonte, texto ou binário.
   * .msg chega como bytes e é delegado a core/mail-msg.js, que devolve a mesma
   * estrutura `Mensagem`. O conversor abaixo não sabe de onde veio.
   */
  function normalizarArquivo(conteudo, nome) {
    const ehBinario = conteudo instanceof ArrayBuffer || ArrayBuffer.isView(conteudo);
    const leitorMsg = (typeof self !== 'undefined' && self.oftMailMsg)
      || (typeof window !== 'undefined' && window.oftMailMsg)
      || (typeof globalThis !== 'undefined' && globalThis.oftMailMsg) || null;
    if (ehBinario) {
      if (!leitorMsg) throw new Error('Leitor de .msg indisponível nesta página.');
      if (!leitorMsg.ehMsg(conteudo)) throw new Error('Arquivo binário que não é um .msg do Outlook.');
      return leitorMsg.lerMsg(conteudo, { lerCabecalhos, lerEndereco, lerEnderecos });
    }
    return normalizar(conteudo, /\.eml$/i.test(String(nome || '')) ? 'eml' : undefined);
  }

  const api = {
    version: '1.13.0',
    normalizarArquivo,
    lerCabecalhos,
    MARCA_INICIO,
    MARCA_FIM,
    normalizar,
    lerEml,
    lerColagem,
    lerEndereco,
    lerEnderecos,
    decodificarPalavras,
    htmlParaTexto,
    tituloSugerido,
    descricaoDe,
    referenciaDe,
    cartaoSugerido,
    corpoLegivel,
    resumo,
  };

  if (typeof self !== 'undefined') self.oftMailCore = api;
  if (typeof window !== 'undefined') window.oftMailCore = api;
  /* eslint-disable-next-line no-undef -- `module` só existe no Node dos testes. */
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
