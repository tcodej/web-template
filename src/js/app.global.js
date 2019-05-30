var mode = 'test',
    app = app || {},

    apiURL = {
        local: '/json/',
        test: '/json/',
        live: '/json/'
    };

switch (location.hostname) {
    case 'localhost':
        mode = 'local';
    break;
    case 'test.example.com':
        mode = 'test';
    break;
    case 'www.example.com':
    case 'example.com':
        mode = 'live';
    break;
}
console.log('Mode: '+ mode);
