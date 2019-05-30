/**
 * Cookie management
 */
app.cookie = (function() {
    'use strict';
    var name = 'unique_name',
        hours = 10,
        self = {
            
        /**
         * Override default expiration time in seconds
         */  
        setExpiration: function(seconds) {
            hours = seconds / 60 / 60;
            //console.log('cookie expires in '+ hours +' hours.');
        },

        set: function(value, cname, expiresHours) {
            if (cname === undefined) cname = name;
            var expires = '';
            if (hours || expiresHours) {
                var newHours = expiresHours ? expiresHours : hours,
                    date = new Date();

                date.setTime(date.getTime() + (newHours * 60 * 60 * 1000));
                expires = '; expires='+ date.toGMTString();
            }
            document.cookie = cname + '=' + value + expires + '; path=/';
        },

        append: function(value) {
            var cookie = self.get(name);
            if (cookie !== null) {
                var vals = cookie.split(',');
                for (var i = 0, len = vals.length; i < len; i++) {
                    if (vals[i] == value) {
                        // already exists, cancel
                        return true;
                    }
                }
            }
            value = cookie === null ? value : cookie +','+ value;
            self.set(value);
        },

        get: function(cname) {
            if (cname === undefined) cname = name;
            var nameEQ = cname + '=',
                ca = document.cookie.split(';');
            for (var i = 0, len = ca.length; i < len; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        },

        clear: function(cname) {
            document.cookie = (cname ? cname : name) +'=; expires=-1; path=/';
        }
    };

    return self;
})();

