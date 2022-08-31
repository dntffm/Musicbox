/* eslint-disable camelcase */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const mapDBtoModel = require('../../utils/mapDBtoModel');

class SongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({
    title, year, performer, genre, duration,
  }) {
    const id = `song-${nanoid(16)}`;
    const inserted_at = new Date().toISOString();
    const updated_at = inserted_at;

    const query = {
      text: 'INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      values: [id, title, year, performer, genre, duration, inserted_at, updated_at],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('gagal menambah song!');
    }

    return result.rows[0].id;
  }

  async getSongs() {
    const songs = await this._pool.query('SELECT id, title, performer FROM songs');
    return songs.rows;
  }

  async getSongById(songid) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songid],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Id song tidak ditemukan!');
    }

    return result.rows.map(mapDBtoModel)[0];
  }

  async editSongById(id, {
    title, year, performer, genre, duration,
  }) {
    const updated_at = new Date().toISOString();
    const query = {
      text: 'UPDATE songs SET title=$1, year=$2, performer=$3, genre=$4, duration=$5, updated_at=$6 WHERE id = $7 RETURNING id',
      values: [title, year, performer, genre, duration, updated_at, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Id tidak ditemukan');
    }

    return result;
  }

  async deleteSongById(id) {
    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Id tidak ditemukan');
    }

    return result;
  }
}

module.exports = SongsService;
