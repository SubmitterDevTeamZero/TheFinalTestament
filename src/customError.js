class InvalidInputException {
  constructor(message, metadata) {
    super(message);
    this.metadata = metadata;
  }
};

class ParseCompletionException {
  constructor (message, metadata) {
    super(message);
    this.metadata = metadata;
  }
}

module.exports = {
  InvalidInputException,
  ParseCompletionException,
}