const { getChannel } = require('./rabbitmq');

const EMAIL_QUEUE = 'task.assignment.email';

async function assertEmailQueue(channel) {
  await channel.assertQueue(EMAIL_QUEUE, { durable: true });
}

async function publishTaskAssignmentEmail(payload) {
  const channel = await getChannel();
  await assertEmailQueue(channel);

  return channel.sendToQueue(
    EMAIL_QUEUE,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
}

module.exports = {
  EMAIL_QUEUE,
  assertEmailQueue,
  publishTaskAssignmentEmail
};
