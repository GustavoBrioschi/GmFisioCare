
O painel do paciente reúne sessões realizadas e restantes, pacotes válidos, últimas orientações do fisioterapeuta, histórico recente e um resumo dos pagamentos. As barras representam sessões utilizadas no pacote, não avaliação de evolução clínica.

Requer Node.js 22 ou superior.
Requer Node.js 22 ou superior e npm. Para experimentar localmente, não é necessário configurar o Firebase.

1. Clone ou baixe o repositório e abra um terminal na pasta do projeto.
2. Copie `.env.example` para `.env.local` e altere `DEMO_MODE=false` para `DEMO_MODE=true`.
3. Instale as dependências e inicie o servidor:

```sh
npm install
npm ci
npm run dev
npm test
npm run build
```

Abra http://127.0.0.1:3000. A configuração local inicial usa `DEMO_MODE=true` em `.env.local`. Os botões da tela de login dão acesso aos três perfis fictícios. Senha inicial: `Demo@2026!`. Os cadastros e movimentos ficam em `.local/demo.json`. Contas temporárias da demonstração ficam apenas na memória e desaparecem ao reiniciar o servidor. Nenhum dado de paciente ou token fica em localStorage.
Abra [http://127.0.0.1:3000](http://127.0.0.1:3000), ou a porta indicada pelo terminal. Os botões da tela de login dão acesso aos três perfis fictícios. Senha inicial da demonstração: `Demo@2026!`. Os cadastros e movimentos ficam em `.local/demo.json`. Contas temporárias da demonstração ficam apenas na memória e desaparecem ao reiniciar o servidor. Nenhum dado de paciente ou token fica em localStorage.


Para executar os testes de regras de negócio e compilar o projeto:

```sh
npm test
npm run build
```

## Conectar seu Firebase
```sh
npm run seed -- --confirm-demo-data
node --env-file=.env.local scripts/seed.mjs --confirm-demo-data
```

Para complementar os pacientes fictícios do seed com atendimentos e movimentações para os relatórios, confira primeiro a prévia e depois aplique:

```sh
npm run seed:reports
npm run seed:reports:apply
```

Essa importação preserva cadastros manuais e não duplica os mesmos cenários. Consulte [ATUALIZACAO.md](ATUALIZACAO.md) para detalhes e instruções de atualização.

## Publicação na Vercel

Depois de configurar: teste login real, troca de senha, geração de acesso e cada perfil antes de entregar. A integração real não foi validada até fornecer as credenciais localmente. Firebase Spark e Vercel Hobby têm cotas; acompanhar os consoles é parte da configuração.
Depois de configurar, valide login, troca de senha, geração de acesso e permissões de cada perfil no seu ambiente. Consulte as condições e cotas dos serviços antes de publicar.


Coleções: `users`, `professionals`, `specialties`, `patients`, `packages`, `encounters`, `charges`, `payments`, `audit` e `_rateLimits`. Referências são IDs de documentos, não chaves estrangeiras SQL. A modelagem relacional alternativa será desenvolvida separadamente, conforme combinado.
Coleções: `users`, `professionals`, `specialties`, `patients`, `packages`, `encounters`, `charges`, `payments`, `audit` e `_rateLimits`. Referências são IDs de documentos, não chaves estrangeiras SQL.


## Referências
## Estrutura do projeto

```text
app/          Interface, componentes, estilos e rotas da API
lib/          Regras de negócio, autenticação e integração com Firebase
public/       Logotipo, ícones e arquivos da PWA
scripts/      Criação de administrador e geração de dados fictícios
tests/        Testes de regras de negócio e da API
```

## Contribuições

- https://nextjs.org/docs/app
- https://firebase.google.com/docs/auth/admin/manage-cookies
- https://firebase.google.com/docs/firestore/manage-data/transactions
Sugestões de melhorias, relatos de problemas e contribuições de código são bem-vindos. Ao relatar um problema, descreva como reproduzi-lo e o comportamento esperado. Para contribuir, crie uma branch com sua alteração, execute os testes aplicáveis e envie um pull request com uma descrição do que mudou.

Marca e arquivos originais fornecidos pelo usuário.
Use somente dados fictícios nos exemplos e testes. Não inclua `.env.local`, chaves de serviço ou dados pessoais em commits e relatos de problemas.

## Licença

A licença de código aberto ainda será definida pelos autores. Este repositório ainda não inclui um arquivo `LICENSE`.

## Referências

- [Documentação do Next.js](https://nextjs.org/docs/app)
- [Sessões com Firebase Authentication](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Transações no Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
