import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { provisionTictoPurchase, revokeTictoPurchase } from "./functions/src/services/provisioningService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para parsear JSON no webhook
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Webhook da Ticto
  app.post("/api/webhooks/ticto", async (req, res) => {
    try {
      const payload = req.body;
      const status = payload.status || payload.transaction_status;
      
      if (status === 'approved' || status === 'paid') {
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

      res.status(200).send('OK');
    } catch (error) {
      console.error('Erro ao processar webhook da Ticto:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
