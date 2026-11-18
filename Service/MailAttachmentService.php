<?php
namespace Kanboard\Plugin\MailToTask\Service;

class MailAttachmentService
{
    const MAX_MAIL_BYTES = 20971520; // 20 MiB per original Outlook message.
    const MAX_EXTRACTED_BYTES = 20971520; // 20 MiB sum of extracted attachments.
    const MAX_EXTRACTED_FILES = 40;

    public function validateOriginal($file)
    {
        if (!is_array($file) || !isset($file['error']) || (int)$file['error'] !== UPLOAD_ERR_OK) {
            throw new \InvalidArgumentException('Envio da mensagem original falhou (verifique os limites do servidor).');
        }
        $size = isset($file['size']) ? (int)$file['size'] : 0;
        if ($size <= 0 || $size > self::MAX_MAIL_BYTES) {
            throw new \InvalidArgumentException('Mensagem original deve ter no máximo 20 MiB.');
        }
        $name = isset($file['name']) ? (string)$file['name'] : '';
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!in_array($ext, array('msg', 'eml'), true)) {
            throw new \InvalidArgumentException('Formato de mensagem inválido (.msg/.eml).');
        }
        $path = isset($file['tmp_name']) ? (string)$file['tmp_name'] : '';
        if (!is_uploaded_file($path)) {
            throw new \InvalidArgumentException('Arquivo temporário de mensagem inválido.');
        }
        $handle = fopen($path, 'rb');
        if (!$handle) throw new \InvalidArgumentException('Mensagem original ilegível.');
        $head = fread($handle, 4096);
        fclose($handle);
        if ($ext === 'msg' && substr($head, 0, 8) !== "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1") {
            throw new \InvalidArgumentException('Arquivo .msg com assinatura inválida.');
        }
        if ($ext === 'eml' && !preg_match('/^(from|date|subject|to|mime-version|received|message-id|return-path):/mi', $head)) {
            throw new \InvalidArgumentException('Arquivo .eml sem cabeçalhos reconhecidos.');
        }
        return $this->sanitizeName($name);
    }

    public function validateExtracted($files, $expected = 0)
    {
        $expected = (int)$expected;
        if ($expected < 0 || $expected > self::MAX_EXTRACTED_FILES) {
            throw new \InvalidArgumentException('Número de anexos inválido.');
        }
        if (!$files || !isset($files['name']) || !is_array($files['name'])) {
            if ($expected !== 0) throw new \InvalidArgumentException('Os anexos extraídos não chegaram ao servidor.');
            return array();
        }
        $out = array();
        $total = 0;
        foreach ($files['name'] as $index => $name) {
            $error = isset($files['error'][$index]) ? (int)$files['error'][$index] : UPLOAD_ERR_NO_FILE;
            if ($error === UPLOAD_ERR_NO_FILE) continue;
            if ($error !== UPLOAD_ERR_OK) throw new \InvalidArgumentException('Falha no envio de um anexo (código '.$error.').');
            $size = isset($files['size'][$index]) ? (int)$files['size'][$index] : 0;
            if ($size <= 0 || $size > self::MAX_EXTRACTED_BYTES) {
                throw new \InvalidArgumentException('Anexo vazio ou acima de 20 MiB.');
            }
            $total += $size;
            if ($total > self::MAX_EXTRACTED_BYTES) {
                throw new \InvalidArgumentException('A soma dos anexos extraídos ultrapassou 20 MiB.');
            }
            $path = isset($files['tmp_name'][$index]) ? $files['tmp_name'][$index] : '';
            if (!is_uploaded_file($path)) throw new \InvalidArgumentException('Arquivo temporário de anexo inválido.');
            $out[] = array('name'=>$this->sanitizeName($name), 'size'=>$size, 'error'=>UPLOAD_ERR_OK, 'tmp_name'=>$path);
        }
        if (count($out) > self::MAX_EXTRACTED_FILES || count($out) !== $expected) {
            throw new \InvalidArgumentException('Quantidade de anexos recebidos difere da esperada.');
        }
        return $out;
    }

    public function sanitizeName($name)
    {
        $name = (string)$name;
        $name = str_replace(array('\\', '/'), '/', $name);
        $name = basename($name);
        $name = preg_replace('/[\x00-\x1F\x7F]/', '_', $name);
        $name = trim($name, " .\t\r\n");
        if ($name === '' || $name === '.' || $name === '..') $name = 'anexo.bin';
        return mb_substr($name, 0, 180, 'UTF-8');
    }

    public function store($taskFileModel, $taskId, $original, array $extracted)
    {
        $errors = array();
        $saved = array();
        foreach (array_merge(array($original), $extracted) as $file) {
            try {
                $before = count($taskFileModel->getAll($taskId));
                // Kanboard v1.2.57 uploadFile() returns void, so check persisted metadata.
                $taskFileModel->uploadFile($taskId, $file);
                $after = count($taskFileModel->getAll($taskId));
                if ($after !== $before + 1) {
                    throw new \RuntimeException('O arquivo não apareceu no cadastro de anexos do Kanboard.');
                }
                $saved[] = $file['name'];
            } catch (\Exception $e) {
                $errors[] = $file['name'].': '.$e->getMessage();
            }
        }
        return array('saved'=>$saved, 'errors'=>$errors);
    }
}
