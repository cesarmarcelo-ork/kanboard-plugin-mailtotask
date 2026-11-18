# MailToTask - experimental attachments branch (0.4.0-dev)

**Development branch: `feature/attachments-20mb`. NOT ready for production or institutional emails.** The working v0.3.0-dev in `develop` and `main` remain unchanged.

## Planned 20 MiB file policy

- One Outlook `.msg` or `.eml` source file up to **20 MiB** (20 × 1,048,576 bytes).
- Extracted non-inline attachments up to **20 MiB in aggregate**, maximum 40 files.
- The source message is stored **unchanged**, alongside each extracted attachment, through Kanboard `TaskFileModel::uploadFile()`.
- Since extracted files also exist inside the original source, disk and transfer use can approach **40 MiB per message**, plus multipart overhead. This is intentional for traceability.
- Import is refused before task creation when the source, attachments or extraction exceed these limits.
- If storage fails after task creation, the card remains and the user receives an explicit warning; do not assume all files were saved.

## Implementation

- Browser parses source message using OrkFlowTech's existing readers `mail-core.js` and `mail-msg.js`. No third-party parsing service.
- The review is local to the form. User manually provides the **Objetivo**; the original Outlook message is retained in a regular multipart upload.
- Non-inline embedded attachments are passed through native multipart as separate `File` items; they are not uploaded as Base64 JSON.
- Server validates the message extension, signature/headers, actual `is_uploaded_file`, byte limits, count and uploaded bytes. It checks CSRF and uses Kanboard's native attachment model.
- StatusReport continues to own its comment classification and description mirror.

## Server configuration prerequisites

Kanboard's per-file size is constrained by **PHP upload_max_filesize, post_max_size and the web server's request-body limit**, not the plugin alone. To accommodate a message of 20 MiB plus 20 MiB extracted attachments in ONE POST, consider:

```ini
upload_max_filesize = 20M
post_max_size = 48M
max_file_uploads = 50
memory_limit = 256M
```

And at the Nginx location or server block serving Kanboard:

```nginx
client_max_body_size 48m;
```

These are *requirements to validate, not instructions to globally overwrite the homelab*. An existing stricter reverse-proxy, Cloudflare tunnel or frontend request limit may still reject a large POST. Existing site security/backup policies remain applicable. Inspect the live effective config first. 48M is a buffer for multipart overhead; values should be adjusted for measured usage.

## Validation required

- Unit smoke test and PHP/JS syntax check in GitHub Actions.
- Real Kanboard v1.2.57 lab test with small .msg, small .eml, multipart documents, filenames, no attachment, 20 MiB boundary, invalid/oversized source and failed upload.
- Confirm StatusReport is intact, task permissions and CSRF, real files visible and downloadable, and original bytes unchanged (SHA256).
- Confirm UI supports Outlook drag-and-drop using saved files; dragging an in-app Outlook item straight to a browser may not expose a binary file.
- Check browser compatibility for `DataTransfer` and `File`, PHP / Nginx / proxy limits, disk space and permissions.

**Do not install this branch over the stable homelab plugin until the above prerequisites are checked.**

---

# Kanboard MailToTask - OrkFlowTech

**Status: 0.3.0-dev - interface e importação preliminar; NÃO homologado para produção.**

Plugin independente para converter mensagens do Microsoft Outlook/Exchange em cartões do Kanboard. A branch `main` permanece preservada; o trabalho acontece em `develop`.

## Requisitos acordados

- Outlook/Exchange exclusivamente na v1.0; arquitetura futura poderá receber Microsoft 365/Graph.
- O título pode ser sugerido pelo assunto do e-mail e editado pelo usuário.
- O **Objetivo** começa vazio e exige redação manual a partir da mensagem.
- A **Situação Atual** inicia com **"Documentação recebida por e-mail e aguardando análise inicial."** e pode ser alterada.
- Quando o StatusReport estiver instalado, a Situação Atual deve ser um comentário classificado como Informe de Situação; o StatusReport é proprietário do espelhamento na descrição.
- Sem StatusReport, não simular status como texto livre: permitir criação somente com Objetivo.
- A mensagem original e seus anexos deverão ser preservados na versão estável.

