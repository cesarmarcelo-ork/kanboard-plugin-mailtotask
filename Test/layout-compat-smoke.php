<?php
// Regression test: Kanboard layout.php (1.2.50+) expects $title.
namespace Kanboard\Controller {
    class BaseController {
        public $response;
        public $helper;
        public $projectModel;
        public $languageModel;
        public $container = array();
    }
}
namespace {
    $GLOBALS['mailtotask_test_locale'] = 'en_US';
    function t($key) {
        $root = dirname(__DIR__);
        $locale = $GLOBALS['mailtotask_test_locale'];
        $values = require $root.'/Locale/'.$locale.'/translations.php';
        return isset($values[$key]) ? $values[$key] : $key;
    }
    require dirname(__DIR__).'/Controller/MailController.php';
    class TestProjectModel {
        public function getById($id) { return array('id' => $id, 'name' => 'Example project'); }
    }
    class TestLanguageModel {
        public function getCurrentLanguage() { return $GLOBALS['mailtotask_test_locale']; }
    }
    class TestLayout {
        public $params;
        public function app($template, $params) {
            if ($template !== 'MailToTask:mail/import') throw new \RuntimeException('Unexpected template');
            $this->params = $params;
            return 'rendered';
        }
    }
    class TestResponse {
        public function html($body) { if ($body !== 'rendered') throw new \RuntimeException('Unexpected body'); }
    }
    $ctrl = new \Kanboard\Plugin\MailToTask\Controller\MailController();
    $layout = new TestLayout();
    $ctrl->response = new TestResponse();
    $ctrl->helper = (object)array('layout' => $layout);
    $ctrl->projectModel = new TestProjectModel();
    $ctrl->languageModel = new TestLanguageModel();
    $method = new \ReflectionMethod($ctrl, 'render');
    foreach (array('en_US' => 'Email to task', 'pt_BR' => 'e-mail para cartão') as $locale => $heading) {
        $GLOBALS['mailtotask_test_locale'] = $locale;
        $method->invoke($ctrl, 1);
        $params = $layout->params;
        if (!isset($params['title']) || $params['title'] !== 'Example project') {
            throw new \RuntimeException('Missing or incorrect layout title for '.$locale);
        }
        if (!isset($params['page_title']) || $params['page_title'] !== $heading.' - Example project') {
            throw new \RuntimeException('Incorrect browser page title for '.$locale);
        }
    }
    echo "Layout compatibility smoke OK: en_US, pt_BR\n";
}
