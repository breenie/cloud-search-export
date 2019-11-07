const AWS = require('aws-sdk');
const fs = require('fs');
const readlineSync = require('readline-sync');
const unFoldAsync = require('./src/unfold').unfoldAsync;
const search = require('./src/cloud-search');

const region = 'eu-west-1';
const apiVersion = '2013-01-01';

var batchSize = 1000;

const client = createClient(new AWS.CloudSearch({
  region,
  apiVersion
}));

const onSuccess = (response) =>
  Promise.resolve(0 === response.hits.hit.length ? {
    done: true
  } : {
    next: response.hits.cursor,
    items: response.hits.hit
  });

const matchIndex = (name, indexes) => indexes.find(element => !!name.match(new RegExp("^" + element.Options.IndexFieldName)));

const indexIsArray = (type) => type && type.match(/^((?!array).)*$/);

const processRow = (row, indexes) => {
  Object.keys(row.fields).forEach(key => {
    const match = matchIndex(key, indexes);

    if (indexIsArray(match.Options.IndexFieldType)) {
      row.fields[key] = row.fields[key][0];
    }
  });

  row.type = "add";
  return row;
};


const p = async () => {

  const names = await client.listDomains();

  const index = readlineSync.keyInSelect(
    names,
    "Which search instance do you want to export?"
  );

  if (-1 === index) {
    return Promise.reject(new Error("Cancelled by user."));
  }

  const endpoint = await client.getEndpoint(names[index]);
  const indexes = await client.describeIndexFields(names[index]);

  const unFoldFn = unFoldAsync(onSuccess);

  const unFolder = unFoldFn(offset => {
    const csd = new AWS.CloudSearchDomain({
      endpoint,
      region
    });

    return csd.search({
        query: "matchall",
        cursor: offset,
        size: batchSize,
        queryParser: "structured",
        return: indexes.map(index => index.Options.IndexFieldName).sort().join(',')
      })
      .promise();
  });

  const items = await unFolder("initial");

  const parsed = items.map((element) => processRow(element, indexes));

  fs.writeFile(__dirname + '/' + names[index] + '-documents.json', JSON.stringify(parsed), function (err) {
    if (err) {
      return console.log(err);
    }
  });
};
p();