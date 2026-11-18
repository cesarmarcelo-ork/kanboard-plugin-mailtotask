<?php $pid = (int)$project['id']; ?>
<div class="mt-page" data-mailtotask>
  <div class="mt-header">
    <div>
      <h2 class="mt-heading"><?= t('MailToTask title') ?></h2>
      <p class="mt-subtitle"><?= $this->text->e($project['name']) ?> • Microsoft Outlook / Exchange</p>
      <p class="mt-back"><?= $this->url->link(t('MailToTask back'), 'BoardViewController', 'show', array('project_id'=>$pid)) ?></p>
    </div>
  </div>
  <?php if ($error): ?><div class="mt-error" role="alert"><?= $this->text->e($error) ?></div><?php endif ?>
  <form id="mt-create" method="post" enctype="multipart/form-data"
    action="<?= $this->url->href('MailController', 'create', array('plugin'=>'MailToTask','project_id'=>$pid)) ?>">
    <?= $this->form->csrf() ?>
    <section class="mt-card">
      <h3><?= t('MailToTask step import') ?></h3>
      <p class="mt-note"><?= t('MailToTask import hint') ?></p>
      <div class="mt-drop" id="mt-drop">
        <span aria-hidden="true" style="font-size:34px">✉</span>
        <strong><?= t('MailToTask drop') ?></strong>
        <small><?= t('MailToTask max hint') ?></small>
        <input class="mt-file" type="file" id="mt-file" accept=".msg,.eml,message/rfc822" aria-label="<?= t('MailToTask choose') ?>">
      </div>
      <div id="mt-info" class="mt-note" role="status" aria-live="polite" style="margin-top:12px"><?= t('MailToTask initial') ?></div>
    </section>
    <div id="mt-review" class="mt-hidden">
      <section class="mt-card">
        <h3><?= t('MailToTask step review') ?></h3>
        <div id="mt-origin" class="mt-origin"></div>
        <label><?= t('MailToTask body') ?></label>
        <pre id="mt-message" class="mt-message"></pre>
        <div id="mt-attachment-list" style="margin-top:16px"></div>
      </section>
      <section class="mt-card">
        <h3><?= t('MailToTask step task') ?></h3>
        <div class="mt-field">
          <label for="mt-title"><?= t('MailToTask task title') ?></label>
          <input name="title" id="mt-title" type="text" maxlength="255" required>
        </div>
        <div class="mt-field">
          <label for="mt-objective"><?= t('MailToTask objective') ?></label>
          <textarea id="mt-objective" name="objective" rows="6" maxlength="20000" required placeholder="<?= t('MailToTask objective placeholder') ?>"></textarea>
        </div>
        <?php if ($statusreport): ?>
        <div class="mt-field">
          <label><input type="checkbox" name="register_status" value="1" checked> <?= t('MailToTask register status') ?></label>
        </div>
        <div class="mt-field">
          <label for="mt-status"><?= t('MailToTask current status') ?></label>
          <textarea id="mt-status" name="status" rows="3"><?= $this->text->e($default_status) ?></textarea>
        </div>
        <?php else: ?>
          <p class="mt-alert"><?= t('MailToTask no status') ?></p>
        <?php endif ?>
        <p class="mt-note"><?= t('MailToTask storage notice') ?></p>
        <div class="mt-actions"><button id="mt-create-button" type="submit" class="btn btn-blue" disabled><?= t('MailToTask create') ?></button></div>
      </section>
    </div>
    <input id="mt-original-upload" type="file" name="email_file" class="mt-hidden" tabindex="-1" aria-hidden="true">
    <input id="mt-extracted-upload" type="file" name="attachments[]" multiple class="mt-hidden" tabindex="-1" aria-hidden="true">
    <input id="mt-attachments-expected" type="hidden" name="attachments_expected" value="0">
  </form>
  <p class="mt-alert"><?= t('MailToTask lab warning') ?></p>
</div>
