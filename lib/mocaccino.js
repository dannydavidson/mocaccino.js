/*
 * mocaccino.js
 *
 * Copyright (c) 2014 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var path    = require('path');
var fs      = require('fs');
var through = require('through2');
var resolve = require('resolve');
var listen  = require('listen');


module.exports = function (b, opts) {
  if (!opts) {
    opts = {};
  }
  var reporter = opts.reporter || opts.R || 'tap';
  var yields = opts.yields || opts.y || 250;
  var ui = opts.ui || opts.U || 'bdd';
  var timeout = opts.timeout || opts.t || 2000;
  var setupFile;
  var listener = listen();
  if (opts.node) {
    b.exclude('mocha');
    setupFile = 'setup-node.js';
  } else {
    setupFile = 'setup-browser.js';
    var broutFile = resolve.sync('brout', {
      baseDir: __dirname,
      packageFilter: function (pkg) {
        return { main : pkg.browser };
      }
    });
    var broutPath = path.relative(process.cwd(), broutFile);
    b.require('./' + broutPath.replace(/\\/g, '/'), {
      expose : 'brout'
    });
    fs.readFile(resolve.sync('mocha/mocha'), 'utf8', listener('mocha'));
  }
  setupFile = path.join(__dirname, setupFile);

  var onSetupFile = listener('setup');
  fs.readFile(setupFile, 'utf8', function (err, content) {
    if (err) {
      throw err;
    }
    var windowWidth = process.stdout.getWindowSize ?
        process.stdout.getWindowSize()[0] : 80;
    var setupContent = content
      .replace('{{WINDOW_WIDTH}}', JSON.stringify(windowWidth))
      .replace('{{REPORTER}}', reporter)
      .replace('{{YIELDS}}', yields)
      .replace('{{UI}}', ui)
      .replace('\'{{TIMEOUT}}\'', timeout);
    onSetupFile(null, setupContent);
  });

  if (!opts.node) {
    b.transform(function () {
      var s = '';
      return through(function (chunk, enc, next) {
        /*jslint unparam: true*/
        s += chunk;
        var p = s.lastIndexOf('\n');
        if (p !== -1) {
          this.push(
            s.substring(0, p + 1).replace(/require\(['"]mocha["']\)/g, 'Mocha')
          );
          s = s.substring(p + 1);
        }
        next();
      }, function (next) {
        if (s) {
          this.push(s);
        }
        next();
      });
    });
  }

  var setupSource;
  var reset = false;

  function createSetupEntry() {
    return {
      id     : 'mocaccino-setup',
      file   : setupFile,
      entry  : true,
      order  : 0,
      source : setupSource,
      deps   : {}
    };
  }

  function apply() {
    b.pipeline.get('deps').push(through.obj(function (row, enc, next) {
      /*jslint unparam: true*/
      if (row.entry) {
        row.deps['mocaccino-setup'] = setupFile;
        row.order++;
      }
      this.push(row);
      if (listener) {
        var self = this;
        listener.then(function (err, res) {
          setupSource = (res.mocha || '') + res.setup;
          self.push(createSetupEntry());
          next();
        });
        listener = null;
      } else if (reset) {
        this.push(createSetupEntry());
        reset = false;
        next();
      } else {
        next();
      }
    }));
  }

  apply();
  b.on('reset', function () {
    reset = true;
    apply();
  });

};
