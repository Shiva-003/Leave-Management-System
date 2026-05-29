import amqp from 'amqplib';

const RABBITMQ_URL    = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME   = 'leave.events';
const EXCHANGE_TYPE   = 'topic';


let channel = null;

export const connectPublisher = async (retries=5, delay=4000) => {
    for (let i=1; i<=retries;i++){
        try{
            const connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            (await channel).assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {durable: true });

            connection.on('error', (err)=>{
                console.error(`[PUBLISHER] Connection error:`, err.message);
                channel = null;
            });

            connection.on('close', ()=>{
                console.warn('[PUBLISHER] Connection closed');
                channel = null;
            });

            console.log(`[PUBLISHER] Connected to RabbitMQ — exchange: "${EXCHANGE_NAME}" (${EXCHANGE_TYPE})`);
            return;
        }catch (err) {
            console.warn(`[PUBLISHER] RabbitMQ not ready (attempt ${i}/${retries}): ${err.message}`);
            if (i < retries) await new Promise((r) => setTimeout(r, delay));
        }
    }
    console.error('[PUBLISHER] Unable to connect to RabbitMQ');
}

export const publishMessage = (routingKey, notification) => {
    const payload = JSON.stringify({
        ...notification,
        routingKey,
        publishedAt: new Date().toISOString()
    });

    if(channel){
        try{
            channel.publish(
                EXCHANGE_NAME,
                routingKey,
                Buffer.from(payload),
                { persistent: true }
            );
        } catch(err){
            console.error('[PUBLISHER] Failed to publish: ', err.message);
        }
    }
}