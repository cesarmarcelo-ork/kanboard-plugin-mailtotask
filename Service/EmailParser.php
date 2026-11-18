<?php
namespace Kanboard\Plugin\MailToTask\Service;

/** Interpretador básico de cabeçalhos RFC 822. Não suporta multipart MIME/anexos nesta versão. */
class EmailParser
{
    public function parse($raw)
    {
        $raw = str_replace(array("\r\n", "\r"), "\n", (string) $raw);
        if (strlen($raw) > 2 * 1024 * 1024) {
            throw new \InvalidArgumentException('Mensagem excede 2 MB.');
        }
        if (trim($raw) === '') {
            throw new \InvalidArgumentException('Informe o conteúdo do e-mail ou selecione um arquivo .eml.');
        }
        $parts = preg_split('/\n\s*\n/', $raw, 2);
        $header = isset($parts[0]) ? $parts[0] : '';
        $body = isset($parts[1]) ? $parts[1] : '';
        if (!preg_match('/^(From|Subject|Date|To|Message-ID):/mi', $header)) {
            return array('subject'=>'', 'from'=>'', 'to'=>'', 'date'=>'', 'message_id'=>'', 'body'=>trim($raw));
        }
        $header = preg_replace('/\n[ \t]+/', ' ', $header);
        $fields = array();
        foreach (explode("\n", $header) as $line) {
            if (preg_match('/^([\w-]+):\s*(.*)$/', $line, $m)) {
                $fields[strtolower($m[1])] = trim($m[2]);
            }
        }
        $decode = function ($value) {
            if (function_exists('iconv_mime_decode')) {
                $decoded = @iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
                if ($decoded !== false) return $decoded;
            }
            return $value;
        };
        $encoding = strtolower(isset($fields['content-transfer-encoding']) ? $fields['content-transfer-encoding'] : '');
        if ($encoding === 'base64') {
            $decoded = base64_decode($body, true);
            $body = $decoded !== false ? $decoded : '';
        } elseif ($encoding === 'quoted-printable') {
            $body = quoted_printable_decode($body);
        }
        $type = strtolower(isset($fields['content-type']) ? $fields['content-type'] : '');
        if (strpos($type, 'multipart/') !== false) {
            $body = '[Mensagem multipart MIME: extração do corpo e anexos ainda não implementada. Consulte a mensagem original.]';
        } elseif (strpos($type, 'text/html') !== false) {
            $body = html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        return array(
            'subject'=>$decode(isset($fields['subject']) ? $fields['subject'] : ''),
            'from'=>$decode(isset($fields['from']) ? $fields['from'] : ''),
            'to'=>$decode(isset($fields['to']) ? $fields['to'] : ''),
            'date'=>isset($fields['date']) ? $fields['date'] : '',
            'message_id'=>trim(isset($fields['message-id']) ? $fields['message-id'] : '', '<> '),
            'body'=>trim($body),
        );
    }
}
