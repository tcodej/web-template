var mode = 'live',
    app = app || {};

var dataURL = {
        local: '/json/',
        dev: '/json/',
        test: '/json/',
        live: '/json/'
    };

/**
 * Page/view manager, handles some common elements and helper functions
 * todo: come up with a way to pass data to any page during init
 */
app.page = (function() {
    "use strict";
    var data = {},
        title = 'Site Name',
        titleSeparator = ' | ',
        carousels = [],
        self = {

        /**
         * Load the json data file for a page
         * page is the app.page.pagename object
         */
        load: function(endpoint, page) {
            // check if data was previously loaded and use cached data if so
            var id = endpoint.replace(/\.[^/.]+$/, '');
            if (data[id]) {
                // data has been previously cached
                self.postLoad(data[id], page);
            } else {
                // load data from the server
                app.service.load(dataURL[mode] + endpoint,
                    function(result) {
                        // cache data
                        data[id] = result;
                        self.postLoad(data[id], page);
                    }
                );
            }
        },

        /**
         * Common tasks once a page has loaded
         */
        postLoad: function(data, page) {
            // todo: this reset doesn't work
            self.resetCarousels();
            self.setID(data.page);
            self.setTitle(data.title);
            page.render(data);
            app.main.hideLoader();
        },

        /**
         * Load the selected page
         * Essentially just changes the window hash
         */
        loadPage: function(name) {
            window.location.hash = name;
        },

        /**
         * Supports multiple carousels on any page
         */
        initCarousel: function(opts) {
            $('.carousel-container').each(function() {
                carousels.push(app.carousel($(this)).init(opts));
            });
        },
        
        resetCarousels: function() {
            var carousel;
            while (carousel = carousels.pop()) {
                carousel.reset();
            }
        },

        /**
         * Enable any accordion elements
         */
        initAccordion: function(collapse) {
            $('.accordion-toggle').on('click', function() {
                var $obj = $(this).parent();
                if ($obj.hasClass('is-active')) {
                    // collapse the currently open item
                    $obj.removeClass('is-active');
                } else {
                    if (collapse === true) {
                        // close all others and expand the clicked item
                        $('.accordion').removeClass('is-active');
                    }
                    $obj.addClass('is-active');
                }
            });
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
            var hash = window.location.hash.substr(1).toLowerCase();

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

                default:
                    try {
                        app.page[hash].init();
                    } catch(e) {
                        console.log(e);
                        app.page.error.init();
                    }
                break;
            }
        },

        /**
         * Analytics
         */
        track: function(action, label) {
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
                // todo: error handling
                $.get('templates/'+ templateName +'.html')
                    .done(function(source) {
                        // don't compile, just add to the DOM and let the calling function process it
                        //var template = Handlebars.compile(source);
                        $('#template').html(source);
                        if (typeof callback === 'function') {
                            //callback(template(data));
                            callback();
                        }
                    })
                    .fail(function(e) {
                        console.log('Failed loading external template: '+ templateName);
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
         * Initialize Handlebars helpers and partials. Should happen before rendering anything.
         */
        initHandlebars: function() {
            Handlebars.registerHelper('ifMultiple', function(num, opts) {
                return parseInt(num, 10) > 1 ? opts.fn(this) : opts.inverse(this);
            });
            
            Handlebars.registerPartial('carousel', $('#partial-carousel').html());
            Handlebars.registerPartial('event', $('#partial-event').html());
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
    var self = {

        init: function() {
            app.page.load('index.json', self);
        },

        render: function(data) {
            $('#page').html(app.main.getTemplate('page-index', data));
            app.page.initCarousel({
                delay: 5000
            });
            
        }
    };

    return self;
}());







/**
 * About page
 */
app.page.about = (function() {
    "use strict";
    var self = {

        init: function() {
            app.page.load('about.json', self);
        },

        render: function(data) {
            $('#page').html(app.main.getTemplate('page-about', data));
        }
    };

    return self;
}());







/**
 * Generic error view
 */
app.page.error = (function() {
    "use strict";
    var self = {

        init: function() {
            app.page.postLoad({
                page: 'error',
                title: 'Page not found.'
            }, self);
        },

        render: function(data) {
            app.main.getTemplate('page-error', {}, true, function(data) {
                $('#page').html(app.main.getTemplate('error'));
            });
        }
    };

    return self;
}());







/* ----- APP COMPONENTS ----- */

/**
 * Image/video carousel
 */
app.carousel = function($carousel) {
    "use strict";
    var $slider,
        current = 0,
        total = 0,
        resizeTimer = null, // simulates a 'resize is done' event
        timer = null,   // auto-slide timer
        delay = 0,   // milliseconds
        videoPlaying = false,
        threshold = 50,    // distance of drag before triggering slider movement
        thresholdReached = false,   // once the threshold has been reached, allow any movement
        move = {
            left: 0,
            startX: 0,
            dist: 0,
            active: false
        },
        options = {
            onSlideEnd: function() {},
            fullScreen: false
        },
        self = {

        init: function(opts) {
            if (opts) {
                if (typeof opts.onSlideEnd == 'function') {
                    options.onSlideEnd = opts.onSlideEnd;
                }
            }
            
            $slider = $('.slide-container', $carousel);
            total = $('.slide', $carousel).length;
            
            if (total > 1) {
                
                if (opts) {
                    if (opts.delay) {

                        delay = opts.delay;

                        if (delay > 0) {
                            $carousel
                                .on('mouseenter', function() {
                                    self.stopTimer();
                                })
                                .on('mouseleave', function() {
                                    self.moveEnd();
                                });
                        }
                    }
                }
                
                $('.carousel', $carousel)
                    .on('touchstart mousedown', function(e) {
                        move.active = true;
                        self.stopTimer();
                        $slider.addClass('is-active');
                        var touchEvt = e.originalEvent.touches ? e.originalEvent.touches[0] : e.originalEvent;
                        move.left = parseInt($slider.css('left'), 10);
                        move.startX = touchEvt.clientX;
                        move.dist = 0;
                    })
                    .on('touchmove mousemove', function(e) {
                        if (move.active == false) return;
                        var touchEvt = e.originalEvent.touches ? e.originalEvent.touches[0] : e.originalEvent;
                        move.dist = touchEvt.clientX - move.startX;
                        
                        if (Math.abs(move.dist) > threshold || thresholdReached) {
                            thresholdReached = true;
                            $slider.css({ 'left': move.left + move.dist });
                        }
                    })
                    .on('touchend mouseup', function(e) {
                        self.moveEnd();
                    });
                    
                $('.slide img', $carousel).on('drag dragstart dragend', function(e) {
                    e.preventDefault();
                });

                $('.arrow', $carousel).on('click', function() {
                    self.slideTo($(this).data('dir'));
                });
                
                $('.thumbnails a', $carousel)
                    .on('click', function(e) {
                        e.preventDefault();
                        self.slideTo(parseInt($(this).data('slide'), 10)); 
                    })
                    .on('dragstart', function(e) {
                        e.preventDefault();
                    });
                    
                self.slideTo(0);
                self.startTimer();
            }
            
            $('video', $carousel).on('click', function(e) {
                if (move.dist != 0) return;
                var video = $(this)[0];
                if (video.playing !== true) {
                    
                    if (options.fullScreen == true) {
                        if (video.requestFullscreen) {
                          video.requestFullscreen();
                        } else if (video.mozRequestFullScreen) {
                          video.mozRequestFullScreen();
                        } else if (video.webkitRequestFullscreen) {
                          video.webkitRequestFullscreen();
                        } else if (video.msRequestFullscreen) {
                            video.msRequestFullscreen();
                        }
                    }

                    self.playVideo(video);
                } else {
                    self.stopVideo(video);
                }

            }).on('ended', function(e) {
                self.stopAllVideo();
            });
            
            return self;
        },
        
        /**
         * If non-standard sizes are uploaded, adjust each as necessary
         */
        adjustSlideDimensions: function() {
            // clear any previously set css
            $('.slide-content').removeAttr('style');

            $('.slide-content', $carousel).each(function(i) {
                var width = Math.round($(this).width()),
                    height = Math.round($(this).height()),
                    //targetHeight = Math.round(width * (842 / 1500));
                    targetHeight = Math.round(width * (1055 / 1880));
                
                if (height > targetHeight) {
                    $(this).css({
                        'height': targetHeight,
                        'width': 'auto'
                    });
                }
                //console.log(width, height, targetHeight);
            });
                
  
        },
        
        resizeHandler: function(e) {
            if (resizeTimer !== null) {
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(self.resizeComplete, 150);
        },

        // when resize has finished, adjust slider position
        resizeComplete: function() {
            clearTimeout(resizeTimer);
            self.adjustSlideDimensions();
        },
        
        moveEnd: function() {
            self.startTimer();
            if (move.active === false) return;
            
            move.active = false;
            $slider.removeClass('is-active');

            if (move.dist < -100) {
                current++;
                if (current > total - 1) current = total - 1;
                self.slideTo(current);
                
            } else if (move.dist > 100) {
                current--;
                if (current < 0) current = 0;
                self.slideTo(current);
                
            } else {
                $slider.css({ 'left': move.left });
            }
        },

        slideTo: function(val) {
            if (val === undefined) {
                val = current;
            }
            self.stopAllVideo();
            
            if (val === 'prev') {
                val = current - 1;
            }
            if (val === 'next') {
                val = current + 1;
            }
            if (val < 0) val = total -1;
            if (val >= total) val = 0;
            
            current = val;
            
            $slider.css({ 'left': -(current * 100) +'%' });
            $('.thumbnails a', $carousel).removeClass('current');
            $('.slide-'+ current, $carousel).addClass('current');

            var left = 0,
                widthPercent = 10; // this should match the thumbnail image width % from the css

            if (total > widthPercent) {
                if (current < 5) {
                    left = 0;
                } else {
                    if (current <= total - 5) {
                        left = -((current - 5) * widthPercent) +'%';
                    } else {
                        left = -((total - widthPercent) * widthPercent) +'%';
                    }
                }
            }
            
            $('.thumbs-container', $carousel).css({
                'left': left
            });
            
            thresholdReached = false;
            
            /*
            var slideTitle = $('[data-index="'+ current +'"]', $carousel).data('title');
            $('#slide-title').empty();

            if (slideTitle) {
                $('#slide-title', $carousel).text(slideTitle +' - ');
            }
            */

            // var percent = Math.floor((current + 1) / total * 100);
            // $('.bar', $carousel).css('width', percent+'%');
            
            var width = 100 / total,
                left = width * current;

            $('.bar', $carousel).css({
                width: width +'%',
                left: left +'%'
            });
            
            // special case for the index page
            $('#page-index .bar').css({
                width: width +'%',
                left: left +'%'
            });
            //console.log(total, current, width, left);
            

            // fire the callback
            options.onSlideEnd(current);
            
            // if autoplay is set, play the video on mute
            var $slide = $('.slide[data-index="'+ current +'"]');

            $('video', $carousel).each(function() {
                $(this)[0].pause();
            });

            if ($slide.hasClass('autoplay')) {
                $('video', $slide)[0].play();
            }
        },

        autoSlide: function() {
            current++;
            self.slideTo(current);
        },

        startTimer: function() {
            if (videoPlaying === true || delay < 1000) return;

            if (timer === null) {
                timer = setInterval(self.autoSlide, delay);
            }
        },

        stopTimer: function() {
            if (timer !== null) {
                clearInterval(timer);
                timer = null;
            }
        },
        
        /**
         * Stops all video playback in the current carousel
         */
        stopAllVideo: function() {
            $('video', $carousel).each(function() {
                self.stopVideo($(this)[0]);
            });
        },
        
        /**
         * Plays an individual video
         */
        playVideo: function(video) {
            videoPlaying = video.playing = true;
            video.controls = true;
            $(video).parent().addClass('is-active');
            video.play();
            self.stopTimer();    
        },
        
        /**
         * Stops an individual video
         */
        stopVideo: function(video) {
            if (video.playing === true) {
                videoPlaying = video.playing = false;
                video.controls = false;
                video.pause();
                $(video).parent().removeClass('is-active');
                self.startTimer();
                
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        },
        
        /**
         * Reset any carousels that may have been previously initialized
         * Called by app.page.postLoad when the page is first loaded
         * todo: this doesn't work
         */
        reset: function() {
            options.onSlideEnd = function() {};
            self.stopTimer();
            self.stopAllVideo();
        }
    };
    return self;
};







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




