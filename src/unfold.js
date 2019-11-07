module.exports = {
  unfoldAsync: (onSuccess) => fn => seed => {
    const doGetItems = (offset, acc) => {
      return fn(offset)
        .then(onSuccess)
        .then(({
            next,
            items,
            done
          }) => done ?
          acc : doGetItems(next, acc.concat(items))
        )
    };
  
    return doGetItems(seed, []);
  }
};