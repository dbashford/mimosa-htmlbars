"use strict";

var fs = require( "fs" )
  , path = require( "path" )
  , logger = null
  , config = require( "./config" )
  , getExtensions = function ( mimosaConfig ) {
    logger = mimosaConfig.log;
    return mimosaConfig.htmlbars.extensions;
  }

var regularBoilerplate =
  "if (!HTMLBars) {\n" +
  "  throw new Error(\"HTMLBars library has not been passed in successfully\");\n" +
  "}\n\n" +
  "var templates = {};\n" +
  "var processEnv = function(env) {\n" +
  "  if (!env){env = {};}\n" +
  "  if (!env.dom){env.dom = new HTMLBars.DOMHelper();}\n" +
  "  if (!env.hooks){env.hooks = HTMLBars.hooks;}\n" +
  "  if (!env.partials){env.partials = templates;}\n" +
  "  return env;\n" +
  "}\n";

var prefix = function ( mimosaConfig, libraryPath ) {

  if ( mimosaConfig.template.wrapType === "amd" ) {
    logger.debug( "Building HTMLBars template file wrapper" );
    var jsDir = path.join( mimosaConfig.watch.sourceDir, mimosaConfig.watch.javascriptDir )
      , possibleHelperPaths = []
      , helperPaths
      , defineString
      , defines = []
      , params = [];

    // build list of possible paths for helper files
    mimosaConfig.extensions.javascript.forEach( function( ext ) {
      mimosaConfig.htmlbars.helpers.forEach( function( helperFile ) {
        possibleHelperPaths.push( path.join( jsDir, helperFile + "." + ext ) );
      });
    });

    // filter down to just those that exist
    helperPaths = possibleHelperPaths.filter( function ( p) {
      return fs.existsSync( p );
    });

    // set up initial define dependency array and the array export parameters
    defines.push( "'" + libraryPath + "'" );
    params.push( "HTMLBars" );

    // build proper define strings for each helper path
    helperPaths.forEach( function( helperPath ) {
      var helperDefine = helperPath.replace( mimosaConfig.watch.sourceDir, "" )
        .replace( /\\/g, "/" )
        .replace( /^\/?\w+\/|\.\w+$/g, "" );
      defines.push( "'" + helperDefine + "'" );
    });

    defineString = defines.join( "," );

    if ( logger.isDebug() ) {
      logger.debug( "Define string for HTMLBars templates [[ " + defineString + " ]]" );
    }

    return "define([" + defineString + "], function (" + (params.join(",")) + "){\n  " + regularBoilerplate;
  } else {
    if ( mimosaConfig.template.wrapType === "common" ) {
      return "var HTMLBars = require('" + mimosaConfig.template.commonLibPath + "');\n" + regularBoilerplate;
    }
  }

  return regularBoilerplate;
};

var suffix = function ( mimosaConfig ) {
  if ( mimosaConfig.template.wrapType === "amd" ) {
    return "return templates; });";
  } else {
    if ( mimosaConfig.template.wrapType === "common" ) {
      return "\nmodule.exports = templates;";
    }
  }

  return "";
};

var compile = function ( mimosaConfig, file, cb) {
  var output, error;

  try {
    output = mimosaConfig.htmlbars.lib.compileSpec( file.inputFileText );
    output = output.replace( /var dom = env.dom/g, "env = processEnv(env);var dom = env.dom" );
  } catch ( err ) {
    error = err;
  }

  cb( error, output );
};

module.exports = {
  name: "htmlbars",
  compilerType: "template",
  clientLibrary: path.join( __dirname, "client", "htmlbars.js" ),
  compile: compile,
  suffix: suffix,
  prefix: prefix,
  extensions: getExtensions,
  defaults: config.defaults,
  placeholder: config.placeholder,
  validate: config.validate
};
