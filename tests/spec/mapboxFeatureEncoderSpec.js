describe("mapboxFeatureEncoder", function () {
    it("should be able to encode one point", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2]);
        expect(encoder.encodeOverlays()).toBe("path(12)");
    });

    it("should be able to encode multiple points", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2, 3, 4]);
        expect(encoder.encodeOverlays()).toBe("path(1234)");
    });

    it("should be able to encode multiple features and be comma seperated", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2]);
        encoder.addPath([3, 4]);
        expect(encoder.encodeOverlays()).toBe("path(12),path(34)");
    });

    it("should be able to encode nothing", function () {
        var encoder = MapboxFeatureEncoder();
        expect(encoder.encodeOverlays()).toBe("");
    });

    it("should be able to specify stroke width", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2], 3);
        expect(encoder.encodeOverlays()).toBe("path-3(12)");
    });

    it("should be able to specify stroke width and color", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2], 3, "FFF");
        expect(encoder.encodeOverlays()).toBe("path-3+FFF(12)");
    });

    it("should be able to round to nearest one hundredth", function () {
        var encoder = MapboxFeatureEncoder(100);
        encoder.addPath([0.123, 0.123]);
        expect(encoder.encodeOverlays()).toBe("path(0.120.12)");
    });

    it("should be able to round to nearest one thousandth", function () {
        var encoder = MapboxFeatureEncoder(1000);
        encoder.addPath([0.1234, 0.1238]);
        expect(encoder.encodeOverlays()).toBe("path(0.1230.124)");
    });

    it("should be able to add a marker", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addMarker([1, 2]);
        expect(encoder.encodeOverlays()).toBe("pin-m(2,1)");
    });

    it("should be able to add a car marker", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addMarker([1, 2], "car");
        expect(encoder.encodeOverlays()).toBe("pin-m-car(2,1)");
    });

    it("should be able to add a red car marker", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addMarker([1, 2], "car", "F00");
        expect(encoder.encodeOverlays()).toBe("pin-m-car+F00(2,1)");
    });

    it("should be able to add a path and red car marker", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addPath([1, 2]);
        encoder.addMarker([1, 2], "car", "F00");
        expect(encoder.encodeOverlays()).toBe("path(12),pin-m-car+F00(2,1)");
    });

    it("should be able to add multiple markers", function () {
        var encoder = MapboxFeatureEncoder();
        encoder.addMarker([1, 2], "car", "F00");
        encoder.addMarker([3, 4], "car", "F00");
        expect(encoder.encodeOverlays()).toBe("pin-m-car+F00(2,1),pin-m-car+F00(4,3)");
    });
});