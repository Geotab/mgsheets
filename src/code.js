//function updateSeed() {
//  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Vehicle");
//  var range = sheet.getRange("I5");
//  range.setValue(range.getValue()+1);
//}

function getDeviceId_(anyDeviceSearchValue) {
  var docCache,
    device,
    deviceId,
    devices,
    api;

  docCache = CacheService.getDocumentCache();
  deviceId = docCache.get("deviceId-" + anyDeviceSearchValue);

  if (deviceId !== null) {
    return deviceId;
  }

  api = getApi_();
  
  // Search by name
  devices = api.get("Device", {
    name: anyDeviceSearchValue
  });

  if (devices.length === 1) {
    docCache.put("deviceId-" + anyDeviceSearchValue, devices[0].id, 600);
    return devices[0].id;
  }
  if (devices.length > 1) {
    throw "The vehicle search criteria provided resulted in ambigious results. You need to specify search criteria that yields exactly one vehicle. " + 
          "You may use a wildcard search such as 'DODGE%' where any vehicle starting with DODGE is returned. However, there must be one " + 
          "matching vehicle.";
  }
  return null;
}


/**
 * Returns a Device object for the given device ID 
 *
 * @param {string} deviceId The device ID
 * @return {object} A device oject
 * @customfunction
 */
function getDeviceById_(deviceId) {
  var docCache,
    device,
    devices,
    api;

  docCache = CacheService.getDocumentCache();
  device = docCache.get("device-" + deviceId);

  if (device !== null) {
    return device;
  }

  api = getApi_();
  
  // Search by id
  devices = api.get("Device", {
    id: deviceId
  });

  if (devices.length === 1) {
    docCache.put("device-" + deviceId, devices[0], 600);
    return devices[0];
  }
  return null;
}

/**
 * Returns a Device object for the given device ID 
 *
 * @param {string} deviceId The device ID
 * @return {object} A device oject
 * @customfunction
 */
function getDriverById_(driverId) {
  var docCache,
    driver,
    drivers,
    api;

  docCache = CacheService.getDocumentCache();
  driver = docCache.get("driver-" + driverId);

  if (driver !== null) {
    return driver;
  }

  api = getApi_();
  
  // Search by id
  drivers = api.get("User", {
    id: driverId
  });

  if (drivers.length === 1) {
    docCache.put("driver-" + driverId, driverId, 600);
    return drivers[0];
  }
  return null;
}

function getApi_() {
  var docProperties = PropertiesService.getDocumentProperties();
  var session = docProperties.getProperty('api-session');
  Logger.log("Session ID: " + session);
  var api = MyGeotabApi(JSON.parse(session));
  return api;
}

/**
 * Returns a URL that will show a map tile with the location provided.
 *
 * @param {array} location The longitude (x) and latitude (y). Select a range of cells horizontally next to each other.
 * @param {string} color The 3 or 6 digit HEX color value. For example, "F0F" or "FF00FF"
 * @param {number} width The width of the map in pixels
 * @param {number} height The height of the map in pixels 
 * @param {number} zoom The zoom level. Default is 17 (street level). 1 is the whole world.
 * @return {string} A URL that links to a static map image.
 * @customfunction
 */
function MGMAPURL(location, color, width, height, zoom) {
  var mainUrl = "https://api.tiles.mapbox.com/v4/geotab.i8d8afbp/",
    accessToken = "?access_token=pk.eyJ1IjoiZ2VvdGFiIiwiYSI6IjBqUDNodmsifQ.BJF8wMClneBH89oxyaTuxw",
    color = color || 482,
    width = width || 100,
    height = height || 100,
    zoom = zoom || 17,
    x, y;

  if (location.map) {
    x = location[0][0];
    y = location[0][1];
  } else {
    x = 0;
    y = 0;
  }

  return mainUrl + "pin-l-car+" + color + "(" + x + "," + y + ")/" + x + "," + y + "," + zoom + "/" + width + "x" + height + ".png" + accessToken;
}

/**
 * Returns the status for the given vehicle(s). A range of values can be provided in the vehicles parameter or a single cell.
 *
 * @param {string} vehicles The vehicle description or part thereof. It must be unique and can accept wildcard character %. A range of cells can be provided.
 * @param {boolean} showHeadings Set to true if the headings should be returned as first row in array
 * @param {boolean} refresh - Set to any value - used to force a refresh periodically
 * @return {Array} An array of statuses
 * @customfunction
 */
