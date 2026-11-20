# Envio de e-mails

A API envia e-mails por **SMTP** com o [nodemailer](https://nodemailer.com/). Todo envio passa pelo módulo do núcleo `apps/api/src/modules/mail/mailer.ts`: os formulários usam hoje, e é o mesmo caminho previsto para e-mails de conta no futuro (seção "Contas de usuário" abaixo).

## O que é enviado hoje

A cada envio de formulário do site, a API grava o envio e dispara até **2 e-mails**:

| E-mail      | Para quem                                            | Conteúdo                                                                             | Quando                                          |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Aviso       | O e-mail cadastrado no painel para aquele formulário | Todos os campos preenchidos. "Responder" vai direto para quem preencheu (`Reply-To`) | Se o e-mail de aviso estiver preenchido         |
| Confirmação | Quem preencheu o formulário                          | Texto fixo: "recebemos sua mensagem". **Não repete nada do que foi escrito**         | Se "Enviar confirmação" estiver ligado (padrão) |

- Os e-mails saem **depois** de gravar o envio e sem segurar a resposta ao visitante. Se o servidor de e-mail falhar, o envio continua salvo no painel e a API registra só um aviso no log, sem destinatário nem conteúdo.
- O painel tem o botão **Enviar e-mail de teste**, que manda uma mensagem para o e-mail de aviso e mostra o erro na hora, se houver.
- Sem `SMTP_HOST`, o envio fica desligado: os formulários funcionam, mas nenhum e-mail sai (o painel avisa).

## Configuração (`.env` da API)

| Variável        | Exemplo                                 | Observação                                    |
| --------------- | --------------------------------------- | --------------------------------------------- |
| `SMTP_HOST`     | `smtp.gmail.com`                        | Vazio desliga os e-mails                      |
| `SMTP_PORT`     | `465` ou `587`                          | Padrão `587`                                  |
| `SMTP_SECURE`   | `true` na 465, `false` na 587           | `587` usa STARTTLS                            |
| `SMTP_USER`     | `contato@cliente.com`                   | Usuário da caixa que envia                    |
| `SMTP_PASSWORD` | senha de app                            | Nunca a senha principal da conta              |
| `MAIL_FROM`     | `Site do Cliente <contato@cliente.com>` | Remetente; use o mesmo domínio do `SMTP_USER` |

A API não sobe com `SMTP_HOST` sem `MAIL_FROM`, com `SMTP_USER` sem `SMTP_PASSWORD`, nem com porta e `SMTP_SECURE` trocados (587 com `true` ou 465 com `false`).

Quando um envio falha, o log da API e o botão "Enviar teste" do painel mostram o motivo e a resposta do servidor (com endereços de e-mail ocultos). Ex.: `535 5.7.3 Authentication unsuccessful` é usuário ou senha recusados.

### Provedores

- **Gmail (testes e sites pequenos):** ative a verificação em duas etapas na conta Google e crie uma **senha de app** (Conta Google → Segurança → Senhas de app). Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER` e `MAIL_FROM` com o endereço do Gmail. O Gmail limita os envios por dia e reescreve o remetente para a própria conta.
- **Outlook.com / Hotmail / Live (contas pessoais): não use.** A Microsoft exige OAuth2 no SMTP dessas contas e recusa login por senha (`535 5.7.3`), que é o que o nodemailer usa aqui.
- **E-mail do domínio do cliente** (o da hospedagem, Google Workspace, Microsoft 365): o mais indicado em produção, porque o remetente fica `@cliente.com`.
- **Serviço de envio transacional** (Brevo, Amazon SES, Resend, Mailgun…): quando o volume crescer ou a entrega for crítica (contas de usuário). Todos oferecem SMTP, então é só trocar as variáveis.

### Chegar na caixa de entrada (e não no spam)

No DNS do domínio do remetente, configure **SPF**, **DKIM** e **DMARC** conforme as instruções do provedor de e-mail. Sem eles, provedores como Gmail e Outlook tendem a marcar as mensagens como spam ou recusá-las.

## Segurança

- **Formulário não vira canal de spam:** a confirmação vai para um endereço digitado por qualquer pessoa, por isso não leva nenhum texto escrito pelo visitante (nem o nome). Assim ninguém usa o site para mandar mensagens próprias a terceiros. Rate limit por IP e honeypot completam a proteção.
- **Conteúdo escapado:** no aviso, os valores preenchidos entram no HTML com escape; nada vira HTML ativo.
- **Logs sem dados pessoais:** falhas registram só o tipo de e-mail e o código do erro.
- **Segredos:** `SMTP_PASSWORD` só no `.env` (ou no painel da hospedagem), nunca no repositório.

## Contas de usuário (futuro)

Quando o projeto tiver área de usuário no site (`docs/ARCHITECTURE.md`, seção 12), os e-mails de conta usam o **mesmo** `mailer.ts`:

- **Confirmação de cadastro** e **recuperação de senha**, com link de uso único e validade curta (ex.: 1 hora). O token vai no link, guardado no banco só como hash.
- **Rate limit** por e-mail e por IP nesses envios, para ninguém usar o site para encher a caixa de outra pessoa.
- **Envio confiável:** com contas, perder um e-mail significa uma pessoa sem acesso. Antes desse passo, avalie uma fila simples no banco (tabela de envios pendentes com novas tentativas) e um provedor transacional, em vez do envio direto de hoje.
- **Modelos:** os textos ficam em funções como as de `apps/api/src/modules/forms/form-emails.ts` (texto puro + HTML simples com `emailLayout`), sempre com escape do que vier do usuário.
