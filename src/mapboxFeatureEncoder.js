function MapboxFeatureEncoder(precision) {
	var polyLines = [],
		markers = [],
		precision = precision || 10000;
		
		
	function removeSequentialPoints(points) {
		var nonSequentialPoints = [], i;
		
		if (points.length >= 2) {
	        nonSequentialPoints.push(points[0]);
	        nonSequentialPoints.push(points[1]);
		}
        for (i = 2; i < points.length; i += 2) {
            if (points[i] !== points[i - 2] || 
				points[i+1] !== points[i - 1]) {
                nonSequentialPoints.push(points[i]);
	        	nonSequentialPoints.push(points[i+1]);
            }
        }
		return nonSequentialPoints;
    }
  
	function roundPoints(points) {
		var i,
			roundedPoints = [];
			for (i = 0; i < points.length; i++) {
				roundedPoints.push(Math.round(points[i] * precision) / precision);
			}
		return roundedPoints;
	}

	return {
		 /**
		 * Adds marker to the set of features.
		 * @param {array} point An array with two elements: latitude and longitude.
		 * @param {string} label The marker symbol. a-z, 0-9, car, zoo etc.
		 * @param {string} color The 3 or 6 digit HEX color value. For example, "F0F" or "FF00FF"
		 */
		addMarker: function (point, label, color) {
			var marker = {
				point : point
			};
			if (color !== undefined) {
				marker.color = color;
			}
			if (label !== undefined) {
				marker.label = label;
			}
			markers.push(marker);
		},
		 /**
		 * Adds a Polyline to the set of features.
		 * @param {array} points An array of latitude and longitude pairs.
		 * @param {number} strokeWidth The width of stroke in pixels.
		 * @param {string} color The 3 or 6 digit HEX color value. For example, "F0F" or "FF00FF"
		 */
		addPath: function (points, strokeWidth, color) {
			var polyLine = {
				points : points
			};
			if (color !== undefined) {
				polyLine.color = color;
			}
			if (strokeWidth !== undefined) {
				polyLine.strokeWidth = strokeWidth;
			}
			polyLines.push(polyLine);
		},
		 /**
		 * @return {string} An encoded string for all the features includes in this overlay
		 */
		encodeOverlays: function () {
			var roundedPoints, i, encodedOverlays = "", polyLine, marker;
			
			// Add a roundedPoints property to each polyLine
			for (i=0; i < polyLines.length; i++) {
				encodedOverlays = encodedOverlays + "path";
				polyLine = polyLines[i];
				if (polyLine.hasOwnProperty('strokeWidth')) {
					encodedOverlays += "-" + polyLine.strokeWidth;
				}
				if (polyLine.hasOwnProperty('color')) {
					encodedOverlays += "+" + polyLine.color;
				}
				roundedPoints = removeSequentialPoints(roundPoints(polyLine.points));
				encodedOverlays = encodedOverlays + "(" + encodeURIComponent(Maps.encodePolyline(roundedPoints)) + ")";
				
				// Add trailing comma
				if (i < (polyLines.length-1) || markers.length > 0) {
					encodedOverlays = encodedOverlays + ",";
				}
			}
			
			for (i=0; i < markers.length; i++) {
				marker = markers[i];
				encodedOverlays += "pin-m";
				if (marker.hasOwnProperty('label')) {
					encodedOverlays += "-" + marker.label;
				}
				if (marker.hasOwnProperty('color')) {
					encodedOverlays += "+" + marker.color;
				}
				// Note markers need the longitude first, then latitude
				encodedOverlays += "(" + Math.round(marker.point[1] * precision) / precision  + "," + Math.round(marker.point[0] * precision) / precision + ")";
				if (i < markers.length-1) {
					encodedOverlays += ",";
				}
			}
			return encodedOverlays;
		}
	};
}	
