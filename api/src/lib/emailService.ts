import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface InvitationEmailData {
  to: string
  inviterName: string
  organizationName: string
  role: string
  invitationUrl: string
  expiresAt: Date
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private config: EmailConfig | null = null

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const emailUser = process.env.EMAIL_USER
    const emailPassword = process.env.EMAIL_PASSWORD

    if (!emailUser || !emailPassword) {
      console.warn('Email configuration not found. Email sending will be disabled.')
      return
    }

    this.config = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    }

    this.transporter = nodemailer.createTransport(this.config)
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email transporter not initialized. Skipping email send.')
      return false
    }

    try {
      const mailOptions = {
        from: `"${data.organizationName}" <${this.config!.auth.user}>`,
        to: data.to,
        subject: `You're invited to join ${data.organizationName}`,
        html: this.generateInvitationEmailHTML(data),
        text: this.generateInvitationEmailText(data)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Invitation email sent successfully:', result.messageId)
      return true
    } catch (error) {
      console.error('Failed to send invitation email:', error)
      return false
    }
  }

  private generateInvitationEmailHTML(data: InvitationEmailData): string {
    const expiresDate = data.expiresAt.toLocaleDateString()
    const expiresTime = data.expiresAt.toLocaleTimeString()

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to Join ${data.organizationName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .footer {
            background: #f9fafb;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
        }
        .button {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background: #059669;
        }
        .role-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .expiry-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>You're Invited!</h1>
        <p>Join ${data.organizationName} on TokenOps</p>
    </div>
    
    <div class="content">
        <p>Hello,</p>
        
        <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on TokenOps as a <span class="role-badge">${data.role}</span>.</p>
        
        <p>TokenOps is a comprehensive platform for secure and compliant token issuance, helping organizations manage their digital assets with enterprise-grade security and regulatory compliance.</p>
        
        <div style="text-align: center;">
            <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
        </div>
        
        <div class="expiry-notice">
            <strong>⏰ This invitation expires on ${expiresDate} at ${expiresTime}</strong>
        </div>
        
        <p>If you have any questions, please contact your organization administrator.</p>
        
        <p>Best regards,<br>The TokenOps Team</p>
    </div>
    
    <div class="footer">
        <p>This invitation was sent to ${data.to}</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
</body>
</html>
    `
  }

  private generateInvitationEmailText(data: InvitationEmailData): string {
    const expiresDate = data.expiresAt.toLocaleDateString()
    const expiresTime = data.expiresAt.toLocaleTimeString()

    return `
You're Invited to Join ${data.organizationName} on TokenOps

Hello,

${data.inviterName} has invited you to join ${data.organizationName} on TokenOps as a ${data.role}.

TokenOps is a comprehensive platform for secure and compliant token issuance, helping organizations manage their digital assets with enterprise-grade security and regulatory compliance.

To accept this invitation, click the link below:
${data.invitationUrl}

⏰ This invitation expires on ${expiresDate} at ${expiresTime}

If you have any questions, please contact your organization administrator.

Best regards,
The TokenOps Team

---
This invitation was sent to ${data.to}
If you didn't expect this invitation, you can safely ignore this email.
    `
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false
    }

    try {
      await this.transporter.verify()
      console.log('Email service connection verified successfully')
      return true
    } catch (error) {
      console.error('Email service connection failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()
