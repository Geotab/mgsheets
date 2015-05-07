function TimeSpan() {

    var reTimeSpan = /(\d+\.)?(\d{2}):(\d{2}):(\d{2})\.?(\d{3})?/,
        isEmpty = function (timespan) {
            return !timespan || timespan === "00:00:00" || timespan === "00:00:00.000" || (timespan.getAllMilliseconds && timespan.getAllMilliseconds() === 0);
        },
        millisIndex = 4,
        secondsIndex = millisIndex - 1,
        minutesIndex = secondsIndex - 1,
        hoursIndex = minutesIndex - 1,
        daysIndex = hoursIndex - 1,
        bases = [1, 24, 60, 60, 1000],
        basesUpToAllParents = bases.concat(1).reverse().reduce(function (mulResult, current, index) {
            mulResult.unshift((mulResult[mulResult.length - index] || 1) * current);
            return mulResult;
        }, []).slice(1),
        isTimespan = function (candidate) {
            return typeof candidate === "object" && candidate.hasOwnProperty("getAllDays") && candidate.hasOwnProperty("add") && candidate.hasOwnProperty("getAllMilliseconds") && candidate.hasOwnProperty("isEmpty");
        },
        toAllMilliseconds = function (timespanStr) {
            var matches,
                i,
                millis = 0,
                match;

            reTimeSpan.lastIndex = 0;
            matches = reTimeSpan.exec(timespanStr);
            if (matches) {
                for (i = 1; i < matches.length; i++) {
                    match = matches[i];
                    if (match) {
                        millis += (+match) * basesUpToAllParents[i - 1];
                    }
                }
            }

            return millis;
        },
        toString = function (timeSpan, ignoreMilliseconds) {
            var days = timeSpan.getDays(),
                milliseconds,
                result =
                    (days ? days.toString() + "." : "") +
                    [timeSpan.getHours(), timeSpan.getMinutes(), timeSpan.getSeconds()].map(function (component) {
                        return (component < 10 ? "0" : "") + component.toString();
                    }).join(":");

            if (!ignoreMilliseconds) {
                milliseconds = "00" + timeSpan.getMilliseconds();
                milliseconds = milliseconds.slice(milliseconds.length - 3);
                result += "." + milliseconds;
            }
            return result;

        },
        parseMilliseconds = function (timeSpan) {
            switch (typeof timeSpan) {
                case "string":
                    return toAllMilliseconds(timeSpan);
                case "object":
                    return timeSpan.hasOwnProperty("getAllMilliseconds") ? timeSpan.getAllMilliseconds() : parseMilliseconds(timeSpan.toString());
                case "number":
                    return timeSpan;
                default:
                    return 0;
            }
        },
        createTimespan = function (timeSpanStr) {
            var millis = timeSpanStr ? parseMilliseconds(timeSpanStr) : 0,
                getComponent = function (baseIndex) {
                    return function () {
                        var value = getAllComponent(baseIndex)(),
                            base = bases[baseIndex];

                        return base !== 1 ? value % base : value;
                    };
                },
                getAllComponent = function (baseIndex) {
                    return function () {
                        return Math.floor(millis / (basesUpToAllParents[baseIndex] || 1));
                    };
                },
                self;

            return self = {
                isEmpty: function () {
                    return isEmpty(this);
                },
                toString: function (ignoreMilliseconds) {
                    return toString(this, ignoreMilliseconds);
                },
                getMilliseconds: getComponent(millisIndex),
                getSeconds: getComponent(secondsIndex),
                getMinutes: getComponent(minutesIndex),
                getHours: getComponent(hoursIndex),
                getDays: getComponent(daysIndex),
                getAllMilliseconds: getAllComponent(millisIndex),
                getAllSeconds: getAllComponent(secondsIndex),
                getAllMinutes: getAllComponent(minutesIndex),
                getAllHours: getAllComponent(hoursIndex),
                getAllDays: getAllComponent(daysIndex),
                /*
                * Returns the number of whole days as the decimal part and the remainder as a fraction of a day.
                * This format is useful for spreadsheets that store Durations in this format.
                */
                getDuration: function () {
                    return this.getAllDays() + ((this.getHours() * 3600 * 1000 + this.getMinutes() * 60 * 1000 + this.getSeconds() * 1000 + this.getMilliseconds()) / (24 * 3600 * 1000));
                },
                add: function (timeSpan) {
                    return createTimespan(this.getAllMilliseconds() + parseMilliseconds(timeSpan));
                },
                negate: function () {
                    return createTimespan(-millis);
                },
                substract: function (timeSpan) {
                    return createTimespan(timeSpan).negate().add(self);
                },
                addToDate: function (date) {
                    var newDate = new Date(date);
                    newDate.setMilliseconds(newDate.getMilliseconds() + millis);
                    return newDate;
                }
            };
        };

    createTimespan.isEmpty = isEmpty;
    createTimespan.getAllMilliseconds = toAllMilliseconds;
    createTimespan.isTimespan = isTimespan;
    return createTimespan;
}