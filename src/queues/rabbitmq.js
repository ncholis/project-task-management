const amqp = require('amqplib');
const rabbitConfig = require('../config/rabbitmq');

let connection;
let channel;

async function getChannel() {
  if (channel) return channel;

  connection = await amqp.connect(rabbitConfig.url);
  connection.on('close', () => {
    channel = null;
    connection = null;
  });
  connection.on('error', (error) => {
    console.error('RabbitMQ connection error:', error.message);
  });

  channel = await connection.createChannel();
  channel.on('close', () => {
    channel = null;
  });
  channel.on('error', (error) => {
    console.error('RabbitMQ channel error:', error.message);
  });

  return channel;
}

async function closeRabbitMQ() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

module.exports = {
  getChannel,
  closeRabbitMQ
};
