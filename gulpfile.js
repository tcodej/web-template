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
  argv = require('yargs').argv,
  jshint = require('gulp-jshint');
  
  // return environment based on args --development --test --production
  function getEnv() {
    if (argv.test) return 'test';
    if (argv.prod || argv.production) return 'production';
    // development is default
    return 'development';
  };


// These profiles should be set up in your ~/.aws/config with the proper keys
var AWS_PROFILE = 'wk-pdx2',

    googleAnalytics = {
      'development': 'UA-XXXXXXXX-X',
      'test': 'UA-XXXXXXXX-X',
      'production': 'UA-XXXXXXXX-X'
    },

    googleTagManager = {
      'development': 'GTM-XXXXXXX',
      'test': 'GTM-XXXXXXX',
      'production': 'GTM-XXXXXXX'
    },

    cloudfront = {
      'development': '',
      'test': '',
      'production': ''
    },

    // these are used in the share meta data in index.html when building the site
    domain = {
      'development': 'http://dev.example.com',
      'test': 'http://test.example.com',
      'production': 'http://www.example.com'
    },
    
    bucket = {
      'development': 'remark-preview/v2',
      'test': 'remark-preview/v2',
      'production': 'remark-preview/v2'
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
    var now = Date.now();

    return gulp.src('./dist/*.html')
      .pipe(inject.replace('{inject:env}', getEnv()))
      .pipe(inject.replace('{inject:build-date}', new Date()))
      .pipe(inject.replace('{inject:domain}', domain[getEnv()]))
      .pipe(inject.replace('UA-XXXXXXXX-X', googleAnalytics[getEnv()]))
      .pipe(inject.replace('GTM-XXXXXXX', googleTagManager[getEnv()]))
      .pipe(inject.replace('.min.js"', '.min.js?v='+ now +'"'))
      .pipe(inject.replace('.min.css"', '.min.css?v='+ now +'"'))
      .pipe(htmlmin({
        removeComments: true,
        collapseWhitespace: true,
        processScripts: ['text/x-handlebars-template'],
        customAttrSurround: [
          [ /\{\{#[^}]+\}\}/, /\{\{\/[^}]+\}\}/ ]
        ]
    }))
    .pipe(gulp.dest('./dist'));
});


/**
 * Simply copy supporting files from src to dist
 */
gulp.task('copy-files', ['useref'], function() {
  // list of folders in src directory that should be copied directly to dist when building
  var folders = ['img', 'fonts', 'json', 'templates'];

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
 * Run this to periodically sanity check your js formatting
 */
gulp.task('lint', function() {
  return gulp.src('./src/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
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
 * Local dev command line deploy
 * (You'll need the AWS CLI installed and a profile set up in ~/.aws/config)
 * Always use Codepipline branches to deploy, but occasionally this can come in handy to quickly test on dev or for emergency deploys
 */
gulp.task('deploy', function() {
  // when testing, exclude some non-changing items to save upload time
  var exclude = '';
  if (argv.quick) {
    exclude = ' --exclude "fonts/*" --exclude "img/*" ';
  }

  // gulp needs something for src, so the file doesn't matter as long as it exists
  return gulp.src('./src/index.html', { read: false })
    .pipe(shell('aws s3 sync ./dist s3://' + bucket[getEnv()] +' --delete'+ exclude +' --profile '+ AWS_PROFILE));
});


/**
 * Invalidate CloudFront cache
 * Must allow this command manually before using: aws configure set preview.cloudfront true
 * use --local for clearing from your local dev environment
 */
gulp.task('cf', function() {
  // gulp needs something for src, so the file doesn't matter as long as it exists
  return gulp.src('./src/index.html', { read: false })
    .pipe(shell('aws cloudfront create-invalidation --paths "/*" --distribution-id '+ cloudfront[getEnv()] +' --profile '+ AWS_PROFILE));
});


// This compiles scss to css and serves the source files for debugging.
gulp.task('default', ['sass-src', 'webserver-src', 'watch-src']);

// This compiles everything to the dist directory and serves from there so you can test against what will be deployed.
gulp.task('dist', ['sass', 'useref', 'inject:replace', 'copy-files',
  'webserver', 'watch'
]);

// This compiles to the dist directory to prep for deployment. Does not launch a webserver.
gulp.task('build', ['sass', 'useref', 'inject:replace', 'copy-files']);
