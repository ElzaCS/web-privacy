import Dexie from 'dexie'
var simhash = require('simhash')('');

/* connect to indexedDB */
const db = new Dexie('user_history');
db.version(1).stores(
  { history_store: "++id,name,tag,desc" }
)

async function cohortValue(){
    /* reset before initializing indexedDB */
    await db.history_store.orderBy('name').delete();

    let searchHistory = [];
    const cohortID = await fetch( './RandomDB.csv' )
        .then( response => response.text() )
        .then( responseText => {
            var tagsToCohort = [];
            const lines = responseText.split('\n');
            
            for(let i=1; i<lines.length; i++){
              const values = lines[i].split(",");         
              let tag = values[1];

              if (tag){
                /* get searchHistory from RandomDB.csv */
                searchHistory.push({name: values[3], tag: values[1], desc: values[4]});

                /* get tags for cohortID calculation */
                tagsToCohort.push(tag)
              }
            }
            /* cohortID calculation */
            return simhash(tagsToCohort);
        })

    /* store searchHistory in indexedDB, only if indexedDB hasn't been initialized */
    let numRecords = await db.history_store.count();
    if (numRecords === 0) {
      db.history_store.bulkAdd(searchHistory)
        .then(() =>{
          console.log("initialized searchHistory from RandomDB.csv to indexedDB")
        })
    }
    else{
      console.log("indexedDB already initialized, current no. of records", numRecords)
    }

    /* check data in indexedDB*/
    // let finaldata = await db.history_store.toArray();
    // console.log("initialized data:", finaldata)

    console.log("simhash:", JSON.stringify(cohortID));
    return cohortID;
}


/**
 * Called everytime the user clicks on a search result
 * Adds the search result to indexedDB and re-calculates cohortID
 * 
 * Returns new cohortID
*/
async function updateCohortValue(searchData){
    //console.log("searchData :", searchData);
    let newSearches;

    console.log("Updating cohort value")
    /* add new searches to searchHistory in indexedDB */
    if (searchData.tag.length === 1){
      newSearches = { name: searchData.title, desc: searchData.snippet, tag: searchData.tag[0] }
      db.history_store.add(newSearches)
        .then(() =>{ console.log("added newSearch with single tag") })
    }
    else{
      newSearches = [];
      for(let i=0; i< searchData.tag.length; i++){
        newSearches.push( { name: searchData.title, desc: searchData.snippet, tag: searchData.tag[i] } )
      }
      db.history_store.bulkAdd(newSearches)
        .then(() =>{ console.log("added newSearch with multiple tags") })
    }

    /* check if data is updated in indexedDB */
    let num = await db.history_store.count();
    console.log("current no. of records:", num)

    /* get all tags to update cohortID */
    const allTags = await db.history_store.orderBy('tag').keys();  
    console.log("Alltags:" , allTags.length)
    console.log("updated simhash:", JSON.stringify(simhash(allTags)))
        
    return simhash(allTags); 
}

function dot(a, b) {
  return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
}

export {
  cohortValue,
  updateCohortValue,
  dot
}
