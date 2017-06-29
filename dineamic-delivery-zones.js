
if (!window['dineamic'])
    window['dineamic'] = {};

if (!window.dineamic['deliveryZones']) {
    window.dineamic['deliveryZones'] = (function () {

        function fillLookupTable(lookup, zones) {
            for (var i = 0; i < zones.length; i++) {
                storeZone(lookup, zones[i]);
            }
        }

        function storeZone(lookup, zone) {
            var name = zone.suburb + zone.postcode;
            store(lookup, zone, zone.postcode);
            store(lookup, zone, name);
            var sub = convertQuery(name);
            for (var i = 4; i < sub.length; i++) {
                store(lookup, zone, sub.substring(0, i));
            }
        }

        function store(lookup, zone, query) {
            if (!query) {
                console.log(zone);
                return;
            }
            var key = convertQuery(query);
            if (lookup.hasOwnProperty(key)) {
                lookup[key].push(zone);
            } else {
                lookup[key] = [zone];
            }
        }

        function search(lookup, query) {
            var key = convertQuery(query);
            return lookup[key] || [];
        }

        function convertQuery(query) {
            return query.replace(/ /g, '').toLowerCase();
        }

        function getJson(url, callback) {
            var req = new XMLHttpRequest();
            req.open('GET', url);
            req.onreadystatechange = function () {
                if (req.readyState === XMLHttpRequest.DONE) {
                    if (req.status === 200) {
                        var data = JSON.parse(req.responseText);
                        callback(data);
                    } else {
                        console.log(req);
                    }
                }
            };
            req.send();
        }

        function download(url, callback) {
            var lookup = {};
            getJson(url, function (data) {
                fillLookupTable(lookup, data);
                if (callback) {
                    callback(data);
                }
            });
            return {
                search: function (query) {
                    return search(lookup, query);
                }
            };
        }

        return {
            download: download
        };
    })();
}
