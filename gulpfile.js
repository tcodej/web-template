const gulp = require('gulp');
const useref = require('gulp-useref');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const htmlmin = require('gulp-htmlmin');
const sass = require('gulp-sass')(require('node-sass'));
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const clean = require('gulp-clean');
const webserver = require('gulp-webserver');
const shell = require('gulp-shell');
const inject = require('gulp-inject-string');
const argv = require('yargs').argv;
const lazypipe = require('lazypipe');

// These profiles should be set up in your ~/.aws/config with the proper keys
const AWS_PROFILE = 'YOUR_PROFILE_NAME',

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
gulp.task('clean', () => {
  return del([
      './src/css/**/*.css',
      './dist/*'
    ]);
});

/**
 * Compile sass to the src/css directory. Let useref combine the files and copy to dist/css
 */
gulp.task('sass', () => {
  return gulp.src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass.sync({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(sourcemaps.write())
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
    .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))
    .pipe(gulpif('*.js', uglify()))
    .pipe(sourcemaps.write('maps'))
    .on('error', function (err) {
      console.log(err.toString());
    })
    .pipe(gulp.dest('./dist'));
});


/**
 * Replace one string with another when parsing html files for build.
 */
gulp.task('inject:replace', () => {
  let env = 'test'

  if (argv.prod || argv.production) {
    env = 'production';
  }

  let now = Date.now();

  gulp.src('./dist/**/*.js')
    .pipe(inject.replace('{inject:now}', now))
    .pipe(gulp.dest('./dist'));

  return gulp.src('./dist/**/*.html')
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
    }))
    .pipe(gulp.dest('./dist'));
});


/**
 * Simply copy supporting files from src to dist
 */
gulp.task('copy-files', (done) => {
  // list of folders in src directory that should be copied directly to dist when building
  const folders = ['img', 'fonts'];
  let copied = 0;

  // list of individual files in src directory that should be copied directly to dist when building
  gulp.src(['./src/favicon.ico', './src/robots.txt'])
    .pipe(gulp.dest('./dist'));

  for (let folder of folders) {
    gulp.src('./src/' + folder + '/**/*')
      .pipe(gulp.dest('./dist/' + folder))
      .on('end', function() {
        copied++;

        if (copied == folders.length) {
          done();
        }
      });
  }
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
gulp.task('watch-src', (done) => {
  gulp.watch('./src/scss/**/*.scss', gulp.series('sass-src'));

  done();
});

// gulp.task('lint', () => {
//   return gulp.src(['./src/js/*.js', './gulpfile.js', './lang/gulpfile.js'])
//     .pipe(jshint({ esversion: 6 }))
//     .pipe(jshint.reporter('jshint-stylish'))
//     .pipe(jshint.reporter('fail'));
// });

// /**
//  * If you don't want to use your own webserver, use this
//  */
gulp.task('webserver', (done) => {
  gulp.src('./dist')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      host: '0.0.0.0',
      port: 8000,
      https: false
    }));

  done();
});

gulp.task('webserver-src', (done) => {
  gulp.src('./src')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: false,
      host: '0.0.0.0',
      port: 8000,
      https: false
    }));

  done();
});


// /**
//  * Deploy the test S3 bucket
//  * (You'll need the AWS CLI installed and a profile set up in ~/.aws/config)
//  */
// gulp.task('deploy', function() {

//   // set this to what ever your default bucket will be
//   var bucket = 'test.example.com';

//   if (argv.prod || argv.production) {
//     bucket = 'www.example.com';
//   }

//   // option to exclude some non-changing items to save upload time
//   var exclude = '';
//   if (argv.quick) {
//     exclude = '--exclude "img/*" --exclude "fonts/*" ';
//   }

//   // gulp needs something for src, so the file doesn't matter as long as it exists
//   return gulp.src('./src/index.html', {
//       read: false
//     })
//     .pipe(shell('aws s3 cp ./dist s3://'+ bucket +' --recursive '+ exclude +' --profile '+ AWS_PROFILE));
// });

// /**
//  * Invalidate CloudFront cache
//  * Must allow this command manually before using: aws configure set preview.cloudfront true
//  */
// gulp.task('cf', function() {
//   var env = 'test'

//   if (argv.prod || argv.production) {
//     env = 'production';
//   }

//   // gulp needs something for src, so the file doesn't matter as long as it exists
//   return gulp.src('./src/index.html', {
//       read: false
//     })
//     .pipe(shell('aws cloudfront create-invalidation --paths "/*" --distribution-id '+ cloundfront[env] +' --profile '));
// });



// This compiles scss to css and serves the source files for debugging.
gulp.task('default', gulp.series('sass-src', 'webserver-src', 'watch-src'));

// // This compiles everything to the dist directory and serves from there so you can test against what will be deployed.
gulp.task('dist', gulp.series('sass', 'useref', 'inject:replace', 'copy-files', 'webserver', 'watch'));

// // This compiles to the dist directory to prep for deployment. Does not launch a webserver.
gulp.task('build', gulp.series('sass', 'useref', 'inject:replace', 'copy-files'));
