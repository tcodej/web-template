// todo: fully convert this to gulp 4

const gulp = require('gulp'),
      useref = require('gulp-useref'),
      gulpif = require('gulp-if'),
      uglify = require('gulp-uglify'),
      htmlmin = require('gulp-htmlmin'),
      sass = require('gulp-sass'),
      sourcemaps = require('gulp-sourcemaps'),
      del = require('del');
      webserver = require('gulp-webserver'),
      exec = require('child_process').exec,
      inject = require('gulp-inject-string'),
      argv = require('yargs').argv,
      jshint = require('gulp-jshint'),
      rename = require('gulp-rename'),
      touch = require('gulp-touch-fd');

  // return environment based on args --test --production
  const getEnv = () => {
    if (argv.test) return 'test';
    if (argv.prod || argv.production) return 'production';
    // test is default
    return 'test';
  };


// These profiles should be set up in your ~/.aws/config with the proper keys
const AWS_PROFILE = 'YOUR_PROFILE',

    // title, description and fbAppID used for page meta tags
    title = 'Web Template',
    description = 'Description meta tag.',
    cacheBuster = '?v=1',

    fbAppID = {
      'test': 'XXXXXXXXXX',
      'production': 'XXXXXXXXXX'
    },

    googleAnalytics = {
      'test': 'UA-XXXXXXXX-X',
      'production': 'UA-XXXXXXXX-X'
    },

    cloudfront = {
      'test': 'XXXXXXXXXXXXXX',
      'production': 'XXXXXXXXXXXXXX'
    },

    // these are used in the share meta data in index.html when building the site
    domain = {
      'test': 'http://test.example.com',
      'production': 'https://www.example.com'
    },
    
    bucket = {
      'test': 'osg',
      'production': 'www.example.com'
    },

    // if true, index.html will be overwritten by the content in maintenance.html before deploying
    maintenanceMode = {
      'test': false,
      'production': false
    };



/**
 * Clear out the dist directory and compiled css in the src directory
 */
gulp.task('clean', () => {
  return del(['./src/css/**/*.css', './dist']);
});


/**
 * Compile sass to the src/css directory. Let useref combine the files and copy to dist/css
 */
gulp.task('sass', () => {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sass.sync({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(gulp.dest('./src/css'));
});


/**
 * Compile sass but don't compress.
 */
gulp.task('sass-src', () => {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./src/css'));
});


/**
 * Minify, replace .js and .css paths in index.html using gulp-useref and copy to the dist directory
 */
gulp.task('useref', () => {
  return gulp.src('./src/*.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulp.dest('./dist'))
    .pipe(touch());
});


/**
 * Replace one string with another when parsing html files for build.
 */
gulp.task('inject:replace', () => {
    var now = Date.now();

    return gulp.src('./dist/**/*.html')
      .pipe(inject.replace('{inject:env}', getEnv()))
      .pipe(inject.replace('{inject:build-date}', new Date()))
      .pipe(inject.replace('{inject:cache-buster}', cacheBuster))
      .pipe(inject.replace('{inject:title}', title))
      .pipe(inject.replace('{inject:description}', description))
      .pipe(inject.replace('{inject:domain}', domain[getEnv()]))
      .pipe(inject.replace('UA-XXXXXXXX-X', googleAnalytics[getEnv()]))
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
gulp.task('copy-files', (done) => {
  // list of folders in src directory that should be copied directly to dist when building
  var folders = ['img', 'fonts', 'json', 'templates'];

  for (var folder of folders) {
    gulp.src('./src/' + folder + '/**/*')
      .pipe(gulp.dest('./dist/' + folder))
      .pipe(touch());
  }

  // list of individual files in src directory that should be copied directly to dist when building
  gulp.src(['./src/favicon.ico'])
    .pipe(gulp.dest('./dist'))
    .pipe(touch());

  // robots.txt is different per environment, so copy and rename
  gulp.src('./src/robots-'+ getEnv() +'.txt')
    .pipe(rename('robots.txt'))
    .pipe(gulp.dest('./dist'))
    .pipe(touch());

  done();
});


/**
 * Turn on maintenance mode - see the var mantenanceMode above
 */
gulp.task('maintenance', (done) => {
  if (maintenanceMode[getEnv()] === true) {
    console.log('Maintenance mode is on for '+ getEnv());

    gulp.src('./dist/maintenance.html')
      .pipe(rename('index.html'))
      .pipe(touch())
      .pipe(gulp.dest('./dist'));
  }

  done();
});



/**
 * Watch for updates and recompile
 */
gulp.task('watch', (done) => {
  gulp.watch('./src/*.html', gulp.series('useref', 'inject:replace'));
  gulp.watch('./src/js/*.js', gulp.series('useref'));
  gulp.watch('./src/scss/**/*.scss', gulp.series('sass', 'useref'));

  done();
});



/**
 * Watch for updates and recompile when serving the source files
 */
gulp.task('watchSrc', (done) => {
  gulp.watch('./src/scss/**/*.scss', gulp.series('sass-src'));

  done();
});


/**
 * Run this to periodically sanity check your js formatting
 */
gulp.task('lint', () => {
  return gulp.src(['./src/js/*.js', './gulpfile.js', '../lambda/*.js'])
    .pipe(jshint({ esversion: 6 }))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});


/**
 * If you don't want to use your own webserver, use this
 */
gulp.task('webserver', (done) => {
  gulp.src('./dist')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      port: 8000
    }));

  done();
});


gulp.task('webserver-src', (done) => {
  gulp.src('./src')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      port: 8000
    }));

  done();
});


/**
 * Local dev command line deploy
 * You'll need the AWS CLI installed and a profile set up in ~/.aws/config
 */
gulp.task('deploy', () => {
  // when testing, exclude some non-changing items to save upload time
  let exclude = '';

  if (argv.quick) {
    ['fonts', 'img'].forEach(function(folder) {
      exclude += ' --exclude "'+ folder +'/*"';
    });

    console.log(exclude)
  }

  return exec('aws s3 sync ./dist s3://' + bucket[getEnv()] +' --delete'+ exclude +' --profile '+ AWS_PROFILE,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
    }
  );
});


/**
 * Invalidate CloudFront cache
 * Must allow this command manually before using: aws configure set preview.cloudfront true
 */
gulp.task('cf', () => {
  return exec('aws cloudfront create-invalidation --paths "/*" --distribution-id '+ cloudfront[getEnv()] +' --profile '+ AWS_PROFILE,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
    }
  );
});


// This compiles scss to css and serves the source files for debugging.
gulp.task('default', gulp.series('sass-src', 'webserver-src', 'watchSrc'));

// This compiles everything to the dist directory and serves from there so you can test against what will be deployed.
gulp.task('dist', gulp.series('sass', 'useref', 'copy-files', 'inject:replace', 'maintenance', 'webserver', 'watch'));

// This compiles to the dist directory to prep for deployment. Does not launch a webserver.
gulp.task('build', gulp.series('sass', 'useref', 'copy-files', 'inject:replace', 'maintenance'));
