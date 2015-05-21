/*
 (c) 2013, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/


function Simplifier() {

    // to suit your point format, run search/replace for '.longitude' and '.latitude';
    // for 3D version, see 3d branch (configurability would draw significant performance overhead)
    
    // square distance between 2 points
    function getSqDist(p1, p2) {

        var dx = p1.longitude - p2.longitude,
            dy = p1.latitude - p2.latitude;

        return dx * dx + dy * dy;
    }
    
    // square distance from a point to a segment
    function getSqSegDist(p, p1, p2) {

        var x = p1.longitude,
            y = p1.latitude,
            dx = p2.longitude - x,
            dy = p2.latitude - y;

        if (dx !== 0 || dy !== 0) {

            var t = ((p.longitude - x) * dx + (p.latitude - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = p2.longitude;
                y = p2.latitude;

            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.longitude - x;
        dy = p.latitude - y;

        return dx * dx + dy * dy;
    }
    // rest of the code doesn't care about point format
    
    // basic distance-based simplification
    function simplifyRadialDist(points, sqTolerance) {

        var prevPoint = points[0],
            newPoints = [prevPoint],
            point;

        for (var i = 1, len = points.length; i < len; i++) {
            point = points[i];

            if (getSqDist(point, prevPoint) > sqTolerance) {
                newPoints.push(point);
                prevPoint = point;
            }
        }

        if (prevPoint !== point) newPoints.push(point);

        return newPoints;
    }

    function simplifyDPStep(points, first, last, sqTolerance, simplified) {
        var maxSqDist = sqTolerance,
            index;

        for (var i = first + 1; i < last; i++) {
            var sqDist = getSqSegDist(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
        }
    }
    
    // simplification using Ramer-Douglas-Peucker algorithm
    function simplifyDouglasPeucker(points, sqTolerance) {
        var last = points.length - 1;

        var simplified = [points[0]];
        simplifyDPStep(points, 0, last, sqTolerance, simplified);
        simplified.push(points[last]);

        return simplified;
    }

    return {

        // both algorithms combined for awesome performance
        simplify: function (points, tolerance, highestQuality) {
            if (points.length <= 2) return points;

            var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

            points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
            points = simplifyDouglasPeucker(points, sqTolerance);

            return points;
        }
    };
}