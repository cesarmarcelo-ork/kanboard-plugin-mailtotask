<?php
namespace Kanboard\Plugin\MailToTask;

use Kanboard\Core\Plugin\Base;
use Kanboard\Core\Security\Role;
use Kanboard\Core\Translator;

class Plugin extends Base
{
    public function initialize()
    {
        $this->projectAccessMap->add('MailController', '*', Role::PROJECT_MEMBER);
        $this->template->hook->attach('template:project:dropdown', 'MailToTask:project/dropdown');
        $this->hook->on('template:layout:css', array('template' => 'plugins/MailToTask/Asset/css/mailtotask.css'));
        $this->hook->on('template:layout:js', array('template' => 'plugins/MailToTask/Asset/js/mail-msg.js'));
        $this->hook->on('template:layout:js', array('template' => 'plugins/MailToTask/Asset/js/mail-core.js'));
        $this->hook->on('template:layout:js', array('template' => 'plugins/MailToTask/Asset/js/mailtotask.js'));
        $this->route->addRoute('/project/:project_id/mail-to-task', 'MailController', 'show', 'MailToTask');
        $this->route->addRoute('/project/:project_id/mail-to-task/create', 'MailController', 'create', 'MailToTask');
    }
    public function onStartup()
    {
        Translator::load($this->languageModel->getCurrentLanguage(), __DIR__.'/Locale');
    }
    public function getPluginName() { return 'MailToTask'; }
    public function getPluginDescription() { return 'Importação manual de e-mails do Outlook/Exchange para cartões com Objetivo e StatusReport.'; }
    public function getPluginAuthor() { return 'OrkFlowTech'; }
    public function getPluginVersion() { return '0.4.0-rc1'; }
    public function getPluginHomepage() { return 'https://github.com/cesarmarcelo-ork/kanboard-plugin-mailtotask'; }
    public function getCompatibleVersion() { return '>=1.2.50'; }
}
