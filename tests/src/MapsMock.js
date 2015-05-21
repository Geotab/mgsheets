this.Maps = (function () {
	return {
		encodePolyline : function (points) {
			var mockEncoding = "", i;
			for (i = 0; i < points.length; i++) {
				mockEncoding += points[i];
			}
			return mockEncoding;
		}
	}
})();

