const EXPORT = ["karaage"];

function decomposeFilePath(aPath) {
  var directoryPos = {}, directoryLen = {},
      basenamePos  = {}, basenameLen  = {},
      extensionPos = {}, extensionLen = {};
  URLParser.parseFilePath(aPath, aPath.length,
                          directoryPos, directoryLen,
                           basenamePos,  basenameLen,
                          extensionPos, extensionLen);
  var dir  = aPath.substr(directoryPos.value, directoryLen.value);
  var base = aPath.substr( basenamePos.value,  basenameLen.value);
  var ext  = aPath.substr(extensionPos.value, extensionLen.value);
  return [dir ? ((dir == "/") ? dir : dir.substr(0, dir.length - 1)) : ".",
          base ? ((aPath[aPath.length - 1] == ".") ? base.substr(0, base.length - 1) : base) : false,
          ext ? ext : (aPath[aPath.length - 1] == ".") ? "" : false];
}

function makeBasenamesUnique(aArray) {
  function funnyBasenameGen(aBasename) {
    function randStr(aLength) {
      var result = "";
      var source = "abcdefghijklmnopqrstuvwxvz";
      for (var i = 0; i < aLength; i++) {
        result += source.charAt(Math.floor(Math.random() * source.length));
      }
      return result;
    }
    var [, base, ext] = decomposeFilePath(aBasename);
    var i;
    for (i = 0; i < 100; i++) {
      // "rose.jpg" -> "rose_001.jpg", "rose_021.jpg" etc.
      yield base + "_" + ("00" + i).substr(-3) + (ext ? "." + ext : "");
    }
    for (i = 0; i < 100; i++) {
      // "rose.jpg" -> "rose_xaz.jpg", "rose_gkh.jpg" etc.
      yield base + "_" +            randStr(3) + (ext ? "." + ext : "");
    }
    yield false;
  }
  function getBasename(aPath) {
    var [, base, ext] = decomposeFilePath(aPath);
    return base + (ext ? "." + ext : "");
  }
  // make a mapping table.
  // the key is the "basename". the value is a index in the array;
  var mapping = {};
  aArray.forEach(function(x, idx) {
    x.basename = getBasename(x.uri.path);
    if (!mapping[x.basename]) mapping[x.basename] = [];
    mapping[x.basename].push(idx);
  });
  for (var basename in mapping) {
    if (mapping[basename].length > 1) {
      // Now then, there exists duplicated basenames. Try to make them unique.
      mapping[basename].forEach(function(idx) {
        var gen = funnyBasenameGen(basename);
        var uniqBasename;
        for(uniqBasename = gen.next(); mapping[uniqBasename]; uniqBasename = gen.next()) {
          if (!uniqBasename) throw new Error("failed to make basenames unique");
        };
        mapping[uniqBasename] = [idx];
        aArray[idx].basename = uniqBasename;
      });
    }
  }
  return aArray;
}

function mergeSameFile(aArray) {
  var table = {};
  aArray.forEach(function(x, idx) {
    if (!table[x.uri.spec]) table[x.uri.spec] = [];
    table[x.uri.spec].push(idx);
  });
  var result = [];
  for (var spec in table) {
    var v = {elements: [], uri: aArray[table[spec][0]].uri};
    table[spec].forEach(function(idx) {
      v.elements.push(aArray[idx].element);
    });
    result.push(v);
  }
  return result;
}

function filterLocalFileElements(aDocument, aBaseURISpec) {
  function getSource(aElement) {
    var source = "";
    if (aElement.tagName == "LINK" || aElement.tagName == "A")
      source = aElement.href;
    if (aElement.tagName == "IMG"  || aElement.tagName == "SCRIPT")
      source = aElement.src;
    if (!source) return null;
    var o = parseURI(source);
    if (o && o.frag) source = o.frag;
    var base = IOService.newURI(aBaseURISpec, null, null);
    var uri  = IOService.newURI(source, null, base);
    return uri;
  }
  function filterMapLocalFile(aElement) {
    var uri = getSource(aElement);
    if (uri && uri.schemeIs("file"))
      return {element: aElement, uri: makeURIFromSpec(uri.spec)};
    return false;
  }
  return filterMap([].concat($A(aDocument.getElementsByTagName("a")),
                             $A(aDocument.getElementsByTagName("img")),
                             $A(aDocument.getElementsByTagName("script")),
                             $A(aDocument.getElementsByTagName("link"))),
                   filterMapLocalFile);
}

