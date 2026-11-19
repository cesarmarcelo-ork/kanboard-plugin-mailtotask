# MailToTask - OrkFlowTech

Kanboard plugin that turns **Microsoft Outlook/Exchange** messages (`.msg`, `.eml`) into tasks, with user-authored objectives and native file attachments.

Plugin do Kanboard para converter mensagens **Microsoft Outlook/Exchange** (`.msg`, `.eml`) em cartões, com Objetivo elaborado pelo usuário e anexos nativos.

**Release candidate:** `0.4.0-rc2` • **Compatibility declared:** Kanboard `>=1.2.50` • **Status:** functional acceptance tests and distribution licensing pending.

## Português (pt_BR)

### Recursos

- Menu nativo do projeto: **✉ e-mail**; título **e-mail para cartão**.
- Arraste arquivos `.msg` e `.eml` salvos no dispositivo para a área de importação.
- Exibe remetente, assunto, data e conteúdo; permite revisar antes de criar o cartão.
- **Objetivo obrigatório e preenchido manualmente** (não é gerado automaticamente).
- **Situação Atual** inicial editável, registrada como Informe de Situação quando o plugin StatusReport está disponível. O StatusReport mantém o controle do espelhamento na descrição.
- Mensagem original preservada como arquivo do cartão; anexos extraídos enviados separadamente por meio de `TaskFileModel` do Kanboard.
- Limite: até **20 MiB** para o e-mail original e até **20 MiB no conjunto dos anexos extraídos**, até 40 anexos. Por haver duplicação documental, o armazenamento poderá chegar a aproximadamente 40 MiB por mensagem.

### Limites conhecidos

- O arraste direto de um item dentro do Outlook para o navegador depende do cliente e navegador. O caminho suportado é salvar `.msg`/`.eml` e arrastar o arquivo.
- Mensagens e anexos são interpretados no navegador; conteúdo MIME muito complexo pode exigir tratamento adicional.
- Não há conexão direta à caixa Exchange/Microsoft Graph, sincronização, seleção detalhada de raia/coluna/responsável ou deduplicação.
- Se um upload falhar após a criação do cartão, o cartão será mantido, e uma mensagem de aviso indicará que é necessário verificar seus arquivos.

### Configuração do servidor

Um POST pode carregar o original de 20 MiB e os anexos extraídos de até 20 MiB, além de overhead multipart. Conferir configurações efetivas no PHP, no Nginx e em eventuais proxies:

```ini
upload_max_filesize=20M
post_max_size=48M
max_file_uploads=50
memory_limit=256M
```

```nginx
client_max_body_size 48m;
```

São exemplos de dimensionamento para **validar e adaptar**, e não alterações automáticas de configuração.

### Instalação manual

O pacote adequado deve conter `MailToTask/Plugin.php` diretamente dentro do ZIP. Extraia `MailToTask` em `plugins/MailToTask/`. Não utilize diretamente o arquivo ZIP da branch do GitHub, pois a pasta extraída terá um nome diferente.

### Homologação

Executar testes com mensagens fictícias .msg/.eml, com e sem anexos, limites de tamanho, diferentes codificações, integridade SHA256 do original, StatusReport presente/ausente, autorização e CSRF. Os testes de sintaxe não equivalem à homologação funcional. A versão somente deve ser anunciada como pronta para produção após esses testes.

## English (en_US)

### Features

- Native project menu **✉ e-mail**; page title **Email to task**.
- Drag and drop saved Outlook `.msg` and `.eml` files for local parsing and preview.
- Review sender, subject, date, body and extracted attachments.
- **Objective is required and entered manually**, never auto-generated.
- Editable initial Current Status, optionally classified and mirrored by the separate StatusReport plugin.
- Upload the **unchanged original message** and non-inline extracted attachments via Kanboard's native file storage model.
- Limits: **20 MiB** for the original message, **20 MiB combined** for extracted files and at most 40 attachments; total disk usage may approach 40 MiB per import.

### Known limitations

- Directly dragging an Outlook application item into a browser may not provide a real file; export the message first.
- Complex MIME structures may require additional parsing support.
- No direct Exchange/Microsoft Graph connection, sync, full task placement options or duplicate detection.
- Partial uploads generate warnings; the task remains for manual review.

### Installation and compatibility

Create a distribution ZIP with `MailToTask/` as its root folder, then extract it to `plugins/MailToTask/`. Declared compatibility is Kanboard >=1.2.50; functional acceptance testing remains required. Check PHP, Nginx and proxy limits (see configuration above). Both `pt_BR` and `en_US` UI translations are included.

## Maintainers and distribution

- Copyright: OrkFlowTech / respective copyright holders.
- **Public redistribution and license terms must be resolved before publishing.** The browser message readers were adapted from another OrkFlowTech project that carries a proprietary license notice. No MIT license is implied by this README.
- The official Kanboard catalog requires a **public, versioned ZIP release** and a pull request to `kanboard/website`, changing `plugins.json`. This repository is still private until the owner changes its visibility.
- For CI see `.github/workflows/development-checks.yml`; the workflow packages the correct ZIP and verifies PHP syntax, JS syntax, parser smoke test and locale coverage.

References: [Kanboard plugin directory](https://kanboard.org/plugins.html), [directory submission guide](https://github.com/kanboard/website), [StatusReport](https://github.com/cesarmarcelo-ork/kanboard-plugin-statusreport).
