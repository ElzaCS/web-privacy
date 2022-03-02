var simhash = require('simhash')();
const fastcsv = require("fast-csv"); 
var fs = require('fs');

function cohortValue(){
    var tagsToCohort = [];
    let stream = fs.createReadStream("../../public/RandomDB.csv");
    let row = 0;
    let csvStream = fastcsv
      .parse()
      .on("data", function(data) {
        row++;
        if(row !== 1){ 
          let tag = data[4]
          tagsToCohort.append(tag)
        }
      })
    stream.pipe(csvStream);

    console.log(simhash(tagsToCohort))
    return simhash(tagsToCohort);
}

module.exports = cohortValue();
