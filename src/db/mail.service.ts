import { Injectable, OnModuleInit } from '@nestjs/common';
import amqp, {
    AmqpConnectionManager,
    ChannelWrapper,
    Channel
} from 'amqp-connection-manager';
import { escape } from 'he';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function convertTextToHtmlEmail(text: string): string {
    // Escape HTML special characters
    let html = escape(text);

    // Convert line breaks to <br> tags
    html = html.replace(/\n/g, '<br>');

    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/\S+)/g;
    html = html.replace(urlRegex, (url) => `<a href="${url}">${url}</a>`);

    // Wrap the content in a basic HTML structure
    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    ${html}
</div>`;
}

@Injectable()
export class MailService implements OnModuleInit {
    private rabbit: AmqpConnectionManager;
    private channelWrapper: ChannelWrapper;

    async onModuleInit() {
        this.rabbit = amqp.connect([process.env.RABBIT_URL]);
        await this.rabbit.connect();
        console.log('Connected to RabbitMQ service.');
        this.channelWrapper = this.rabbit.createChannel({
            setup: (channel: Channel) => {
                return channel.assertQueue(process.env.RABBIT_QUEUE, {
                    durable: true
                });
            }
        });
    }

    async sendMail(recipient: string, subject: string, content: string) {
        const mail = {
            to: recipient,
            subject,
            text: content
            // html: convertTextToHtmlEmail(content)
        };

        await this.channelWrapper.sendToQueue(
            process.env.RABBIT_QUEUE,
            Buffer.from(JSON.stringify(mail)),
            {
                persistent: true,
                contentType: 'application/json'
            }
        );
    }

    async sendRegistrationEmail(
        recipient: string,
        firstName: string,
        token: string
    ) {
        await this.sendMail(
            recipient,
            'Verify your email for VEX Market',
            `Hi ${firstName}!

Thank you for signing up for VEX Market! To complete your registration and ensure the security of your account, please verify your email address by clicking the link below:
${process.env.BASE_URL}/auth/verify/${token} 

If you didn't create an account with VEX Market, please ignore this email or contact our support team at ${process.env.SUPPORT_EMAIL} if you have any concerns.

Best regards,
The VEX Market Team`
        );
    }

    async sendRegistrationSuccessEmail(recipient: string, firstName: string) {
        await this.sendMail(
            recipient,
            'Account created for VEX Market',
            `Hi ${firstName}!

Your email has successfully been verified for VEX Market. You now have full access to VEX Market and can log into your account at https://vexmarket.com.

Best regards,
The VEX Market Team`
        );
    }

    async sendPasswordResetEmail(
        recipient: string,
        firstName: string,
        token: string
    ) {
        await this.sendMail(
            recipient,
            'Reset password for your VEX Market account',
            `Hi ${firstName}!

We received a request to reset the password for your VEX Market account. If you made this request, please click the link below to set a new password:
${process.env.BASE_URL}/auth/reset/${token} 

The link will expire in one hour. If you have any concerns or didn't request this password reset, please contact our support team at support@vexmarket.com.

Best regards,
The VEX Market Team`
        );
    }

    async sendPasswordResetNotificationEmail(
        recipient: string,
        firstName: string
    ) {
        await this.sendMail(
            recipient,
            'Password Successfully Updated',
            `Hi ${firstName}!

You are receiving this email because your password has been changed on VEXMarket.com. If this wasn't you, please contact us immediately at support@vexmarket.com.

Best regards,
The VEX Market Team`
        );
    }
}
