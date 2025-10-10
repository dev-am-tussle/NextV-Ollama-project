import sgMail from '@sendgrid/mail';
import dotenv from "dotenv";
dotenv.config();

class SendGridService {
  constructor() {
    if (!process.env.SEND_GRID_API_KEY) {
      console.warn('⚠️ SEND_GRID_API_KEY not found in environment variables');
      return;
    }
    
    sgMail.setApiKey(process.env.SEND_GRID_API_KEY);
    this.senderEmail = process.env.SENDER_EMAIL || 'noreply@company.com';
    console.log('✅ SendGrid service initialized');
  }

  /**
   * Send invitation email to new employee
   * @param {Object} invitationData - Invitation details
   * @param {string} invitationData.email - Recipient email
   * @param {string} invitationData.name - Recipient name
   * @param {string} invitationData.token - Invitation token
   * @param {string} invitationData.organizationName - Organization name
   * @param {string} invitationData.inviterName - Inviter name
   * @param {string} invitationData.frontendUrl - Frontend URL for invite link
   * @returns {Promise<Object>} SendGrid response
   */
  async sendInvitationEmail(invitationData) {
    try {
      const {
        email,
        name,
        token,
        organizationName = 'Your Organization',
        inviterName = 'Your Admin',
        frontendUrl = process.env.FRONTEND_ORIGIN
      } = invitationData;

      if (!process.env.SEND_GRID_API_KEY) {
        console.log('📧 SendGrid not configured - Email would be sent to:', email);
        return {
          success: true,
          message: 'Email would be sent (SendGrid not configured)',
          messageId: 'mock-' + Date.now()
        };
      }

      const inviteLink = `${frontendUrl}/accept-invite?token=${token}`;
      
      const emailTemplate = this.generateInvitationTemplate({
        name,
        organizationName,
        inviterName,
        inviteLink
      });

      const msg = {
        to: email,
        from: {
          email: this.senderEmail,
          name: organizationName
        },
        subject: `You're invited to join ${organizationName}`,
        html: emailTemplate,
        text: this.generatePlainTextInvitation({
          name,
          organizationName,
          inviterName,
          inviteLink
        }),
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          }
        }
      };

      const response = await sgMail.send(msg);
      
      console.log('✅ Invitation email sent successfully to:', email);
      return {
        success: true,
        message: 'Invitation email sent successfully',
        messageId: response[0].headers['x-message-id'] || 'unknown'
      };

    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      
      if (error.response) {
        console.error('SendGrid Error Details:', error.response.body);
      }

      return {
        success: false,
        error: 'Failed to send invitation email',
        details: error.message
      };
    }
  }

  /**
   * Generate HTML email template for invitation
   */
  generateInvitationTemplate({ name, organizationName, inviterName, inviteLink }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${organizationName}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white; }
            .content { padding: 30px 20px; }
            .cta-button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .security-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 You're Invited!</h1>
                <p>Join ${organizationName}</p>
            </div>
            <div class="content">
                <h2>Hello ${name}!</h2>
                <p>${inviterName} has invited you to join <strong>${organizationName}</strong>.</p>
                
                <p>Click the button below to accept your invitation and complete your profile:</p>
                
                <div style="text-align: center;">
                    <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
                </div>
                
                <div class="security-note">
                    <strong>🔒 Security Note:</strong> This invitation link is unique to you and will expire in 7 days. 
                    If you didn't expect this invitation, you can safely ignore this email.
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${inviteLink}</p>
                
                <p>Welcome to the team!</p>
                <p>Best regards,<br>The ${organizationName} Team</p>
            </div>
            <div class="footer">
                <p>This invitation was sent by ${inviterName} from ${organizationName}</p>
                <p>If you have any questions, please contact your administrator.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text version of invitation
   */
  generatePlainTextInvitation({ name, organizationName, inviterName, inviteLink }) {
    return `
Hello ${name}!

${inviterName} has invited you to join ${organizationName}.

To accept your invitation and complete your profile, please visit:
${inviteLink}

This invitation link is unique to you and will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Welcome to the team!

Best regards,
The ${organizationName} Team

---
This invitation was sent by ${inviterName} from ${organizationName}
If you have any questions, please contact your administrator.
    `;
  }

  /**
   * Send password reset email (for future use)
   */
  async sendPasswordResetEmail(emailData) {
    // Implementation for password reset emails
    console.log('Password reset email feature - to be implemented');
    return { success: false, error: 'Not implemented yet' };
  }
}

export const sendGridService = new SendGridService();