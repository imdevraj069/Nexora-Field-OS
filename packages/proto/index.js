const path = require('node:path');

module.exports = {
  IDENTITY_PROTO_PATH: path.join(__dirname, 'identity.proto'),
  STORAGE_PROTO_PATH: path.join(__dirname, 'storage.proto'),
  AI_PROTO_PATH: path.join(__dirname, 'ai.proto'),
};
