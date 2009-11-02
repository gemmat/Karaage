
if (!Karaage)
  var Karaage = {};

Components.utils.import("resource://karaage/modules/00-utils.jsm",
                        Karaage);

/**
 * load script files at the specified URI.
 *
 * @param {String} uri the URI of the script file.
 *                     When it's terminated with "/",
 *                     loads the directory recursively.
 */
Karaage.load = function (uri) {
  if (uri.charAt(uri.length - 1) === "/") {
    var load = arguments.callee;
    load.getScriptURIs(uri)
        .forEach(function (uri) load.call(this, uri), this);
    return;
  }

  var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                 .getService(Components.interfaces.mozIJSSubScriptLoader);
  var env = { __proto__: this };
  loader.loadSubScript(uri, env);
  if (env.EXPORT)
      env.EXPORT.forEach(function (name) this[name] = env[name], this);
};

Karaage.load.getScriptURIs = function (dirURI) {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const EXTENSION_ID = "karaage@musubi.ne.jp";
  var uris = [];
  var dirPath = dirURI.replace(/^[\w-]+:\/\/[\w.:-]+\//, "");
  var em = Cc["@mozilla.org/extensions/manager;1"]
             .getService(Ci.nsIExtensionManager);
  var baseURI = 'chrome://karaage/' + dirPath;
  // XXX if you want to package them in the jar file, the nsIZipReader will be some help.
  var dir = em.getInstallLocation(EXTENSION_ID)
              .getItemFile(EXTENSION_ID, "chrome/" + dirPath);
  if (!dir.exists() || !dir.isDirectory()) return uris;
  var files = dir.directoryEntries;
  while (files.hasMoreElements()) {
    var file = files.getNext().QueryInterface(Ci.nsIFile);
    if (/\.js$/.test(file.leafName))
      uris.push(baseURI + file.leafName);
  }
  return uris.sort();
};

if (!("autoload" in Karaage) || Karaage.autoload) {
  Karaage.loadModules();
  Karaage.load("chrome://karaage/content/common/");
  Karaage.load(location.href.replace(/\.\w+$/, "/"));
}