function MGSTATUS(vehicles, showHeadings, refresh) {

  var api = getApi_(),
    statuses = [],
    status,
    deviceId,
    values,
    i,
    timespan = TimeSpan();

  if (vehicles.map) {
    // A two dimentional array is returned. Pull out first item
    vehicles = vehicles.map(function (item) {
      return item[0];
    });
  } else {
    // Just one - add it to an array with multiple
    vehicles = [vehicles];
  }

  for (i = 0; i < vehicles.length; i++) {
    values = [];
    deviceId = getDeviceId_(vehicles[i]);
    if (deviceId == null) {
      statuses.push(values);
      continue;
    }
    status = api.get("DeviceStatusInfo", {
      deviceSearch: {
        id: deviceId
      }
    });

    status = status[0];
    Logger.log(status);
    
    values.push(status.device.id);
    values.push(getDeviceById_(status.device.id).name);
    if (status.driver === "UnknownDriverId") {
      values.push(1);            
      values.push("Unknown");
    }
    else {
      values.push(status.driver.id);            
      values.push(getDriverById_(status.driver.id).name);
    }                
    values.push(status.bearing);
    values.push(timespan(status.currentStateDuration).getDuration());
    values.push(status.isDeviceCommunicating);
    values.push(status.isDriving);
    values.push(status.longitude);
    values.push(status.latitude);
    values.push(status.speed);
    values.push(new Date(Date.parse(status.dateTime)));
    statuses.push(values);
  }

  if (showHeadings === true) {
    values = ["DeviceId", "DeviceName", "DriverId", "Bearing", "Duration", "IsCommunicating", "IsDriving", "x", "y", "Speed", "DateTime"];
    statuses.unshift(values);
  }
  return statuses;
}
    
/**
 * Returns the trips for the given vehicle. Up to 500 trips are returned. If a from and to date is specified, only trips during this period is included.
 *
 * @param {string} vehicle The vehicle description or part thereof. It must be unique and can accept wildcard character %.
 * @param {Date} fromDate Trips after this value will be returned.
 * @param {Date} toDate Trips before this value will be returned.
 * @param {boolean} showHeadings Set to true if the headings should be returned as first row in array
 * @param {boolean} refresh - Set to any value - used to force a refresh periodically
 * @return {Array} An array of trips
 * @customfunction
 */
function MGTRIPS(vehicle, fromDate, toDate, showHeadings, refresh) {
  var api = getApi_(),
    trips,
    deviceId,
    values,
    timespan = TimeSpan(),
    tripSearch;

  if (fromDate !== undefined) {
    // Something was passed, but was it null or a valid date?
    if (fromDate && !(fromDate instanceof Date)) {
      throw "fromDate was provided but it is not a valid Date."
    }
  }

  if (toDate !== undefined) {
    // Something was passed, but was it null or a valid date?
    if (toDate && !(toDate instanceof Date)) {
      throw "toDate was provided but it is not a valid Date."
    }
  }

  deviceId = getDeviceId_(vehicle);
  if (deviceId === null) {
    throw "Can't find vehicle: " + vehicle;
  }

  tripSearch = {
    deviceSearch: {
      id: deviceId
    }
  };

  if (fromDate instanceof Date) {
    tripSearch.fromDate = fromDate;
  }

  if (toDate instanceof Date) {
    tripSearch.toDate = toDate;
  }

  trips = api.get("Trip", tripSearch, 500);

  var result = trips.map(function (trip) {
    var values = [];
    
    values.push(trip.device.id);
    values.push(getDeviceById_(trip.device.id).name);
    if (trip.driver === "UnknownDriverId") {
      values.push(1);            
      values.push("Unknown");
    }
    else {
      values.push(trip.driver.id);            
      values.push(getDriverById_(trip.driver.id).name);
    }
    values.push(trip.distance);
    values.push(timespan(trip.drivingDuration).getDuration());
    values.push(timespan(trip.idlingDuration).getDuration());
    values.push(trip.maximumSpeed);
    values.push(trip.averageSpeed);
    values.push(new Date(Date.parse(trip.start)));
    values.push(new Date(Date.parse(trip.stop)));
    values.push(new Date(Date.parse(trip.nextTripStart)));
    values.push(timespan(trip.stopDuration).getDuration());
    values.push(trip.stopPoint.x);
    values.push(trip.stopPoint.y);
    return values;
  });

  if (showHeadings === true) {
    values = ["DeviceId", "DeviceName", "DriverId", "DriverName", "Distance", "DrivingDuration", "IdlingDuration", "MaximumSpeed", "AverageSpeed", "DrivingStart", "DrivingStop", "NextTripStart", "StopDuration", "x", "y"];
    result.unshift(values);
  }
  return result;
}

/**
 * Returns the address (reverse geocode) for the given latitude and longitude
 *
 * @param {array} location The latitude and longitude. Select a range of cells horizontally next to each other.
 * @customfunction
 */
function MGREVERSEGEOCODE(location) {
  var x, y;

  if (!location.map) {
    throw "Please select two cells like [A1:B1] containing longitude (x) and latitude (y)";
  }

  x = location[0][0];
  y = location[0][1];

  var geocoder = Maps.newGeocoder();
  var result = geocoder.reverseGeocode(y, x);

  if (result.status == "OK") {
    if (result.results.length >= 1) {
      return result.results[0].formatted_address;
    }
    else {
      return "No location information";
    }
  }
  else {
    return "No location information";
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("MyGeotab")
    .addItem("Open sidebar", "openSideBar")
    .addToUi();
};

function openSideBar() {
  var html = HtmlService.createHtmlOutputFromFile('login')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setTitle('MyGeotab Login')
    .setWidth(250);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getLoginCredentials(formObject) {
  Logger.log("got credentials");
  var api = MyGeotabApi();
  var session = api.authenticate(formObject.userName, formObject.password, formObject.database);

  var docProperties = PropertiesService.getDocumentProperties();
  docProperties.setProperty('api-session', JSON.stringify(session));

  Logger.log(session);
  Logger.log("Set API");
}