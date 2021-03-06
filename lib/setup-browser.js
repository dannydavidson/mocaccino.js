/*global Mocha, window*/
/*
 * mocaccino.js
 *
 * Copyright (c) 2014 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

require('brout');

Mocha.reporters.Base.window.width = JSON.parse('{{WINDOW_WIDTH}}');
Mocha.reporters.Base.symbols.dot = '.';
var mocha = new Mocha();
mocha.reporter('{{REPORTER}}');
mocha.ui('{{UI}}');
mocha.timeout('{{TIMEOUT}}');
mocha.suite.emit('pre-require', window, '', mocha);
var t = new Date().getTime();
var y = Number('{{YIELDS}}');
mocha.suite.afterEach(function (done) {
  var now = new Date().getTime();
  if (now - t > y) {
    t = now;
    process.nextTick(done);
  } else {
    done();
  }
});

setTimeout(function () {
  Mocha.process.stdout = process.stdout;
  mocha.run(function (errs) {
    process.exit(errs ? 1 : 0);
  });
}, 1);
