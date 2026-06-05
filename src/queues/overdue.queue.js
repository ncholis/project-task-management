const { getChannel } = require('./rabbitmq');

const OVERDUE_EXCHANGE = 'task.overdue.exchange';
const OVERDUE_DELAY_QUEUE = 'task.overdue.delay';
const OVERDUE_READY_QUEUE = 'task.overdue.ready';
const OVERDUE_READY_ROUTING_KEY = 'task.overdue.ready';

async function assertOverdueQueues(channel) {
  await channel.assertExchange(OVERDUE_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(OVERDUE_READY_QUEUE, { durable: true });
  await channel.bindQueue(OVERDUE_READY_QUEUE, OVERDUE_EXCHANGE, OVERDUE_READY_ROUTING_KEY);

  await channel.assertQueue(OVERDUE_DELAY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': OVERDUE_EXCHANGE,
      'x-dead-letter-routing-key': OVERDUE_READY_ROUTING_KEY
    }
  });
}

async function publishOverdueTask(taskId, endTime) {
  if (!endTime) return false;

  const end = new Date(endTime);
  if (Number.isNaN(end.getTime())) return false;

  const channel = await getChannel();
  await assertOverdueQueues(channel);

  const payload = {
    task_id: Number(taskId),
    end_time: end.toISOString()
  };
  const buffer = Buffer.from(JSON.stringify(payload));
  const delay = Math.max(end.getTime() - Date.now(), 0);

  if (delay === 0) {
    return channel.publish(OVERDUE_EXCHANGE, OVERDUE_READY_ROUTING_KEY, buffer, { persistent: true });
  }

  return channel.sendToQueue(OVERDUE_DELAY_QUEUE, buffer, {
    persistent: true,
    expiration: String(delay)
  });
}

module.exports = {
  OVERDUE_EXCHANGE,
  OVERDUE_DELAY_QUEUE,
  OVERDUE_READY_QUEUE,
  OVERDUE_READY_ROUTING_KEY,
  assertOverdueQueues,
  publishOverdueTask
};
