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

  var normalizeText = function(text){
    return text.replace(/(?:\r\n|\r|\n|\t|\\t|\\n)/g, '').trim();
  };

  var getTranslation = function(language, string){
    string = normalizeText(string);

    // Search for available translations
    for (var i in translations[language]) {
      var translation = translations[language][i];
      var normalized = normalizeText(translation.msgid);

      if (normalized === string) {
        var translationid = translation.msgid;
        if(translation.msgstr[0]){
          return translation.msgstr[0];
        }
      }
    }

    return string;
  };

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

        if(n.name.toLowerCase() === "translate"){
          // Search for available translations
          node.replaceWith(getTranslation(language, node.html()));
          return;
        }

        var attr = node.attr();

        // Loop through all translate attributes
        var translationExist = false;
        if (attr.hasOwnProperty('translate') && !attr.hasOwnProperty('translate-plural')) {
          node.removeAttr('translate');

          node.html(getTranslation(language, node.html()));
        }else if(attr.hasOwnProperty('translate') && attr.hasOwnProperty('translate-plural')){
          var singular = node.html();
          var plural = node.attr('translate-plural');
          var count = node.attr('translate-n');

          node.removeAttr('translate');
          node.removeAttr('translate-n');
          node.removeAttr('translate-plural');

          var singularTranslated = getTranslation(language, singular);
          var pluralTranslated = getTranslation(language, plural).replace('{{$count}}', '{}');

          var ngPluralize = '<ng-pluralize count="' + count + '" when="{\'one\': \'' + singularTranslated + '\', \'other\': \'' + pluralTranslated + '\'}"></ng-pluralize>';
          node.html(ngPluralize);
        }

        if(attr.hasOwnProperty('placeholder')){
          var placeholder = node.attr('placeholder');
          // Search for available translations
          node.attr('placeholder', getTranslation(language, placeholder));
        }

        // Loop through all attributes which matches regex: {{'string' | translate}}
        // @example <input type="text" placeholder="{{'string' | translate}}"/>
        // @see https://regex101.com/r/oS8lJ5/1
        var regex = /^{{\s?[\'\"](.*)[\'\"]\s?\|\s?translate}}$/;
        _.forEach(node[0].attribs, function (attribute, key) {
          var result = attribute.match(regex);
          if (result) {
            var translated = getTranslation(language, result[1]);
            node.attr(key, translated);
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
