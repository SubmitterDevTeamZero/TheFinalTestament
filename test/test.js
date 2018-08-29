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
      const error = genQuery();
      expect(error.message).to.equal('BAD SURA AND/OR VERSE: Need to provide a number');
    });
  });

  describe('___CLEAN VERSE___', () => {
    const chapterNum = 63;
    const verseNum = 6;
    it('should be a function', () => {
      expect(cleanVerse).to.be.a('function');
    });

    it('should return a formatted verse with the subtitle, verse, footnoes, and sura:verse', () => {
      const stackedVerse = {
        ZSUBTITLE: 'SUBTITLE',
        ZENGLISH_VERSION: 'VERSE',
        ZFOOTNOTE: 'FOOTNOTES',
      };
      const actual = cleanVerse(chapterNum, verseNum, stackedVerse);
      expect(actual).to.be.a('string');
      expect(actual).to.equal('SUBTITLE\n[63:6] VERSE\nFOOTNOTES');
    });

    it('shoult return a formatted verse with verse, footnotes, and sura:verse', () => {
      const stackedVerse = {
        ZSUBTITLE: null,
        ZENGLISH_VERSION: 'VERSE',
        ZFOOTNOTE: 'FOOTNOTES',
      };
      const actual = cleanVerse(chapterNum, verseNum, stackedVerse);
      expect(actual).to.be.a('string');
      expect(actual).to.equal('[63:6] VERSE\nFOOTNOTES');
    });

    it('shoult return a formatted verse with subtitle, verse, and sura:verse', () => {
      const stackedVerse = {
        ZSUBTITLE: 'SUBTITLE',
        ZENGLISH_VERSION: 'VERSE',
        ZFOOTNOTE: null,
      };
      const actual = cleanVerse(chapterNum, verseNum, stackedVerse);
      expect(actual).to.be.a('string');
      expect(actual).to.equal('SUBTITLE\n[63:6] VERSE');
    });

    it('shoult return a formatted verse with verse and sura:verse', () => {
      const stackedVerse = {
        ZSUBTITLE: null,
        ZENGLISH_VERSION: 'VERSE',
        ZFOOTNOTE: null,
      };
      const actual = cleanVerse(chapterNum, verseNum, stackedVerse);
      expect(actual).to.be.a('string');
      expect(actual).to.equal('[63:6] VERSE');
    });
  });

  describe('___PARSE CMD___', () => {
    const type = '!'
    const cmd = 'makan';

    it('should be a function', () => {
      expect(parseCMD).to.be.a('function');
    });

    it('should return an object', () => {
      const actual = parseCMD();
      expect(actual).to.be.an('object');
    });

    it('should have the properties of type and cmd', () => {
      const actual = parseCMD(type, cmd);
      expect(actual).to.have.property('type', '!');
      expect(actual).to.have.property('cmd', 'makan');
    });
  });

  describe('___PARSE VERSE QUERY___', () => {
    const type = '$';
    const single = '63:6';
    const multiple = '63:1-6';

    it('should be a function', () => {
      expect(parseVerseQuery).to.be.a('function');
    });

    it('should return an object', () => {
      const actual = parseVerseQuery('$', '');
      expect(actual).to.be.an('object');
    });

    it('should return an object with the type, chapter, startVerse properties for a single query', () => {
      const actual = parseVerseQuery(type, single);
      expect(actual).to.have.property('type', '$');
      expect(actual).to.have.property('chapter', 63);
      expect(actual).to.have.property('startVerse', 6);
    });

    it('should return an object with the type, chapter, startVerse, and endVerse properties for multiple query', () => {
      const actual = parseVerseQuery(type, multiple);
      expect(actual).to.have.property('type', '$');
      expect(actual).to.have.property('chapter', 63);
      expect(actual).to.have.property('startVerse', 1);
      expect(actual).to.have.property('endVerse', 6);
    });
  });

  describe('___PARSE LOOKUP___', () => {
    
    it('should be a function', () => {
      expect(parseLookup).to.be.a('function');
    });
    
    it('should return an error if a string isn\'t passed in', () => {
      const error = parseLookup();
      expect(error.message).to.equal('BAD QUERY: Please submit a string');
    })
    
    it('should return an object', () => {
      const actual = parseLookup('!makan');
      expect(actual).to.be.an('object');
    });
    
    it('should return a formatted query for a "!"', () => {
      const bang = '!makan';
      const actual = parseLookup(bang);
      const expected = { type: '!', cmd: 'makan'}
      expect(actual).to.deep.equal(expected);
    });
    
    it('should return a formatted query for a "$"', () => {
      const single = '$63:6';
      const multiple = '$63:1-6';
      const long = '$2:110-120';
      const actualSingle = parseLookup(single);
      const actualMultiple = parseLookup(multiple);
      const actualLong = parseLookup(long);
      expect(actualSingle).to.deep.equal({
        type: '$',
        chapter: 63,
        startVerse: 6
      });
      expect(actualMultiple).to.deep.equal({
        type: '$',
        chapter: 63,
        startVerse: 1,
        endVerse: 6
      });
      expect(actualLong).to.deep.equal({
        type: '$',
        chapter: 2,
        startVerse: 110,
        endVerse: 120,
      });
    });
  });
});