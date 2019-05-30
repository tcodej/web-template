## Basic web template

Test URL: http://test.example.com   
Live URL: https://www.example.com

Requires [node](https://nodejs.org/en/), [npm](https://www.npmjs.com/), [gulp](http://gulpjs.com/).

### Development commands

`$ npm install`  
Standard npm command to install required Node modules into the working directory.

`$ gulp`  
Compiles SCSS in the src directory and serves the files in the src directory at http://localhost:8000

`$ gulp dist`  
Compiles src files into the dist directory and serves the files in the dist directory at http://localhost:8000

`$ gulp build`  
Same as the dist command but doesn't launch a local web server. Use for building the site for launch. This will create a `dist` folder in the working directory and compile files to it.

`$ gulp clean`  
Optional command to delete the `dist` directory so it can be rebuilt from scratch.

See [package.json](./package.json) for the list of required Node modules.

See [gulpfile.js](./gulpfile.js) for more information about required variables and commands.

### Deployment

If you want to deploy from the command line (you don't have to), you must first have the [Amazon CLI](https://aws.amazon.com/cli/) installed and a profile set up with your AWS access keys in your local ~/.aws/config file. Change the profile name in [gulpfile.js](./gulpfile.js#L30) to match yours.

From the command line `cd` into your working directory for this repo.

(With the following commands, note that if you leave off '--test' it will default to the test environment.)  

1. `$ gulp clean` Deletes the existing ./dist directory. Optional.
2. `$ gulp build [--test|--production]` Compiles everything into the ./dist directory.
3. `$ gulp deploy [--test|--production]` Uploads the contents of the ./dist directory to the appropriate AWS bucket.
4. `$ gulp cf [--test|--production]` Creates a CloudFront invalidation request.

Optional helpful commands

1. `$ gulp deploy --quick [--test|--production]` Deploys the build directory but skips supporting media files that aren't often updated and have previously been deployed. Add to or remove from that list in [gulpfile.js](./gulpfile.js#L180)
2. `$ gulp lint` Javascript linter.


