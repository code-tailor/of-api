function openCache(options) {
  var cacheName;
  if (options && options.cache) {
    cacheName = options.cache.name;
  }
  cacheName = cacheName || toolbox.options.cache.name;

  return caches.open(cacheName);
}

function fetchAndCache(request, options) {
  options = options || {};
  var successResponses = options.successResponses || toolbox.options.successResponses;

  return fetch(request.clone()).then(function(response) {
    // Only cache GET requests with successful responses.
    // Since this is not part of the promise chain, it will be done
    // asynchronously and will not block the response from being returned to the
    // page.
    if (request.method === 'GET' && successResponses.test(response.status)) {
      openCache(options).then(function(cache) {
        cache.put(request, response);
      });
    }

    return response.clone();
  });
}

toolbox.router.get(/https:\/\/example\.com\/*/, function(request, values, options){
  var swStrategy = request.headers.get('sw-strategy');
  
  if (swStrategy === 'networkFirst') {
    return toolbox.networkFirst.apply(this, arguments);
  }
  
  if (swStrategy === 'cacheFirst') {
    return toolbox.cacheFirst.apply(this, arguments);
  }
  
  if (swStrategy === 'fastest') {
    return toolbox.fastest.apply(this, arguments);
  }
  
  if (swStrategy === 'cacheOnly') {
    return toolbox.cacheOnly.apply(this, arguments);
  }
  
  if (swStrategy === 'networkOnlyWithCache') {
    return fetchAndCache(request, options).then(function(response){
      return response.clone();
    });
  }
  
  if (swStrategy === 'networkOnly') {
    return toolbox.networkOnly.apply(this, arguments);
  }
  
  // Essentially the same as not creating a route for the URL at all.
  return toolbox.networkOnly.apply(this, arguments);
});