
/*
 * In this utils file,
 * global vars and funcs are exported,
 * unless the name is prefixed with "_".
 */

function commonFoobar0() {
}

function _notExported() {
}

var EXPORT = [m for (m in new Iterator(this, true))
                if (m[0] !== "_" && m !== "EXPORT")];