function ftpQueueWebBrowserPersist(aDocument, aBaseURISpec) {
  function setSource(aElement, aValue) {
    if (aElement.tagName == "LINK" || aElement.tagName == "A") {
      aElement.href = aValue;
    }
    if (aElement.tagName == "IMG"  || aElement.tagName == "SCRIPT") {
      aElement.src  = aValue;
    }
  }
  var doc = aDocument.documentElement.cloneNode(true);
  var uploadQueue = [];
  makeBasenamesUnique(
    mergeSameFile(
      filterLocalFileElements(doc, aBaseURISpec)))
        .forEach(function(x) {
          uploadQueue.push({basename: x.basename,
                            uri: x.uri,
                            istream: openInputFile(x.uri)});
          x.elements.forEach(function(element) {
            setSource(element, x.basename);
        });
  });
  // upload "index.html".
  uploadQueue.push({basename: "index.html",
                    uri: null,
                    istream: openInputString("<html>\n" + doc.innerHTML + "\n</html>\n")});
  return uploadQueue;
}

function openInputFile(aFileURI) {
  var file = aFileURI.QueryInterface(Ci.nsIFileURL).file;
  if (!file.exists()) return null;
  var fistream = Cc["@mozilla.org/network/file-input-stream;1"]
                  .createInstance(Ci.nsIFileInputStream);
  fistream.init(file, -1, -1, false);
  var bfistream = Cc['@mozilla.org/network/buffered-input-stream;1']
                    .createInstance(Ci.nsIBufferedInputStream);
  bfistream.init(fistream, 8192);
  var binary = Cc["@mozilla.org/binaryinputstream;1"]
                 .createInstance(Ci.nsIBinaryInputStream);
  binary.setInputStream(bfistream);
  return binary;
}

function openInputString(aString) {
  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                    .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  return converter.convertToInputStream(aString);
}

function ajaxRequestKaraageInfo(aCGIURI, aJID, aProc) {
  ajaxRequest("GET", aCGIURI, {jid: aJID}, function oncomp(req) {
    var xml = req.responseXML;
    var ftp  = xml.getElementsByTagName( "ftp");
    var http = xml.getElementsByTagName("http");
    if (!ftp.length || !http.length) return;
    aProc(ftp[0].firstChild.nodeValue, http[0].firstChild.nodeValue);
  });
}

function test() {
  var ftpURI  = Musubi.IOService.newURI("ftp://localhost/", null, null);
  var httpURI = Musubi.IOService.newURI("http://localhost/musubi/teruaki", null, null);
  var fileURI = Musubi.IOService.newURI("file:///home/teruaki/Desktop/gauss.html",null,null);
  var targetFile = Cc['@mozilla.org/file/local;1']
                     .createInstance(Ci.nsILocalFile);
  targetFile.initWithPath("/home/teruaki/Desktop/ok/");
  var google = Musubi.IOService.newURI("http://www.google.co.jp", null, null);
  var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                  .createInstance(Ci.nsIWebBrowserPersist);
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
  persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
  persist.saveDocument(content.document, ftpURI, httpURI, null, null, null);
}

function karaage(aJID, aDocument, aCont) {
  var baseURISpec = aDocument.documentURI;
  var o = parseURI(baseURISpec);
  if (o && o.frag) baseURISpec = o.frag;
  if (!baseURISpec) return;
  var prefs = new Prefs("extensions.musubi.");
  ajaxRequestKaraageInfo(
    prefs.get("defaultkaraage", "http://localhost/cgi-bin/echo.cgi"),
    aJID,
    function (aFtpValue, aHttpValue) {
      var ftpURI = IOService.newURI(aFtpValue + "/", null, null);
      ftpQueuedUpload(ftpURI, ftpQueueWebBrowserPersist(aDocument, baseURISpec), function (success, failure) {
        success.forEach(function(x) {
                           Application.console.log("success:" + x.basename);
                         });
        failure.forEach(function(x) {
                           Application.console.log("failure:" + x.basename);
                         });
        aCont(aHttpValue);
      });
    });
}

