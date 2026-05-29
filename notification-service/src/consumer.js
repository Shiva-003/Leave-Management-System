import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'leave.events';
const EXCHANGE_TYPE = 'topic';

const QUEUES = [
    {
        name: 'employee-notifications',
        bindingKey: 'leave.*.employee',
    },
    {
        name: 'manager-notifications',
        bindingKey: 'leave.*.manager'
    }
]

const startConsumer = async (retries=5, delay=4000) => {
    for (let i=1; i <= retries; i++){
        try {
            const connection = await amqp.connect(RABBITMQ_URL);
            const channel = await connection.createChannel();
            
            await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true } );

            for (const q of QUEUES){
                await channel.assertQueue(q.name, {durable: true});
                await channel.bindQueue(q.name, EXCHANGE_NAME, q.bindingKey);
                console.log(`[${process.env.SERVICE_NAME}] Queue "${q.name}" bound to exchange "${EXCHANGE_NAME}" with key "${q.bindingKey}"`);
            }
            
            channel.prefetch(1);

            for (const q of QUEUES){
                channel.consume(q.name, async(msg) => {
                    if (!msg) return
    
                    try{
                        const notification = JSON.parse(msg.content.toString());
                        console.log(`[${process.env.SERVICE_NAME}] [${notification.routingKey}] ${notification.recipientId} | ${notification.message}`);
                        channel.ack(msg);
                    }catch(err){
                        console.error(`[CONSUMER] Failed to process message from "${q.name}":`, err.message);
                        channel.nack(msg, false, false);
                    }
                })

                console.log(`[CONSUMER] Listening on queue: "${q.name}"`);
            }

            connection.on('error', (err) => console.error('[CONSUMER] Connection error:', err.message));
            connection.on('close', ()    => console.warn('[CONSUMER] Connection closed'));
            return;
        }catch(err){
            console.warn(`[CONSUMER] RabbitMQ not ready (attempt ${i}/${retries}): ${err.message}`);
            if (i < retries) await new Promise((r) => setTimeout(r, delay));
        }
    }

    throw new Error('Could not connect to RabbitMQ after all retries.');
}

export default startConsumer;