const simhash = require('./simhash')('');

exports.assignCohortValues = function (category){
    let cohortID = simhash([category]);
    return cohortID;
}
