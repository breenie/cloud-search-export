module.exports = {
  createClient: (cloudSearch) => {
    return {
      describeIndexFields: DomainName => cloudSearch.describeIndexFields({
          DomainName
        })
        .promise()
        .then(data => data.IndexFields),

      listDomains: () => cloudSearch.listDomainNames()
        .promise()
        .then(data => Object.keys(data.DomainNames)),

      getEndpoint: domain => cloudSearch.describeDomains({
          DomainNames: [domain]
        })
        .promise()
        .then(data => data.DomainStatusList[0].SearchService.Endpoint)
        .catch(() => new Error("No domain list in response."))
    }
  }
};