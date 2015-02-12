var gulp = require('gulp'),
    YAML = require('yamljs'),
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
    connect = require('gulp-connect'),

    handlebars = require('gulp-compile-handlebars'),
    rename = require('gulp-rename')

    del = require('del'),
    join = require('path').join,

    PRODUCTION = process.env.ENV === 'production',
    SVR_PORT = 3333;

var config = require('./build.config.js');
var appName = config.appName || 'project';

gulp.task('browserify', ['templates'], function(cb) {
  return createBundles(config.appFiles.js.files);
});

gulp.task('vendor', function(cb){
  return gulp.src(config.vendorFiles.js)
    .pipe(concat('vendor.js'))
    .pipe(gulpif(PRODUCTION, uglify()))
    .pipe(gulp.dest(join(config.globs.dist, 'js/')));
});

gulp.task('templates', function(cb) {
  var options = {
    ignorePartials: true, //ignores the unknown footer2 partial in the handlebars template, defaults to false
    batch : [config.globs.root],
    helpers : {
      stringify_json: function(obj) {
        return JSON.stringify(obj);
      }
    }
  }

  var app = YAML.load(join(config.globs.app, 'app.yaml'));
  app.config = YAML.load(join(config.globs.app, 'config.yaml'));

  return gulp.src(config.appFiles.templates.files)
    .pipe(handlebars(app, options))
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./public'))
    .pipe(connect.reload());
});

gulp.task('stylus', function(cb) {
  return gulp.src(config.appFiles.styl.files)
    .pipe(stylus({
      use:[
        autoprefixer({browsers:['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4']}),
        nib()
      ],
      errors:true,
      paths: config.appFiles.styl.paths,
      sourcemap: {inline: true}
    }))
    .on('error', errorHandler)
    .pipe(gulpif(PRODUCTION, minifycss()))
    .pipe(gulp.dest(join(config.globs.dist, 'css/')))
    .pipe(notify({ message: 'Styles task complete' }))
});

gulp.task('images', function(cb) {
  return gulp.src(config.appFiles.images)
    .pipe(plumber({
      errorHandler: errorHandler
    }))
    .pipe(changed(join(config.globs.dist, 'images')))
    .pipe(imagemin())
    .pipe(gulp.dest(join(config.globs.dist, 'images')))
    .pipe(notify({ message: 'Images task complete' }))
});

gulp.task('htdocs', function(cb) {
  return gulp.src(config.appFiles.htdocs)
    .pipe(gulp.dest(config.globs.dist))
    .pipe(notify({ message: 'Htdocs task complete' }))
});

gulp.task('clean', function(cb) {
  del([config.globs.dist], cb);
});

gulp.task('setWatch', function(cb) {
  global.isWatching = true;
  cb();
});

gulp.task('watch', ['clean', 'setWatch', 'server'], function(cb) {
  gulp.start('build');
  gulp.watch(config.appFiles.styl.watch, ['stylus']);
  gulp.watch(config.appFiles.templates.files, ['templates']);
  gulp.watch(config.appFiles.htdocs, ['htdocs']);
  gulp.watch(config.appFiles.images, ['images']);
  gulp.watch(config.vendorFiles.watch, ['vendor']);
  gulp.watch([].concat(
    config.appFiles.styl.watch,
    config.appFiles.js.watch,
    config.appFiles.templates.files,
    config.appFiles.htdocs,
    config.appFiles.images,
    config.vendorFiles.watch
  ), connect.reload);
  cb();
});

gulp.task('server', function(cb) {
  connect.server({
    root: 'public',
    livereload: true,
    port: SVR_PORT
  });
  cb();
});

gulp.task('build', ['htdocs', 'stylus', 'vendor', 'browserify', 'images']);
gulp.task('default', ['watch', 'server']);

// Helpers functions

function createBundle(options) {

  var bundler = browserify({
    entries: options.input,
    extensions: options.extensions || [],
    debug: !PRODUCTION
  });

  var rebundle = function (sourceBundler) {
    var startTime = new Date().getTime();
    sourceBundler.bundle()
    .on('error', errorHandler)
    .on('end', function(){
      var time = (new Date().getTime() - startTime) / 1000;
      notify({message: options.output + 'was browserified:' + (time + 's') });
      connect.reload();
    })
    .pipe(gulpif(PRODUCTION, stripDebug()))
    .pipe(source(options.output))
    .pipe(gulp.dest(join(config.globs.dist, 'js/')))
    .pipe(notify({message: 'Browserify completed' }))
  }

  if (global.isWatching) {
    var bundlerWatch = watchify(bundler);
    bundlerWatch.on('update', function(){
      rebundle(bundler);
    });
  }

  rebundle(bundler);
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

function errorHandler(error) {
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, arguments);

  // prevent gulp from hanging
  this.emit('end');
}