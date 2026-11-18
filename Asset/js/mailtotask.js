/* MailToTask drag-and-drop import. Reuses the OrkFlowTech parsers (same author). */
(function () {
  'use strict';
  function ready() {
    const root = document.querySelector('[data-mailtotask]');
    if (!root || !root.querySelector('#mt-drop')) return;
    const drop = root.querySelector('#mt-drop');
    const input = root.querySelector('#mt-file');
    const form = root.querySelector('#mt-import');
    const raw = root.querySelector('#mt-raw');
    const info = root.querySelector('#mt-info');
    let selected = null;
    let busy = false;
    function inform(message, bad) {
      info.textContent = message;
      info.className = bad ? 'mt-alert' : 'mt-ok';
    }
    function select(file) {
      if (!file) { inform('O navegador não forneceu um arquivo. Salve o e-mail do Outlook como .msg ou .eml e arraste o arquivo salvo.', true); return; }
      if (!/\.(eml|msg)$/i.test(file.name)) { inform('Formato não aceito. Use mensagens .msg ou .eml do Outlook.', true); return; }
      if (file.size > 8 * 1024 * 1024) { inform('O arquivo supera 8 MB. Este limite é provisório para testes.', true); return; }
      selected = file;
      inform('Selecionado: ' + file.name + ' (' + Math.ceil(file.size / 1024) + ' KB). Clique em Interpretar e revisar.', false);
    }
    ['dragenter','dragover'].forEach(name => drop.addEventListener(name, function (e) {
      e.preventDefault(); e.stopPropagation(); drop.classList.add('mt-over');
    }));
    ['dragleave','drop'].forEach(name => drop.addEventListener(name, function (e) {
      e.preventDefault(); e.stopPropagation(); drop.classList.remove('mt-over');
    }));
    drop.addEventListener('drop', function (e) {
      const files = e.dataTransfer && e.dataTransfer.files;
      select(files && files.length ? files[0] : null);
    });
    input.addEventListener('change', function () { select(input.files && input.files[0]); });
    form.addEventListener('submit', async function (e) {
      if (busy) { e.preventDefault(); return; }
      const file = selected || (input.files && input.files[0]);
      if (!file || !/\.msg$/i.test(file.name)) {
        if (file && /\.eml$/i.test(file.name) && (!input.files || !input.files.length || input.files[0] !== file)) {
          e.preventDefault();
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            form.requestSubmit();
          } catch (err) { inform('Não foi possível transferir o arquivo. Use Escolher arquivo para selecionar o .eml.', true); }
        }
        return;
      }
      e.preventDefault();
      busy = true;
      try {
        if (!window.oftMailMsg || !window.oftMailCore) throw new Error('Leitores Outlook não carregados.');
        const buffer = await file.arrayBuffer();
        if (!window.oftMailMsg.ehMsg(buffer)) throw new Error('O arquivo não é um .msg válido.');
        const msg = window.oftMailCore.normalizarArquivo(buffer, file.name);
        if (!String(msg.assunto || '').trim() && !String(msg.textoPlano || '').trim() && !String(msg.textoHtml || '').trim()) {
          throw new Error('Não foi possível extrair assunto ou corpo deste .msg.');
        }
        const clean = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
        const from = msg.de ? clean((msg.de.nome || '') + ' <' + (msg.de.email || '') + '>') : '';
        const body = msg.textoPlano || (window.oftMailCore.htmlParaTexto ? window.oftMailCore.htmlParaTexto(msg.textoHtml || '') : '');
        const synthesized = 'From: ' + from + '\n' +
          'Subject: ' + clean(msg.assunto) + '\n' +
          'Date: ' + (msg.data instanceof Date && !Number.isNaN(msg.data.getTime()) ? msg.data.toUTCString() : '') + '\n' +
          'Message-ID: ' + clean(msg.messageId || '') + '\n' +
          'Content-Type: text/plain; charset=UTF-8\n\n' + String(body || '');
        raw.value = synthesized;
        /* No server-side .msg reader in this dev build. The preview uses
           extracted text; the original and attachments are NOT persisted yet. */
        input.value = '';
        selected = null;
        inform('Mensagem .msg interpretada. Conteúdo extraído para revisão; original e anexos ainda não serão gravados nesta versão.', false);
        form.submit();
      } catch (err) {
        inform('Falha ao interpretar .msg: ' + (err && err.message || err), true);
      } finally { busy = false; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
