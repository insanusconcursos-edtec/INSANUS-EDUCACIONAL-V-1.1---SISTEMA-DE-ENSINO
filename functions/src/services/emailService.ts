import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'seu-email@gmail.com',
    pass: process.env.SMTP_PASS || 'sua-senha-de-app'
  }
});

export const sendWelcomeEmail = async (name: string, email: string, password: string) => {
  const mailOptions = {
    from: `"Insanus Educacional" <${process.env.SMTP_USER || 'seu-email@gmail.com'}>`,
    to: email,
    subject: 'Seus acessos chegaram! Bem-vindo(a) à Insanus',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
        <h2 style="color: #e53e3e;">Olá, ${name}!</h2>
        <p>Seu pagamento foi aprovado e seus acessos foram liberados com sucesso.</p>
        <p>Acesse a plataforma através do link abaixo:</p>
        <p><strong>URL:</strong> <a href="https://suaplataforma.com" style="color: #60a5fa;">Acessar Plataforma</a></p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Senha Provisória:</strong> ${password}</p>
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Por segurança, recomendamos que você altere esta senha imediatamente após o seu primeiro login, acessando a aba "Editar Perfil" na tela inicial.</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[E-MAIL] Boas-vindas enviadas com sucesso para ${email}`);
  } catch (error) {
    console.error(`[E-MAIL] Erro ao enviar e-mail de boas-vindas para ${email}:`, error);
    // Não lançamos o erro para não interromper o fluxo de provisionamento
  }
};
