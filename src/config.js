"use strict";

exports.defaults = function() {
  return {
    htmlbars: {
      extensions: ["hbs", "htmlbars"],
      helpers:["app/template/htmlbars-helpers"]
    }
  };
};

exports.placeholder = function() {
  return "\t\n\n" +
         "  htmlbars:              # config settings for the HTMLBars compiler module\n" +
         "    lib: undefined         # use this property to provide a specific version of HTMLBars\n" +
         "    extensions: [\"hbs\", \"htmlbars\"]  # default extensions for HTMLBars files\n" +
         "    helpers:[\"app/template/htmlbars-helpers\"]  # the paths from watch.javascriptDir to\n" +
         "                           # the files containing HTMLBars helper/partial registrations\n";
};

exports.validate = function( config, validators ) {
  var errors = [];

  if ( validators.ifExistsIsObject( errors, "htmlbars config", config.htmlbars ) ) {

    if ( !config.htmlbars.lib ) {
      config.htmlbars.lib = require( "htmlbars" );
    }

    if ( validators.isArrayOfStringsMustExist( errors, "htmlbars.extensions", config.htmlbars.extensions ) ) {
      if (config.htmlbars.extensions.length === 0) {
        errors.push( "htmlbars.extensions cannot be an empty array");
      }
    }

    validators.ifExistsIsArrayOfStrings( errors, "htmlbars.helpers", config.htmlbars.helpers );

  }

  return errors;
};
