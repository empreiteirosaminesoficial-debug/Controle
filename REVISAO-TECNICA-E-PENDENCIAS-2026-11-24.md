# Controle-Teste — revisão técnica e alterações preparadas

Data: 24/11/2026

## Alterações implementadas nesta revisão

1. **Serviços Pagos**
   - Adicionado o botão `Serviços Pagos` ao lado de `Novo serviço`.
   - Abre uma janela separada, sem substituir nem reorganizar a página Serviços.
   - Lista somente registros com `paymentStatus === 'pago'`.
   - Mostra estabelecimento, serviço, data de quitação, total do serviço, total recebido e forma de pagamento.
   - O atalho é administrativo; o cliente continua em modo de consulta.

2. **Resumo da nota fiscal para o cliente**
   - O ADM mantém a apresentação do acréscimo e do detalhamento.
   - O cliente vê somente o total calculado como `totalNotaFiscal + totalImpostoNF`.
   - O percentual, a linha `Débito Extra c/ NF` e a taxa de liquidação ficam ocultos no perfil do cliente.

3. **Barra superior**
   - Removidos os atalhos administrativos de status de sincronização, exportação e download do ZIP do código.
   - Mantidos o gerenciamento de clientes/lojas, o sino de notificações e Meu Perfil.

4. **Sincronização**
   - Adicionado estado de conectividade para que os listeners administrativos e do cliente sejam reinstalados quando a conexão voltar.
   - Isso cobre o caso em que a aplicação inicia sem rede e depois reconecta.
   - O funcionamento em tempo real entre duas contas ainda precisa de teste ponta a ponta; não foi possível confirmar o comportamento do Firebase remoto nesta revisão.

5. **Logotipo global**
   - A sincronização do logo foi separada de `settings/app_config` para `publicAssets/branding`.
   - A leitura do documento de identidade visual foi liberada inclusive antes do login, para permitir o logo na inicialização.
   - A gravação continua exclusiva do administrador verificado.
   - O carregamento de ícones do PWA passa a respeitar o logo personalizado salvo no navegador.
   - A rota administrativa existente do servidor continua atualizando os arquivos de ícone e manifesto do PWA.
   - Foi incluída migração do logo legado: o ADM copia o valor antigo para o novo documento público quando consegue lê-lo.

6. **APK**
   - Mantido o acesso administrativo ao gerador/fluxo PWABuilder existente.
   - Adicionada aba administrativa para enviar um APK já gerado, informar a versão e publicar.
   - O APK é armazenado em `app-releases/<versão>/`.
   - A página Conheça a Empresa escuta a versão publicada em tempo real e mostra botão de download para contas autenticadas de cliente.
   - Upload limitado a 200 MB e restrito ao administrador verificado.

## Regras Firebase que precisam ser publicadas

As regras locais foram atualizadas em:
- `firestore.rules`: leitura pública somente do documento `publicAssets/branding`; leitura autenticada dos metadados em `publicAssets`; gravação exclusiva do administrador.
- `storage.rules`: leitura autenticada dos APKs em `app-releases`; envio/substituição exclusivo do administrador verificado, com tipo MIME e tamanho controlados.

**Essas regras não foram publicadas no Firebase.** Antes de testar o logo em outra conta ou publicar/baixar APK, revise e publique os dois arquivos no Firebase Console:
- Firestore Database → Rules → conteúdo de `firestore.rules`.
- Storage → Rules → conteúdo de `storage.rules`.

Não houve alteração direta nos dados do Firebase nem deploy de Hosting/Storage/Firestore.

## Validação executada nesta revisão

- Verificação sintática TypeScript/TSX por transpilation: 63 arquivos, sem erros sintáticos.
- Verificação de chaves nos arquivos de regras: contagem balanceada.
- `tsc --noEmit` não pôde concluir porque este pacote ZIP não contém `node_modules` e faltam as definições `vite/client` e `vite-plugin-pwa/client`.
- O build Vite completo não foi executado neste ambiente.
- Não foram realizados testes reais de login, listeners Firestore, upload/download no Storage ou PWA instalado.

## Pendências que permanecem

1. Teste ponta a ponta da sincronização ADM ↔ cliente com contas separadas e lojas autorizadas; verificar logs de permissão do Firestore e confirmar que serviços, obras, visitas e notificações atualizam sem F5.
2. Testar o cartão da nota fiscal com os valores reais do exemplo (R$ 552,00 + R$ 152,00 = R$ 704,00) e confirmar a apresentação nos dois perfis.
3. Testar o logotipo na tela de login, cabeçalho, perfil, comprovante, ícones instalados e em outro dispositivo após publicar as regras.
4. Testar upload de APK pelo ADM e download pela conta cliente após publicar as regras do Storage e Firestore.
5. Adaptar o desenho do comprovante ao modelo de referência Asaas, preservando os dados reais de pagamento.
6. Deixar por último o comprovante consolidado com histórico de parcelas e geração automática na quitação, conforme prioridade definida.
7. Executar no Windows, com dependências instaladas: `npm ci`, `npm run lint` e `npm run build`.
8. Testar PWA em Android e validar a sincronização com o PWA original do Google AI Studio.

## Preservação

- O lembrete PIX de segunda-feira continua removido.
- O backup automático diário das 04:00 e os seletores de backup semanal não foram alterados nesta revisão.
- Nenhuma publicação ou exclusão de dados remotos foi feita.
