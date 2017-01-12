## Basic front-end template

Test URL: http://test.example.com  
Live URL: http://www.example.com

Requires [node](https://nodejs.org/en/), [npm](https://www.npmjs.com/), [gulp](http://gulpjs.com/).

### Development commands

`$ npm install`

`$ gulp`  
Compiles SCSS in the src directory and serves the files in the src directory at http://localhost:8000

`$ gulp dist`  
Compiles src files into the dist directory and serves the files in the dist directory at http://localhost:8000

`$ gulp build`  
Same as the dist command but doesn't launch a local web server. Use for building the site for launch.

`$ gulp clean`  
Optional command to delete the dist directory so it can be rebuilt.

### Deployment

If you want to deploy from the command line (you don't have to), you must first have the [Amazon CLI](https://aws.amazon.com/cli/) installed and a profile set up with your AWS access keys in your local ~/.aws/config file. Change the profile name in [gulpfile.js](./gulpfile.js#L13) to match yours.

From the command line `cd` into your working directory for this repo.

(With the following commands, note that if you leave off '--test' it will default to the test environment.)  

1. `$ gulp clean` Deletes the existing ./dist directory. Optional.
2. `$ gulp build --test` or `gulp build --prod` Compiles everything into the ./dist directory.
3. `$ gulp deploy --test` or `gulp deploy --prod` Uploads the contents of the ./dist directory to the test or prod AWS bucket.
4. `$ gulp cf-prod` Creates a CloudFront invalidation request.