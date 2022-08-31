const amqp = require('amqplib');
const { Pool } = require('pg');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class ProducerService {
  constructor() {
    this._pool = new Pool();
  }

  async verifyPlaylistOwner(id, credentialId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ada');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== credentialId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async sendMessage(queue, message, playlistId, ownerId) {
    await this.verifyPlaylistOwner(playlistId, ownerId);
    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, {
      durable: true,
    });

    await channel.sendToQueue(queue, Buffer.from(message));

    setTimeout(() => {
      connection.close();
    }, 1000);
  }
}

module.exports = ProducerService;
