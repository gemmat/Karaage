const EXPORT = ["ftpQueuedUpload", "ftpUpload"];

const DownloadManager  = Cc["@mozilla.org/download-manager;1"]
                           .getService(Ci.nsIDownloadManager);

function delay(aCallback, aMilliseconds) {
  var event = {notify: aCallback};
  var timer = Cc["@mozilla.org/timer;1"]
                .createInstance(Ci.nsITimer);
  timer.initWithCallback(event,
                         500,
                         Ci.nsITimer.TYPE_ONE_SHOT);
}

function ftpQueuedUpload(aFtpURI, aQueue, aCont) {
  var uploadedItem = null;
  var success = [];
  var failure = [];
  function f(result) {
    if (uploadedItem) {
      (result ? success : failure).push(uploadedItem);
    }
    if (!aQueue.length) {
      if (aCont) aCont(success, failure);
      return;
    }
    var item = aQueue.pop();
    uploadedItem = item;
    delay(function (timer) {
            ftpUpload(aFtpURI, item.basename, item.uri, item.istream, f);
          },
          1000);
  }
  f(false);
}

function ftpUpload(aFtpURI, aBasename, aTargetURI, aInputStream, aCallback) {
  if (!aInputStream) return aCallback(false);
  aCallback = aCallback || function(_) {};
  var target  = IOService.newURI(aBasename, null, aFtpURI);
  var channel = IOService.newChannelFromURI(target);
  var uploadChannel = channel.QueryInterface(Ci.nsIUploadChannel);
  uploadChannel.setUploadStream(aInputStream, "", -1);
  var dummyFileURI = makeURIFromSpec("file:///DUMMY/DUMMY/DUMMY/DUMMY/DUMMY");
  var download = aTargetURI && DownloadManager.addDownload(0, aFtpURI, dummyFileURI, "uploading:" + aTargetURI.spec, null, null, null, null, null);
  Application.console.log("ftpUpload:" + (aTargetURI ? aTargetURI.spec : "?" + aBasename));
  var contentLength = aTargetURI ? aTargetURI.QueryInterface(Ci.nsIFileURL).file.fileSize : 0;
  var listener = new StreamListener(download, contentLength, aCallback);
  channel.asyncOpen(listener, null);
  return true;
}

function StreamListener(aDownload, aContentLength, aCallbackFunc) {
  this.download      = aDownload;
  this.contentLength = aContentLength;
  this.totalDownloaded = 0;
  this.mCallbackFunc = aCallbackFunc;
}

StreamListener.prototype = {
  // nsIStreamListener
  onStartRequest: function (aRequest, aContext) {
    Application.console.log(this.contentLength);
  },

  onDataAvailable: function (aRequest, aContext, aStream, aSourceOffset, aLength) {
    var scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                                  .createInstance(Ci.nsIScriptableInputStream);
    scriptableInputStream.init(aStream);
    scriptableInputStream.read(aLength);
    this.totalDownloaded += aLength;
    Application.console.log(this.totalDownloaded + "/" + this.contentLength);
    if (this.download)
      this.download.onProgressChange64(null, aRequest,
                                       this.totalDownloaded, this.contentLength,
                                       this.totalDownloaded, this.contentLength);
  },

  onStopRequest: function (aRequest, aContext, aStatus) {
    Application.console.log("stop");
    if (this.download)
      this.download.onStateChange(null, aRequest, this.download.STATE_STOP, Components.results.NS_OK);
    if (Components.isSuccessCode(aStatus)) {
      // request was successfull
      this.mCallbackFunc(true);
    } else {
      // request failed
      this.mCallbackFunc(false);
    }
  },

  // nsIInterfaceRequestor
  getInterface: function (aIID) {
    try {
      return this.QueryInterface(aIID);
    } catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIProgressEventSink (not implementing will cause annoying exceptions ? I didn't try)
  onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
  onStatus   : function (aRequest, aContext, aStatus, aStatusArg) { },
  // nsICancelable
  cancel: function ( ) {
    this.canceling = true;
  },
  // nsIWebBrowserPersist
  CancelSave: function () {},

  // we are faking an XPCOM interface, so we need to implement QI
  QueryInterface : function(aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.nsIInterfaceRequestor) ||
        aIID.equals(Ci.nsIChannelEventSink) ||
        aIID.equals(Ci.nsIProgressEventSink) ||
        // mimic nsIWebBrowserPersist for the nsIDownloadManager.
        aIID.equals(Ci.nsIWebBrowserPersist) ||
        aIID.equals(Ci.nsICancelable) ||
        aIID.equals(Ci.nsIStreamListener))
      return this;
    throw Components.results.NS_NOINTERFACE;
  }
};