## Implementado nesta revisão

- Registro e rotas básicas do plugin dentro do Kanboard.
- Página corrigida para utilizar o layout nativo do Kanboard, CSS isolado e interface em etapas.
- Arrastar e soltar arquivos `.eml` e `.msg` salvos no computador.
- Leitura de `.msg` no navegador por meio dos interpretadores existentes na extensão OrkFlowTech. Na versão de desenvolvimento, o conteúdo é convertido para texto de pré-visualização; os anexos e o arquivo original ainda não são salvos.
- Formulário para importar arquivo `.eml` simples ou colar texto, com revisão do e-mail.
- Criação de cartão com Objetivo digitado manualmente.
- Integração inicial com os modelos `statusReportModel` e `statusReportMirrorModel` quando detectados.
- Teste básico do parser `Test/parser-smoke.php`.

**Não implementado:** persistência do arquivo `.msg` e de seus anexos, mensagens MIME multipart completas no backend, preservação do original, duplicidades, histórico, escolha de raia/coluna/responsável, OAuth, conexão direta ao Exchange e Microsoft Graph. O arraste direto do item a partir do Outlook (sem salvá-lo como arquivo) depende do navegador/cliente de e-mail e não é garantido; usar `.msg`/`.eml` salvo quando necessário. O texto do e-mail não é persistido entre etapas nesta revisão. Não utilizar dados institucionais reais nos testes de desenvolvimento.

## Compatibilidade e segurança

Compatibilidade declarada: Kanboard `>=1.2.50`; **ainda não validada funcionalmente**. O plugin deverá respeitar ACL de projeto, CSRF, validação de arquivos e tratamento de falhas parciais. Confirmar esses itens no laboratório antes de instalação corporativa. O teste isolado do parser não equivale à validação da interface ou da integração com StatusReport.

### Teste simples do interpretador

```bash
php plugins/MailToTask/Test/parser-smoke.php
```

### Estrutura de instalação (somente laboratório)

Colocar esta estrutura em `plugins/MailToTask/`, garantindo que `plugins/MailToTask/Plugin.php` exista.

## Critérios mínimos antes da v1.0

1. Parser robusto para `.msg` e `.eml` com anexos, codificações e limites.
2. Preservar o arquivo original e a rastreabilidade do e-mail.
3. Seletores do cartão com permissões corretamente verificadas.
4. Deduplicação por Message-ID e alternativa quando indisponível.
5. Compatibilidade efetiva com StatusReport 1.0.0, incluindo sua ausência.
6. Testes automatizados e funcionais em Kanboard 1.2.50 e 1.2.54.
7. Garantia de que o plugin não altera o núcleo do Kanboard nem a extensão OrkFlowTech.

## Referências

- [Extensão OrkFlowTech](https://github.com/cesarmarcelo-ork/orkflowtech-extension)
- [Kanboard StatusReport](https://github.com/cesarmarcelo-ork/kanboard-plugin-statusreport)

## Correção de interface v0.3.0-dev

- Raiz do problema: o formulário era renderizado com `template->render`, sem a camada de aplicação do Kanboard; agora é renderizado usando `helper->layout->app`.
- O menu do projeto continua nativo. CSS usa classes `mt-*` para não modificar estilos globais.
- A interface de drop aceita arquivos salvos `.msg`/`.eml`; `.msg` é interpretado no navegador com o mesmo leitor da extensão. O formulário de revisão mostra somente metadados/texto. Isso ainda NÃO constitui uma importação documental completa.
- **Não testar com e-mails confidenciais** até validação da persistência segura de arquivos, anexos, controles de acesso e limites de tamanho.
