# Controle-teste — ajustes aplicados nesta entrega

## Aplicado
- Removida a opção/página **Configuração** da navegação e do roteamento principal.
- Removido o atalho de Configurações do Dashboard.
- Removida do modal de perfil a seção **Dados Oficiais da Empresa Prestadora (Contratada)**.
- Removido da barra superior o atalho do agendador de backup.
- Movido o acesso à ferramenta **Gerar APK** da barra superior para a página **Conheça a Empresa** (visível ao administrador).
- Ajustado o padrão do backup agendado para uma execução diária às **04:00**, sem aviso automático de sucesso.
- O agendador automático de backup passa a executar somente na sessão administrativa.
- Desativados os disparos automáticos do lembrete semanal de PIX e do lembrete diário de confirmação manual de backup.

## Ainda precisa ser implementado e validado
- Upload/publicação de um APK já gerado, com armazenamento seguro e download autorizado pelos clientes. Não foi criado um botão falso: as regras atuais do Firebase Storage bloqueiam leitura pública e escrita fora da área privada de backups; é necessário definir a autorização e o local de publicação antes de liberar downloads.
- Comprovante consolidado com o histórico de todos os pagamentos, datas, saldo e geração automática quando quitar. O modelo atual guarda comprovantes por recebimento e não mantém um histórico estruturado de parcelas suficiente para consolidar com segurança.
- Sincronização completa do perfil do cliente com todas as alterações feitas pelo ADM; requer auditoria dos listeners, queries e regras do Firestore.
- Notificação sonora para clientes; ainda requer validação do fluxo de áudio e das permissões do navegador.
- Central de notificações manuais configuráveis e desativação de todos os demais eventos automáticos. Nesta entrega foram desligados os lembretes automáticos de PIX e de confirmação manual de backup, mas os eventos automáticos de serviços, débitos, pagamentos e visitas ainda precisam ser migrados para um fluxo configurável.
- Testes funcionais de ponta a ponta com contas ADM e cliente.

## Validação técnica
- A verificação sintática por transpilation foi executada em 61 arquivos TS/TSX: sem erros sintáticos.
- A verificação completa `tsc --noEmit` e o build Vite não foram concluídos neste ambiente porque a instalação de dependências (`npm ci`) expirou e não deixou os pacotes de tipos do Vite disponíveis. Execute no Windows: `npm install`, `npm run lint` e `npm run build`.
- Nenhuma publicação foi realizada no Firebase.
