const sqlite3 = require('sqlite3').verbose();
console.log('DB running');

// open database in memory
// let db = new sqlite3.Database(':memory:', (err) => {
//   if (err) {
//     return console.error(err.message);
//   }
//   console.log('Connected to the in-memory SQlite database.');
// });

let chapterNum = 63;
let verseNum = 6;
let verseQuery = `SELECT v.ZSUBTITLE, v.ZENGLISH_VERSION, v.ZFOOTNOTE FROM ZVERSE v INNER JOIN ZSURA s ON s.Z_PK = v.ZWHICHSURA WHERE v.ZVERSE_NO IS ${verseNum} AND s.ZSURA_NO IS ${chapterNum};`

let db = new sqlite3.Database(`${__dirname}/../files/Quran.sqlite`, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the Quran database.');
  }
});

const findVerse = (chapterNum, verseNum) => {
  db.get(verseQuery, [], (err, rows) => {
    if (err) {
      throw err;
    }
    //rows.forEach((row) => {
      console.log(typeof rows, rows);
    //});
  });
  closeDb();
}

// close the database connection
const closeDb = () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closing the database connection.');
  });
}

// findVerse();
exports.findVerse = findVerse;
