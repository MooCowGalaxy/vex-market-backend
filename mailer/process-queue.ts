import { createTransport } from 'nodemailer';
import amqp, { Channel } from 'amqp-connection-manager';
import { config } from 'dotenv';
config();

const transporterOptions = {
    host: process.env.SMTP_SERVER,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_NOREPLY_EMAIL,
        pass: process.env.SMTP_PASSWORD
    },
    from: `"${process.env.SMTP_NOREPLY_NAME}" <${process.env.SMTP_NOREPLY_EMAIL}>`
};

const transporter = createTransport(transporterOptions);
const RABBIT_QUEUE = process.env.RABBIT_QUEUE || 'vex_mail';

async function main() {
    const rabbit = amqp.connect(process.env.RABBIT_URL || 'amqp://localhost');
    await rabbit.connect();
    console.log('Connected to RabbitMQ service.');

    const channel = rabbit.createChannel({
        setup: async (channel: Channel) => {
            await channel.assertQueue(RABBIT_QUEUE, {
                durable: true
            });
            await channel.prefetch(1);
        }
    });

    await channel.waitForConnect();
    console.log('Connected to queue.');

    await channel.consume(RABBIT_QUEUE, async (msg) => {
        if (msg === null) {
            console.error('Consumer cancelled by server.');
            return;
        }

        const data = JSON.parse(msg.content.toString());

        try {
            await transporter.sendMail(data);
        } catch (err) {
            console.error(err.stack);
            console.error(data);
        }

        channel.ack(msg);
    });
}

main().then();
