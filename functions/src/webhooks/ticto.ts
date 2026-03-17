import * as functions from 'firebase-functions';
import { provisionTictoPurchase, revokeTictoPurchase } from '../services/provisioningService';

export const tictoWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Receber método POST com payload
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const payload = req.body;
    
    // 2. Verificar status da transação
    // Exemplo: 'approved', 'paid', etc. Ajuste conforme a documentação da Ticto
    const status = payload.status || payload.transaction_status;
    
    if (status === 'approved' || status === 'paid') {
      // 3. Extrair dados do cliente e ID do produto
      const customerData = {
        name: payload.customer?.name || payload.client_name || '',
        email: payload.customer?.email || payload.client_email || '',
        phone: payload.customer?.phone || payload.client_phone || ''
      };
      
      const tictoProductId = payload.product?.id || payload.product_id || '';

      if (!customerData.email || !tictoProductId) {
        console.error('Payload inválido: E-mail do cliente ou ID do produto ausentes.', payload);
        res.status(400).send('Bad Request: Missing required fields');
        return;
      }

      // 4. Chamar a função de provisionamento
      await provisionTictoPurchase(customerData, tictoProductId);
    } else if (status === 'refunded' || status === 'chargeback' || status === 'canceled' || status === 'overdue') {
      const customerEmail = payload.customer?.email || payload.client_email || '';
      const tictoProductId = payload.product?.id || payload.product_id || '';

      if (!customerEmail || !tictoProductId) {
        console.error('Payload inválido para revogação: E-mail do cliente ou ID do produto ausentes.', payload);
        res.status(400).send('Bad Request: Missing required fields');
        return;
      }

      await revokeTictoPurchase(customerEmail, tictoProductId);
    } else {
      console.log(`Webhook recebido com status ignorado: ${status}`);
    }

    // 5. Retornar HTTP Status 200
    res.status(200).send('OK');

  } catch (error) {
    // 6. Bloco try/catch para registrar erros sem deixar a requisição pendente
    console.error('Erro ao processar webhook da Ticto:', error);
    res.status(500).send('Internal Server Error');
  }
});
