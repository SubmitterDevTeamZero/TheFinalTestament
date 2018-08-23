const { expect } = require('chai');
const {
  genQuery,
  cleanVerse,
  parseCMD,
  parseVerseQuery,
  parseLookup
} = require('../src/bot');

describe('### THE FINAL TESTAMENT ###', () => {
  describe('___GEN QUERY___', () => {
    it('should be a function', () => {
      expect(genQuery).to.be.a('function');
    });

    it('should return a string when passed the proper parameters', () => {
      const actual = genQuery(63, 6);
      const expected = 'SELECT v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO IS 6 AND s.ZSURA_NO IS 63;'
      expect(actual).to.equal(expected);
    });

    it('should return an error if a sura or a verse isn\'t provided', () => {
      expect(genQuery).to.throw(Error).with.property('message', 'BAD SURA AND/OR VERSE: Need to provide a number');
    });
  });
});