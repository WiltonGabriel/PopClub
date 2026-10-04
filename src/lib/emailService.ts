/**
 * Serviço modular e desacoplado de mensageria / e-mail do PopClub.
 *
 * Suporta modo de simulação no console (desenvolvimento) e provedores reais
 * plugáveis (Resend, SMTP, SendGrid) ativados via variáveis de ambiente (.env),
 * sem que regras de negócio ou componentes de interface precisem ser alterados.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: "simulation" | "production";
}

export interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * Provedor de Simulação / Desenvolvimento
 * Registra o e-mail no console com formatação clara e estruturada.
 */
class ConsoleSimulationEmailProvider implements EmailProvider {
  name = "ConsoleSimulation";

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const timestamp = new Date().toISOString();
    console.log(`\n=============================================================`);
    console.log(`[EMAIL SERVICE] 📨 Simulação de Envio de E-mail (${timestamp})`);
    console.log(`Provedor: ${this.name} (Modo Simulação / Desenvolvimento)`);
    console.log(`Para: ${message.to}`);
    console.log(`Assunto: ${message.subject}`);
    if (message.text) {
      console.log(`--- Conteúdo (Texto) ---`);
      console.log(message.text);
    }
    console.log(`=============================================================\n`);

    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode: "simulation",
    };
  }
}

/**
 * Provedor Resend (Exemplo de integração externa para produção)
 */
class ResendEmailProvider implements EmailProvider {
  name = "Resend";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const from = process.env.EMAIL_FROM || "PopClub <nao-responda@popclub.com.br>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.message || "Falha ao enviar e-mail via Resend.",
          mode: "production",
        };
      }

      return {
        success: true,
        messageId: data.id,
        mode: "production",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro inesperado ao conectar com Resend.",
        mode: "production",
      };
    }
  }
}

/**
 * Fábrica do Provedor de E-mail
 */
function getEmailProvider(): EmailProvider {
  const providerType = process.env.EMAIL_PROVIDER?.toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY;

  if (providerType === "resend" && resendApiKey) {
    return new ResendEmailProvider(resendApiKey);
  }

  // Fallback padrão seguro para desenvolvimento e testes
  return new ConsoleSimulationEmailProvider();
}

/**
 * Serviço de E-mail Principal do PopClub
 */
export const emailService = {
  /**
   * Envia uma mensagem genérica de e-mail através do provedor ativo.
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    const provider = getEmailProvider();
    return provider.sendEmail(message);
  },

  /**
   * Envia o código de 6 dígitos para recuperação de senha do usuário.
   */
  async sendPasswordResetCode({
    to,
    name,
    code,
    expiresMinutes = 15,
  }: {
    to: string;
    name?: string | null;
    code: string;
    expiresMinutes?: number;
  }): Promise<EmailSendResult> {
    const recipientName = name ? name.split(" ")[0] : "Cliente";
    const subject = `Seu código de recuperação PopClub: ${code}`;

    const text = [
      `Olá, ${recipientName}!`,
      ``,
      `Você solicitou a redefinição da sua senha de acesso na PopClub / Pop Shake Sorveteria.`,
      ``,
      `Seu código de segurança de 6 dígitos é:`,
      `[ ${code} ]`,
      ``,
      `Este código é válido por ${expiresMinutes} minutos.`,
      `Se você não fez esta solicitação, por favor desconsidere este e-mail com segurança.`,
      ``,
      `Atenciosamente,`,
      `Equipe PopClub`,
    ].join("\n");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
            .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .brand { font-size: 20px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; text-align: center; }
            .code-box { background: #f3e8ff; border: 2px dashed #9333ea; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
            .code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #6b21a8; }
            .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">🍨 PopClub Sorveteria</div>
            <p>Olá, <strong>${recipientName}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir sua senha de acesso. Utilize o código temporário abaixo para concluir a alteração:</p>
            <div class="code-box">
              <span class="code">${code}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">⏱️ Este código expira em <strong>${expiresMinutes} minutos</strong>.</p>
            <p style="font-size: 13px; color: #64748b;">Se você não solicitou a alteração, ignore este e-mail com segurança.</p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Pop Shake Sorveteria &bull; Várzea Grande, MT
            </div>
          </div>
        </body>
      </html>
    `;

    return this.send({ to, subject, text, html });
  },
};
