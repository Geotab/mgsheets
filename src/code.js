//function updateSeed() {
//  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Vehicle");
//  var range = sheet.getRange("I5");
//  range.setValue(range.getValue()+1);
//}

/**
 * Returns the ID for a device given some arbitrary search string. 
 *
 * @param {string} A string describing the vehicle. Currently the name property is searched on. Wildcard with % is supported.
 * @return {object} The device ID, if found
 */
function getDeviceId_(anyDeviceSearchValue) {
    var docCache,
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
 */
function getDeviceById_(deviceId) {
    var device,
        devices,
        api,
        docCache;

    docCache = CacheService.getDocumentCache();
    device = docCache.get("device-" + deviceId);

    if (device !== null) {
        try {
            device = JSON.parse(device);
            return device;
        }
        catch (err) {
            docCache.remove("device-" + deviceId);
        }
    }

    api = getApi_();
  
    // Search by id
    devices = api.get("Device", {
        id: deviceId
    });

    if (devices.length === 1) {
        docCache.put("device-" + deviceId, JSON.stringify(devices[0]), 600);
        return devices[0];
    }
    return null;
}

/**
 * Returns a Device object for the given device ID 
 *
 * @param {string} deviceId The device ID
 * @return {object} A device oject
 */
function getDriverById_(driverId) {
    var docCache,
        driver,
        drivers,
        api;

    docCache = CacheService.getDocumentCache();
    driver = docCache.get("driver-" + driverId);

    if (driver !== null) {
        try {
            driver = JSON.parse(driver);
            return driver;
        }
        catch (err) {
            docCache.remove("driver-" + driverId);
        }
    }

    api = getApi_();
  
    // Search by id
    drivers = api.get("User", {
        id: driverId
    });

    if (drivers.length === 1) {
        docCache.put("driver-" + driverId, JSON.stringify(drivers[0]), 600);
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

function getExtent(points) {
    var extent = [], i, minLat, minLong, maxLat, maxLong, currentLat, currentLong;
    minLat = points[0];
    minLong = points[1];
    maxLat = points[0];
    maxLong = points[1];
    for (i = 2; i < points.length; i += 2) {
        currentLat = points[i];
        currentLong = points[i + 1];
        if (currentLat < minLat) {
            minLat = currentLat;
        }
        if (currentLat > maxLat) {
            maxLat = currentLat;
        }
        if (currentLong < minLong) {
            minLong = currentLong;
        }
        if (currentLong > maxLong) {
            maxLong = currentLong;
        }
    }
    extent.push(minLat);
    extent.push(minLong);
    extent.push(maxLat);
    extent.push(maxLong);
    return extent;
}

function getGeoJson(points) {
  
    // TODO: What if start/end markers are on top of eachother?
    var lineCoordinates, i,
        template =
            {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: {
                            stroke: "#0b10ff",
                            "stroke-width": 5,
                            "stroke-opacity": 0.5
                        },
                        geometry: {
                            type: "LineString",
                            coordinates: []
                        }
                    },
                    {
                        type: "Feature",
                        properties: {
                            "marker-color": "#f50000",
                            "marker-size": "medium",
                            "marker-symbol": "embassy"
                        },
                        geometry: {
                            type: "Point",
                            coordinates: []
                        }
                    },
                    {
                        type: "Feature",
                        properties: {
                            "marker-color": "#00aa00",
                            "marker-size": "large",
                            "marker-symbol": "car"
                        },
                        geometry: {
                            type: "Point",
                            coordinates: []
                        }
                    }
                ]
            };
  
    // Grab a reference to the array
    lineCoordinates = template.features[0].geometry.coordinates;

    for (i = 0; i < points.length; i += 2) {
        lineCoordinates.push([points[i + 1], points[i]]);
    }

    template.features[1].geometry.coordinates = [points[1], points[0]];
    template.features[2].geometry.coordinates = [points[points.length - 1], points[points.length - 2]];

    return template;
}

/**
 * Returns a URL that will show a given Trip on the map
 *
 * @param {array} trip The ID (or whole Trip object) to draw
 * @param {string} color The trip color as 3 or 6 digit HEX color value. For example, "F0F" or "FF00FF"
 * @param {number} width The width of the map in pixels
 * @param {number} height The height of the map in pixels 
 * @param {number} strokeWidth How thick the line should be
 * @return {string} A URL that links to a static map image.
 * @customfunction
 */
function MGMAPTRIPURL(vehicle, fromDate, toDate, color, width, height, strokeWidth) {
    // TODO: Extract these constants
    var mainUrl = "https://api.tiles.mapbox.com/v4/geotab.i8d8afbp/",
        accessToken = "?access_token=pk.eyJ1IjoiZ2VvdGFiIiwiYSI6IjBqUDNodmsifQ.BJF8wMClneBH89oxyaTuxw",
        api = getApi_(),
        logs,
        logRecordSearch;

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
  
    // TODO: Give default for "today" if no from/to date was supplied
    deviceId = getDeviceId_(vehicle);
    if (deviceId === null) {
        throw "Can't find vehicle: " + vehicle;
    }

    logRecordSearch = {
        deviceSearch: {
            id: deviceId
        }
    };

    if (fromDate instanceof Date) {
        logRecordSearch.fromDate = fromDate;
    }

    if (toDate instanceof Date) {
        logRecordSearch.toDate = toDate;
    }
    
    // Setup defaults
    color = color || 482;
    width = width || 350;
    height = height || 350;
    strokeWidth = strokeWidth || 3;
  
    // Got a trip ID - now render it
    logs = api.get("LogRecord", logRecordSearch, 1000);
    
    logs.sort(function (logA, logB) {
        var dateA = new Date(Date.parse(logA.dateTime)),
            dateB = new Date(Date.parse(logB.dateTime));
        return dateA - dateB;
    });

    var coordinates = [];
    for (i = 0; i < logs.length; i++) {
        coordinates.push(logs[i].latitude);
        coordinates.push(logs[i].longitude);
    }

    // TODO: FeatureEncoder will blindly accept all the points I give it.
    //       This need to be enhanced so you can constrain the length of the string
    //       it must encode.
    var mapboxFeatureEncoder = MapboxFeatureEncoder(10000);
    mapboxFeatureEncoder.addPath(coordinates, strokeWidth, color);
    mapboxFeatureEncoder.addMarker(coordinates.slice(0, 2), "car", "0A0");
    mapboxFeatureEncoder.addMarker(coordinates.slice(coordinates.length - 2, coordinates.length), "embassy", "A00");
  
    //var extent = getExtent(coordinates);
    //var midLatitude = (extent[0] + extent[2]) / 2;
    //var midLongitude = (extent[1] + extent[3]) / 2;
    ///
    //var geoJsonEncoded = encodeURIComponent(JSON.stringify(getGeoJson(coordinates)));
    //var url = mainUrl + "geojson(" + geoJsonEncoded + ")/auto/" + width + "x" + height + ".png" + accessToken;
    //var url = mainUrl + "path-5+f44+f44(" + encodedPolyLine + ")/" + midLongitude + "," + midLatitude + "," + zoom + "/" + width + "x" + height + ".png" + accessToken;
    return mainUrl + mapboxFeatureEncoder.encodeOverlays() + "/auto/" + width + "x" + height + ".png" + accessToken;
    
    //path+strokecolor-strokeopacity+fillcolor-fillopacity({polyline})
    //Examples
    //http://api.tiles.mapbox.com/v4/examples.map-zr0njcqy/path-5+f44+f44(kumwFrjvbMaf%40kuD%7BnCkS)/-73.99,40.70,12/500x300.png?access_token=pk.eyJ1IjoiZ2VvdGFiIiwiYSI6ImxSa18yY2MifQ.RyYz70IXh-UPd4zuPoqKFA
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
        x, y;
    
    // Setup defaults
    color = color || 482;
    width = width || 100;
    height = height || 100;
    zoom = zoom || 17;

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
        values = ["DeviceId", "DeviceName", "DriverId", "DriverName", "Bearing", "Duration", "IsCommunicating", "IsDriving", "x", "y", "Speed", "DateTime"];
        statuses.unshift(values);
    }
    return statuses;
}
    
