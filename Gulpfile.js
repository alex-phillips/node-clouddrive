var gulp = require('gulp');
var async = require('async');
var jshint = require('gulp-jshint');
var babel = require('gulp-babel');

gulp.task('lint', function () {
  gulp.src([
    './*.js',
    './lib/*.js',
    './lib/**/*.js'
  ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('build', (finished) => {
  gulp.src([
      'lib/*.js',
      'lib/**/*.js'
    ])
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'build']);
