(function(){
  
  /**
   * The query string that should be appended to the `url`, serialized from
   * the current value of `params`.
   *
   * @param {object} params - An object that contains query parameters to be appended to the specified url when generating a request. 
   * @return {string}
   */
  function queryString (params) {
    var queryParts = [];
    var param;
    var value;

    for (param in params) {
      value = params[param];
      param = window.encodeURIComponent(param);

      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
        }
      } else if (value !== null) {
        queryParts.push(param + '=' + window.encodeURIComponent(value));
      } else {
        queryParts.push(param);
      }
    }
    return queryParts.join('&');
  }
  
  /**
   * Merge query parameters with url
   *
   * @param {string} url - Specifies the URL to send the request to.
   * @param {object} params - An object that contains query parameters to be appended to the specified url when generating a request. 
   * @return {string}
   */
  function requestUrl(url, params) {
    var queryStr = queryString(params);

    if (queryStr) {
      var bindingChar = url.indexOf('?') >= 0 ? '&' : '?';
      return url + bindingChar + queryStr;
    }

    return url;
  }
  
  function requestHeaders(inputHeaders, swStrategyHeaderName, swStrategy) {
    var headers = {};
    swStrategyHeaderName = swStrategyHeaderName || 'sw-strategy';
    
    var header;
    if (typeof inputHeaders === 'object') {
      for (header in inputHeaders) {
        headers[header] = inputHeaders[header].toString();
      }
    }
    
    if (swStrategy) {
      headers[swStrategyHeaderName] = swStrategy;
    } else {
      delete  headers[swStrategyHeaderName];
    }
    return headers;
  }
  
  function _fetch(url, headers, success, error) {
    fetch(url, {
      headers: headers
    }).then(function(response) {
      var contentType = response.headers.get("content-type");
      var errored = (response.status < 200 || response.status >= 300);

      response.json().then(function(myJson){
        if(!errored && success){
          response.response = myJson;
          success(response);
        }
        if(errored && error){
          response.response = myJson;
          error(response);
        }
      }).catch(function(){
        if(!errored && success){
          success(response);
        }
        if(errored && error){
          error(response);
        }
      });
      
    }).catch(function(err) {
      if(error){
        error({
          status: 0,
          message: err.message,
          error: err
        });
      }
    });
  }
  
  function _fetchCacheOnly(url, request){
    var cacheOnlyHeaders = requestHeaders(request.headers, request.swStrategyHeaderName, 'cacheOnly');
    _fetch(url, cacheOnlyHeaders, request.cacheSuccess);
  }
  
  function _fetchNetworkOnlyWithCache(url, request, authHeadersObj){
    var headers = Object.assign({}, request.headers);
    
    if(authHeadersObj && typeof authHeadersObj === 'object'){
      headers = Object.assign(headers, authHeadersObj);
    }
    
    var networkOnlyWithCacheHeaders = requestHeaders(headers, request.swStrategyHeaderName, 'networkOnlyWithCache');
    _fetch(url, networkOnlyWithCacheHeaders, request.success, request.error);
  }
  
  /**
   * To send Offline First API request using service-worker.
   * @param {string} request.url - Specifies the URL to send the request to.
   * @param {object} request.params - An object that contains query parameters to be appended to the specified url when generating a request. 
   * @param {object} request.headers - HTTP request headers to send.
   * @param {string} request.swStrategyHeaderName - Header name to send service worker to customize strategy (Default: sw-strategy).
   * @param {Function} request.authHeaders - HTTP request auth headers to send. Must return promise
   * @param {Function} request.success - A function to be run when the request succeeds
   * @param {Function} request.error - A function to run if the request fails.
   * @param {Function} request.cacheSuccess - A function to be run when the cached response is available in service worker
   */
  function ofApi(request){
    var url = requestUrl(request.url, request.params);
    if(request.cacheSuccess){
      _fetchCacheOnly(url, request);
    }
    
    if(!request.authHeaders){
      _fetchNetworkOnlyWithCache(url, request);
      return;
    }
    
    request.authHeaders.then(function(headers){
      _fetchNetworkOnlyWithCache(url, request, headers);
    }).catch(function(){
      _fetchNetworkOnlyWithCache(url, request);
    });
  };
  
  window.ct = window.ct || {};
  ct.ofApi = ofApi;
})();