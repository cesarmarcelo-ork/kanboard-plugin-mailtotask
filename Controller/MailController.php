<?php
namespace Kanboard\Plugin\MailToTask\Controller;

use Kanboard\Controller\BaseController;
use Kanboard\Core\Controller\AccessForbiddenException;
use Kanboard\Core\Security\Role;
use Kanboard\Plugin\MailToTask\Service\MailAttachmentService;

class MailController extends BaseController
{
    const DEFAULT_STATUS = 'Documentação recebida por e-mail e aguardando análise inicial.';

    private function projectId()
    {
        $id = (int)$this->request->getIntegerParam('project_id');
        if (!$id || !$this->projectModel->getById($id)) throw new AccessForbiddenException();
        return $id;
    }

    private function supportsStatusReport()
    {
        return isset($this->container['statusReportModel']) && isset($this->container['statusReportMirrorModel']);
    }

    private function render($projectId, $error = '')
    {
        $this->response->html($this->helper->layout->app('MailToTask:mail/import', array(
            'project'=>$this->projectModel->getById($projectId),
            'error'=>$error,
            'statusreport'=>$this->supportsStatusReport(),
             'default_status'=>t('MailToTask initial status'),
        )));
    }

    public function show() { $this->render($this->projectId()); }

    public function create()
    {
        $projectId = $this->projectId();
        $this->checkCSRFForm();
        $posted = $this->request->getValues();
        $title = trim((string)(isset($posted['title']) ? $posted['title'] : ''));
        $objective = trim((string)(isset($posted['objective']) ? $posted['objective'] : ''));
        $register = !empty($posted['register_status']);
        $status = trim((string)(isset($posted['status']) ? $posted['status'] : ''));

        if ($title === '' || mb_strlen($title) > 255 || $objective === '' || mb_strlen($objective) > 20000) {
            return $this->render($projectId, t('MailToTask title objective required'));
        }
        if ($register && (!$this->supportsStatusReport() || $status === '')) {
            return $this->render($projectId, t('MailToTask status unavailable'));
        }
        $service = new MailAttachmentService();
        try {
            $original = isset($_FILES['email_file']) ? $_FILES['email_file'] : null;
            $name = $service->validateOriginal($original);
            $original['name'] = $name;
            $attachments = $service->validateExtracted(
                isset($_FILES['attachments']) ? $_FILES['attachments'] : null,
                isset($posted['attachments_expected']) ? $posted['attachments_expected'] : 0
            );
        } catch (\InvalidArgumentException $e) {
            return $this->render($projectId, $e->getMessage());
        }

        $taskId = $this->taskCreationModel->create(array(
            'project_id'=>$projectId,
            'title'=>$title,
            'description'=>"## Objetivo\n\n".$objective,
            'creator_id'=>(int)$this->userSession->getId(),
        ));
        if (!$taskId) {
            return $this->render($projectId, t('MailToTask card creation failed'));
        }

        $upload = $service->store($this->taskFileModel, $taskId, $original, $attachments);
        $warnings = $upload['errors'];

        if ($register) {
            try {
                $commentId = $this->commentModel->create(array(
                    'task_id'=>$taskId,
                    'user_id'=>(int)$this->userSession->getId(),
                    'comment'=>$status,
                    'visibility'=>Role::APP_USER,
                ));
                if (!$commentId || $this->container['statusReportModel']->create($taskId, $commentId, $this->userSession->getId()) === false) {
                    throw new \RuntimeException('Falha ao classificar o Informe de Situação.');
                }
                $this->container['statusReportMirrorModel']->sync($taskId);
            } catch (\Exception $e) {
                $this->logger->error('MailToTask: cartao #'.$taskId.' - StatusReport: '.$e->getMessage());
                $warnings[] = t('MailToTask status registration failed');
            }
        }

        if ($warnings) {
            $this->logger->error('MailToTask: cartao #'.$taskId.' - upload incompleto: '.implode(' | ', $warnings));
            $this->flash->failure(t('MailToTask partial', $taskId));
        } else {
            $this->flash->success(t('MailToTask success', $taskId, count($attachments)));
        }
        return $this->response->redirect($this->helper->url->to('TaskViewController', 'show', array('task_id'=>$taskId)));
    }
}
