import { WhatsAppConfig, WhatsAppTemplates } from '../types';

const WHATSAPP_STORAGE_KEY = 'gestao_whatsapp_config_v1';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  paymentReminder: `🔔 *Lembrete de Pagamento - Empreiteiro Saminês*

Olá, *{cliente}*!
Passando para lembrar sobre o acerto do serviço:
📌 *{servico}*
💰 *Valor:* R$ {valor}
📅 *Vencimento:* {vencimento}

🔑 *Chave PIX:* {chave_pix}
👤 *Favorecido:* {favorecido}

{link_fatura}
Qualquer dúvida estamos à disposição! 🤝`,

  obraUpdate: `🏗️ *Atualização da Obra - Empreiteiro Saminês*

Olá, *{cliente}*!
Temos novidades no andamento da sua obra:
🏢 *Obra:* {obra}
📊 *Progresso Atual:* {progresso}%
⚡ *Status:* {status}
🗓️ *Data:* {data}

📝 *Detalhes:*
{detalhes}

Seguimos trabalhando com dedicação e qualidade técnica! 🛠️`,

  receiptConfirmation: `✅ *Comprovante de Pagamento Confirmado*

Olá, *{cliente}*!
Confirmamos o recebimento referente à sua obra/serviço:
📄 *Comprovante:* #{numero_comprovante}
💰 *Valor Recebido:* R$ {valor}
📅 *Data:* {data}

Agradecemos pela pontualidade e confiança em nossos serviços! 🤝`,

  visitaScheduled: `📅 *Confirmação de Visita Técnica - Empreiteiro Saminês*

Olá, *{cliente}*!
Sua visita técnica foi agendada:
🗓️ *Data:* {data} às {hora}
📍 *Endereço:* {endereco}
👷 *Responsável Técnico:* {tecnico}
🎯 *Finalidade:* {finalidade}

Por favor, nos confirme se este horário continua bom para você! 👍`,
};

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  templates: DEFAULT_WHATSAPP_TEMPLATES,
};

export function loadWhatsAppConfig(): WhatsAppConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_WHATSAPP_CONFIG;
  }

  try {
    // Remove tokens, endpoints e credenciais antigas de API eventualmente salvos.
    localStorage.removeItem(WHATSAPP_STORAGE_KEY);
    return DEFAULT_WHATSAPP_CONFIG;
  } catch (err) {
    console.warn('Erro ao carregar configurações de WhatsApp:', err);
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

