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

## Observações
- Na primeira abertura desta versão pelo ADM, serviços/obras/visitas que existiam
  só no aparelho dele são enviados uma única vez ao Firebase.
- Fotos são guardadas dentro do registro do serviço; o Firebase limita cada
  registro a 1 MB. Muitas fotos num mesmo serviço podem impedir a gravação
  (o ADM recebe um aviso). Solução definitiva: mover fotos para o Firebase Storage.
- Pendências da lista original ainda não tratadas: itens 3 a 11 (CPF/CNPJ e
  aprovação, backup 04:00, APK, ajustes de interface, PWA, comprovante consolidado).
