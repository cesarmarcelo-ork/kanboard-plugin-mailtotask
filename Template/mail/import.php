<?php $pid = (int) $project['id']; $preview = $stage === 'preview'; ?>
<div class="page-header"><h2>MailToTask - <?= $this->text->e($project['name']) ?></h2></div>
<p>Outlook/Exchange: importe uma mensagem .eml ou cole o texto. Esta versão de desenvolvimento ainda não suporta .msg ou anexos.</p>
<?php if ($error): ?><p class="alert alert-error"><?= $this->text->e($error) ?></p><?php endif ?>
<?php if (!$preview): ?>
<form method="post" enctype="multipart/form-data" action="<?= $this->url->href('MailController', 'preview', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>">
    <?= $this->form->csrf() ?>
    <fieldset><legend>1. Importar e-mail</legend>
      <p><label for="mail-file">Arquivo .eml (até 2 MB)</label><input id="mail-file" type="file" accept=".eml,message/rfc822" name="email_file"></p>
      <p><label for="mail-raw">Ou cole o conteúdo da mensagem</label><textarea id="mail-raw" name="raw_email" rows="12" style="width:100%;max-width:850px"></textarea></p>
    </fieldset>
    <button type="submit" class="btn btn-blue">Interpretar e revisar</button>
</form>
<?php else: ?>
<?php if (isset($values['from']) || isset($values['body'])): ?>
  <fieldset><legend>Mensagem de referência - somente leitura</legend>
    <p><strong>Remetente:</strong> <?= $this->text->e(isset($values['from']) ? $values['from'] : '') ?></p>
    <p><strong>Data:</strong> <?= $this->text->e(isset($values['date']) ? $values['date'] : '') ?></p>
    <p><strong>Corpo:</strong></p>
    <pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto"><?= $this->text->e(isset($values['body']) ? $values['body'] : '') ?></pre>
  </fieldset>
<?php endif ?>
<form method="post" action="<?= $this->url->href('MailController', 'create', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>">
    <?= $this->form->csrf() ?>
    <fieldset><legend>2. Elaborar cartão</legend>
      <p><label for="mail-title">Título *</label><input id="mail-title" type="text" name="title" value="<?= $this->text->e(isset($values['subject']) ? $values['subject'] : '') ?>" maxlength="255" required style="width:100%;max-width:850px"></p>
      <p><label for="mail-obj">Objetivo * (redigido pelo usuário)</label><textarea id="mail-obj" name="objective" rows="6" required style="width:100%;max-width:850px"><?= $this->text->e(isset($values['objective']) ? $values['objective'] : '') ?></textarea></p>
      <?php if ($statusreport): ?>
        <p><label><input type="checkbox" name="register_status" value="1" <?= (!isset($values['register_status']) || $values['register_status']) ? 'checked' : '' ?>> Registrar Informe de Situação inicial pelo StatusReport</label></p>
        <p><label for="mail-status">Situação Atual (editável)</label><textarea id="mail-status" name="status" rows="3" style="width:100%;max-width:850px"><?= $this->text->e(isset($values['status']) ? $values['status'] : $default_status) ?></textarea></p>
      <?php else: ?>
        <p><strong>StatusReport não detectado.</strong> O cartão poderá ser criado apenas com o Objetivo.</p>
      <?php endif ?>
    </fieldset>
    <button type="submit" class="btn btn-blue">Criar cartão</button>
    <?= $this->url->link('Cancelar', 'MailController', 'show', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>
</form>
<?php endif ?>
