class InvalidInputException extends Error {
  constructor(message, metadata) {
    super(message);
    this.metadata = metadata;
  }
};

class ParseCompletionException extends Error {
  constructor (message, metadata) {
    super(message);
    this.metadata = metadata;
  }
}

module.exports = {
  InvalidInputException,
  ParseCompletionException,
}