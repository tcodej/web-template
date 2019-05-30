/**
 * Manages API calls and callbacks
 */
app.service = (function() {
    "use strict";

    var self = {

        /**
         * Connect to server (GET, POST, PATCH, DELETE), get response, optionally send data.
         * dataType defaults to 'json'
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
                    console.log('success');
                    if (typeof callback == 'function') callback(response);
                },

                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('error');
                    if (typeof errorcallback == 'function') errorcallback(jqXHR.responseJSON);
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
        },

        /**
         * Get the high scores
         */
        loadExample: function(callback, errorcallback) {
            self.getResponse({
                url: apiURL[mode] +'items.json',
                method: 'GET'
            }, callback, errorcallback);
        }
    };
    return self;
}());
