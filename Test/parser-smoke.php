<?php
require dirname(__DIR__).'/Service/EmailParser.php';
use Kanboard\Plugin\MailToTask\Service\EmailParser;
$eml = "From: Exemplo <exemplo@example.org>\r\nTo: Equipe <equipe@example.org>\r\nSubject: =?UTF-8?Q?An=C3=A1lise_de_documenta=C3=A7=C3=A3o?=\r\nDate: Tue, 17 Nov 2026 14:00:00 -0300\r\nMessage-ID: <test-123@example.org>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nSolicito analisar a documentacao.";
$parsed = (new EmailParser())->parse($eml);
if ($parsed['subject'] !== 'Análise de documentação' || $parsed['message_id'] !== 'test-123@example.org' || strpos($parsed['body'], 'Solicito') === false) {
    fwrite(STDERR, "Parser smoke FAILED\n");
    exit(1);
}
echo "Parser smoke OK\n";
