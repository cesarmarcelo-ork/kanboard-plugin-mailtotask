/* MailToTask v0.4 development: in-browser preview and multipart binary preservation. */
(function () {
  'use strict';
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
      if (input.files.length !== files.length) throw new Error('Navegador impediu o preparo dos anexos.');
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
      if (!file || !originalSource(file)) throw new Error('Selecione uma mensagem .msg ou .eml.');
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('A mensagem deve ter no máximo 20 MiB.');
      if (!window.oftMailCore || !window.oftMailMsg) throw new Error('Leitores Outlook não carregados. Recarregue a página.');
      const normalized = /\.msg$/i.test(file.name)
        ? window.oftMailCore.normalizarArquivo(await file.arrayBuffer(), file.name)
        : window.oftMailCore.normalizarArquivo(await file.text(), file.name);
      if (!plain(normalized.assunto) && !plain(normalized.textoPlano) && !plain(normalized.textoHtml)) {
        throw new Error('Não foi possível interpretar o conteúdo da mensagem.');
      }
      return normalized;
    }
    function display(m, file, attachments) {
      root.querySelector('#mt-title').value = plain(m.assunto) || 'Demanda recebida por e-mail';
      const from = m.de ? (plain(m.de.nome) + ' <' + plain(m.de.email) + '>') : '';
      const date = m.data instanceof Date && !Number.isNaN(m.data.getTime()) ? m.data.toLocaleString('pt-BR') : '';
      const line = [
        ['Remetente', from], ['Data', date], ['Message-ID', m.messageId || 'Não disponível'],
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
      body.textContent = plainBody.slice(0, 20000) || 'Conteúdo não disponível: consulte o arquivo original.';
      names.replaceChildren();
      const label = document.createElement('strong');
      label.textContent = 'Arquivos que serão anexados ao cartão';
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
      inform('Mensagem interpretada. ' + attachments.length + ' anexo(s) extraído(s), ' + readable(total) + '. Revise e defina o Objetivo antes de criar o cartão.', false);
    }
    async function choose(file) {
      selected = null;
      parsed = null;
      readyToSend = false;
      submit.disabled = true;
      review.classList.add('mt-hidden');
      if (!file) { inform('O Outlook não forneceu um arquivo. Salve a mensagem como .msg/.eml antes de arrastar.', true); return; }
      if (!originalSource(file)) { inform('Aceitamos somente mensagens .msg/.eml.', true); return; }
      if (file.size > MAX_BYTES) { inform('Mensagem acima do limite de 20 MiB.', true); return; }
      if (extracting) return;
      extracting = true;
      inform('Interpretando mensagem e preparando anexos...', false);
      try {
        const msg = await interpret(file);
        const extracted = [];
        let sum = 0;
        const relevant = (msg.anexos || []).filter(a => !a.embutido);
        if (relevant.length > MAX_FILES) throw new Error('Mensagem tem mais de 40 anexos.');
        for (const item of relevant) {
          if (!item.dados) throw new Error('O anexo ' + cleanName(item.nome) + ' não possui conteúdo recuperável.');
          const attachment = toFile(item);
          if (!attachment) throw new Error('Falha ao decodificar o anexo ' + cleanName(item.nome));
          sum += attachment.size;
          if (sum > MAX_BYTES) throw new Error('A soma dos anexos extraídos ultrapassa 20 MiB.');
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
        inform('Falha de importação: ' + (err && err.message || err), true);
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
        inform('Interprete a mensagem antes de criar o cartão.', true);
      } else if (!plain(root.querySelector('#mt-objective').value)) {
        e.preventDefault();
        inform('O Objetivo deve ser preenchido manualmente.', true);
      } else {
        submit.disabled = true;
        submit.textContent = 'Enviando mensagem e anexos...';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
