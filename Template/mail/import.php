<?php $pid = (int)$project['id']; ?>
<div class="mt-page" data-mailtotask>
  <div class="mt-header">
    <div>
      <h2 class="mt-heading">E-mail para cartão</h2>
      <p class="mt-subtitle"><?= $this->text->e($project['name']) ?> • Microsoft Outlook / Exchange</p>
      <p class="mt-back"><?= $this->url->link('Voltar ao quadro', 'BoardViewController', 'show', array('project_id'=>$pid)) ?></p>
    </div>
  </div>
  <?php if ($error): ?><div class="mt-error" role="alert"><?= $this->text->e($error) ?></div><?php endif ?>
  <form id="mt-create" method="post" enctype="multipart/form-data"
    action="<?= $this->url->href('MailController', 'create', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>">
    <?= $this->form->csrf() ?>
    <section class="mt-card">
      <h3>1. Incorporar uma mensagem do Outlook</h3>
      <p class="mt-note">Arraste um arquivo .msg ou .eml salvo no computador. A mensagem original será preservada como anexo do cartão, juntamente com os documentos extraídos.</p>
      <div class="mt-drop" id="mt-drop">
        <span aria-hidden="true" style="font-size:34px">✉</span>
        <strong>Arraste a mensagem para cá</strong>
        <small>.msg / .eml • arquivo original até 20 MiB • anexos extraídos até 20 MiB no total</small>
        <input class="mt-file" type="file" id="mt-file" accept=".msg,.eml,message/rfc822" aria-label="Selecionar mensagem do Outlook">
      </div>
      <div id="mt-info" class="mt-note" role="status" aria-live="polite" style="margin-top:12px">Selecione uma mensagem para começar.</div>
    </section>
    <div id="mt-review" class="mt-hidden">
      <section class="mt-card">
        <h3>2. Revisar mensagem e documentos</h3>
        <div id="mt-origin" class="mt-origin"></div>
        <label>Corpo do e-mail (somente leitura)</label>
        <pre id="mt-message" class="mt-message"></pre>
        <div id="mt-attachment-list" style="margin-top:16px"></div>
      </section>
      <section class="mt-card">
        <h3>3. Preparar cartão</h3>
        <div class="mt-field">
          <label for="mt-title">Título *</label>
          <input name="title" id="mt-title" type="text" maxlength="255" required>
        </div>
        <div class="mt-field">
          <label for="mt-objective">Objetivo * - redigido pelo usuário</label>
          <textarea id="mt-objective" name="objective" rows="6" maxlength="20000" required placeholder="Escreva o objetivo da demanda."></textarea>
        </div>
        <?php if ($statusreport): ?>
        <div class="mt-field">
          <label><input type="checkbox" name="register_status" value="1" checked> Registrar Informe de Situação inicial pelo StatusReport</label>
        </div>
        <div class="mt-field">
          <label for="mt-status">Situação Atual - editável</label>
          <textarea id="mt-status" name="status" rows="3"><?= $this->text->e($default_status) ?></textarea>
        </div>
        <?php else: ?>
          <p class="mt-alert">O StatusReport não foi detectado; a criação não incluirá Informe de Situação inicial.</p>
        <?php endif ?>
        <p class="mt-note">O documento original e seus anexos serão enviados diretamente ao armazenamento nativo do Kanboard. Não há compactação ou modificação dos arquivos originais.</p>
        <div class="mt-actions"><button id="mt-create-button" type="submit" class="btn btn-blue" disabled>Criar cartão e incorporar arquivos</button></div>
      </section>
    </div>
    <input id="mt-original-upload" type="file" name="email_file" class="mt-hidden" tabindex="-1" aria-hidden="true">
    <input id="mt-extracted-upload" type="file" name="attachments[]" multiple class="mt-hidden" tabindex="-1" aria-hidden="true">
    <input id="mt-attachments-expected" type="hidden" name="attachments_expected" value="0">
  </form>
  <p class="mt-alert">Versão experimental: testes devem utilizar mensagens fictícias. O navegador precisa permitir a leitura de arquivos e o envio multipart. Se o limite do servidor estiver abaixo do necessário, o envio poderá ser recusado.</p>
</div>
