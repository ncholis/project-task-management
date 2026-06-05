const { getChannel, closeRabbitMQ } = require('../queues/rabbitmq');
const { EMAIL_QUEUE, assertEmailQueue } = require('../queues/email.queue');
const { sendTaskAssignmentEmail } = require('../config/mailer');

async function handleMessage(message, channel) {
  if (!message) return;

  try {
    const payload = JSON.parse(message.content.toString());
    await sendTaskAssignmentEmail(payload);
    channel.ack(message);
  } catch (error) {
    console.error('Email worker error:', error.message);
    channel.nack(message, false, false);
  }
}

async function start() {
  const channel = await getChannel();
  await assertEmailQueue(channel);
  channel.prefetch(10);

  console.log(`Email worker listening on ${EMAIL_QUEUE}`);
  await channel.consume(EMAIL_QUEUE, (message) => handleMessage(message, channel));
}

async function shutdown() {
  await closeRabbitMQ();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(async (error) => {
  console.error('Failed to start email worker:', error);
  await shutdown();
});
