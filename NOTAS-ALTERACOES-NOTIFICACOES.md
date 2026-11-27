# Alterações — notificações destinadas aos clientes

Data: 23/11/2026

## O que foi alterado
- O aviso superior para ativar notificações aparece somente quando o perfil autenticado é `client`.
- O pedido de permissão que ficava dentro da Central administrativa foi removido; o administrador não recebe esse pedido.
- Eventos associados a um estabelecimento (serviços, débitos, pagamentos, fotos, obras e visitas) são gravados como notificações `audience: client`, com `storeId`.
- Comprovantes emitidos também são encaminhados ao canal de notificações do estabelecimento correspondente.
- O cliente escuta somente notificações dos `storeId` que constam em `authorizedStoreIds`.
- A Central administrativa e a sincronização administrativa ignoram documentos marcados como `audience: client`.
- As regras locais do Firestore permitem leitura dessas notificações somente a usuários com vínculo ativo e aprovado ao estabelecimento. A criação continua exclusiva do administrador.

## Importante antes de testar
1. Estas alterações são locais no projeto entregue. Nenhuma publicação foi realizada.
2. O arquivo `firestore.rules` foi atualizado e precisa ser publicado no Firebase antes de o cliente conseguir ler as novas notificações.
3. Não publique Hosting nem Storage. A publicação necessária para esta funcionalidade é somente Firestore Rules, após autorização explícita.
4. A instalação das dependências e a compilação completa não puderam ser executadas neste ambiente. Foi feita verificação sintática dos arquivos TypeScript/TSX (61 arquivos, sem erros sintáticos). É necessário executar `npm ci`, `npm run lint` e `npm run build` no ambiente Windows do projeto antes de publicar.
5. Testar com uma conta cliente aprovada em um CNPJ: criar um serviço, registrar uma visita e emitir um comprovante. Conferir que o aviso aparece no topo da tela do cliente e não na tela do administrador.

## Backups
Os arquivos originais foram preservados em `_backups/client-notifications-20261123/`, com hashes SHA-256 no `manifest.json`.
