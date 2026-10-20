# GM Fisio Care

Sistema acadêmico de gestão de uma clínica de fisioterapia. React com Next.js, API no servidor, Firebase Authentication e Cloud Firestore. Publicação prevista na Vercel. Somente dados fictícios.

## Executar e testar

Requer Node.js 22 ou superior.

```sh
npm install
npm run dev
npm test
npm run build
```

Com o servidor de demonstração ativo, `npm run test:api` valida autenticação, isolamento entre perfis, proteção de origem e troca obrigatória da senha. Esse teste usa somente contas fictícias locais.

Abra http://127.0.0.1:3000. A configuração local inicial usa `DEMO_MODE=true` em `.env.local`. Os botões da tela de login dão acesso aos três perfis fictícios. Senha inicial: `Demo@2026!`. Os cadastros e movimentos ficam em `.local/demo.json`. Contas temporárias da demonstração ficam apenas na memória e desaparecem ao reiniciar o servidor. Nenhum dado de paciente ou token fica em localStorage.

O modo demo é bloqueado quando `NODE_ENV=production` ou na Vercel. Ele serve apenas para desenvolvimento, não substitui a validação no Firebase.

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
npm run seed -- --confirm-demo-data
```

O script não sobrescreve coleções existentes. Caso uma importação seja interrompida após um lote, revise as coleções antes de repetir. Os usuários dos cadastros fictícios não são criados automaticamente no Authentication. Crie seus acessos pela interface quando necessário.

## Publicação na Vercel

Importe este repositório como projeto Next.js. Configure as mesmas variáveis em Environment Variables, com `DEMO_MODE=false`. A validação de origem acompanha automaticamente o domínio acessado, inclusive os previews da Vercel. Não é necessário usar Firebase Cloud Functions. O backend roda na Vercel.

Depois de configurar: teste login real, troca de senha, geração de acesso e cada perfil antes de entregar. A integração real não foi validada até fornecer as credenciais localmente. Firebase Spark e Vercel Hobby têm cotas; acompanhar os consoles é parte da configuração.

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

Coleções: `users`, `professionals`, `specialties`, `patients`, `packages`, `encounters`, `charges`, `payments`, `audit` e `_rateLimits`. Referências são IDs de documentos, não chaves estrangeiras SQL. A modelagem relacional alternativa será desenvolvida separadamente, conforme combinado.

Valores monetários são inteiros em centavos. Cada atendimento guarda o percentual e os valores de repasse aplicados. O preço do pacote é distribuído por posições de sessão; cancelar uma sessão libera sua posição e preserva a distribuição exata dos centavos. Vendas de pacotes e sessões não são somadas como se fossem duas receitas.

Para esta massa acadêmica, a API carrega coleções e as transações leem o conjunto de registros antes de gravar somente as diferenças. Isso simplifica a consistência, mas gera leituras proporcionais ao tamanho da base. Antes de ampliar o uso, substituir por consultas paginadas, transações específicas por entidade, agregações e índices. Não é uma arquitetura dimensionada para produção clínica.

## Limitações atuais

- Configuração, integração real com Firebase e publicação dependem das contas do proprietário.
- Sem envio automático de e-mail: entrega manual da senha, conforme escopo.
- Demonstração local não persiste contas de autenticação criadas em memória.
- Auditoria disponível na interface para administradores; documentos guardam o antes e depois.
- Geração/renovação de contas cruza Auth e Firestore, que não compartilham transação; falhas de rede nessa etapa devem ser verificadas no console antes de repetir.
- Um cadastro administrativo pode ser vinculado a um profissional pelo campo `professionalId` em `users` para atuar como ambos. O administrador já pode registrar atendimentos em nome de qualquer profissional pela interface.

## Referências

- https://nextjs.org/docs/app
- https://firebase.google.com/docs/auth/admin/manage-cookies
- https://firebase.google.com/docs/firestore/manage-data/transactions

Marca e arquivos originais fornecidos pelo usuário.

A dependência indireta `uuid` está fixada por override na linha 11 corrigida, mantendo a API CommonJS `v4` usada pelo cliente Google. Reavaliar esse override ao atualizar o Firebase Admin.
