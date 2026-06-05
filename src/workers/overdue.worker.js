const prisma = require('../config/prisma');
const { getChannel, closeRabbitMQ } = require('../queues/rabbitmq');
const {
  OVERDUE_READY_QUEUE,
  assertOverdueQueues,
  publishOverdueTask
} = require('../queues/overdue.queue');
const { invalidateTaskTreeCache } = require('../modules/tasks/task.cache');

async function handleMessage(message, channel) {
  if (!message) return;

  try {
    const payload = JSON.parse(message.content.toString());
    const payloadEndTime = new Date(payload.end_time);

    if (!payload.task_id || Number.isNaN(payloadEndTime.getTime())) {
      channel.ack(message);
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: Number(payload.task_id) } });
    if (!task || !task.end_time || task.status === 'CLOSED') {
      channel.ack(message);
      return;
    }

    const currentEndTime = new Date(task.end_time);
    if (currentEndTime.getTime() !== payloadEndTime.getTime()) {
      channel.ack(message);
      return;
    }

    if (Date.now() < currentEndTime.getTime()) {
      await publishOverdueTask(task.id, currentEndTime);
      channel.ack(message);
      return;
    }

    if (task.status !== 'OVERDUE') {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'OVERDUE' }
      });
      await invalidateTaskTreeCache(task.project_id);
      console.log(`Task ${task.id} marked as OVERDUE`);
    }

    channel.ack(message);
  } catch (error) {
    console.error('Overdue worker error:', error.message);
    channel.nack(message, false, true);
  }
}

async function start() {
  const channel = await getChannel();
  await assertOverdueQueues(channel);
  channel.prefetch(5);

  console.log(`Overdue worker listening on ${OVERDUE_READY_QUEUE}`);
  await channel.consume(OVERDUE_READY_QUEUE, (message) => handleMessage(message, channel));
}

async function shutdown() {
  await prisma.$disconnect();
  await closeRabbitMQ();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(async (error) => {
  console.error('Failed to start overdue worker:', error);
  await shutdown();
});
