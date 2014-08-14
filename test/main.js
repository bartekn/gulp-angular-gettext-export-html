'use strict';

var _ = require('lodash');
var gulp = require('gulp');
var gettext_export_html = require('../index.js');
var glob = require('glob');
var del = require('del');
var fs = require('fs');
var expect = require('chai').expect;

describe('gulp-angular-gettext-export-html', function () {
  describe('gettext_export_html', function () {
    it('should translate templates', function (done) {
      gulp.src('test/templates/*.html')
        .pipe(gettext_export_html('test/po/*.po'))
        .pipe(gulp.dest('test/translated'))
        .on('end', function checkDiff() {
          // Compare files
          var expectedFiles = glob.sync('test/expected/**/*.html');
          var translatedFiles = _.map(expectedFiles, function(filename) {
            return filename.replace('test/expected', 'test/translated');
          });

          for (var i in expectedFiles) {
            var expected = fs.readFileSync(expectedFiles[i]).toString();
            var translated = fs.readFileSync(translatedFiles[i]).toString();
            expect(translated).to.equal(expected);
          }

          // Remove translated files
          del.sync('test/translated');
          done();
        });
    });
  });
});