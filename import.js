const AWS = require('aws-sdk');
const fs = require('fs');
const readlineSync = require('readline-sync');
const search = require('./src/cloud-search');
const program = require('commander');

const region = 'eu-west-1';
const apiVersion = '2013-01-01';

program
  .requiredOption('-f, --file <file>')
  .parse(process.argv);

const stat = file => {return new Promise((resolve, reject) => {
  fs.stat(file, _, (err, stats) => {
    if (err) {
      reject(err);
    } else {
      resolve(stats);
    }
  })
})};

const client = search.createClient(new AWS.CloudSearch({
  region,
  apiVersion
}));

stat(program.file)
  .then(client.listDomains)
  .then(names => {
    const index = readlineSync.keyInSelect(
      names,
      "Which search instance do you want to import to?"
    );

    if (-1 === index) {
      return Promise.reject(new Error("Cancelled by user."));
    }

    return names[index];
  })
  .then(domain => {
  })
  .catch(({
    message
  }) => {
    console.log(message)
  });