/**
 * Page/view manager, handles some common elements and helper functions
 */
app.page = (function() {
    "use strict";
    var data = {},
        title = 'Web Template',
        titleSeparator = ' | ',
        self = {

        /**
         * Common tasks once a page has loaded
         */
        postLoad: function(data, page) {
            self.setID(data.page);
            self.setTitle(data.title);
            page.render(data);
            app.main.hideLoader();
        },

        /**
         * Load the selected page
         * Essentially just changes the window hash
         * name: the page module name
         * replace: replace the current page in browsing history
         */
        loadPage: function(name, replace) {
            if (replace) {
                if (name) {
                    window.location.replace('#'+ name);

                } else {
                    window.location.replace('/');
                }

                return;
            }

            window.location.hash = name;
        },

        /**
         * Sets the id attribute of the body tag. Useful for CSS.
         */
        setID: function(val) {
            if (val === undefined || val == '' || val === '/') {
                val = 'index';
            }
            $('body').attr('id', 'page-'+ val);
        },

        setTitle: function(val) {
            window.document.title = title + (val ? titleSeparator + val : '');
        },

        /**
         * Clears cached data
         */
        clearData: function() {
            data = {};
        },

        /**
         * Lock page from scrolling
         */
        setFixed: function(bool) {
            if (bool == undefined) {
                bool = true;
            }
            if (bool === true) {
                $('body').addClass('fixed');
            } else {
                $('body').removeClass('fixed');
            }
        }
    };
    return self;
}());

/**
 * Main site controller, typically used to manage items that are common across multiple views
 */
app.main = (function() {
    "use strict";
    var self = {

        /**
         * Called on page load
         */
        init: function() {
            self.initHandlebars();
            $('#this-year').text(new Date().getFullYear());
            $('#btn-menu').on('click', self.toggleNav);

            $(window).on('hashchange', function() {
                self.checkHash();
            });

            self.checkHash();
        },

        toggleNav: function(force) {
            var btn = $('#btn-menu'),
                nav = $('header nav');
                
            if (btn.hasClass('is-active') || force === 'close') {
                btn.removeClass('is-active');
                nav.removeClass('is-active');
                return;
            }

            if (btn.hasClass('is-active') === false || force === 'open') {
                btn.addClass('is-active');
                nav.addClass('is-active');
                return;
            }
        },

        showLoader: function() {
            $('#loader').addClass('is-active');
        },

        hideLoader: function() {
            $('#loader').removeClass('is-active');
        },

        /**
         * Check the URL hash value and process accordingly
         */
        checkHash: function() {
            var hash = window.location.hash.substr(1).toLowerCase(),
                pieces = decodeURIComponent(hash).split('/');
            
            if (['about'].includes(pieces[0])) {
                hash = pieces[0];
            }

            app.message.clear();
            app.page.setTitle('');
            self.toggleNav('close');
            self.showLoader();
            window.scrollTo(0, 0);
            app.page.setID(hash);

            switch (hash) {
                case '/':
                case '':
                    app.page.index.init();
                break;

                case 'about':
                    app.page.about.init(pieces[1]);
                break;

                default:
                    if (app.page[hash]) {
                        app.page[hash].init();

                    } else {
                        try {
                            app.page.default.init(hash);

                        } catch(e) {
                            console.log(e);
                            app.page.default.init('error');
                        }
                    }
                break;
            }
        },

        /**
         * Analytics
         */
        track: function(action, label) {
            console.log('track: ', action, label);

            if (typeof gtag !== 'undefined') {
                gtag('event', 'general', {
                    'event_category': 'general',
                    'event_action': action,
                    'event_label': label
                });
            }
        },

        /**
         * Compiles a handlebars.js template
         * templateName: the ID of the <script> object that contains an inline template, or the file name of an external template (no extension)
         * data: a json object containing data that will populate the template
         * externalTemplate: if true, will attempt to load an external template file
         * callback: used when loading external templates, function to call when template has loaded
         */
        getTemplate: function(templateName, data, externalTemplate, callback) {
            // always have a data object
            if (data == undefined) {
                data = {};
            }
            
            if (externalTemplate === true) {
                // optionally load an external template file
                $.get('templates/'+ templateName +'.html')
                    .done(function(source) {
                        // don't compile, just add to the DOM and let the calling function process it
                        $('#template').html(source);
                        if (typeof callback === 'function') {
                            callback();
                        }
                    })
                    .fail(function(e) {
                        console.log('Failed loading external template: '+ templateName);
                        app.page.default.init('error');
                    }
                );

            } else {
                // detault loads an embedded template
                var source = $('#template-'+ templateName).html(),
                    template = Handlebars.compile(source);
                return template(data);
            }
        },

        /**
         * After an external template has been loaded and rendered, this will clear the template from the dom
         * Optional
         */
        clearTemplate: function() {
            $('#template').empty();
        },
        
        /**
         * Initialize Handlebars helpers and partials. Should happen before rendering anything.
         */
        initHandlebars: function() {
            Handlebars.registerHelper('ifMultiple', function(num, opts) {
                return parseInt(num, 10) > 1 ? opts.fn(this) : opts.inverse(this);
            });

            // add logical operators
            Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

                switch (operator) {
                    case '==':
                        return (v1 == v2) ? options.fn(this) : options.inverse(this);
                    case '===':
                        return (v1 === v2) ? options.fn(this) : options.inverse(this);
                    case '!=':
                        return (v1 != v2) ? options.fn(this) : options.inverse(this);
                    case '!==':
                        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                    case '<':
                        return (v1 < v2) ? options.fn(this) : options.inverse(this);
                    case '<=':
                        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                    case '>':
                        return (v1 > v2) ? options.fn(this) : options.inverse(this);
                    case '>=':
                        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                    case '&&':
                        return (v1 && v2) ? options.fn(this) : options.inverse(this);
                    case '||':
                        return (v1 || v2) ? options.fn(this) : options.inverse(this);
                    default:
                        return options.inverse(this);
                }
            });
        }
    };

    return self;
}());



