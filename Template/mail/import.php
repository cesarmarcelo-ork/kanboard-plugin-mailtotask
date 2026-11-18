<?php
$pid = (int) $project['id'];
$preview = $stage === 'preview';
?>
<div class="mt-page" data-mailtotask>
  <div class="mt-header">
    <div>
      <h2 class="mt-heading">E-mail para cartão</h2>
      <p class="mt-subtitle"><?= $this->text->e($project['name']) ?> • Outlook / Exchange</p>
      <p class="mt-back"><?= $this->url->link('Voltar ao quadro', 'BoardViewController', 'show', array('project_id' => $pid)) ?></p>
    </div>
  </div>
  <?php if ($error): ?>
    <div class="mt-error" role="alert"><?= $this->text->e($error) ?></div>
  <?php endif ?>
  <?php if (!$preview): ?>
  <section class="mt-card">
    <h3>1. Selecionar mensagem do Outlook</h3>
    <p class="mt-note">Arraste um arquivo <strong>.msg</strong> ou <strong>.eml</strong> para a área abaixo ou escolha um arquivo. O Outlook pode não disponibilizar a mensagem diretamente quando arrastada do aplicativo para o navegador; se isso ocorrer, salve o e-mail como arquivo e depois arraste.</p>
    <form id="mt-import" method="post" enctype="multipart/form-data" action="<?= $this->url->href('MailController', 'preview', array('plugin'=>'MailToTask', 'project_id'=>$pid)) ?>">
      <?= $this->form->csrf() ?>
      <div class="mt-drop" id="mt-drop" aria-label="Arraste uma mensagem de e-mail para importar">
        <span aria-hidden="true" style="font-size:34px">✉</span>
        <strong>Arraste o e-mail aqui</strong>
        <small>Outlook .msg / .eml • teste de até 8 MB para .msg; .eml até 2 MB</small>
        <input class="mt-file" type="file" id="mt-file" name="email_file" accept=".msg,.eml,message/rfc822" aria-label="Selecionar mensagem do Outlook">
      </div>
      <div id="mt-info" aria-live="polite" class="mt-note" style="margin-top:12px"></div>
      <details class="mt-card">
        <summary>Ou colar o texto de um e-mail</summary>
        <div class="mt-field">
          <label for="mt-raw">Conteúdo da mensagem</label>
          <textarea id="mt-raw" name="raw_email" rows="8" placeholder="Cole o conteúdo do e-mail..."></textarea>
        </div>
      </details>
      <div class="mt-actions"><button class="btn btn-blue" type="submit">Interpretar e revisar</button></div>
    </form>
  </section>
  <p class="mt-alert">Versão de desenvolvimento: .msg é interpretado no navegador, mas o arquivo original e os anexos não são gravados no cartão. Não utilize mensagens institucionais reais até a conclusão da preservação documental e dos testes de segurança.</p>
  <?php else: ?>
  <section class="mt-card">
    <h3>2. Conferir informações da mensagem</h3>
    <?php if (isset($values['from']) || isset($values['body'])): ?>
      <div class="mt-origin">
        <div><b>Remetente</b><?= $this->text->e(isset($values['from']) ? $values['from'] : '') ?></div>
        <div><b>Data</b><?= $this->text->e(isset($values['date']) ? $values['date'] : '') ?></div>
        <div><b>Message-ID</b><?= $this->text->e(isset($values['message_id']) ? $values['message_id'] : '') ?></div>
      </div>
      <b>Conteúdo recebido</b>
      <div class="mt-message"><?= $this->text->e(isset($values['body']) ? $values['body'] : '') ?></div>
    <?php endif ?>
  </section>
  <section class="mt-card">
    <h3>3. Elaborar o cartão</h3>
    <form method="post" action="<?= $this->url->href('MailController', 'create', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>">
      <?= $this->form->csrf() ?>
      <div class="mt-field">
        <label for="mt-title">Título do cartão *</label>
        <input id="mt-title" name="title" type="text" required maxlength="255" value="<?= $this->text->e(isset($values['subject']) ? $values['subject'] : '') ?>">
      </div>
      <div class="mt-field">
        <label for="mt-objective">Objetivo * - preenchido pelo usuário</label>
        <textarea id="mt-objective" name="objective" required rows="5" placeholder="Defina o objetivo considerando a solicitação recebida por e-mail."><?= $this->text->e(isset($values['objective']) ? $values['objective'] : '') ?></textarea>
      </div>
      <?php if ($statusreport): ?>
        <div class="mt-field">
          <label><input name="register_status" type="checkbox" value="1" <?= (!isset($values['register_status']) || $values['register_status']) ? 'checked' : '' ?>> Registrar Informe de Situação inicial pelo StatusReport</label>
        </div>
        <div class="mt-field">
          <label for="mt-status">Situação Atual - editável</label>
          <textarea id="mt-status" name="status" rows="3"><?= $this->text->e(isset($values['status']) ? $values['status'] : $default_status) ?></textarea>
        </div>
      <?php else: ?>
        <p class="mt-alert">StatusReport não está disponível. O cartão poderá ser criado com Objetivo, sem Informe de Situação inicial.</p>
      <?php endif ?>
      <p class="mt-note">As informações da mensagem são exibidas para revisão, mas a implementação atual não registra o e-mail original nem transfere seus anexos para o cartão.</p>
      <div class="mt-actions">
        <button class="btn btn-blue" type="submit">Criar cartão</button>
        <?= $this->url->link('Cancelar', 'MailController', 'show', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>
      </div>
    </form>
  </section>
  <?php endif ?>
</div>
