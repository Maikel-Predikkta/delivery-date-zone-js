if (!window['dineamic'])
    window['dineamic'] = {};

if (!window.dineamic['deliveryDates']) {
    window.dineamic['deliveryDates'] = (function () {
        
        var dayNums = {
            "Sun": 0,
            "Mon": 1,
            "Tue": 2,
            "Wed": 3,
            "Thu": 4,
            "Fri": 5,
            "Sat": 6
        };

        function nextDelivery(zone) {
            var freq = zone.frequency;
            var today = new Date();
            if (freq === 'Daily (business days)') {
                var deliveryDays = [1, 2, 3, 4, 5];
                return nextDailyDeliveries(today, deliveryDays);
            }
            if (freq === 'Daily (business days + Saturday)') {
                var deliveryDays = [1, 2, 3, 4, 5, 6];
                return nextDailyDeliveries(today, deliveryDays);
            }
            if (freq === 'Weekly') {
                return nextWeeklyDelivery(today, zone);
            }
            if (freq === 'Fortnightly') {
                return nextFortnightlyDelivery(today, zone);
            }
            console.log("Error: unknown frequency: " + freq);
            return {
                cutoffTime: '',
                cutoffDate: '',
                deliveryDate: ''
            };
        }
        
        function nextDailyDeliveries(start, deliveryDays) {
            // After 10am, start search the following day
            if (start.getHours() > 9) {
                start = addDays(start, 1);
            }
            var cutoffDate = nextBusinessDate(start);
            var deliveryDateStart = addDays(cutoffDate, 1);
            var deliveryDates = nextDates(deliveryDateStart, 12, deliveryDays);
            return {
                cutoffTime: '10am',
                cutoffDate: cutoffDate,
                deliveryDate: deliveryDates[0],
                deliveryDates: deliveryDates
            };
        }
        
        function nextWeeklyDelivery(start, zone) {
            var cutoffDaysPrior = +zone.turn + 1;
            var deliveryDays = parseDays(zone.day);
            var deliveryStart = addBusinessDays(start, cutoffDaysPrior);
            var deliveryDate = advanceToDay(deliveryStart, deliveryDays);
            var cutoffDate = addBusinessDays(deliveryDate, -cutoffDaysPrior);
            return {
                cutoffTime: 'midnight',
                cutoffDate: cutoffDate,
                deliveryDate: deliveryDate,
                deliveryDates: nextDates(deliveryDate, 6, deliveryDays)
            };

        }
        
        function nextFortnightlyDelivery(start, zone) {
            var cutoffDaysPrior = +zone.turn + 1;
            var deliveryDays = parseDays(zone.day);
            var deliveryStart = addBusinessDays(start, cutoffDaysPrior);
            var deliveryDate = advanceToDayInFortnight(deliveryStart, deliveryDays, zone.deliveryDate);
            var cutoffDate = addBusinessDays(deliveryDate, -cutoffDaysPrior);
            var deliveryDates = [
                deliveryDate,
                addDays(deliveryDate, 14),
                addDays(deliveryDate, 28)
            ];
            return {
                cutoffTime: 'midnight',
                cutoffDate: cutoffDate,
                deliveryDate: deliveryDate,
                deliveryDates: deliveryDates
            };

        }
        
        function nextBusinessDate(start) {
            var startDay = start.getDay();
            var daysToAdvance = daysToNextBusinessDay(startDay);
            return addDays(start, daysToAdvance);
        }
        
        function daysToNextBusinessDay(day) {
            if (day < 1) {
                return 1;
            }
            if (day > 5) {
                return 2;
            }
            return 0;
        }
        
        function parseDays(string) {
            var names;
            if (string.indexOf('/ ') !== -1) {
                names = string.split('/ ');
            } else if (string.indexOf(', ') !== -1) {
                names = string.split(', ');
            } else {
                names = [string];
            }
            return names.map(parseDay);
        }
        
        function parseDay(dayName) {
            return dayNums[dayName.substr(0, 3)];
        }
        
        function addDays(date, days) {
            var newDate = new Date(date);
            newDate.setDate(date.getDate() + days);
            return newDate;
        }
        
        function addBusinessDays(date, businessDays) {
            date = nextBusinessDate(date);
            var weeks;
            if (businessDays < 0) {
                weeks = Math.ceil(businessDays / 5);
            } else {
                weeks = Math.floor(businessDays / 5);
            }
            var remainingDays = businessDays % 5;
            var weekendDays = 0;
            var day = date.getDay();
            // If we cross a weekend
            if (day + remainingDays > 5) {
                weekendDays += 2;
            }
            if (day + remainingDays < 1) {
                weekendDays -= 2;
            }
            var totalDays = weeks * 7 + weekendDays + remainingDays;
            return addDays(date, totalDays);
        }
        
        function nextDates(startDate, number, deliveryDays) {
            var startDay = startDate.getDay();
            var daysFromStart = deliveryDays.map(function (dayOfWeek) {
                var days = dayOfWeek - startDay;
                if (dayOfWeek < startDay) {
                    days += 7;
                }
                return days;
            }).sort();
            var dates = [];
            for (var i = 0; i < number; i++) {
                var cycles = Math.floor(i / daysFromStart.length);
                var index = i % daysFromStart.length;
                var days = cycles * 7 + daysFromStart[index];
                dates.push(addDays(startDate, days));
            }
            return dates;
        }
        
        function advanceToDay(startDate, deliveryDays) {
            var startDay = startDate.getDay();
            var soonestDate;
            var minimumDays = 14;
            for (var i = 0; i < deliveryDays.length; i++) {
                var dayOfWeek = deliveryDays[i];
                if (dayOfWeek === startDay) {
                    return startDate;
                }
                var days = dayOfWeek - startDay;
                if (dayOfWeek < startDay) {
                    days += 7;
                }
                if (days < minimumDays) {
                    soonestDate = addDays(startDate, days);
                    minimumDays = days;
                }
            }
            return soonestDate;
        }
        
        function advanceToDayInFortnight(startDate, deliveryDays, referenceDateString) {
            var nextDate = advanceToDay(startDate, deliveryDays);
            var dayMonthYear = referenceDateString.split('/').map(Number);
            var refMonth = dayMonthYear[1] - 1;
            var refDate = new Date(dayMonthYear[2], refMonth, dayMonthYear[0]);
            if (isInFortnightlyInterval(nextDate, refDate)) {
                return nextDate;
            }
            return addDays(nextDate, 7);
        }
        
        function daysBetween(date1, date2) {
            var a = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
            var b = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
            var diff = b - a;
            return diff / 1000 / 60 / 60 / 24;
        }
        
        function isInFortnightlyInterval(date, referenceDate) {
            var days = daysBetween(
                    beginningOfWeek(date),
                    beginningOfWeek(referenceDate)
                    );
            return (days % 14) === 0;
        }
        
        function beginningOfWeek(date) {
            return addDays(date, -date.getDay());
        }
        
        return {
            nextDelivery: nextDelivery
        };
    })();
}
