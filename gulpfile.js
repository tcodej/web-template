var gulp = require('gulp'),
    useref = require('gulp-useref'),
    gulpif = require('gulp-if'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    clean = require('gulp-clean'),
    webserver = require('gulp-webserver'),
    shell = require('gulp-shell'),
    inject = require('gulp-inject-string'),
    argv = require('yargs').argv;

// These profiles should be set up in your ~/.aws/config with the proper keys
var AWS_PROFILE = '',
    AWS_CF_PROD = '',
    // these are used in the share meta data in index.html when building the site
    domains = {
      "test": "http://test.example.com",
      "prod": "http://www.example.com"
    };

/**
 * Clear out the dist directory
 */
gulp.task('clean', function () {
    return gulp.src('./dist', {read: false})
      .pipe(clean());
});

/**
 * Compile sass to the src/css directory. Let useref combine the files and copy to dist/css
 */
gulp.task('sass', function () {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sass.sync({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(gulp.dest('./src/css'));
});

/**
 * Compile sass but don't compress.
 */
gulp.task('sass-src', function () {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(gulp.dest('./src/css'));
});


/**
 * Minify, replace .js and .css paths in index.html using gulp-useref and copy to the dist directory
 */
gulp.task('useref', ['sass'], function () {
  return gulp.src('./src/*.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulp.dest('./dist'));
});

/**
 * Replace one string with another. Using it here to simply add a build date
 */
gulp.task('inject:replace', ['useref'], function() {
    var domain = domains['test'];
    if (argv.prod) {
      domain = domains['prod'];
    }
    var now = new Date();
    return gulp.src('./dist/index.html')
      .pipe(inject.replace('{inject:build-date}', now.toUTCString()))
      .pipe(inject.replace('{inject:domain}', domain))
      .pipe(gulp.dest('./dist'));
});

/**
 * Simply copy supporting files from src to dist
 */
gulp.task('copy-files', ['useref'], function() {
  // images
  gulp.src('./src/img/**/*')
    .pipe(gulp.dest('./dist/img'));

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
 * Watch for updates and recompile when serving the source files (gulp dev)
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
      open: false
    }));
});

gulp.task('webserver-src', function() {
  gulp.src('./src')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false
    }));
});

/**
 * Deploy the test S3 bucket
 * (You'll need the AWS CLI installed and a profile set up in ~/.aws/config)
 */
gulp.task('deploy', function() {

  // set this to what ever your default bucket will be
  var bucket = 'test.example.com';

  if (argv.prod) {
    bucket = 'www.example.com';
  }

  // gulp needs something for src, so the file doesn't matter as long as it exists
  return gulp.src('./src/index.html', {read: false})
    .pipe(shell('aws s3 cp ./dist s3://'+ bucket +' --recursive --profile '+ AWS_PROFILE));
});

/**
 * Invalidate CloudFront cache for test
 * Must allow this command manually before using: aws configure set preview.cloudfront true
 */
gulp.task('cf-prod', shell.task('aws cloudfront create-invalidation --paths "/*" --distribution-id '+ AWS_CF_PROD +' --profile '+ AWS_PROFILE));




// This compiles scss to css and serves the source files for debugging.
gulp.task('default', ['sass-src', 'webserver-src', 'watch-src']);

// This compiles everything to the dist directory and serves from there so you can test against what will be deployed.
gulp.task('dist', ['sass', 'useref', 'inject:replace', 'copy-files', 'webserver', 'watch']);

// This compiles to the dist directory to prep for deployment. Does not launch a webserver.
gulp.task('build', ['sass', 'useref', 'inject:replace', 'copy-files']);




