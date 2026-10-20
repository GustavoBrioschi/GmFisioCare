# GM Fisio Care

Projeto acadêmico de gestão de clínicas de fisioterapia, desenvolvido como trabalho de faculdade por **Gustavo Brioschi** e **Matheus Oliveira da Silva**, com a proposta de disponibilizar o código à comunidade como um projeto open source.

O GM Fisio Care centraliza pacientes, profissionais, atendimentos, pacotes de sessões e controle financeiro. O objetivo é aplicar conceitos de desenvolvimento web, autenticação, controle de acesso e persistência de dados em um sistema que representa a rotina de uma clínica. A demonstração utiliza somente dados fictícios.

## Autores e créditos

- **Gustavo Brioschi**
- **Matheus Oliveira da Silva**

Projeto desenvolvido para fins acadêmicos e de aprendizado.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | React, Next.js App Router e CSS |
| API | Route Handlers do Next.js, executados no servidor |
| Autenticação | Firebase Authentication |
| Banco de dados | Cloud Firestore |
| Integração no servidor | Firebase Admin SDK |
| Validação e ícones | Zod e Lucide React |
| Publicação prevista | Vercel |

## Perfis de acesso

| Perfil | Principais recursos |
| --- | --- |
| Administrador | Gestão da clínica, cadastros, acessos, repasses, financeiro e relatórios |
| Profissional | Pacientes vinculados, atendimentos, orientações e resultados autorizados |
| Paciente | Consulta dos próprios atendimentos, orientações, pacotes e pagamentos |

O painel do paciente reúne sessões realizadas e restantes, pacotes válidos, últimas orientações do fisioterapeuta, histórico recente e um resumo dos pagamentos. As barras representam sessões utilizadas no pacote, não avaliação de evolução clínica.

## Executar e testar

Requer Node.js 22 ou superior e npm. Para experimentar localmente, não é necessário configurar o Firebase.

1. Clone ou baixe o repositório e abra um terminal na pasta do projeto.
2. Copie `.env.example` para `.env.local` e altere `DEMO_MODE=false` para `DEMO_MODE=true`.
3. Instale as dependências e inicie o servidor:

```sh
npm ci
npm run dev
```

Com o servidor de demonstração ativo, `npm run test:api` valida autenticação, isolamento entre perfis, proteção de origem e troca obrigatória da senha. Esse teste usa somente contas fictícias locais.

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000), ou a porta indicada pelo terminal. Os botões da tela de login dão acesso aos três perfis fictícios. Senha inicial da demonstração: `Demo@2026!`. Os cadastros e movimentos ficam em `.local/demo.json`. Contas temporárias da demonstração ficam apenas na memória e desaparecem ao reiniciar o servidor. Nenhum dado de paciente ou token fica em localStorage.

O modo demo é bloqueado quando `NODE_ENV=production` ou na Vercel. Ele serve apenas para desenvolvimento, não substitui a validação no Firebase.

Para executar os testes de regras de negócio e compilar o projeto:

```sh
npm test
npm run build
```

## Conectar seu Firebase

