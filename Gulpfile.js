var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('lint', function () {
  gulp.src([
    './*.js',
    './bin/*.js',
    './lib/*.js',
    './lib/Cache/*.js',
    './lib/Commands/*.js'
  ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('default', ['lint']);
