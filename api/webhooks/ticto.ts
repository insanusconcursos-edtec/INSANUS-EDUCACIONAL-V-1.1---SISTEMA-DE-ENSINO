import type { VercelRequest, VercelResponse } from '@vercel/node';
import { provisionTictoPurchase, revokeTictoPurchase } from '../../functions/src/services/provisioningService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // A Ticto envia os dados via POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const payload = req.body;
    
    // O Token exato fornecido pelo administrador para validar a origem da Ticto
    // Este token deve ser configurado no painel da Ticto
    const tictoToken = "Zbi2TLCWBPbYJU1Xz14JF7gt8LGm8LQ0tNfMzGcu0US35mR56ye4PFU44We9c5eHcYU6wDzNxNOkx13UDWsVd7FHzI1brmjRrt0i";

    // 1. Validação de Segurança (Token)
    if (payload.token !== tictoToken) {
      console.error("Token da Ticto inválido. Tentativa de acesso bloqueada.");
      return res.status(401).json({ error: 'Acesso Negado' });
    }

    const { status, customer, item } = payload;

    // 2. Ignorar status de teste (waiting_payment ou compras fictícias da aprovação da Ticto)
    // A Ticto envia um product_id = 1 para validar o endpoint
    if (status === 'waiting_payment' || item?.product_id === 1 || payload.product_id === 1) {
      console.log("Payload de teste recebido da Ticto e ignorado com segurança.");
      return res.status(200).json({ received: true, message: "Teste recebido com sucesso" });
    }

    // 3. Lógica de Negócio Real
    // approved/paid -> Provisionar
    // refunded/chargeback/canceled/overdue -> Revogar
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

    // 4. Retorno de Sucesso OBRIGATÓRIO (200 OK) para a Ticto
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Erro interno no Webhook da Ticto:", error);
    // IMPORTANTE: Retornamos 200 mesmo em erro para evitar que a Ticto desative o webhook
    return res.status(200).json({ 
      received: true, 
      error: "Erro interno processado em silêncio",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
