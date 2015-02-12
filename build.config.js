/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {

  appName: 'axefrontman',

  globs: {
    dist: './public/',
    root: './source/',
    assets: './source/assets/',
    htdocs: './source/htdocs/',
    app: './source/app/'
  },

  appFiles: {
    js: {
      watch: './source/**/*.js',
      files: [
        {
          input: './source/app/main.js',
          output: 'main.js'
        }
      ]
    },

    styl: {
      watch: './source/**/*.styl',
      files:[
        './source/assets/styles/app.styl'
      ],
      paths: [
        './source/app/',
        './source/common/'
      ]
    },

    templates: {
      files: [
        './source/app/index.hbs',
      ]
    },

    images: [ './source/assets/images/**' ],

    htdocs: [ './source/htdocs/**' ]
  },

  vendorFiles: {
    watch: './vendor/**/*.js',
    js: [
      './vendor/hook.min.js',
      './vendor/jquery-1.11.1.js',
    ]
  }
};
