/**
 * Manages API calls and callbacks
 */
app.service = (function() {
    "use strict";

    var self = {

        init: function() {
            switch (location.hostname) {
                case 'localhost':
                    mode = 'local';
                break;
                case 'www.ylpwsdev.com':
                    mode = 'dev';
                break;
                case 'www.ylpws.com':
                    mode = 'test';
                break;
                case 'www.myyl.com':
                case 'myyl.com':
                    mode = 'live';
                break;
            }
            //console.log('Mode: '+ mode);
        },

        /**
         * Connect to server (GET, POST, PATCH, DELETE), get response, optionally send data.
         * dataType defaults to 'json' except for the api/support/profile/ endpoint which requires 'text'
         */
        getResponse: function(obj, callback, errorcallback, dataType) {
            $.ajax({
                url: obj.url,
                method: obj.method,
                crossDomain: true,
                contentType: 'application/json; charset=utf-8',
                cache: false,
                dataType: dataType ? dataType : 'json',
                data: JSON.stringify(obj.data),
                success: function(response) {
                    if (typeof callback == 'function') callback(response);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    if (typeof errorcallback == 'function') errorcallback(self.parseError(jqXHR.responseJSON));
                }
            });
        },

        /**
         * Loads a json file and returns it
         */
        load: function(endpoint, callback, errorcallback) {
            if (endpoint == undefined) {
                endpoint = '';
            }
            $.getJSON(endpoint)
                .done(function(response) {
                    if (typeof callback == 'function') callback(response);
                })
                .fail(function(response) {
                    console.error('Error connecting to '+ dataURL[mode] + endpoint +'. Probably invalid JSON.');
                    if (typeof errorcallback == 'function') errorcallback(response);
                }
            );
        }

    };
    return self;
}());
