function Utils () {

}

Utils.convertFileSize = function (bytes, decimals) {
    if (decimals === undefined) {
        decimals = 2
    }

    var size = bytes ? bytes : 0;
    var sizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var factor = Math.floor((size.toString().length - 1) / 3);

    decimals = (10 * decimals);
    if (size) {
        size = Math.round((bytes / Math.pow(1024, factor)) * decimals) / decimals;
    }

    return size + sizes[factor];
};

Utils.getHomeDirectory = function () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
};

Utils.getPathArray = function (path) {
    var retval = [];
    path = path.split('/');
    for (var i = 0; i < path.length; i++) {
        if (path[i]) {
            retval.push(path[i]);
        }
    }

    return retval;
};

Utils.pad = function (string, length) {
    return (string.toString().length < length) ? Utils.pad(string + " ", length) : string;
};

Utils.trimPath = function (string) {
    while (string.charAt(0) == '/') {
        string = string.substring(1);
    }

    while (string.charAt(string.length - 1) == '/') {
        string = string.substring(0, string.length - 1);
    }

    return string;
};

module.exports = Utils;
