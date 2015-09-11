'use strict';

var _ = require('lodash');
var cheerio = require('cheerio');
var fs = require('fs');
var PO = require('pofile');
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var glob = require('glob');

var pluginName = require('./package.json').name;

module.exports = function(poFiles) {
  poFiles = glob.sync(poFiles);

  var languages = _.map(poFiles, function(file) {
    return path.basename(file, '.po')
  });

  var parsedPoFiles = _.map(poFiles, function(poFile) {
    var content = fs.readFileSync(poFile);
    return PO.parse(content.toString());
  });

  var translations = _.zipObject(languages, _.pluck(parsedPoFiles, 'items'));

  return through.obj(function(file, enc, throughCallback) {
    if (file.isNull()) {
      this.push(file);
      throughCallback();
      return;
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(pluginName, 'Streaming not supported'));
      throughCallback();
      return;
    }

    var self = this;
    _.forEach(languages, function(language) {
      var newFile = file.clone();
      var $ = cheerio.load(newFile.contents, {decodeEntities: false});

      $('*').each(function (index, n) {
        var plural;
        var node = $(n);

        var attr = node.attr();

        // Loop through all translate attributes
        if (attr.hasOwnProperty('translate') && !attr.hasOwnProperty('translate-plural')) {
          plural = node.attr('translate-plural');
          node.removeAttr('translate');
          

          // Search for available translations
          var translationExist = false;
          for (var i in translations[language]) {
            var translation = translations[language][i];
            if (translation.msgid === node.text()) {
              	var translationid = translation.msgid;
	            if(translation.msgstr[0]){
	                translationExist = true;
	                node.text(translation.msgstr[0]);
	                break;
	            }
            }
          }
          	if(translationExist === false){
	            node.text(translationid);
	        }
        }
        // Loop through all attributes which matches regex: {{'string' | translate}}
        // @example <input type="text" placeholder="{{'string' | translate}}"/>
        // @see https://regex101.com/r/oS8lJ5/1
        var regex = /^{{\s?[\'\"](.*)[\'\"]\s?\|\s?translate}}$/;
        _.forEach(node[0].attribs, function (attribute, key) {
            var result = attribute.match(regex);
            if (result) {

            	var translationExist = false;
                // Search for available translations
                for (var i in translations[language]) {
                    var translation = translations[language][i];
                    if (translation.msgid === result[1]) {
                       var translationid = translation.msgid;
                        if(translation.msgstr[0]){
                            var keyTranslated = key;
                            translationExist = true;
                            node.attr(key, translation.msgstr[0]);
                            break;
                        }
                    }
                }
                if(translationExist === false){
                    node.attr(keyTranslated, translationid);
                }
            }
        }); 
      });

      newFile.contents = new Buffer($.html());
      newFile.path = language+'/'+path.basename(newFile.path);
      newFile.base = './';
      self.push(newFile);
    });

    throughCallback();
  });
};