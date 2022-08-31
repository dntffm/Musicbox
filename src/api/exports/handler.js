const ClientError = require('../../exceptions/ClientError');

class ExportsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
    this.postExportsPlaylistHandler = this.postExportsPlaylistHandler.bind(this);
  }

  async postExportsPlaylistHandler(request, h) {
    try {
      const { playlistId: plId } = request.params;
      const playlistOwnerid = request.auth.credentials.id;

      this._validator.validateExportsPlaylistPayload(request.payload);

      const message = {
        userId: playlistOwnerid,
        playlistId: plId,
        targetEmail: request.payload.targetEmail,
      };

      await this._service.sendMessage('exports:playlist', JSON.stringify(message), plId, playlistOwnerid);

      const response = h.response({
        status: 'success',
        message: 'Permintaan Anda dalam antrean',
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }
      // Server ERROR!
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      return response;
    }
  }
}

module.exports = ExportsHandler;
