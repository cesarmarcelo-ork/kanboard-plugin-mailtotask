<?php
// Verify translation coverage and prevent untranslated UI labels from reaching a release.
$root = dirname(__DIR__);
$pt = require $root.'/Locale/pt_BR/translations.php';
$en = require $root.'/Locale/en_US/translations.php';
$keys = array_unique(array_merge(array_keys($pt), array_keys($en)));
$missing = array();
foreach ($keys as $key) {
    if (!isset($pt[$key], $en[$key]) || trim($pt[$key]) === '' || trim($en[$key]) === '') {
        $missing[] = 'Missing locale key: '.$key;
    }
}
foreach (array('Template/mail/import.php','Template/project/dropdown.php','Controller/MailController.php','Service/MailAttachmentService.php') as $source) {
    $data = file_get_contents($root.'/'.$source);
    preg_match_all("/\\bt\\('([^']+)'/", $data, $matches);
    foreach ($matches[1] as $key) {
        if (strncmp($key, 'MailToTask ', 11) === 0 && (!isset($pt[$key]) || !isset($en[$key]))) {
            $missing[] = $source.': '.$key;
        }
    }
}
if (isset($pt['MailToTask title']) && $pt['MailToTask title'] !== 'e-mail para cartão') {
    $missing[] = 'Portuguese page title does not match requested case.';
}
if (isset($en['MailToTask title']) && $en['MailToTask title'] !== 'e-mail to task') {
    $missing[] = 'English page title does not match expected translation.';
}
if (strpos(file_get_contents($root.'/Template/mail/import.php'), "t('MailToTask lab warning')") !== false) {
    $missing[] = 'Experimental warning still rendered.';
}
if ($missing) {
    fwrite(STDERR, implode(PHP_EOL, $missing).PHP_EOL);
    exit(1);
}
echo 'Locale smoke OK: '.count($keys).' keys in pt_BR and en_US'.PHP_EOL;
