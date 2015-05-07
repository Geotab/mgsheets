 
/**
* Constructs a new GeotabApi object.
*
* @param {object} Optional session object. If not provided, Authenticate needs to be called first (it will return a session).
*
*/
function MyGeotabApi(session) {
  
  var 
      session = session,

      /**
      * Makes a basic JSON-RPC call against the MyGeotab server provided in path. It does not do anything "special" like authentication. 
      */
      call = function (method, params) {
        // Construct an object that conforms to JSON-RCP2 spec 
        var jsonRpcPayload = {
            method : method,
            params: params
        },
        options = {
          "method" : "post",
          "contentType" : "application/json",
          "payload" : JSON.stringify(jsonRpcPayload)
        },
        result = UrlFetchApp.fetch("https://" + session.server + "/apiv1", options);
        
        if (result.getResponseCode() == 200) {
          return JSON.parse(result.getContentText());
        }
        // TODO: Should we be creating custom exception handling object?
        throw "Could not execute JSON-RPC";
      },
        
      /**
      * Authenticates against the MyGeotab server and sets securityToken if successful. Path is also updated if it is found that database is on different server.
      *
      * @param {string} The MyGeotab user name (typically email address) used to log in.
      * @param {string} The MyGeotab user's password
      * @param {string} The database name
      * @param {string} Optional federation name such as "my.geotab.com". If not provided, default is "my.geotab.com"
      *
      */
      authenticate = function (userName, password, database, federation) {
        var rpcResult,
            server = federation || "my.geotab.com",
            
        // Construct parameters that Authenticate expects
        credentials = { 
          userName : userName,
          password : password,
          database : database
        };
        
        // Authenticate always destroys the previous session and creates a new one. Set the server. Call depends on it.
        session = {
          server : server
        }
          
        rpcResult = call("Authenticate", credentials);
         
        if (rpcResult.result) {
          rpcResult = rpcResult.result;
          if (rpcResult.path.toUpperCase() !== "THISSERVER") {
            // We're not on the right server - update sessino.
            session.server = rpcResult.path;
          }
          session.credentials = rpcResult.securityToken;
          return session;
        } else if (rpcResult.error) {
              var response = rpcResult.error;
              if (response.errors && response.errors.length >= 1) {
                var errorMessage = response.errors[0].name.toUpperCase();
                if (errorMessage === "INVALIDUSEREXCEPTION" || errorMessage === "DBUNAVAILABLEEXCEPTION") {
                  // TODO: should we be doing this for DBUNAVAILABLE?
                  throw "Authentication failed";
                }
              }
              // TODO: Consider what is the right thing to do in this case
              else throw rpcResult.error;
        }
        throw "Invalid response received";
      },
      
      authenticatedCall = function (method, params) {
        var rpcResult;
        
        if (session === null) {
          throw "Call Authenticate before using the API object";
        }

        // Session should have valid credentials stored (username/db/sessionId)
        params.credentials = session.credentials;
          
        // Uncomment to fake an expiry
        // params.credentials.sessionId += "1";
        // Uncomment to fake DB moving
        // path = "my2.geotab.com";
        rpcResult = call(method, params);
          
        if (rpcResult.result) {
          return rpcResult.result;
        } else if (rpcResult.error) {
          var response = rpcResult.error;
          if (response.errors && response.errors.length >= 1) {
            var errorMessage = response.errors[0].name.toUpperCase();
            if (errorMessage === "INVALIDUSEREXCEPTION" || errorMessage === "DBUNAVAILABLEEXCEPTION") {
              // Session expired or username/password changed
              Logger.log("Session expired or credentials no longer valid");
              throw "Please authenticate - session expired or credentials no longer valid";
            }
          }
          
          // The actual RPC call failed. Show info about it.
          var description = "An error occured making the API call. \n";
          description += "Arguments sent: \n";
          description += JSON.stringify(params) + "\n";
          description += "Error: \n";
          description += JSON.stringify(rpcResult);
          throw description;
        }
      },
       
     /**
     * Convenience implementation of GET API
     */
     getInternal = function (typeName, search, resultsLimit) {
       var params = {
         typeName : typeName
       };
       if (search !== undefined && search !== null) {
         params.search = search;
       }
       if (resultsLimit !== undefined && resultsLimit !== null) {
         params.resultsLimit = resultsLimit;
       }
       return authenticatedCall("Get", params);
     }
  
  // Public methods
  return {
    call: authenticatedCall,
    get: getInternal,
    authenticate : authenticate
  };
}
