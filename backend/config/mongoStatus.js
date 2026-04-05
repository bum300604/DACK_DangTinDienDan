let lastMongoError = null;

module.exports = {
  setLastError: function (err) {
    lastMongoError = err ? String(err.message || err) : null;
  },
  getLastError: function () {
    return lastMongoError;
  },
};
