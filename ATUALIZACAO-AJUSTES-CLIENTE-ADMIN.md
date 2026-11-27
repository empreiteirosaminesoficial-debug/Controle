# Atualização — ajustes de interface Cliente/Administrador

Esta versão aplica os seguintes ajustes no código:

1. O aviso de ativação de notificações não é exibido para a conta administrativa oficial.
2. O cartão de backup do cliente foi removido do Dashboard e colocado em **Meu Perfil**.
3. O item de navegação **Nossa Empresa** foi renomeado para **Conheça a Empresa**.
4. O cliente agora tem o botão **Solicitar visita**, com formulário para informar data desejada, horário, motivo e detalhes. A solicitação fica com status `solicitada`; o administrador pode abrir a solicitação, definir data/horário e alterar o status para `agendada`, `realizada` ou `cancelada`.
5. Foram mantidos os controles de visibilidade por perfil: clientes não recebem os controles administrativos de visitas, e as páginas administrativas continuam ocultas no menu do cliente.

## Importante — publicar as regras do Firestore

O fluxo de solicitação de visita depende da regra nova em `firestore.rules`. Ela permite que um cliente autenticado crie somente uma solicitação vinculada a um estabelecimento ao qual já tenha acesso aprovado. Edição e exclusão continuam restritas ao administrador.

Depois de revisar o arquivo, publique as regras no Firebase Console (Firestore Database → Rules) ou pelo Firebase CLI:

```powershell
firebase deploy --only firestore:rules
```

A publicação das regras é necessária para o envio da solicitação pelo cliente funcionar na nuvem. Não foi feita nenhuma alteração direta no banco de dados.

## Validação

Os seis arquivos TypeScript/TSX alterados passaram pela verificação de sintaxe TypeScript. A compilação completa (`npm run build` / `tsc --noEmit`) não foi concluída neste ambiente porque as dependências do projeto não estavam instaladas e a tentativa de instalação expirou. Execute `npm ci` e depois `npm run build` no ambiente local antes de publicar.
