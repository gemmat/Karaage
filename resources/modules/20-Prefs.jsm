
const EXPORTED_SYMBOLS = ["Prefs"];
Components.utils.import("resource://karaage/modules/00-utils.jsm");

function Prefs(aBranchName) {
  if (aBranchName && aBranchName[aBranchName.length - 1] != ".")
    throw new Error("aBranchName should be terminated with a period. " + aBranchName);
  this._branch = aBranchName;
  this._prefs  = aBranchName ?
                   PrefService.getBranch(aBranchName) :
                   PrefService;
};

Prefs.prototype = {
  get branch() {
    return this._branch;
  },
  get prefs() {
    return this._prefs;
  },
  /* ComplexValueType       : aType  table
   *
   * nsISupportsString      : nsISupportsString,      "string",   (PREF_STRING as a default)
   * nsIPrefLocalizedString : nsIPrefLocalizedString, "localized"
   * nsILocalFile           : nsILocalFile,           "file"
   * nsIRelativeFilePref    : nsIRelativeFilePref,    "relFile"
   */
  get: function PrefsGet(aPrefName, aDefValue, aType) {
    var prefs = this.prefs;
    aType = aType || prefs.getPrefType(aPrefName);
    try {
      switch (aType) {
      case PrefService.PREF_INT:      //FALLTHROUGH
      case "number":
        return prefs.getIntPref(aPrefName);
      case PrefService.PREF_BOOL:     //FALLTHROUGH
      case "boolean":
        return prefs.getBoolPref(aPrefName);
      case PrefService.PREF_STRING:   //FALLTHROUGH
      case Ci.nsISupportsString:      //FALLTHROUGH
      case "string":
        return prefs.getComplexValue(aPrefName, Ci.nsISupportsString).data;
      case Ci.nsIPrefLocalizedString: //FALLTHROUGH
      case "localized":
        return prefs.getComplexValue(aPrefName, Ci.nsIPrefLocalizedString).data;
      case Ci.nsILocalFile:           //FALLTHROUGH
      case "file":
        return prefs.getComplexValue(aPrefName, Ci.nsILocalFile);
      case Ci.nsIRelativeFilePref:    //FALLTHROUGH
      case "relFile":
        return prefs.getComplexValue(aPrefName, Ci.nsIRelativeFilePref);
      case PrefService.PREF_INVALID:
        throw new Error(aPrefName + " gets PREF_INVALID type");
      default:
        throw new Error(aPrefName + " gets an unknown type");
      }
    } catch(e) {
      dump(e.name + ": " + e.message);
      return aDefValue;
    }
  },
  set: function PrefsSet(aPrefName, aValue, aType, aRelFilePrefRelToKey) {
    var prefs = this.prefs;
    aType = aType || prefs.getPrefType(aPrefName) || typeof aValue;
    aRelFilePrefRelToKey = aRelFilePrefRelToKey || "ProfD";
    switch (aType) {
    case PrefService.PREF_INT:      //FALLTHROUGH
    case "number":
      return prefs.setIntPref(aPrefName, +aValue);
    case PrefService.PREF_BOOL:     //FALLTHROUGH
    case "boolean":
      return prefs.setBoolPref(aPrefName, !!aValue);
    case PrefService.PREF_STRING:   //FALLTHROUGH
    case Ci.nsISupportsString:      //FALLTHROUGH
    case "string":
      var str = Cc["@mozilla.org/supports-string;1"]
                  .createInstance(Ci.nsISupportsString);
      str.data = aValue;
      return prefs.setComplexValue(aPrefName, Ci.nsISupportsString, str);
    case Ci.nsIPrefLocalizedString: //FALLTHROUGH
    case "localized":
      var pls = Cc["@mozilla.org/pref-localizedstring;1"]
                  .createInstance(Ci.nsIPrefLocalizedString);
      pls.data = aValue;
      return prefs.setComplexValue(aPrefName, Ci.nsIPrefLocalizedString, pls);
    case Ci.nsILocalFile:           //FALLTHROUGH
    case "file":
      return prefs.setComplexValue(aPrefName, Ci.nsILocalFile, aValue);
    case Ci.nsIRelativeFilePref:    //FALLTHROUGH
    case "relFile":
      var relFile = Cc["@mozilla.org/pref-relativefile;1"]
                      .createInstance(Ci.nsIRelativeFilePref);
      relFile.relativeToKey = aRelFilePrefRelToKey;
      relFile.file = aValue;
      return prefs.setComplexValue(aPrefName, Ci.nsIRelativeFilePref, relFile);
    case PrefService.PREF_INVALID:
      throw new Error(aPrefName + " sets PREF_INVALID type");
    default:
      throw new Error(aPrefName + " sets a wrong type " + aValue + " , " + aType);
    }
  },
  clear: function PrefsClear(aPrefName) {
    try {
      this.prefs.clearUserPref(aPrefName);
    } catch(e) {
      dump(e.name + ": " + e.message);
    }
  },
  getChildList: function getChildList(aStartingAt) {
    return this.prefs.getChildList(aStartingAt || "", {});
  }
};
