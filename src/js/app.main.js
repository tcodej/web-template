/**
 * For the main app view
 */

var mode = 'test',
    app = app || {};

app.main = (function() {
    "use strict";
    var self = {

        /**
         * Called on page load
         */
        init: function() {
            console.log('main init');
            app.service.init();
            app.share.init();
            //self.load();

            $('section').append(self.getTemplate('example', { data: 'Hurray!' }));
        },

        /**
         * Load data from an external service
         */
        load: function(reload) {
            app.service.load(function(result) {
                console.log(result);
            },
            function(result) {
                console.error('There was a problem connecting to the remote service. Please try again later.');
            });
        },

        /**
         * Check the URL hash value and process accordingly
         */
        checkHash: function() {
            var hash = window.location.hash.substr(1).toLowerCase();
            
            switch (hash) {
                case '/':
                case '':
                    //
                break;
            }
        },

        /**
         * Analytics
         */
        track: function(category, action) {
            if (typeof ga !== 'undefined') {
                ga('send', 'event', category, action);
                console.log('Track: '+ category +', '+ action);
            }
        },

        /**
         * Compiles a handlebars.js template
         */
        getTemplate: function(templateName, data) {
            var source = $('#template-'+ templateName).html(),
                template = Handlebars.compile(source);
            return template(data);
        }
    };

    return self;
}());


app.share = (function() {
    var shareURL = {
            local: 'http://test.example.com/',
            test: 'http://test.example.com/',
            live: 'https://www.example.com/'
        },
        fbid = {
            local: '190694681013454',
            test: '',
            live: ''
        },
        self = {

        init: function() {
            // enable share buttons
            $('.share.facebook').off('click').on('click', function() {
                app.share.shareFacebook({
                    description: 'Facebook share description',
                    caption: 'example.com'
                });
            });

            $('.share.twitter').off('click').on('click', function() {
                app.share.shareTwitter({
                    twitter: 'Twitter share description',
                    hashtags: 'hashtag'
                });
            });
        },

        // this is called automatically when the facebook api is ready
        initFacebook: function() {
            FB.init({
                appId: fbid[mode],
                xfbml: true,
                version: 'v2.8'
            });
        },

        shareFacebook: function(obj) {
            var options = {
              method: 'feed',
              link: shareURL[mode],
              name: 'Web Template',
              description: obj.description
            };

            if (obj.picture == undefined) {
                options.picture = shareURL[mode] +'img/share-facebook.png'
            } else {
                options.picture = obj.picture;
            }

            if (obj.caption !== undefined) {
                options.caption = obj.caption;
            }

            FB.ui(options, function(response){});
        },

        shareTwitter: function(obj) {
            if (obj.hashtags == undefined) {
                obj.hashtags = '';
            }
            var width = 500,
                height = 443,
                top = (screen.height / 2) - (height / 2),
                left = (screen.width / 2) - (width / 2),
                windowProperties = "toolbar=no,menubar=no,scrollbars=no,statusbar=no,width="+ width +",height="+ height +",top="+ top +",left="+ left,
                popwin = window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(shareURL[mode]) +'&text='+ encodeURIComponent(obj.twitter) + '&hashtags='+ encodeURIComponent(obj.hashtags), 'twittershare', windowProperties);

            popwin.focus();
        }
    };
    return self;
}());

app.service = (function() {
    "use strict";
    var socket = null,
        dataURL = {
            local: '',
            test: '',
            live: ''
        },
        donateURL = {
            local: '',
            test: '',
            live: ''
        },
        self = {

        init: function() {
            switch (location.hostname) {
                case 'localhost':
                    mode = 'local';
                break;
                case 'test.example.com':
                    mode = 'test';
                break;
                case 'www.example.com':
                    mode = 'live';
                    // force https
                    // if (location.protocol != 'https:') {
                    //     $('body').empty();
                    //     window.location.replace('https://www.example.com');
                    //     return;
                    // }
                break;
            }
            console.log('Mode: '+ mode);
        },

        load: function(callback, errorcallback) {
            $.getJSON(dataURL[mode])
                .done(function(response) {
                    if (typeof callback == 'function') callback(response);
                })
                .fail(function(response) {
                    console.error('Error connecting to service endpoint: '+ dataURL[mode]);
                    if (typeof errorcallback == 'function') errorcallback(response);                    
                });
        }
    };
    return self;
}());


$(function() {
    app.main.init();
});

