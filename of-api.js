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
  
  function requestHeaders(inputHeaders, swStrategy) {
    var headers = {};
    
    var header;
    if (typeof inputHeaders === 'object') {
      for (header in inputHeaders) {
        headers[header] = inputHeaders[header].toString();
      }
    }
    
    if (swStrategy) {
      headers['sw-strategy'] = swStrategy;
    } else {
      delete  headers['sw-strategy'];
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
  
  /**
   * To send Offline First API request using service-worker.
   * @param {string} request.url - Specifies the URL to send the request to.
   * @param {object} request.params - An object that contains query parameters to be appended to the specified url when generating a request. 
   * @param {object} request.headers - HTTP request headers to send.
   * @param {Function} request.success - A function to be run when the request succeeds
   * @param {Function} request.error - A function to run if the request fails.
   * @param {Function} request.cacheSuccess - A function to be run when the cached response is available in service worker
   */
  function ofApi(request){
    var url = requestUrl(request.url, request.params);
    var cacheOnlyHeaders = requestHeaders(request.headers, 'cacheOnly');
    _fetch(url, cacheOnlyHeaders, request.cacheSuccess);
    
    var networkOnlyWithCacheHeaders = requestHeaders(request.headers, 'networkOnlyWithCache');
    _fetch(url, networkOnlyWithCacheHeaders, request.success, request.error);
  };
  
  window.ct = window.ct || {};
  ct.ofApi = ofApi;
})();