1. Ative Authentication → Sign-in method → Email/Password e crie um banco Cloud Firestore.
2. Copie `.env.example` para `.env.local`, mudando `DEMO_MODE=false`. Preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` com a conta de serviço do seu projeto. Mantenha esse arquivo fora do Git. Não cole a chave privada no chat.
3. Defina `FIREBASE_WEB_API_KEY` com a chave do projeto e `RATE_LIMIT_SECRET` com uma sequência aleatória. Esses valores ficam somente no servidor, sem prefixo `NEXT_PUBLIC_`. Não é necessário configurar `APP_ORIGIN`: a API compara a origem da requisição com o endereço acessado. `localhost` e `127.0.0.1` funcionam na porta em que o servidor estiver rodando.
4. Publique as regras de `firestore.rules` pelo console Firebase ou Firebase CLI. Elas bloqueiam acessos diretos por SDK cliente. O Admin SDK da API usa credenciais de servidor; as permissões são verificadas na API.
5. Crie o primeiro administrador pelo terminal:

```sh
npm run admin:create -- seu-email@exemplo.com "Seu nome"
```

O comando mostra a senha temporária uma única vez. A troca é obrigatória no primeiro acesso. Para inserir a massa fictícia (mais de 500 registros), em banco sem dados das entidades:

```sh
node --env-file=.env.local scripts/seed.mjs --confirm-demo-data
```

O script não sobrescreve coleções existentes. Caso uma importação seja interrompida após um lote, revise as coleções antes de repetir. Os usuários dos cadastros fictícios não são criados automaticamente no Authentication. Crie seus acessos pela interface quando necessário.

Para complementar os pacientes fictícios do seed com atendimentos e movimentações para os relatórios, confira primeiro a prévia e depois aplique:

```sh
npm run seed:reports
npm run seed:reports:apply
```

Essa importação preserva cadastros manuais e não duplica os mesmos cenários. Consulte [ATUALIZACAO.md](ATUALIZACAO.md) para detalhes e instruções de atualização.

## Publicação na Vercel

Importe este repositório como projeto Next.js. Configure as mesmas variáveis em Environment Variables, com `DEMO_MODE=false`. A validação de origem acompanha automaticamente o domínio acessado, inclusive os previews da Vercel. Não é necessário usar Firebase Cloud Functions. O backend roda na Vercel.

Depois de configurar, valide login, troca de senha, geração de acesso e permissões de cada perfil no seu ambiente. Consulte as condições e cotas dos serviços antes de publicar.

## Fluxos implementados

- Três perfis com sessão HttpOnly, SameSite, verificação de origem e limitação compartilhada de requisições no Firestore.
- Cadastros de pacientes, profissionais e especialidades; profissionais com várias especialidades e repasse definido pelo administrador.
- Vínculo do paciente autorizado pelo administrador ou profissional já vinculado. Histórico compartilhado sem os valores financeiros dos outros profissionais.
- Pacotes com validade, parcelas, preço dividido por sessão e cancelamento do saldo não utilizado.
- Registro e cancelamento de atendimentos; edição de data/orientação com motivo. Correções financeiras exigem cancelamento e novo registro.
- Recebimentos parciais por parcela, devoluções e saldo a devolver. Repasse reconhecido na realização da sessão.
- Dashboard, filtros e relatórios na tela. Filtro por especialidade não se aplica às entradas de caixa.
- Senha temporária aleatória para entrega manual; nenhuma senha gravada na auditoria. Senhas de usuários reais são geridas pelo Firebase Authentication.
- PWA instalável em navegadores compatíveis. Internet obrigatória; service worker não armazena dados clínicos nem páginas autenticadas.

## Modelo Firestore

Coleções: `users`, `professionals`, `specialties`, `patients`, `packages`, `encounters`, `charges`, `payments`, `audit` e `_rateLimits`. Referências são IDs de documentos, não chaves estrangeiras SQL.

Valores monetários são inteiros em centavos. Cada atendimento guarda o percentual e os valores de repasse aplicados. O preço do pacote é distribuído por posições de sessão; cancelar uma sessão libera sua posição e preserva a distribuição exata dos centavos. Vendas de pacotes e sessões não são somadas como se fossem duas receitas.

Para esta massa acadêmica, a API carrega coleções e as transações leem o conjunto de registros antes de gravar somente as diferenças. Isso simplifica a consistência, mas gera leituras proporcionais ao tamanho da base. Antes de ampliar o uso, substituir por consultas paginadas, transações específicas por entidade, agregações e índices. Não é uma arquitetura dimensionada para produção clínica.

## Limitações atuais

- Configuração, integração real com Firebase e publicação dependem das contas do proprietário.
- Sem envio automático de e-mail: entrega manual da senha, conforme escopo.
- Demonstração local não persiste contas de autenticação criadas em memória.
- Auditoria disponível na interface para administradores; documentos guardam o antes e depois.
- Geração/renovação de contas cruza Auth e Firestore, que não compartilham transação; falhas de rede nessa etapa devem ser verificadas no console antes de repetir.
- Um cadastro administrativo pode ser vinculado a um profissional pelo campo `professionalId` em `users` para atuar como ambos. O administrador já pode registrar atendimentos em nome de qualquer profissional pela interface.

## Estrutura do projeto

```text
app/          Interface, componentes, estilos e rotas da API
lib/          Regras de negócio, autenticação e integração com Firebase
public/       Logotipo, ícones e arquivos da PWA
scripts/      Criação de administrador e geração de dados fictícios
tests/        Testes de regras de negócio e da API
```

## Contribuições

Sugestões de melhorias, relatos de problemas e contribuições de código são bem-vindos. Ao relatar um problema, descreva como reproduzi-lo e o comportamento esperado. Para contribuir, crie uma branch com sua alteração, execute os testes aplicáveis e envie um pull request com uma descrição do que mudou.

Use somente dados fictícios nos exemplos e testes. Não inclua `.env.local`, chaves de serviço ou dados pessoais em commits e relatos de problemas.

## Licença

A licença de código aberto ainda será definida pelos autores. Este repositório ainda não inclui um arquivo `LICENSE`.

## Referências

- [Documentação do Next.js](https://nextjs.org/docs/app)
- [Sessões com Firebase Authentication](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Transações no Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)

A dependência indireta `uuid` está fixada por override na linha 11 corrigida, mantendo a API CommonJS `v4` usada pelo cliente Google. Reavaliar esse override ao atualizar o Firebase Admin.