/**
 * Returns the trips for the given vehicle. Up to 1000 trips are returned. If a from and to date is specified, only trips during this period are included.
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
        tripSearch,
        deviceCache = {},
        driverCache = {};

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

    trips = api.get("Trip", tripSearch, 1000);

    var result = trips.map(function (trip) {
        var values = [];

        values.push(trip.id);
        values.push(trip.device.id);

        if (!(trip.device.id in deviceCache)) {
            deviceCache[trip.device.id] = getDeviceById_(trip.device.id);
        }
        values.push(deviceCache[trip.device.id].name);

        if (trip.driver === "UnknownDriverId") {
            values.push(1);
            values.push("Unknown");
        }
        else {
            if (!(trip.driver.id in driverCache)) {
                driverCache[trip.driver.id] = getDriverById_(trip.driver.id);
            }
            values.push(trip.driver.id);
            values.push(driverCache[trip.driver.id].name);
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
        values = ["Id", "DeviceId", "DeviceName", "DriverId", "DriverName", "Distance", "DrivingDuration", "IdlingDuration", "MaximumSpeed", "AverageSpeed", "DrivingStart", "DrivingStop", "NextTripStart", "StopDuration", "x", "y"];
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

/**
 * Fires when the Google Sheet is opened and adds the menu item required. 
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("MyGeotab")
        .addItem("Login", "openSideBar")
        .addToUi();
};

/**
 * Opens the sideBar where the user can provide credentials.
 */
function openSideBar() {
    var html = HtmlService.createHtmlOutputFromFile('login')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('MyGeotab Login')
        .setWidth(250);
    SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Called from the login.html page when the user provides credentials. 
 *
 * @param {object} formObject The form passed by the user. We can read the credentials from this, authenticate and store a session.
 */
function getLoginCredentials(formObject) {
    Logger.log("got credentials");
    var api = MyGeotabApi();

    var session = api.authenticate(formObject.userName, formObject.password, formObject.database);

    var htmlOutput = HtmlService.createHtmlOutputFromFile('authenticated')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setWidth(400)
        .setHeight(300);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Ready to rumble!');

    var docProperties = PropertiesService.getDocumentProperties();
    docProperties.setProperty('api-session', JSON.stringify(session));

    Logger.log(session);
    Logger.log("Set API");
}