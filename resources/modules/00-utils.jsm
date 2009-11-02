
/*
 * In this utils file,
 * global vars and funcs are exported,
 * unless the name is prefixed with "_".
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const Application      = Cc["@mozilla.org/fuel/application;1"].
                           getService(Ci.fuelIApplication);
const IOService        = Cc["@mozilla.org/network/io-service;1"].
                           getService(Ci.nsIIOService);
const URLParser        = Cc["@mozilla.org/network/url-parser;1?auth=no"]
                           .getService(Ci.nsIURLParser);
const WindowMediator   = Cc["@mozilla.org/appshell/window-mediator;1"].
                           getService(Ci.nsIWindowMediator);
const PrefService      = Cc["@mozilla.org/preferences-service;1"].
                           getService(Ci.nsIPrefService).
                           QueryInterface(Ci.nsIPrefBranch).
                           QueryInterface(Ci.nsIPrefBranch2);
const StorageService   = Cc["@mozilla.org/storage/service;1"].
                           getService(Ci.mozIStorageService);
const StorageStatementWrapper = Components.Constructor(
                                  "@mozilla.org/storage/statement-wrapper;1",
                                  "mozIStorageStatementWrapper",
                                  "initialize");

const _MODULE_BASE_URI = "resource://karaage/modules/";

function loadModules() {
    var uris = _getModuleURIs();
    uris.forEach(function (uri) Cu.import(uri, this), this);
}

function loadPrecedingModules() {
    var uris = _getModuleURIs();
    var self = _MODULE_BASE_URI + this.__LOCATION__.leafName;
    var i = uris.indexOf(self);
    if (i === -1) return;
    uris.slice(0, i).forEach(function (uri) Cu.import(uri, this), this);
}

function _getModuleURIs() {
    var uris = [];
    var files = __LOCATION__.parent.directoryEntries;
    while (files.hasMoreElements()) {
        var file = files.getNext().QueryInterface(Ci.nsIFile);
        if (/\.jsm$/.test(file.leafName))
            uris.push(_MODULE_BASE_URI + file.leafName);
    }
    return uris.sort();
}

/*
 * original code by tombloo
 * http://github.com/to/tombloo
 * Following codes follow the license of the Tombloo.
 */

function extend(target, source, overwrite) {
  overwrite = overwrite == null ? true : overwrite;
  for (var p in source) {
    var getter = source.__lookupGetter__(p);
    if(getter) target.__defineGetter__(p, getter);
    var setter = source.__lookupSetter__(p);
    if(setter) target.__defineSetter__(p, setter);
    if(!getter && !setter && (overwrite || !(p in target)))
      target[p] = source[p];
  }
  return target;
}

function update(self, obj) {
  if (self === null) {
    self = {};
  }
  for (var i = 1; i < arguments.length; i++) {
    var o = arguments[i];
    if (typeof(o) != "undefined" && o !== null) {
      for (var k in o) {
        self[k] = o[k];
      }
    }
  }
  return self;
}

var EXPORTED_SYMBOLS = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORTED_SYMBOLS")];
