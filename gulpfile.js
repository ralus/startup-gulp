var gulp = require('gulp'),
    gulpif   = require('gulp-if'),
    
    stylus   = require('gulp-stylus'),
    nib   = require('nib'),
    autoprefixer = require('autoprefixer-stylus'),
    minifycss = require('gulp-minify-css'),

    changed = require('gulp-changed'),
    imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache'),

    watchify = require('watchify'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),

    notify = require('gulp-notify'),
    plumber = require('gulp-plumber'),
    stripDebug = require('gulp-strip-debug'),
    livereload = require('gulp-livereload'),

    del = require('del'),
    join = require('path').join,

    PRODUCTION = process.env.ENV === 'production',
    SVR_PORT = 3333,
    LR_PORT = 35729;

var livereloadServer;
var defaultAssets = './app/assets/';
var paths = {
  assets: defaultAssets,
  styles: join(defaultAssets, 'styles/'),
  images: join(defaultAssets, 'images/**'),
  scripts: join(defaultAssets, 'scripts/'),
  watch_styles: join(defaultAssets, 'styles/**/*.styl'),
  watch_scripts: join(defaultAssets, 'scripts/**/*.js'),
  watch_images: join(defaultAssets, 'images/**/*'),
  watch_vendor: 'vendor/**/*.js',
  htdocs: join('./app', 'htdocs/**'),
  vendor: './vendor/**/*.js',
  init: './app/init.js',
  dist: './public/'
}

var javascripts = [
  {
    input: [paths.init],
    output: 'app.js',
    destination: join(paths.dist, 'js/')
  }
]
 
function createBundle(options) {

  bundler = browserify({
    entries: options.input,
    extensions: options.extensions || [],
    debug: !PRODUCTION
  });

  rebundle = function () {
    var startTime = new Date().getTime();
    bundler.bundle()
    .on('error', errorHandler)
    .pipe(gulpif(PRODUCTION, stripDebug()))
    .pipe(source(options.output))
    .pipe(gulp.dest(options.destination))
    .on('end', function(){
      var time = (new Date().getTime() - startTime) / 1000;
      console.log(options.output, "was browserified:", (time + 's'));
      if (!!livereloadServer) {
        livereloadServer.changed({path:options.output});
      }
    })
    .pipe(notify({message: "Browserify completed" }))
  }
 
  if (global.isWatching) {
    bundler = watchify(bundler);
    bundler.on('update', rebundle);
  }
 
  rebundle();
}
 
function createBundles(bundles) {
  bundles.forEach(function (bundle) {
    createBundle({
      input : bundle.input,
      output : bundle.output,
      extensions : bundle.extensions || [],
      destination : bundle.destination
    });
  });
}

function errorHandler() {
  notify.onError({
    title: 'Compile Error',
    message: "<%= error.message %>"
  }).apply(this, arguments);
  // prevent gulp from hanging
  this.emit('end');
}

gulp.task('browserify', function(cb) {
  return createBundles(javascripts);
});

gulp.task('vendor', function(cb) {
  return gulp.src(paths.vendor)
    .pipe(concat("vendor.js"))
    .pipe(gulpif(PRODUCTION, uglify()))
    .pipe(gulp.dest(join(paths.dist, "js/")))
    .pipe(notify({ message: 'Vendors task complete' }))
});

gulp.task('stylus', function(cb) {
  return gulp.src(join(paths.styles, 'app.styl'))
    .pipe(stylus({ 
      use:[
        autoprefixer({browsers:['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4']}),
        nib()
      ],
      errors:true, 
      sourcemap: {inline: true} 
    }))
    .on('error', errorHandler)
    .pipe(gulpif(PRODUCTION, minifycss()))
    .pipe(gulp.dest(join(paths.dist, 'css/')))
    .pipe(notify({ message: 'Styles task complete' }))
});

gulp.task('images', function(cb) {
  return gulp.src(paths.images)
    .pipe(plumber({
      errorHandler: errorHandler
    }))
    .pipe(changed(join(paths.dist, "images")))
    .pipe(imagemin())
    .pipe(gulp.dest(join(paths.dist, "images")))
    .pipe(notify({ message: 'Images task complete' }))
});

gulp.task('htdocs', function(cb) {
  return gulp.src(paths.htdocs)
    .pipe(gulp.dest(paths.dist))
    .pipe(notify({ message: 'Htdocs task complete' }))
});

gulp.task('clean', function(cb) {
  del([paths.dist], cb);
});

gulp.task('setWatch', function(cb) {
  global.isWatching = true;
  cb();
});

gulp.task('watch', ['setWatch', 'server'], function(cb) {
  livereloadServer = livereload();

  gulp.start('build');
  gulp.watch(paths.watch_styles, ['stylus']);
  gulp.watch(paths.watch_images, ['images']);
  gulp.watch(paths.watch_vendor, ['vendor']);
  gulp.watch(paths.htdocs, ['htdocs']);
  gulp.watch(join(paths.htdocs, "**"), livereloadServer.changed);
  gulp.watch(paths.watch_styles, livereloadServer.changed);
  gulp.watch(paths.watch_images, livereloadServer.changed);
  gulp.watch(paths.watch_vendor, livereloadServer.changed);
});

gulp.task('server', function(cb) {
  var express = require('express');
  var app = express();
  app.use(require('connect-livereload')({
    port: LR_PORT
  }));
  app.use(express.static(paths.dist));
  app.listen(SVR_PORT);

  console.log('Server running at: http://localhost:' + SVR_PORT + '/');

  cb();
});

gulp.task('build', ['htdocs', 'stylus', 'vendor', 'images', 'browserify']);
gulp.task('default', ['watch', 'server']);