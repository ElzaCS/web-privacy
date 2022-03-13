var simhash = require('simhash')();


function cohortValue(){
    fetch( './RandomDB.csv' )
        .then( response => response.text() )
        .then( responseText => {
            var tagsToCohort = [];

            const lines = responseText.split('\n');
            for(let i=0; i<lines.length; i++){
              const values = lines[i].split(",");
              let tag = values[4];
              if (tag){
                console.log("val:", tag)
                tagsToCohort.push(tag)
              }
            }  
            
            console.log("simhash:", simhash(tagsToCohort))
            return simhash(tagsToCohort);
        })
}

module.exports = cohortValue();
