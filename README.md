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
