import type { VercelRequest, VercelResponse } from '@vercel/node';
import { provisionTictoPurchase, revokeTictoPurchase } from '../../src/backend/services/provisioningService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const payload = req.body;
    const tictoToken = "Zbi2TLCWBPbYJU1Xz14JF7gt8LGm8LQ0tNfMzGcu0US35mR56ye4PFU44We9c5eHcYU6wDzNxNOkx13UDWsVd7FHzI1brmjRrt0i";

    // 1. Validação do Token
    if (payload.token !== tictoToken) {
      console.error("Token da Ticto inválido. Tentativa de acesso bloqueada.");
      return res.status(401).json({ error: 'Acesso Negado' });
    }

    // 2. Interceptar testes da Ticto IMEDIATAMENTE antes de carregar o backend
    if (payload.status === 'waiting_payment' || payload.item?.product_id === 1 || payload.product_id === 1) {
      console.log("Payload de teste recebido da Ticto e ignorado com segurança.");
      return res.status(200).json({ received: true, message: "Teste Ticto aprovado com sucesso!" });
    }

    // 3. Importação Estática (Garantindo resolução de path na Vercel)
    // O caminho é relativo ao arquivo /api/webhooks/ticto.ts
    // ../../src/backend/services/provisioningService

    const { status, customer, item } = payload;
    
    if (status === 'approved' || status === 'paid') {
      const customerData = {
        name: customer?.name || payload.client_name || '',
        email: customer?.email || payload.client_email || '',
        phone: customer?.phone || payload.client_phone || ''
      };
      const productId = item?.product_id?.toString() || payload.product_id?.toString() || '';
      
      if (customerData.email && productId) {
        await provisionTictoPurchase(customerData, productId);
        console.log(`[WEBHOOK] Provisionamento solicitado para ${customerData.email} - Produto ${productId}`);
      }
    } else if (['refunded', 'chargeback', 'canceled', 'overdue'].includes(status)) {
      const email = customer?.email || payload.client_email || '';
      const productId = item?.product_id?.toString() || payload.product_id?.toString() || '';
      
      if (email && productId) {
        await revokeTictoPurchase(email, productId);
        console.log(`[WEBHOOK] Revogação solicitada para ${email} - Produto ${productId}`);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Erro interno no Webhook da Ticto:", error);
    // Retorna 200 OBRIGATORIAMENTE para não desativar o webhook na Ticto
    return res.status(200).json({ 
      received: true, 
      error: "Erro silenciado",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
