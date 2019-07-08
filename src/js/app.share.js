var app = app || {};

app.share = (function() {
    var picURL = {
            local: 'http://test.example.com/',
            test: 'http://test.example.com/',
            live: 'https://www.example.com/'
        },
        fbid = {
            local: '190694681013454',
            test: '376650209131037',
            live: '376650209131037'
        },
        self = {

        // this is called automatically when the facebook api is ready
        initFacebook: function() {
            FB.init({
                appId: fbid[mode],
                xfbml: true,
                version: 'v3.1'
            });
        },

        shareFacebook: function(obj) {
            if (obj.image == undefined) {
                obj.image = picURL[mode] +'img/share-facebook.png';
            }

            FB.ui({
                method: 'share_open_graph',
                action_type: 'og.likes',
                action_properties: JSON.stringify({
                    object: {
                        'og:url': obj.url,
                        'og:title': obj.title,
                        'og:description': obj.description,
                        'og:image': obj.image
                    }
                })
            },

            function (response) {
                // share complete
            });
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
                popwin = window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(obj.url) +'&text='+ encodeURIComponent(obj.title +' - '+ obj.description) + '&hashtags='+ encodeURIComponent(obj.hashtags), 'twittershare', windowProperties);

            popwin.focus();
        }
    };

    return self;
}());
