mimosa-html
===========

## Overview

This module targets [HTMLBars](https://github.com/tildeio/htmlbars) without Ember. If you are using HTMLBars with Ember, you probably want [mimosa-ember-htmlbars](https://github.com/dbashford/mimosa-ember-htmlbars) (coming soon).

For more information regarding Mimosa, see http://mimosa.io

Note: [HTMLBars](https://github.com/tildeio/htmlbars) is still under heavy development, check back for updates!

## Usage

Add `'htmlbars'` to your list of modules.  That's all!  Mimosa will install the module for you when you start `mimosa watch` or `mimosa build`.

## Functionality

This module will compile HTMLBars files during `mimosa watch` and `mimosa build`.

This module utilizes all of the built-in template behavior that comes with Mimosa's basic template compiler.  See the [mimosa website](http://mimosa.io/compilers.html#mt) for more information about how templates are treated or check out the various [`template` configuration options](http://mimosa.io/configuration.html#templates).

## Default Config

```coffeescript
htmlbars:
  lib: undefined
  extensions: ["hbs", "htmlbars"]
  helpers:["app/template/htmlbars-helpers"]
```

* `lib`: You may want to use this module but may want a specific version of HTMLBars. Using the `lib` property you can provide a specific version of HTMLBars if the one being used by this module isn't to your liking. To provide a specific version, you must have it `npm install`ed into your project and then provide it to `lib`. For instance: `lib: require('htmlbars')`.
* `extensions`: an array of strings, the extensions of your HTMLBars files.
* `helpers`: an array of strings, the paths from `watch.javascriptDir` to the files containing HTMLBars helper/partial registrations

## Creating runtime

* Install and build htmlbars
* `npm install -g esperanto`
* Modify `htmlbars-runtime.js`
```javascript
import {Morph, DOMHelper} from './morph';
import hooks from 'htmlbars-runtime/hooks';
import helpers from 'htmlbars-runtime/helpers';

export {
  hooks,
  helpers,
  Morph,
  DOMHelper
};
```
* Run esperanto: `esperanto -b -i htmlbars-runtime.js -o htmlbars-runtime-bundle.js --strict`
* `htmlbars-runtime-bundle.js` is your new AMD compliant browser HTMLBars library.