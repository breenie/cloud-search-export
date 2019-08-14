const AWS = require('aws-sdk');
const fs = require('fs');
const readlineSync = require('readline-sync');

const region = 'eu-west-1';
const apiVersion = '2013-01-01';

var batchSize = 1000;

const cs = new AWS.CloudSearch({
  region,
  apiVersion
});

const describeIndexFields = DomainName => cs.describeIndexFields({
    DomainName
  })
  .promise()
  .then(data => data.IndexFields);

const listDomains = () => cs.listDomainNames()
  .promise()
  .then(data => Object.keys(data.DomainNames));

const getEndpoint = domain => cs.describeDomains({
    DomainNames: [domain]
  })
  .promise()
  .then(data => data.DomainStatusList[0].SearchService.Endpoint)
  .catch(() => new Error("No domain list in response."));


const apiClient = async (offset, endpoint) => {
  const csd = new AWS.CloudSearchDomain({
    endpoint,
    region
  });

  return csd.search({
      query: "matchall",
      cursor: offset || "initial",
      size: batchSize,
      queryParser: "structured",
      // return: "_all_fields",
      return: "created_date,event_date,film_orderable_state,fk_*,location,meta_*,normaltitle,rating,row_id,table_class,tag_cat_*,text_content"
    })
    .promise()
    .then(data => {
      return {
        next: 0 === data.hits.hit.length ? null : data.hits.cursor,
        items: data.hits.hit
      };
    });
};

const getitems = async (endpoint) => {
  const doGetItems = (offset, acc) => {
    return apiClient(offset, endpoint)
      .then(response => {
        if (null === response.next) {
          return acc.concat(response.items);
        } else {
          return doGetItems(response.next, acc.concat(response.items));
        }
      })
  };

  return doGetItems("initial", []);
};

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

  const names = await listDomains();

  const index = readlineSync.keyInSelect(
    names,
    "Which search instance do you want to export?"
  );

  if (-1 === index) {
    return Promise.reject(new Error("Cancelled by user."));
  }

  const endpoint = await getEndpoint(names[index]);
  const indexes = await describeIndexFields(names[index]);

  const items = await getitems(endpoint);
  
  const parsed = items.map((element) => processRow(element, indexes));

  fs.writeFile(__dirname + '/' + names[index] + '-documents.json', JSON.stringify(parsed), function (err) {
    if (err) {
      return console.log(err);
    }
  });
};

p();
