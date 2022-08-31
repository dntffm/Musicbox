const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const AuthenticationError = require('../../exceptions/AuthenticationError');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async verifyPlaylistOwner(id, credentialId) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ada');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== credentialId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async addPlaylist({ name, playlistOwner }) {
    const id = `playlist-${nanoid(16)}`;
    const owner = playlistOwner;
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new AuthenticationError('gagal menambah playlist');
    }

    return result.rows[0].id;
  }

  async getPlaylistsByOwner(playlistOwner) {
    const owner = playlistOwner;

    const query = {
      text: 'SELECT playlists.id, playlists.name, users.username FROM playlists JOIN users ON users.id = playlists.owner WHERE playlists.owner= $1',
      values: [owner],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('User ini tidak memiliki playlist');
    }

    return result.rows;
  }

  async deletePlaylistById(playlistId, playlistOwner) {
    await this.verifyPlaylistOwner(playlistId, playlistOwner);
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      return new NotFoundError('id tidak ada');
    }

    return result;
  }

  async addPlaylistSong({ songId, playlistId, playlistOwner }) {
    await this.verifyPlaylistOwner(playlistId, playlistOwner);
    const id = `playlistsong-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('gagal menambah lagu ke playlist');
    }
    await this._cacheService.delete(`playlistsongs:${playlistId}`);
    return result;
  }

  async getPlaylistSongsById(playlistId, playlistOwner) {
    await this.verifyPlaylistOwner(playlistId, playlistOwner);
    try {
      const result = await this._cacheService.get(`playlistsongs:${playlistId}`);

      return JSON.parse(result.rows);
    } catch (error) {
      const query = {
        text: 'SELECT songs.id, songs.title, songs.performer FROM songs JOIN playlistsongs ON playlistsongs.song_id = songs.id WHERE playlistsongs.playlist_id = $1',
        values: [playlistId],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError('tidak ada lagu di playlist ini');
      }
      await this._cacheService.set(`playlistsongs:${playlistId}`, JSON.stringify(result));
      return result.rows;
    }
  }

  async deletePlaylistSongById({ playlistId, songId, playlistOwner }) {
    await this.verifyPlaylistOwner(playlistId, playlistOwner);
    const query = {
      text: 'DELETE FROM playlistsongs WHERE song_id=$1 AND playlist_id = $2 RETURNING id',
      values: [songId, playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('id tidak ditemukan');
    }
    await this._cacheService.delete(`playlistsongs:${playlistId}`);
    return result;
  }
}

module.exports = PlaylistsService;
