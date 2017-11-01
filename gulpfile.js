var gulp = require('gulp'),
  useref = require('gulp-useref'),
  gulpif = require('gulp-if'),
  uglify = require('gulp-uglify'),
  htmlmin = require('gulp-htmlmin'),
  sass = require('gulp-sass'),
  sourcemaps = require('gulp-sourcemaps'),
  clean = require('gulp-clean'),
  webserver = require('gulp-webserver'),
  shell = require('gulp-shell'),
  inject = require('gulp-inject-string'),
  argv = require('yargs').argv;

// These profiles should be set up in your ~/.aws/config with the proper keys
var AWS_PROFILE = 'YOUR_PROFILE_NAME',

    googleAnalytics = {
      'test': 'UA-XXXXXXXXX-1',
      'production': 'UA-XXXXXXXXX-1'
    },
    
    googleTagManager = {
      'test': 'GTM-XXXXXXX',
      'production': 'GTM-XXXXXXX'
    },

    cloudfront = {
      'test': 'XXXXXXXXXXXXXX',
      'production': 'XXXXXXXXXXXXXX'
    },

    // these are used in the share meta data in index.html when building the site
    domains = {
      'test': 'http://test.example.com',
      'production': 'http://www.example.com'
    };

/**
 * Clear out the dist directory and compiled css in the src directory
 */
gulp.task('clean', function() {
  gulp.src('./src/css/**/*.css', {
      read: false
    })
    .pipe(clean());
  return gulp.src('./dist', {
      read: false
    })
    .pipe(clean());
});

/**
 * Compile sass to the src/css directory. Let useref combine the files and copy to dist/css
 */
gulp.task('sass', function() {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sass.sync({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest('./src/css'));
});

/**
 * Compile sass but don't compress.
 */
gulp.task('sass-src', function() {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./src/css'));
});


/**
 * Minify, replace .js and .css paths in index.html using gulp-useref and copy to the dist directory
 */
gulp.task('useref', ['sass'], function() {
  return gulp.src('./src/*.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulp.dest('./dist'));
});

/**
 * Replace one string with another when parsing html files for build.
 */
gulp.task('inject:replace', ['useref'], function() {
  var env = 'test'

  if (argv.prod || argv.production) {
    env = 'production';
  }

  var now = Date.now();

  return gulp.src('./dist/*.html')
    .pipe(inject.replace('{inject:env}', env))
    .pipe(inject.replace('{inject:build-date}', new Date()))
    .pipe(inject.replace('{inject:domain}', domains[env]))
    .pipe(inject.replace('UA-XXXXXXXX-X', googleAnalytics[env]))
    .pipe(inject.replace('GTM-XXXXXXX', googleTagManager[env]))
    .pipe(inject.replace('.min.js"', '.min.js?v='+ now +'"'))
    .pipe(inject.replace('.min.css"', '.min.css?v='+ now +'"'))
    .pipe(htmlmin({
      removeComments: true,
      collapseWhitespace: true
      /*
      processScripts: ['text/x-handlebars-template'],
      customAttrSurround: [
        [ /\{\{#if\s+\w+\}\}/, /\{\{\/if\}\}/ ],
        [ /\{\{#unless\s+\w+\}\}/, /\{\{\/unless\}\}/ ]
      ]
      */
    }))
    .pipe(gulp.dest('./dist'));
});


/**
 * Simply copy supporting files from src to dist
 */
gulp.task('copy-files', ['useref'], function() {
  // list of folders in src directory that should be copied directly to dist when building
  var folders = ['img', 'fonts'];

  for (var folder of folders) {
    gulp.src('./src/' + folder + '/**/*')
      .pipe(gulp.dest('./dist/' + folder));
  }

  // list of individual files in src directory that should be copied directly to dist when building
  gulp.src(['./src/favicon.ico', './src/robots.txt'])
    .pipe(gulp.dest('./dist'));
});

/**
 * Watch for updates and recompile
 */
gulp.task('watch', function() {
  gulp.watch('./src/*.html', ['useref', 'inject:replace']);
  gulp.watch('./src/js/*.js', ['useref']);
  gulp.watch('./src/scss/**/*.scss', ['sass', 'useref']);
});

/**
 * Watch for updates and recompile when serving the source files
 */
gulp.task('watch-src', function() {
  gulp.watch('./src/scss/**/*.scss', ['sass-src']);
});

/**
 * If you don't want to use your own webserver, use this
 */
gulp.task('webserver', ['copy-files'], function() {
  gulp.src('./dist')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      port: 8000
    }));
});

gulp.task('webserver-src', function() {
  gulp.src('./src')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      port: 8000
    }));
});

/**
 * Deploy the test S3 bucket
 * (You'll need the AWS CLI installed and a profile set up in ~/.aws/config)
 */
gulp.task('deploy', function() {

  // set this to what ever your default bucket will be
  var bucket = 'test.example.com';

  if (argv.prod || argv.production) {
    bucket = 'www.example.com';
  }

  // option to exclude some non-changing items to save upload time
  var exclude = '';
  if (argv.quick) {
    exclude = '--exclude "img/*" --exclude "fonts/*" ';
  }

  // gulp needs something for src, so the file doesn't matter as long as it exists
  return gulp.src('./src/index.html', {
      read: false
    })
    .pipe(shell('aws s3 cp ./dist s3://'+ bucket +' --recursive '+ exclude +' --profile '+ AWS_PROFILE));
});

/**
 * Invalidate CloudFront cache
 * Must allow this command manually before using: aws configure set preview.cloudfront true
 */
gulp.task('cf', function() {
  var env = 'test'

  if (argv.prod || argv.production) {
    env = 'production';
  }

  // gulp needs something for src, so the file doesn't matter as long as it exists
  return gulp.src('./src/index.html', {
      read: false
    })
    .pipe(shell('aws cloudfront create-invalidation --paths "/*" --distribution-id '+ cloundfront[env] +' --profile '));
});



// This compiles scss to css and serves the source files for debugging.
gulp.task('default', ['sass-src', 'webserver-src', 'watch-src']);

// This compiles everything to the dist directory and serves from there so you can test against what will be deployed.
gulp.task('dist', ['sass', 'useref', 'inject:replace', 'copy-files', 'webserver', 'watch']);

// This compiles to the dist directory to prep for deployment. Does not launch a webserver.
gulp.task('build', ['sass', 'useref', 'inject:replace', 'copy-files']);
