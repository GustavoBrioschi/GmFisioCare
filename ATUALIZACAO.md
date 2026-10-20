# Atualização 0.2.1 — GM Fisio Care

## Novidades desta versão

- Atendimentos e Pacotes agora exibem 30 registros por página, com Anterior e Próxima. Buscas e filtros consideram todos os registros e retornam à primeira página quando alterados.
- Primeiro acesso: após entrar com a senha temporária, basta preencher Nova senha e Confirme a nova senha. A sessão autenticada identifica a conta. A troca comum em Configurações continua pedindo a senha atual.
- Esta atualização não exige nova importação de dados nem recriação de acessos. O ZIP contém o projeto completo, incluindo as melhorias da versão anterior.

## Atualizar sua cópia

1. Pare o servidor com Ctrl+C e extraia o ZIP em uma pasta nova.
2. Copie o `.env.local` da sua cópia que já funciona para a raiz da nova pasta (ao lado de `package.json`). O ZIP não contém credenciais.
3. Abra o terminal nessa pasta e execute:

```powershell
npm ci
npm run dev
```

Use `http://localhost:3000` ou a porta mostrada pelo terminal. Se a 3000 estiver ocupada, o Next usará outra porta: a atualização dispensa configurar o endereço no `.env.local`, mas não libera uma porta ocupada por outro processo. A variável antiga `APP_ORIGIN` pode ser removida; ela não é mais usada. A proteção contra requisições vindas de outro site funciona automaticamente.

Com as mesmas credenciais Firebase, seus cadastros, acessos e dados continuam disponíveis. Não recrie o administrador e não rode novamente o seed inicial.

## Gerar atendimentos para os relatórios

Na sua cópia conectada ao Firebase (`DEMO_MODE=false`), execute primeiro a prévia:

```powershell
npm run seed:reports
```

O terminal mostra o projeto de destino e quantos atendimentos novos serão criados. Para gravar:

```powershell
npm run seed:reports:apply
```

O script acrescenta até 300 atendimentos avulsos nos últimos três meses, incluindo o mês atual até o dia de execução. Gera cobranças parceladas, recebimentos completos/parciais, pendências e cancelamentos com devoluções. Usa apenas os pacientes reconhecidos do seed original (`pat0` a `pat99`, com CPF e e-mail fictícios correspondentes), vinculados a profissionais ativos. Cadastros manuais, pacotes existentes e contas de acesso são preservados.

Os IDs são fixos por paciente e mês. Repetir no mesmo período não duplica registros; se a execução for interrompida, pode repeti-la. Registros já presentes não são corrigidos nem sobrescritos. Em outro mês, entram apenas os meses que ainda não existiam.

Ao terminar, atualize a página. Em Relatórios, selecione o período desejado; o padrão é o mês atual. No Financeiro, a listagem começa com todas as datas. Nenhum dado foi gravado no seu Firebase durante a preparação desta entrega: a massa foi validada na demonstração local.

Para experimentar sem Firebase, configure `DEMO_MODE=true` em `.env.local`, rode `npm run dev` e use o acesso de demonstração. Para acrescentar os mesmos cenários localmente:

```powershell
node --env-file=.env.local scripts/seed-reports.mjs --local --apply
```

## Mudanças na interface

- Pacientes: 30 por página, em ordem alfabética; a busca consulta toda a lista.
- Menu lateral: recolhe ao retirar o mouse, sem manter a expansão após navegar; mantém acesso por teclado.
- Seletores: popups com busca e identidade visual, incluindo paciente por nome ou CPF. No atendimento, são exibidos os pacientes vinculados ao profissional selecionado.
- Financeiro: indicadores de recebido, a receber, atrasado e a devolver; abas Pendentes, Quitados e Movimentações; detalhes das parcelas e histórico por cobrança.
- Filtros financeiros: o período seleciona cobranças por vencimento e movimentações por data de pagamento. Os saldos são a posição atual da cobrança inteira.

## Verificação

`npm test` valida regras de negócio, origem automática, saldos e geração sem duplicatas. `npm run build` compila o sistema. `npm run test:api` exige uma demonstração local ativa na porta 3000; para outra porta, defina `TEST_ORIGIN` no terminal. Não rode esse teste contra o Firebase.
