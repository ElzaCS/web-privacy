var cohortValue = function(){
    var simhash = require('simhash')();
    var tagsToCohort = ['Something','ssthing'];

    console.log(simhash(tagsToCohort))
    return simhash(tagsToCohort);
}

module.exports = cohortValue;
