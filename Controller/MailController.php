<?php
namespace Kanboard\Plugin\MailToTask\Controller;

use Kanboard\Controller\BaseController;
use Kanboard\Core\Controller\AccessForbiddenException;
use Kanboard\Core\Security\Role;
use Kanboard\Plugin\MailToTask\Service\EmailParser;

class MailController extends BaseController
{
    const DEFAULT_STATUS = 'Documentação recebida por e-mail e aguardando análise inicial.';

    private function projectId()
    {
        $id = (int) $this->request->getIntegerParam('project_id');
        if (!$id || !$this->projectModel->getById($id)) throw new AccessForbiddenException();
        return $id;
    }
    private function supportsStatusReport()
    {
        return isset($this->container['statusReportModel']) && isset($this->container['statusReportMirrorModel']);
    }
    private function render($projectId, $stage, array $values = array(), $error = '')
    {
        $this->response->html($this->template->render('MailToTask:mail/import', array(
            'project'=>$this->projectModel->getById($projectId),
            'stage'=>$stage, 'values'=>$values, 'error'=>$error,
            'statusreport'=>$this->supportsStatusReport(),
            'default_status'=>self::DEFAULT_STATUS,
        )));
    }
    public function show() { $this->render($this->projectId(), 'import'); }
    public function preview()
    {
        $projectId = $this->projectId();
        $posted = $this->request->getValues();
        $raw = trim((string) (isset($posted['raw_email']) ? $posted['raw_email'] : ''));
        $upload = isset($_FILES['email_file']) ? $_FILES['email_file'] : null;
        if ($upload && (int) $upload['error'] !== UPLOAD_ERR_NO_FILE) {
            if ((int) $upload['error'] !== UPLOAD_ERR_OK
                || (int) $upload['size'] > 2 * 1024 * 1024
                || strtolower(pathinfo($upload['name'], PATHINFO_EXTENSION)) !== 'eml'
                || !is_uploaded_file($upload['tmp_name'])) {
                return $this->render($projectId, 'import', array(), 'Selecione um arquivo .eml válido de até 2 MB.');
            }
            $raw = (string) file_get_contents($upload['tmp_name']);
        }
        try {
            $values = (new EmailParser())->parse($raw);
        } catch (\Exception $e) {
            return $this->render($projectId, 'import', array(), $e->getMessage());
        }
        $this->render($projectId, 'preview', $values);
    }
    public function create()
    {
        $projectId = $this->projectId();
        $posted = $this->request->getValues();
        $title = trim((string) (isset($posted['title']) ? $posted['title'] : ''));
        $objective = trim((string) (isset($posted['objective']) ? $posted['objective'] : ''));
        $register = !empty($posted['register_status']);
        $status = trim((string) (isset($posted['status']) ? $posted['status'] : ''));
        $values = array('subject'=>$title, 'objective'=>$objective, 'status'=>$status, 'register_status'=>$register);
        if ($title === '' || mb_strlen($title) > 255 || $objective === '' || mb_strlen($objective) > 20000) {
            return $this->render($projectId, 'preview', $values, 'Informe título e Objetivo válidos (até 20.000 caracteres).');
        }
        if ($register && (!$this->supportsStatusReport() || $status === '')) {
            return $this->render($projectId, 'preview', $values, 'StatusReport indisponível ou Situação Atual vazia.');
        }
        $taskId = $this->taskCreationModel->create(array(
            'project_id'=>$projectId, 'title'=>$title,
            'description'=>"**Objetivo**\n\n".$objective,
            'creator_id'=>(int) $this->userSession->getId(),
        ));
        if (!$taskId) {
            return $this->render($projectId, 'preview', $values, 'O Kanboard não conseguiu criar o cartão.');
        }
        if ($register) {
            try {
                $commentId = $this->commentModel->create(array(
                    'task_id'=>$taskId, 'user_id'=>(int)$this->userSession->getId(),
                    'comment'=>$status, 'visibility'=>Role::APP_USER,
                ));
                if (!$commentId || $this->container['statusReportModel']->create($taskId, $commentId, $this->userSession->getId()) === false) {
                    throw new \RuntimeException('Falha ao classificar o Informe de Situação.');
                }
                $this->container['statusReportMirrorModel']->sync($taskId);
            } catch (\Exception $e) {
                $this->logger->error('MailToTask: task #'.$taskId.' created; StatusReport failed: '.$e->getMessage());
                $this->flash->failure('Cartão #'.$taskId.' criado, mas o Informe de Situação falhou. Verifique os comentários.');
                return $this->response->redirect($this->helper->url->to('TaskViewController', 'show', array('task_id'=>$taskId)));
            }
        }
        $this->flash->success('Cartão criado com Objetivo'.($register ? ' e Informe de Situação inicial.' : '.'));
        return $this->response->redirect($this->helper->url->to('TaskViewController', 'show', array('task_id'=>$taskId)));
    }
}
