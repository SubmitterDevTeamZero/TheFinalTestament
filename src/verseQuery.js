const { ParseCompletionException, InvalidInputException } = require('./customError');
const suraVerseCounts = require('./suraVerseCounts');

class VerseQuery {
  constructor(message) {
    this.sura = [];
    this.firstVerse = [];
    this.lastVerse = [];
    this.completed = false;
    this.index = 1;
    this.parseMessage(message);
  }

  parseMessage(message) {
    let position = 0;
    while (this.index < message.length) {
      const char = message[this.index];

      if (!char.match(/[0-9\-\:]/g)) break;

      if (char === ':' || char === '-') {
        position += 1;
      } else if (position === 0) {
          this.sura.push(char);
      } else if (position === 1) {
          this.firstVerse.push(char);
      } else if (position === 2) {
          this.lastVerse.push(char);
      }
      this.index += 1;
    }

    this.completed = true;
    this.transformResults();
  }

  transformResults() {
    if (!this.completed) {
      throw new ParseCompletionException('Ran Validity Check before query was parsed', this);
    }
    this.sura = parseInt(this.sura.join(''));
    this.firstVerse = parseInt(this.firstVerse.join(''));
    if (this.lastVerse.length === 0) {
      this.lastVerse = null;
    } else {
      this.lastVerse = parseInt(this.lastVerse.join(''));
    }
    this.transformResults = null;
    this.parseMessage = null;
  }

  isValid() {
    if (!this.completed) {
      throw new ParseCompletionException('Ran Validity Check before query was parsed', this);
    }

    if (isNaN(this.sura) || isNaN(this.firstVerse) || (!this.lastVerse && isNaN(this.lastVerse))) {
      throw new InvalidInputException('Received invalid input', this);
    }

    if (typeof this.lastVerse === 'Number' && this.firstVerse > this.lastVerse) {
      throw new InvalidInputException('First verse provided is greater than the last verse provided', this)
    }

    return true;
  }

  generateQuery() {
    if (this.lastVerse) {
      // return multiple
      return `SELECT s.ZSURA_EN, v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO BETWEEN ${this.firstVerse} AND ${this.lastVerse} AND s.ZSURA_NO IS ${this.sura} ORDER BY v.ZVERSE_NO;`;
    }
    // return single
    return `SELECT s.ZSURA_EN, v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO IS ${this.firstVerse} AND s.ZSURA_NO IS ${this.sura};`;
  }
}

class RandomVerse {
  generateRandomVerse() {
    const sura = this.getSura();
    const verse = this.getVerse(sura);
    return new VerseQuery(`$${sura}:${verse}`);
  }

  getSura() {
    return Math.floor(Math.random() * 114) + 1;
  }

  getVerse(sura) {
    return Math.floor(Math.random() * suraVerseCounts[sura]) + 1;
  }
}

module.exports = {
  VerseQuery,
  RandomVerse
};
