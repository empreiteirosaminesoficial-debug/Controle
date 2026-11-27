# Correções de sincronização e notificações — 27/11/2026

## Causas encontradas
1. **Serviços não chegavam ao cliente:** o Firestore recusa campos `undefined`
   (ex.: `dueDate`/`notes` vazios). A gravação falhava em silêncio; a notificação
   chegava, o serviço não. Na próxima atualização da nuvem, o serviço sumia do ADM.
2. **Visitas ADM → cliente sem aviso:** a notificação tinha `serviceId: undefined`
   e era recusada pelo mesmo motivo.
3. **Comprovantes e fotos:** eram salvos só no aparelho do ADM (nunca no Firebase).
4. **Som mudo:** o áudio era criado sem toque do usuário e o navegador o bloqueava;
   além disso, só tocava se a permissão de notificação estivesse concedida.
5. **Itens excluídos voltavam:** a sincronização reenviava ao Firebase qualquer item
   local que não estivesse na nuvem.

## O que mudou
- `src/lib/firebase.ts`: `ignoreUndefinedProperties: true`.
- `src/utils/cloudOutbox.ts` (novo): fila local de gravações pendentes; reenvio
  ao reconectar e a cada 30 s.
- `src/utils/cloudDatabase.ts`: gravações passam pela fila; sincronização do ADM
  usa a nuvem como fonte da verdade.
- `src/App.tsx`: comprovante/fotos gravados na nuvem; aviso ao ADM (visual, sem som)
  e contador no botão Visitas; cliente com som e contadores em Serviços, Visitas,
  Comprovantes e Obras, que zeram ao abrir a página (o histórico é mantido);
  exclusão de loja não apaga serviços de outra loja com o mesmo CNPJ.
- `src/utils/notifications.ts`: áudio destravado no primeiro toque, som de visita
  ("toc-toc"), modo silencioso, preferência de som.

## Testar (dois aparelhos: ADM e cliente)
- [ ] `npm install` e `npm run build` sem erros.
- [ ] ADM cria serviço sem vencimento/observação → aparece no cliente em segundos.
- [ ] ADM edita e exclui serviço → reflete no cliente; F5 nos dois mantém o estado.
- [ ] ADM offline cria serviço, recarrega a página, volta a rede → serviço sobe.
- [ ] Cliente solicita visita → ver "Solicitação enviada"; ADM recebe aviso na tela
      (sem som) e contador vermelho em Visitas; contador zera ao abrir Visitas.
- [ ] ADM agenda/realiza a visita → cliente ouve "toc-toc" e vê contador em Visitas.
- [ ] ADM gera comprovante → cliente recebe aviso e contador em Comprovantes.
- [ ] Toque uma vez na tela do cliente após abrir o app (destrava o som).

## Etapas seguintes (mesmo dia)

### Cadastro, CPF/CNPJ e permissões
- Cliente que perde todos os estabelecimentos **não é desconectado**: vê
  "Nenhum estabelecimento liberado" e o acesso volta sozinho quando o ADM
  vincular uma loja (a solicitação continua aprovada, sem voltar a pendente).
- Sem internet, os dados já autorizados continuam na tela.
- Ações administrativas bloqueadas também no código para o perfil cliente.
- Já existiam e foram mantidos: um CPF e vários CNPJs por perfil, tela de espera,
  liberação automática, aviso de rejeição, aprovação/rejeição pelo ADM.

### Backup
- ADM: se o backup das 04:00 não rodou (app fechado), roda ao abrir o app.
- Cliente: backup automático diário no Google Drive dele (usa a autorização já
  concedida; se não houver, o cliente faz o primeiro backup manual e autoriza).

### Interface, APK e PWA
- Removidos os restos de Sincronização/Exportação/Baixar Código.
- APK baixa por link direto do Storage (não depende de CORS).
- Service worker não guarda arquivos de outros domínios; versão de cache nova.

### Comprovante consolidado
- Cada pagamento vira uma parcela registrada no serviço (sincroniza com o cliente).
- Na quitação, o comprovante consolidado é gerado automaticamente, o cliente é
  avisado e pode abrir/imprimir/salvar em PDF em Comprovantes.
- Valores pagos antes desta versão aparecem como "Pagamentos anteriores".

### Testar também
- [ ] Remover a única loja de um cliente → tela "Nenhum estabelecimento liberado";
      vincular de novo → acesso volta sozinho.
- [ ] Desligar a internet no cliente → dados continuam visíveis.
- [ ] Pagamento parcial e depois quitação → comprovante consolidado no cliente.
- [ ] Baixar o APK pelo cliente em Nossa Empresa.
- [ ] Abrir o app do ADM depois das 04:00 → backup do dia é feito.

## Observações
- Na primeira abertura desta versão pelo ADM, serviços/obras/visitas que existiam
  só no aparelho dele são enviados uma única vez ao Firebase.
- Fotos são guardadas dentro do registro do serviço; o Firebase limita cada
  registro a 1 MB. Muitas fotos num mesmo serviço podem impedir a gravação
  (o ADM recebe um aviso). Solução definitiva: mover fotos para o Firebase Storage.
- Um app web não roda às 04:00 com o aparelho/app fechado; para backup exato
  nesse horário é preciso uma Cloud Function agendada (plano Blaze do Firebase).
- Não foi possível rodar `npm install`/`npm run build` neste ambiente (sem
  internet). Verificado: checagem de tipos sem erros novos, empacotamento com
  esbuild e testes da fila de reenvio e do comprovante consolidado.
