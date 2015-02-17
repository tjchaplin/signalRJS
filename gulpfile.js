var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
  gulp.src(['./lib/**/*.js',
            './tests/**/*.js',
            '!./lib/hubs/template*.js',
            '!./tests/hubs/expectedHubOutput.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test',['lint'],function(){
    gulp.src(['tests/**/*.js','!./tests/hubs/expectedHubOutput.js'])
        .pipe(mocha({ reporter: 'spec' }));
});

gulp.task('test.local',['lint'],function(){
    gulp.src(['tests/**/*.js','!./tests/hubs/expectedHubOutput.js'])
        .pipe(mocha({ reporter: 'spec' }))
        .on('error', gutil.log);
});