/* ----- APP VIEWS/PAGES ----- */






/**
 * Home page
 */
app.page.index = (function() {
    "use strict";
    var shareData = {},
        self = {

        init: function(id) {
            app.page.postLoad({
                page: 'index',
                title: ''
            }, self);
        },

        render: function(data) {
            app.main.getTemplate('page-index', {}, true, function() {
                $('#page').html(app.main.getTemplate('page-index', data));
                self.ready();
            });
        },

        ready: function() {
            app.service.loadExample(
                function(data) {
                    $('#items').html(app.main.getTemplate('partial-items', {
                        items: data
                    }));
                },

                function(error) {
                    console.log(error);
                }
            );

            shareData.url = (mode == 'local') ? 'http://test.example.com/' : location.origin;
            shareData.image = shareData.url +'/img/share-facebook.png';
            shareData.title = 'Share Title'; // facebook only
            shareData.description = 'Share description.';

            $('#share .facebook').off('click').on('click', function(e) {
                e.preventDefault();
                app.share.shareFacebook(shareData);
            });

            $('#share .twitter').off('click').on('click', function(e) {
                e.preventDefault();
                app.share.shareTwitter(shareData);
            });
        }
    };

    return self;
}());



/**
 * About page view
 */
app.page.about = (function() {
    "use strict";
    var name = 'about',
        self = {

        init: function(param) {
            console.log('Page param: '+ param);

            app.page.postLoad({
                page: name,
                title: 'About Us'
            }, self);
        },

        render: function(data) {
            app.main.getTemplate('page-'+ name, {}, true, function(data) {
                $('#page').html(app.main.getTemplate('page-'+ name));
            });
        }
    };

    return self;
}());





/**
 * Generic page view
 */
app.page.default = (function() {
    "use strict";
    var name = '',
        self = {

        init: function(pageName) {
            if (pageName) {
                name = pageName;
            }

            app.page.postLoad({
                page: name,
                title: 'Page not found.'
            }, self);
        },

        render: function(data) {
            app.main.getTemplate('page-'+ name, {}, true, function(data) {
                $('#page').html(app.main.getTemplate('page-'+ name));
            });
        }
    };

    return self;
}());







/* ----- APP COMPONENTS ----- */


/**
 * Handles global error and info messaging
 */
app.message = (function() {
    'use strict';
    var timer = null,
        self = {

        error: function(message, delay, callback) {
            // only do this if a message is passed
            if (message) {
                self.setDelay(delay);
                $('#message').html(message).addClass('is-active error').on('click', function() {
                    self.clear();
                    if (typeof callback == 'function') {
                        callback();
                    }
                });
               // window.scrollTo(0, 0);
            }
        },

        info: function(message, delay) {
            self.setDelay(delay);
            $('#message').text(message).addClass('is-active').on('click', self.clear);
            //window.scrollTo(0, 0);
        },

        clear: function() {
            $('#message').empty().removeClass('is-active error').off('click', self.clear);
            clearTimeout(timer);
            timer = null;
        },

        setDelay: function(delay) {
            if (isNaN(parseInt(delay, 10)) === false) {
                // clear any existing message/timer
                self.clear();
                timer = setTimeout(self.clear, delay);
            }
        }
    };

    return self;
})();





