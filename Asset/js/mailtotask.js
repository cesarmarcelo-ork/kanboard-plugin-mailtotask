/* MailToTask v0.4 development: in-browser preview and multipart binary preservation. */
(function () {
  'use strict';
  const messages = {
    pt: {
      invalid: 'Selecione uma mensagem .msg ou .eml.',
      size: 'A mensagem deve ter no máximo 20 MiB.',
      readers: 'Leitores Outlook não carregados. Recarregue a página.',
      empty: 'Não foi possível interpretar o conteúdo da mensagem.',
      original: 'Mensagem original',
      sender: 'Remetente',
      date: 'Data',
      missing: 'Não disponível',
      bodyMissing: 'Conteúdo não disponível: consulte o arquivo original.',
      files: 'Arquivos que serão anexados ao cartão',
      selected: 'Mensagem interpretada. Revise e defina o Objetivo antes de criar o cartão.',
      select: 'O Outlook não forneceu um arquivo. Salve a mensagem como .msg/.eml antes de arrastar.',
      type: 'Aceitamos somente mensagens .msg/.eml.',
      over: 'Mensagem acima do limite de 20 MiB.',
      parsing: 'Interpretando mensagem e preparando anexos...',
      many: 'Mensagem tem mais de 40 anexos.',
      missingBytes: 'Anexo sem conteúdo recuperável: ',
      decode: 'Falha ao decodificar o anexo: ',
      total: 'A soma dos anexos extraídos ultrapassa 20 MiB.',
      fail: 'Falha de importação: ',
      first: 'Interprete a mensagem antes de criar o cartão.',
      objective: 'O Objetivo deve ser preenchido manualmente.',
      sending: 'Enviando mensagem e anexos...',
      fallback: 'Demanda recebida por e-mail',
      browser: 'Navegador impediu o preparo dos anexos.'
    },
    en: {
      invalid: 'Choose a .msg or .eml message.',
      size: 'Message must be 20 MiB or smaller.',
      readers: 'Outlook readers are unavailable. Reload this page.',
      empty: 'Unable to parse message content.',
      original: 'Original message',
      sender: 'Sender',
      date: 'Date',
      missing: 'Not available',
      bodyMissing: 'Content unavailable: see the original message.',
      files: 'Files to be attached to the task',
      selected: 'Message parsed. Review it and write the Objective before creating the task.',
      select: 'Outlook did not provide a file. Save the message as .msg/.eml before dropping it.',
      type: 'Only Outlook .msg/.eml messages are supported.',
      over: 'Message exceeds the 20 MiB limit.',
      parsing: 'Parsing message and preparing attachments...',
      many: 'Message contains more than 40 attachments.',
      missingBytes: 'Attachment has no recoverable bytes: ',
      decode: 'Could not decode attachment: ',
      total: 'Extracted attachments exceed 20 MiB in total.',
      fail: 'Import failed: ',
      first: 'Parse the message before creating the task.',
      objective: 'You must write the Objective yourself.',
      sending: 'Uploading message and attachments...',
      fallback: 'Request received by email',
      browser: 'Browser could not prepare file attachments.'
    }
  };
  const locale = (document.documentElement.lang || 'pt').toLowerCase().startsWith('en') ? 'en' : 'pt';
  const tr = key => messages[locale][key] || messages.pt[key] || key;
  const MAX_BYTES = 20 * 1024 * 1024;
  const MAX_FILES = 40;
  const readable = n => (n / 1024 / 1024).toFixed(2) + ' MiB';
  const originalSource = file => /\.(eml|msg)$/i.test(file.name);
  const plain = value => String(value == null ? '' : value).trim();
  function ready() {
    const root = document.querySelector('[data-mailtotask]');
    if (!root) return;
    const form = root.querySelector('#mt-create');
    const picker = root.querySelector('#mt-file');
    const drop = root.querySelector('#mt-drop');
    const message = root.querySelector('#mt-info');
    const raw = root.querySelector('#mt-raw');
    const originalInput = root.querySelector('#mt-original-upload');
    const attachmentsInput = root.querySelector('#mt-extracted-upload');
    const count = root.querySelector('#mt-attachments-expected');
    const review = root.querySelector('#mt-review');
    const meta = root.querySelector('#mt-origin');
    const body = root.querySelector('#mt-message');
    const names = root.querySelector('#mt-attachment-list');
    const submit = root.querySelector('#mt-create-button');
    let selected = null;
    let parsed = null;
    let extracting = false;
    let readyToSend = false;

    function inform(msg, error) {
      message.textContent = msg;
      message.className = error ? 'mt-error' : 'mt-ok';
    }
    function putFiles(input, files) {
      const transfer = new DataTransfer();
      files.forEach(f => transfer.items.add(f));
      input.files = transfer.files;
      if (input.files.length !== files.length) throw new Error(tr('browser'));
    }
    function binaryBase64(encoded) {
      const raw = atob(String(encoded || ''));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return bytes;
    }
    function cleanName(name) {
      const result = plain(name).replace(/[/\\]+/g, '_').replace(/[\x00-\x1f\x7f]/g, '_');
      return result || 'anexo.bin';
    }
    function toFile(item) {
      if (!item.dados || item.embutido) return null;
      const bytes = binaryBase64(item.dados);
      if (!bytes.length) return null;
      return new File([bytes], cleanName(item.nome), {type: item.mime || 'application/octet-stream'});
    }
    async function interpret(file) {
      if (!file || !originalSource(file)) throw new Error(tr('invalid'));
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error(tr('size'));
      if (!window.oftMailCore || !window.oftMailMsg) throw new Error(tr('readers'));
      const normalized = /\.msg$/i.test(file.name)
        ? window.oftMailCore.normalizarArquivo(await file.arrayBuffer(), file.name)
        : window.oftMailCore.normalizarArquivo(await file.text(), file.name);
      if (!plain(normalized.assunto) && !plain(normalized.textoPlano) && !plain(normalized.textoHtml)) {
        throw new Error(tr('empty'));
      }
      return normalized;
    }
    function display(m, file, attachments) {
      root.querySelector('#mt-title').value = plain(m.assunto) || tr('fallback');
      const from = m.de ? (plain(m.de.nome) + ' <' + plain(m.de.email) + '>') : '';
      const date = m.data instanceof Date && !Number.isNaN(m.data.getTime()) ? m.data.toLocaleString('pt-BR') : '';
      const line = [
        [tr('sender'), from], [tr('date'), date], ['Message-ID', m.messageId || tr('missing')],
        ['Original', file.name + ' (' + readable(file.size) + ')'],
      ];
      meta.replaceChildren();
      for (const pair of line) {
        const holder = document.createElement('div');
        const label = document.createElement('b');
        label.textContent = pair[0];
        holder.append(label, document.createTextNode(plain(pair[1])));
        meta.appendChild(holder);
      }
      const plainBody = m.textoPlano || (window.oftMailCore.htmlParaTexto ? window.oftMailCore.htmlParaTexto(m.textoHtml) : '') || '';
      body.textContent = plainBody.slice(0, 20000) || tr('bodyMissing');
      names.replaceChildren();
      const label = document.createElement('strong');
      label.textContent = tr('files');
      names.appendChild(label);
      const ul = document.createElement('ul');
      const originalLi = document.createElement('li');
      originalLi.textContent = 'Mensagem original: ' + file.name;
      ul.appendChild(originalLi);
      attachments.forEach(a => {
        const li = document.createElement('li');
        li.textContent = a.name + ' (' + readable(a.size) + ')';
        ul.appendChild(li);
      });
      names.appendChild(ul);
      review.classList.remove('mt-hidden');
      submit.disabled = false;
      const total = attachments.reduce((n, a) => n + a.size, 0);
      inform(tr('selected') + ' (' + attachments.length + ', ' + readable(total) + ')', false);
    }
    async function choose(file) {
      selected = null;
      parsed = null;
      readyToSend = false;
      submit.disabled = true;
      review.classList.add('mt-hidden');
      if (!file) { inform(tr('select'), true); return; }
      if (!originalSource(file)) { inform(tr('type'), true); return; }
      if (file.size > MAX_BYTES) { inform(tr('over'), true); return; }
      if (extracting) return;
      extracting = true;
      inform(tr('parsing'), false);
      try {
        const msg = await interpret(file);
        const extracted = [];
        let sum = 0;
        const relevant = (msg.anexos || []).filter(a => !a.embutido);
        if (relevant.length > MAX_FILES) throw new Error(tr('many'));
        for (const item of relevant) {
          if (!item.dados) throw new Error(tr('missingBytes') + cleanName(item.nome) + ' não possui conteúdo recuperável.');
          const attachment = toFile(item);
          if (!attachment) throw new Error(tr('decode') + cleanName(item.nome));
          sum += attachment.size;
          if (sum > MAX_BYTES) throw new Error(tr('total'));
          extracted.push(attachment);
        }
        putFiles(originalInput, [file]);
        putFiles(attachmentsInput, extracted);
        count.value = String(extracted.length);
        selected = file;
        parsed = msg;
        readyToSend = true;
        display(msg, file, extracted);
      } catch (err) {
        inform(tr('fail') + (err && err.message || err), true);
      } finally { extracting = false; }
    }
    if (drop) {
      ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, event => {
        event.preventDefault();
        drop.classList.add('mt-over');
      }));
      ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, event => {
        event.preventDefault();
        drop.classList.remove('mt-over');
      }));
      drop.addEventListener('drop', event => {
        const f = event.dataTransfer && event.dataTransfer.files;
        choose(f && f.length ? f[0] : null);
      });
    }
    picker.addEventListener('change', () => choose(picker.files && picker.files[0]));
    form.addEventListener('submit', e => {
      if (!readyToSend || !selected || !parsed || extracting) {
        e.preventDefault();
        inform(tr('first'), true);
      } else if (!plain(root.querySelector('#mt-objective').value)) {
        e.preventDefault();
        inform(tr('objective'), true);
      } else {
        submit.disabled = true;
        submit.textContent = tr('sending');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
