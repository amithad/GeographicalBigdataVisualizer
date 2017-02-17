(function(){

var error = function() {
  var msg = Utils.toArray(arguments).join(' ');
  throw new Error(msg);
};

var Utils = {
  getUniqueName: function(prefix) {
    var n = Utils.__uniqcount || 0;
    Utils.__uniqcount = n + 1;
    return (prefix || "__id_") + n;
  },

  isFunction: function(obj) {
    return typeof obj == 'function';
  },

  isObject: function(obj) {
    return obj === Object(obj); // via underscore
  },

  clamp: function(val, min, max) {
    return val < min ? min : (val > max ? max : val);
  },

  interpolate: function(val1, val2, pct) {
    return val1 * (1-pct) + val2 * pct;
  },

  isArray: function(obj) {
    return Array.isArray(obj);
  },

  // NaN -> true
  isNumber: function(obj) {
    // return toString.call(obj) == '[object Number]'; // ie8 breaks?
    return obj != null && obj.constructor == Number;
  },

  isInteger: function(obj) {
    return Utils.isNumber(obj) && ((obj | 0) === obj);
  },

  isString: function(obj) {
    return obj != null && obj.toString === String.prototype.toString;
    // TODO: replace w/ something better.
  },

  isBoolean: function(obj) {
    return obj === true || obj === false;
  },

  // Convert an array-like object to an Array, or make a copy if @obj is an Array
  toArray: function(obj) {
    var arr;
    if (!Utils.isArrayLike(obj)) error("Utils.toArray() requires an array-like object");
    try {
      arr = Array.prototype.slice.call(obj, 0); // breaks in ie8
    } catch(e) {
      // support ie8
      arr = [];
      for (var i=0, n=obj.length; i<n; i++) {
        arr[i] = obj[i];
      }
    }
    return arr;
  },

  // Array like: has length property, is numerically indexed and mutable.
  // TODO: try to detect objects with length property but no indexed data elements
  isArrayLike: function(obj) {
    if (!obj) return false;
    if (Utils.isArray(obj)) return true;
    if (Utils.isString(obj)) return false;
    if (obj.length === 0) return true;
    if (obj.length > 0) return true;
    return false;
  },

  // See https://raw.github.com/kvz/phpjs/master/functions/strings/addslashes.js
  addslashes: function(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  },

  // Escape a literal string to use in a regexp.
  // Ref.: http://simonwillison.net/2006/Jan/20/escape/
  regexEscape: function(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  },

  defaults: function(dest) {
    for (var i=1, n=arguments.length; i<n; i++) {
      var src = arguments[i] || {};
      for (var key in src) {
        if (key in dest === false && src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  },

  extend: function(o) {
    var dest = o || {},
        n = arguments.length,
        key, i, src;
    for (i=1; i<n; i++) {
      src = arguments[i] || {};
      for (key in src) {
        if (src.hasOwnProperty(key)) {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  },

  /**
   * Pseudoclassical inheritance
   *
   * Inherit from a Parent function:
   *    Utils.inherit(Child, Parent);
   * Call parent's constructor (inside child constructor):
   *    this.__super__([args...]);
   * Call a parent method (when it has been overriden by a same-named function in Child):
   *    this.__super__.<method_name>.call(this, [args...]);
   */
  inherit: function(targ, src) {
    var f = function() {
      if (this.__super__ == f) {
        // add __super__ of parent to front of lookup chain
        // so parent class constructor can call its parent using this.__super__
        this.__super__ = src.prototype.__super__;
        // call parent constructor function. this.__super__ now points to parent-of-parent
        src.apply(this, arguments);
        // remove temp __super__, expose targ.prototype.__super__ again
        delete this.__super__;
      }
    };

    f.prototype = src.prototype || src; // added || src to allow inheriting from objects as well as functions
    // Extend targ prototype instead of wiping it out --
    //   in case inherit() is called after targ.prototype = {stuff}; statement
    targ.prototype = Utils.extend(new f(), targ.prototype); //
    targ.prototype.constructor = targ;
    targ.prototype.__super__ = f;
  }

};



var Env = (function() {
  var inNode = typeof module !== 'undefined' && !!module.exports;
  var inBrowser = typeof window !== 'undefined' && !inNode;
  var inPhantom = inBrowser && !!(window.phantom && window.phantom.exit);
  var ieVersion = inBrowser && /MSIE ([0-9]+)/.exec(navigator.appVersion) && parseInt(RegExp.$1) || NaN;

  return {
    iPhone : inBrowser && !!(navigator.userAgent.match(/iPhone/i)),
    iPad : inBrowser && !!(navigator.userAgent.match(/iPad/i)),
    touchEnabled : inBrowser && ("ontouchstart" in window),
    canvas: inBrowser && !!document.createElement('canvas').getContext,
    inNode : inNode,
    inPhantom : inPhantom,
    inBrowser: inBrowser,
    ieVersion: ieVersion,
    ie: !isNaN(ieVersion)
  };
})();


// Support for timing using T.start() and T.stop("message")
//
var T = {
  stack: [],
  verbose: true,

  start: function(msg) {
    if (T.verbose && msg) verbose(T.prefix() + msg);
    T.stack.push(+new Date);
  },

  // Stop timing, print a message if T.verbose == true
  stop: function(note) {
    var startTime = T.stack.pop();
    var elapsed = (+new Date - startTime);
    if (T.verbose) {
      var msg =  T.prefix() + elapsed + 'ms';
      if (note) {
        msg += " " + note;
      }
      verbose(msg);
    }
    return elapsed;
  },

  prefix: function() {
    var str = "- ",
        level = this.stack.length;
    while (level--) str = "-" + str;
    return str;
  }
};




// Append elements of @src array to @dest array
Utils.merge = function(dest, src) {
  if (!Utils.isArray(dest) || !Utils.isArray(src)) {
    error("Usage: Utils.merge(destArray, srcArray);")
  }
  if (src.length > 0) {
    dest.push.apply(dest, src);
  }
  return dest;
};

// Returns elements in arr and not in other
// (similar to underscore diff)
Utils.difference = function(arr, other) {
  var index = Utils.arrayToIndex(other);
  return arr.filter(function(el) {
    return !Object.prototype.hasOwnProperty.call(index, el);
  });
};

// Test a string or array-like object for existence of substring or element
Utils.contains = function(container, item) {
  if (Utils.isString(container)) {
    return container.indexOf(item) != -1;
  }
  else if (Utils.isArrayLike(container)) {
    return Utils.indexOf(container, item) != -1;
  }
  error("Expected Array or String argument");
};

Utils.some = function(arr, test) {
  return arr.reduce(function(val, item) {
    return val || test(item); // TODO: short-circuit?
  }, false);
};

Utils.every = function(arr, test) {
  return arr.reduce(function(val, item) {
    return val && test(item);
  }, true);
};

Utils.find = function(arr, test, ctx) {
  var matches = arr.filter(test, ctx);
  return matches.length === 0 ? null : matches[0];
};

Utils.indexOf = function(arr, item, prop) {
  if (prop) error("Utils.indexOf() No longer supports property argument");
  var nan = !(item === item);
  for (var i = 0, len = arr.length || 0; i < len; i++) {
    if (arr[i] === item) return i;
    if (nan && !(arr[i] === arr[i])) return i;
  }
  return -1;
};

Utils.range = function(len, start, inc) {
  var arr = [],
      v = start === void 0 ? 0 : start,
      i = inc === void 0 ? 1 : inc;
  while(len--) {
    arr.push(v);
    v += i;
  }
  return arr;
};

Utils.repeat = function(times, func) {
  var values = [],
      val;
  for (var i=0; i<times; i++) {
    val = func(i);
    if (val !== void 0) {
      values[i] = val;
    }
  }
  return values.length > 0 ? values : void 0;
};

// Calc sum, skip falsy and NaN values
// Assumes: no other non-numeric objects in array
//
Utils.sum = function(arr, info) {
  if (!Utils.isArrayLike(arr)) error ("Utils.sum() expects an array, received:", arr);
  var tot = 0,
      nan = 0,
      val;
  for (var i=0, n=arr.length; i<n; i++) {
    val = arr[i];
    if (val) {
      tot += val;
    } else if (isNaN(val)) {
      nan++;
    }
  }
  if (info) {
    info.nan = nan;
  }
  return tot;
};

// Calculate min and max values of an array, ignoring NaN values
Utils.getArrayBounds = function(arr) {
  var min = Infinity,
    max = -Infinity,
    nan = 0, val;
  for (var i=0, len=arr.length; i<len; i++) {
    val = arr[i];
    if (val !== val) nan++;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  return {
    min: min,
    max: max,
    nan: nan
  };
};

Utils.uniq = function(src) {
  var index = {};
  return src.reduce(function(memo, el) {
    if (el in index === false) {
      index[el] = true;
      memo.push(el);
    }
    return memo;
  }, []);
};

Utils.pluck = function(arr, key) {
  return arr.map(function(obj) {
    return obj[key];
  });
};

Utils.countValues = function(arr) {
  return arr.reduce(function(memo, val) {
    memo[val] = (val in memo) ? memo[val] + 1 : 1;
    return memo;
  }, {});
};

Utils.indexOn = function(arr, k) {
  return arr.reduce(function(index, o) {
    index[o[k]] = o;
    return index;
  }, {});
};

Utils.groupBy = function(arr, k) {
  return arr.reduce(function(index, o) {
    var keyval = o[k];
    if (keyval in index) {
      index[keyval].push(o);
    } else {
      index[keyval] = [o]
    }
    return index;
  }, {});
};

Utils.arrayToIndex = function(arr, val) {
  var init = arguments.length > 1;
  return arr.reduce(function(index, key) {
    index[key] = init ? val : true;
    return index;
  }, {});
};

// Support for iterating over array-like objects, like typed arrays
Utils.forEach = function(arr, func, ctx) {
  if (!Utils.isArrayLike(arr)) {
    throw new Error("#forEach() takes an array-like argument");
  }
  for (var i=0, n=arr.length; i < n; i++) {
    func.call(ctx, arr[i], i);
  }
};

Utils.forEachProperty = function(o, func, ctx) {
  Object.keys(o).forEach(function(key) {
    func.call(ctx, o[key], key);
  });
};

Utils.initializeArray = function(arr, init) {
  for (var i=0, len=arr.length; i<len; i++) {
    arr[i] = init;
  }
  return arr;
};

Utils.replaceArray = function(arr, arr2) {
  arr.splice(0, arr.length);
  arr.push.apply(arr, arr2);
};




Utils.repeatString = function(src, n) {
  var str = "";
  for (var i=0; i<n; i++)
    str += src;
  return str;
};

Utils.endsWith = function(str, ending) {
    return str.indexOf(ending, str.length - ending.length) !== -1;
};

Utils.lpad = function(str, size, pad) {
  pad = pad || ' ';
  str = String(str);
  return Utils.repeatString(pad, size - str.length) + str;
};

Utils.rpad = function(str, size, pad) {
  pad = pad || ' ';
  str = String(str);
  return str + Utils.repeatString(pad, size - str.length);
};

Utils.trim = function(str) {
  return Utils.ltrim(Utils.rtrim(str));
};

var ltrimRxp = /^\s+/;
Utils.ltrim = function(str) {
  return str.replace(ltrimRxp, '');
};

var rtrimRxp = /\s+$/;
Utils.rtrim = function(str) {
  return str.replace(rtrimRxp, '');
};

Utils.addThousandsSep = function(str) {
  var fmt = '',
      start = str[0] == '-' ? 1 : 0,
      dec = str.indexOf('.'),
      end = str.length,
      ins = (dec == -1 ? end : dec) - 3;
  while (ins > start) {
    fmt = ',' + str.substring(ins, end) + fmt;
    end = ins;
    ins -= 3;
  }
  return str.substring(0, end) + fmt;
};

Utils.numToStr = function(num, decimals) {
  return decimals >= 0 ? num.toFixed(decimals) : String(num);
};

Utils.formatNumber = function(num, decimals, nullStr, showPos) {
  var fmt;
  if (isNaN(num)) {
    fmt = nullStr || '-';
  } else {
    fmt = Utils.numToStr(num, decimals);
    fmt = Utils.addThousandsSep(fmt);
    if (showPos && parseFloat(fmt) > 0) {
      fmt = "+" + fmt;
    }
  }
  return fmt;
};



function Transform() {
  this.mx = this.my = 1;
  this.bx = this.by = 0;
}

Transform.prototype.isNull = function() {
  return !this.mx || !this.my || isNaN(this.bx) || isNaN(this.by);
};

Transform.prototype.invert = function() {
  var inv = new Transform();
  inv.mx = 1 / this.mx;
  inv.my = 1 / this.my;
  //inv.bx = -this.bx * inv.mx;
  //inv.by = -this.by * inv.my;
  inv.bx = -this.bx / this.mx;
  inv.by = -this.by / this.my;
  return inv;
};


Transform.prototype.transform = function(x, y, xy) {
  xy = xy || [];
  xy[0] = x * this.mx + this.bx;
  xy[1] = y * this.my + this.by;
  return xy;
};

Transform.prototype.toString = function() {
  return Utils.toString(Utils.extend({}, this));
};




function Bounds() {
  if (arguments.length > 0) {
    this.setBounds.apply(this, arguments);
  }
}

Bounds.prototype.toString = function() {
  return JSON.stringify({
    xmin: this.xmin,
    xmax: this.xmax,
    ymin: this.ymin,
    ymax: this.ymax
  });
};

Bounds.prototype.toArray = function() {
  return this.hasBounds() ? [this.xmin, this.ymin, this.xmax, this.ymax] : [];
};

Bounds.prototype.hasBounds = function() {
  return this.xmin <= this.xmax && this.ymin <= this.ymax;
};

Bounds.prototype.sameBounds =
Bounds.prototype.equals = function(bb) {
  return bb && this.xmin === bb.xmin && this.xmax === bb.xmax &&
    this.ymin === bb.ymin && this.ymax === bb.ymax;
};

Bounds.prototype.width = function() {
  return (this.xmax - this.xmin) || 0;
};

Bounds.prototype.height = function() {
  return (this.ymax - this.ymin) || 0;
};

Bounds.prototype.area = function() {
  return this.width() * this.height() || 0;
};

Bounds.prototype.empty = function() {
  this.xmin = this.ymin = this.xmax = this.ymax = void 0;
  return this;
};

Bounds.prototype.setBounds = function(a, b, c, d) {
  if (arguments.length == 1) {
    // assume first arg is a Bounds or array
    if (Utils.isArrayLike(a)) {
      b = a[1];
      c = a[2];
      d = a[3];
      a = a[0];
    } else {
      b = a.ymin;
      c = a.xmax;
      d = a.ymax;
      a = a.xmin;
    }
  }

  this.xmin = a;
  this.ymin = b;
  this.xmax = c;
  this.ymax = d;
  if (a > c || b > d) this.update();
  // error("Bounds#setBounds() min/max reversed:", a, b, c, d);
  return this;
};


Bounds.prototype.centerX = function() {
  var x = (this.xmin + this.xmax) * 0.5;
  return x;
};

Bounds.prototype.centerY = function() {
  var y = (this.ymax + this.ymin) * 0.5;
  return y;
};

Bounds.prototype.containsPoint = function(x, y) {
  if (x >= this.xmin && x <= this.xmax &&
    y <= this.ymax && y >= this.ymin) {
    return true;
  }
  return false;
};

// intended to speed up slightly bubble symbol detection; could use intersects() instead
// TODO: fix false positive where circle is just outside a corner of the box
Bounds.prototype.containsBufferedPoint =
Bounds.prototype.containsCircle = function(x, y, buf) {
  if ( x + buf > this.xmin && x - buf < this.xmax ) {
    if ( y - buf < this.ymax && y + buf > this.ymin ) {
      return true;
    }
  }
  return false;
};

Bounds.prototype.intersects = function(bb) {
  if (bb.xmin <= this.xmax && bb.xmax >= this.xmin &&
    bb.ymax >= this.ymin && bb.ymin <= this.ymax) {
    return true;
  }
  return false;
};

Bounds.prototype.contains = function(bb) {
  if (bb.xmin >= this.xmin && bb.ymax <= this.ymax &&
    bb.xmax <= this.xmax && bb.ymin >= this.ymin) {
    return true;
  }
  return false;
};

Bounds.prototype.shift = function(x, y) {
  this.setBounds(this.xmin + x,
    this.ymin + y, this.xmax + x, this.ymax + y);
};

Bounds.prototype.padBounds = function(a, b, c, d) {
  this.xmin -= a;
  this.ymin -= b;
  this.xmax += c;
  this.ymax += d;
};

// Rescale the bounding box by a fraction. TODO: implement focus.
// @param {number} pct Fraction of original extents
// @param {number} pctY Optional amount to scale Y
//
Bounds.prototype.scale = function(pct, pctY) { /*, focusX, focusY*/
  var halfWidth = (this.xmax - this.xmin) * 0.5;
  var halfHeight = (this.ymax - this.ymin) * 0.5;
  var kx = pct - 1;
  var ky = pctY === undefined ? kx : pctY - 1;
  this.xmin -= halfWidth * kx;
  this.ymin -= halfHeight * ky;
  this.xmax += halfWidth * kx;
  this.ymax += halfHeight * ky;
};

// Return a bounding box with the same extent as this one.
Bounds.prototype.cloneBounds = // alias so child classes can override clone()
Bounds.prototype.clone = function() {
  return new Bounds(this.xmin, this.ymin, this.xmax, this.ymax);
};

Bounds.prototype.clearBounds = function() {
  this.setBounds(new Bounds());
};

Bounds.prototype.mergePoint = function(x, y) {
  if (this.xmin === void 0) {
    this.setBounds(x, y, x, y);
  } else {
    // this works even if x,y are NaN
    if (x < this.xmin)  this.xmin = x;
    else if (x > this.xmax)  this.xmax = x;

    if (y < this.ymin) this.ymin = y;
    else if (y > this.ymax) this.ymax = y;
  }
};

// expands either x or y dimension to match @aspect (width/height ratio)
// @focusX, @focusY (optional): expansion focus, as a fraction of width and height
Bounds.prototype.fillOut = function(aspect, focusX, focusY) {
  if (arguments.length < 3) {
    focusX = 0.5;
    focusY = 0.5;
  }
  var w = this.width(),
      h = this.height(),
      currAspect = w / h,
      pad;
  if (isNaN(aspect) || aspect <= 0) {
    // error condition; don't pad
  } else if (currAspect < aspect) { // fill out x dimension
    pad = h * aspect - w;
    this.xmin -= (1 - focusX) * pad;
    this.xmax += focusX * pad;
  } else {
    pad = w / aspect - h;
    this.ymin -= (1 - focusY) * pad;
    this.ymax += focusY * pad;
  }
  return this;
};

Bounds.prototype.update = function() {
  var tmp;
  if (this.xmin > this.xmax) {
    tmp = this.xmin;
    this.xmin = this.xmax;
    this.xmax = tmp;
  }
  if (this.ymin > this.ymax) {
    tmp = this.ymin;
    this.ymin = this.ymax;
    this.ymax = tmp;
  }
};

Bounds.prototype.transform = function(t) {
  this.xmin = this.xmin * t.mx + t.bx;
  this.xmax = this.xmax * t.mx + t.bx;
  this.ymin = this.ymin * t.my + t.by;
  this.ymax = this.ymax * t.my + t.by;
  this.update();
  return this;
};

// Returns a Transform object for mapping this onto Bounds @b2
// @flipY (optional) Flip y-axis coords, for converting to/from pixel coords
//
Bounds.prototype.getTransform = function(b2, flipY) {
  var t = new Transform();
  t.mx = b2.width() / this.width();
  t.bx = b2.xmin - t.mx * this.xmin;
  if (flipY) {
    t.my = -b2.height() / this.height();
    t.by = b2.ymax - t.my * this.ymin;
  } else {
    t.my = b2.height() / this.height();
    t.by = b2.ymin - t.my * this.ymin;
  }
  return t;
};

Bounds.prototype.mergeCircle = function(x, y, r) {
  if (r < 0) r = -r;
  this.mergeBounds([x - r, y - r, x + r, y + r]);
};

Bounds.prototype.mergeBounds = function(bb) {
  var a, b, c, d;
  if (bb instanceof Bounds) {
    a = bb.xmin, b = bb.ymin, c = bb.xmax, d = bb.ymax;
  } else if (arguments.length == 4) {
    a = arguments[0];
    b = arguments[1];
    c = arguments[2];
    d = arguments[3];
  } else if (bb.length == 4) {
    // assume array: [xmin, ymin, xmax, ymax]
    a = bb[0], b = bb[1], c = bb[2], d = bb[3];
  } else {
    error("Bounds#mergeBounds() invalid argument:", bb);
  }

  if (this.xmin === void 0) {
    this.setBounds(a, b, c, d);
  } else {
    if (a < this.xmin) this.xmin = a;
    if (b < this.ymin) this.ymin = b;
    if (c > this.xmax) this.xmax = c;
    if (d > this.ymax) this.ymax = d;
  }
  return this;
};




// Sort an array of objects based on one or more properties.
// Usage: Utils.sortOn(array, key1, asc?[, key2, asc? ...])
//
Utils.sortOn = function(arr) {
  var comparators = [];
  for (var i=1; i<arguments.length; i+=2) {
    comparators.push(Utils.getKeyComparator(arguments[i], arguments[i+1]));
  }
  arr.sort(function(a, b) {
    var cmp = 0,
        i = 0,
        n = comparators.length;
    while (i < n && cmp === 0) {
      cmp = comparators[i](a, b);
      i++;
    }
    return cmp;
  });
  return arr;
};

// Sort array of values that can be compared with < > operators (strings, numbers)
// null, undefined and NaN are sorted to the end of the array
//
Utils.genericSort = function(arr, asc) {
  var compare = Utils.getGenericComparator(asc);
  Array.prototype.sort.call(arr, compare);
  return arr;
};

Utils.sortOnKey = function(arr, getter, asc) {
  var compare = Utils.getGenericComparator(asc !== false) // asc is default
  arr.sort(function(a, b) {
    return compare(getter(a), getter(b));
  });
};

// Stashes keys in a temp array (better if calculating key is expensive).
Utils.sortOnKey2 = function(arr, getKey, asc) {
  Utils.sortArrayByKeys(arr, arr.map(getKey), asc);
};

Utils.sortArrayByKeys = function(arr, keys, asc) {
  var ids = Utils.getSortedIds(keys, asc);
  Utils.reorderArray(arr, ids);
};

Utils.getSortedIds = function(arr, asc) {
  var ids = Utils.range(arr.length);
  Utils.sortArrayIndex(ids, arr, asc);
  return ids;
};

Utils.sortArrayIndex = function(ids, arr, asc) {
  var compare = Utils.getGenericComparator(asc);
  ids.sort(function(i, j) {
    // added i, j comparison to guarantee that sort is stable
    var cmp = compare(arr[i], arr[j]);
    return cmp > 0 || cmp === 0 && i < j ? 1 : -1;
  });
};

Utils.reorderArray = function(arr, idxs) {
  var len = idxs.length;
  var arr2 = [];
  for (var i=0; i<len; i++) {
    var idx = idxs[i];
    if (idx < 0 || idx >= len) error("Out-of-bounds array idx");
    arr2[i] = arr[idx];
  }
  Utils.replaceArray(arr, arr2);
};

Utils.getKeyComparator = function(key, asc) {
  var compare = Utils.getGenericComparator(asc);
  return function(a, b) {
    return compare(a[key], b[key]);
  };
};

Utils.getGenericComparator = function(asc) {
  asc = asc !== false;
  return function(a, b) {
    var retn = 0;
    if (b == null) {
      retn = a == null ? 0 : -1;
    } else if (a == null) {
      retn = 1;
    } else if (a < b) {
      retn = asc ? -1 : 1;
    } else if (a > b) {
      retn = asc ? 1 : -1;
    } else if (a !== a) {
      retn = 1;
    } else if (b !== b) {
      retn = -1;
    }
    return retn;
  };
};

// This is faster than Array.prototype.sort(<callback>) when "getter" returns a
// precalculated sort string. (Removing -- kludgy, not very useful)
//
// @arr Array of objects to sort.
// @getter Function that returns a sort key (string) for each object.
/*
Utils.sortOnKeyFunction = function(arr, getter) {
  if (!arr || arr.length == 0) {
    return;
  }
  // Temporarily patch toString() method w/ sort key function.
  // Assumes array contains objects of the same type
  // and their "constructor" property is properly set.
  var p = arr[0].constructor.prototype;
  var tmp = p.toString;
  p.toString = getter;
  arr.sort();
  p.toString = tmp;
};
*/




// Generic in-place sort (null, NaN, undefined not handled)
Utils.quicksort = function(arr, asc) {
  Utils.quicksortPartition(arr, 0, arr.length-1);
  if (asc === false) Array.prototype.reverse.call(arr); // Works with typed arrays
  return arr;
};

// Moved out of Utils.quicksort() (saw >100% speedup in Chrome with deep recursion)
Utils.quicksortPartition = function (a, lo, hi) {
  var i = lo,
      j = hi,
      pivot, tmp;
  while (i < hi) {
    pivot = a[lo + hi >> 1]; // avoid n^2 performance on sorted arrays
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) {
        tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        i++;
        j--;
      }
    }
    if (lo < j) Utils.quicksortPartition(a, lo, j);
    lo = i;
    j = hi;
  }
};




Utils.findRankByValue = function(arr, value) {
  if (isNaN(value)) return arr.length;
  var rank = 1;
  for (var i=0, n=arr.length; i<n; i++) {
    if (value > arr[i]) rank++;
  }
  return rank;
}

Utils.findValueByPct = function(arr, pct) {
  var rank = Math.ceil((1-pct) * (arr.length));
  return Utils.findValueByRank(arr, rank);
};

// See http://ndevilla.free.fr/median/median/src/wirth.c
// Elements of @arr are reordered
//
Utils.findValueByRank = function(arr, rank) {
  if (!arr.length || rank < 1 || rank > arr.length) error("[findValueByRank()] invalid input");

  rank = Utils.clamp(rank | 0, 1, arr.length);
  var k = rank - 1, // conv. rank to array index
      n = arr.length,
      l = 0,
      m = n - 1,
      i, j, val, tmp;

  while (l < m) {
    val = arr[k];
    i = l;
    j = m;
    do {
      while (arr[i] < val) {i++;}
      while (val < arr[j]) {j--;}
      if (i <= j) {
        tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
        i++;
        j--;
      }
    } while (i <= j);
    if (j < k) l = i;
    if (k < i) m = j;
  }
  return arr[k];
};

//
//
Utils.findMedian = function(arr) {
  var n = arr.length,
      rank = Math.floor(n / 2) + 1,
      median = Utils.findValueByRank(arr, rank);
  if ((n & 1) == 0) {
    median = (median + Utils.findValueByRank(arr, rank - 1)) / 2;
  }
  return median;
};




// Wrapper for DataView class for more convenient reading and writing of
//   binary data; Remembers endianness and read/write position.
// Has convenience methods for copying from buffers, etc.
//
function BinArray(buf, le) {
  if (Utils.isNumber(buf)) {
    buf = new ArrayBuffer(buf);
  } else if (Env.inNode && buf instanceof Buffer == true) {
    // Since node 0.10, DataView constructor doesn't accept Buffers,
    //   so need to copy Buffer to ArrayBuffer
    buf = BinArray.toArrayBuffer(buf);
  }
  if (buf instanceof ArrayBuffer == false) {
    error("BinArray constructor takes an integer, ArrayBuffer or Buffer argument");
  }
  this._buffer = buf;
  this._bytes = new Uint8Array(buf);
  this._view = new DataView(buf);
  this._idx = 0;
  this._le = le !== false;
}

BinArray.bufferToUintArray = function(buf, wordLen) {
  if (wordLen == 4) return new Uint32Array(buf);
  if (wordLen == 2) return new Uint16Array(buf);
  if (wordLen == 1) return new Uint8Array(buf);
  error("BinArray.bufferToUintArray() invalid word length:", wordLen)
};

BinArray.uintSize = function(i) {
  return i & 1 || i & 2 || 4;
};

BinArray.bufferCopy = function(dest, destId, src, srcId, bytes) {
  srcId = srcId || 0;
  bytes = bytes || src.byteLength - srcId;
  if (dest.byteLength - destId < bytes)
    error("Buffer overflow; tried to write:", bytes);

  // When possible, copy buffer data in multi-byte chunks... Added this for faster copying of
  // shapefile data, which is aligned to 32 bits.
  var wordSize = Math.min(BinArray.uintSize(bytes), BinArray.uintSize(srcId),
      BinArray.uintSize(dest.byteLength), BinArray.uintSize(destId),
      BinArray.uintSize(src.byteLength));

  var srcArr = BinArray.bufferToUintArray(src, wordSize),
      destArr = BinArray.bufferToUintArray(dest, wordSize),
      count = bytes / wordSize,
      i = srcId / wordSize,
      j = destId / wordSize;

  while (count--) {
    destArr[j++] = srcArr[i++];
  }
  return bytes;
};

BinArray.toArrayBuffer = function(src) {
  var n = src.length,
      dest = new ArrayBuffer(n),
      view = new Uint8Array(dest);
  for (var i=0; i<n; i++) {
      view[i] = src[i];
  }
  return dest;
};

// Return length in bytes of an ArrayBuffer or Buffer
//
BinArray.bufferSize = function(buf) {
  return (buf instanceof ArrayBuffer ?  buf.byteLength : buf.length | 0);
};

Utils.buffersAreIdentical = function(a, b) {
  var alen = BinArray.bufferSize(a);
  var blen = BinArray.bufferSize(b);
  if (alen != blen) {
    return false;
  }
  for (var i=0; i<alen; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

BinArray.prototype = {
  size: function() {
    return this._buffer.byteLength;
  },

  littleEndian: function() {
    this._le = true;
    return this;
  },

  bigEndian: function() {
    this._le = false;
    return this;
  },

  buffer: function() {
    return this._buffer;
  },

  bytesLeft: function() {
    return this._buffer.byteLength - this._idx;
  },

  skipBytes: function(bytes) {
    this._idx += (bytes + 0);
    return this;
  },

  readUint8: function() {
    return this._bytes[this._idx++];
  },

  writeUint8: function(val) {
    this._bytes[this._idx++] = val;
    return this;
  },

  readInt8: function() {
    return this._view.getInt8(this._idx++);
  },

  writeInt8: function(val) {
    this._view.setInt8(this._idx++, val);
    return this;
  },

  readUint16: function() {
    var val = this._view.getUint16(this._idx, this._le);
    this._idx += 2;
    return val;
  },

  writeUint16: function(val) {
    this._view.setUint16(this._idx, val, this._le);
    this._idx += 2;
    return this;
  },

  readUint32: function() {
    var val = this._view.getUint32(this._idx, this._le);
    this._idx += 4;
    return val;
  },

  writeUint32: function(val) {
    this._view.setUint32(this._idx, val, this._le);
    this._idx += 4;
    return this;
  },

  readInt32: function() {
    var val = this._view.getInt32(this._idx, this._le);
    this._idx += 4;
    return val;
  },

  writeInt32: function(val) {
    this._view.setInt32(this._idx, val, this._le);
    this._idx += 4;
    return this;
  },

  readFloat64: function() {
    var val = this._view.getFloat64(this._idx, this._le);
    this._idx += 8;
    return val;
  },

  writeFloat64: function(val) {
    this._view.setFloat64(this._idx, val, this._le);
    this._idx += 8;
    return this;
  },

  // Returns a Float64Array containing @len doubles
  //
  readFloat64Array: function(len) {
    var bytes = len * 8,
        i = this._idx,
        buf = this._buffer,
        arr;
    // Inconsistent: first is a view, second a copy...
    if (i % 8 === 0) {
      arr = new Float64Array(buf, i, len);
    } else if (buf.slice) {
      arr = new Float64Array(buf.slice(i, i + bytes));
    } else { // ie10, etc
      var dest = new ArrayBuffer(bytes);
      BinArray.bufferCopy(dest, 0, buf, i, bytes);
      arr = new Float64Array(dest);
    }
    this._idx += bytes;
    return arr;
  },

  readUint32Array: function(len) {
    var arr = [];
    for (var i=0; i<len; i++) {
      arr.push(this.readUint32());
    }
    return arr;
  },

  peek: function() {
    return this._view.getUint8(this._idx);
  },

  position: function(i) {
    if (i != null) {
      this._idx = i;
      return this;
    }
    return this._idx;
  },

  readCString: function(fixedLen, asciiOnly) {
    var str = "",
        count = fixedLen >= 0 ? fixedLen : this.bytesLeft();
    while (count > 0) {
      var byteVal = this.readUint8();
      count--;
      if (byteVal == 0) {
        break;
      } else if (byteVal > 127 && asciiOnly) {
        str = null;
        break;
      }
      str += String.fromCharCode(byteVal);
    }

    if (fixedLen > 0 && count > 0) {
      this.skipBytes(count);
    }
    return str;
  },

  writeString: function(str, maxLen) {
    var bytesWritten = 0,
        charsToWrite = str.length,
        cval;
    if (maxLen) {
      charsToWrite = Math.min(charsToWrite, maxLen);
    }
    for (var i=0; i<charsToWrite; i++) {
      cval = str.charCodeAt(i);
      if (cval > 127) {
        trace("#writeCString() Unicode value beyond ascii range")
        cval = '?'.charCodeAt(0);
      }
      this.writeUint8(cval);
      bytesWritten++;
    }
    return bytesWritten;
  },

  writeCString: function(str, fixedLen) {
    var maxChars = fixedLen ? fixedLen - 1 : null,
        bytesWritten = this.writeString(str, maxChars);

    this.writeUint8(0); // terminator
    bytesWritten++;

    if (fixedLen) {
      while (bytesWritten < fixedLen) {
        this.writeUint8(0);
        bytesWritten++;
      }
    }
    return this;
  },

  writeBuffer: function(buf, bytes, startIdx) {
    this._idx += BinArray.bufferCopy(this._buffer, this._idx, buf, startIdx, bytes);
    return this;
  }
};




/*
A simplified version of printf formatting
Format codes: %[flags][width][.precision]type

supported flags:
  +   add '+' before positive numbers
  0   left-pad with '0'
  '   Add thousands separator
width: 1 to many
precision: .(1 to many)
type:
  s     string
  di    integers
  f     decimal numbers
  xX    hexidecimal (unsigned)
  %     literal '%'

Examples:
  code    val    formatted
  %+d     1      '+1'
  %4i     32     '  32'
  %04i    32     '0032'
  %x      255    'ff'
  %.2f    0.125  '0.13'
  %'f     1000   '1,000'
*/

// Usage: Utils.format(formatString, [values])
// Tip: When reusing the same format many times, use Utils.formatter() for 5x - 10x better performance
//
Utils.format = function(fmt) {
  var fn = Utils.formatter(fmt);
  var str = fn.apply(null, Array.prototype.slice.call(arguments, 1));
  return str;
};

function formatValue(val, matches) {
  var flags = matches[1];
  var padding = matches[2];
  var decimals = matches[3] ? parseInt(matches[3].substr(1)) : void 0;
  var type = matches[4];
  var isString = type == 's',
      isHex = type == 'x' || type == 'X',
      isInt = type == 'd' || type == 'i',
      isFloat = type == 'f',
      isNumber = !isString;

  var sign = "",
      padDigits = 0,
      isZero = false,
      isNeg = false;

  var str;
  if (isString) {
    str = String(val);
  }
  else if (isHex) {
    str = val.toString(16);
    if (type == 'X')
      str = str.toUpperCase();
  }
  else if (isNumber) {
    str = Utils.numToStr(val, isInt ? 0 : decimals);
    if (str[0] == '-') {
      isNeg = true;
      str = str.substr(1);
    }
    isZero = parseFloat(str) == 0;
    if (flags.indexOf("'") != -1 || flags.indexOf(',') != -1) {
      str = Utils.addThousandsSep(str);
    }
    if (!isZero) { // BUG: sign is added when num rounds to 0
      if (isNeg) {
        sign = "\u2212"; // U+2212
      } else if (flags.indexOf('+') != -1) {
        sign = '+';
      }
    }
  }

  if (padding) {
    var strLen = str.length + sign.length;
    var minWidth = parseInt(padding, 10);
    if (strLen < minWidth) {
      padDigits = minWidth - strLen;
      var padChar = flags.indexOf('0') == -1 ? ' ' : '0';
      var padStr = Utils.repeatString(padChar, padDigits);
    }
  }

  if (padDigits == 0) {
    str = sign + str;
  } else if (padChar == '0') {
    str = sign + padStr + str;
  } else {
    str = padStr + sign + str;
  }
  return str;
}

// Get a function for interpolating formatted values into a string.
Utils.formatter = function(fmt) {
  var codeRxp = /%([\',+0]*)([1-9]?)((?:\.[1-9])?)([sdifxX%])/g;
  var literals = [],
      formatCodes = [],
      startIdx = 0,
      prefix = "",
      literal,
      matches;

  while (matches=codeRxp.exec(fmt)) {
    literal = fmt.substring(startIdx, codeRxp.lastIndex - matches[0].length);
    if (matches[0] == '%%') {
      prefix += literal + '%';
    } else {
      literals.push(prefix + literal);
      prefix = '';
      formatCodes.push(matches);
    }
    startIdx = codeRxp.lastIndex;
  }
  literals.push(prefix + fmt.substr(startIdx));

  return function() {
    var str = literals[0],
        n = arguments.length;
    if (n != formatCodes.length) {
      error("[format()] Data does not match format string; format:", fmt, "data:", arguments);
    }
    for (var i=0; i<n; i++) {
      str += formatValue(arguments[i], formatCodes[i]) + literals[i+1];
    }
    return str;
  };
};






function Handler(type, target, callback, listener, priority) {
  this.type = type;
  this.callback = callback;
  this.listener = listener || null;
  this.priority = priority || 0;
  this.target = target;
}

Handler.prototype.trigger = function(evt) {
  if (!evt) {
    evt = new EventData(this.type);
    evt.target = this.target;
  } else if (evt.target != this.target || evt.type != this.type) {
    error("[Handler] event target/type have changed.");
  }
  this.callback.call(this.listener, evt);
}

function EventData(type, target, data) {
  this.type = type;
  this.target = target;
  if (data) {
    Utils.defaults(this, data);
    this.data = data;
  }
}

EventData.prototype.stopPropagation = function() {
  this.__stop__ = true;
};

//  Base class for objects that dispatch events
function EventDispatcher() {}


// @obj (optional) data object, gets mixed into event
// @listener (optional) dispatch event only to this object
EventDispatcher.prototype.dispatchEvent = function(type, obj, listener) {
  var evt;
  // TODO: check for bugs if handlers are removed elsewhere while firing
  var handlers = this._handlers;
  if (handlers) {
    for (var i = 0, len = handlers.length; i < len; i++) {
      var handler = handlers[i];
      if (handler.type == type && (!listener || listener == handler.listener)) {
        if (!evt) {
          evt = new EventData(type, this, obj);
        }
        else if (evt.__stop__) {
            break;
        }
        handler.trigger(evt);
      }
    }
  }
};

EventDispatcher.prototype.addEventListener =
EventDispatcher.prototype.on = function(type, callback, context, priority) {
  context = context || this;
  priority = priority || 0;
  var handler = new Handler(type, this, callback, context, priority);
  // Insert the new event in the array of handlers according to its priority.
  var handlers = this._handlers || (this._handlers = []);
  var i = handlers.length;
  while (--i >= 0 && handlers[i].priority < handler.priority) {}
  handlers.splice(i+1, 0, handler);
  return this;
};

// Remove an event handler.
// @param {string} type Event type to match.
// @param {function(BoundEvent)} callback Event handler function to match.
// @param {*=} context Execution context of the event handler to match.
// @return {number} Returns number of handlers removed (expect 0 or 1).
EventDispatcher.prototype.removeEventListener = function(type, callback, context) {
  context = context || this;
  var count = this.removeEventListeners(type, callback, context);
  return count;
};

// Remove event handlers; passing arguments can limit which listeners to remove
// Returns nmber of handlers removed.
EventDispatcher.prototype.removeEventListeners = function(type, callback, context) {
  var handlers = this._handlers;
  var newArr = [];
  var count = 0;
  for (var i = 0; handlers && i < handlers.length; i++) {
    var evt = handlers[i];
    if ((!type || type == evt.type) &&
      (!callback || callback == evt.callback) &&
      (!context || context == evt.listener)) {
      count += 1;
    }
    else {
      newArr.push(evt);
    }
  }
  this._handlers = newArr;
  return count;
};





var Browser = {

  getPageXY: function(el) {
    var x = 0, y = 0;
    if (el.getBoundingClientRect) {
      var box = el.getBoundingClientRect();
      x = box.left - Browser.pageXToViewportX(0);
      y = box.top - Browser.pageYToViewportY(0);
    }
    else {
      var fixed = Browser.elementIsFixed(el);

      while (el) {
        x += el.offsetLeft || 0;
        y += el.offsetTop || 0;
        el = el.offsetParent;
      }

      if (fixed) {
        var offsX = -Browser.pageXToViewportX(0);
        var offsY = -Browser.pageYToViewportY(0);
        x += offsX;
        y += offsY;
      }
    }

    var obj = {x:x, y:y};
    return obj;
  },

  elementIsFixed: function(el) {
    // get top-level offsetParent that isn't body (cf. Firefox)
    var body = document.body;
    while (el && el != body) {
      var parent = el;
      el = el.offsetParent;
    }

    // Look for position:fixed in the computed style of the top offsetParent.
    // var styleObj = parent && (parent.currentStyle || window.getComputedStyle && window.getComputedStyle(parent, '')) || {};
    var styleObj = parent && Browser.getElementStyle(parent) || {};
    return styleObj['position'] == 'fixed';
  },

  pageXToViewportX: function(x) {
    return x - window.pageXOffset;
  },

  pageYToViewportY: function(y) {
    return y - window.pageYOffset;
  },

  getElementStyle: function(el) {
    return el.currentStyle || window.getComputedStyle && window.getComputedStyle(el, '') || {};
  },

  getClassNameRxp: function(cname) {
    return new RegExp("(^|\\s)" + cname + "(\\s|$)");
  },

  hasClass: function(el, cname) {
    var rxp = this.getClassNameRxp(cname);
    return el && rxp.test(el.className);
  },

  addClass: function(el, cname) {
    var classes = el.className;
    if (!classes) {
      classes = cname;
    }
    else if (!this.hasClass(el, cname)) {
      classes = classes + ' ' + cname;
    }
    el.className = classes;
  },

  removeClass: function(el, cname) {
    var rxp = this.getClassNameRxp(cname);
    el.className = el.className.replace(rxp, "$2");
  },

  replaceClass: function(el, c1, c2) {
    var r1 = this.getClassNameRxp(c1);
    el.className = el.className.replace(r1, '$1' + c2 + '$2');
  },

  mergeCSS: function(s1, s2) {
    var div = this._cssdiv;
    if (!div) {
      div = this._cssdiv = document.createElement('div');
    }
    div.style.cssText = s1 + ";" + s2; // extra ';' for ie, which may leave off final ';'
    return div.style.cssText;
  },

  addCSS: function(el, css) {
    el.style.cssText = Browser.mergeCSS(el.style.cssText, css);
  },

  // Return: HTML node reference or null
  // Receive: node reference or id or "#" + id
  getElement: function(ref) {
    var el;
    if (typeof ref == 'string') {
      if (ref.charAt(0) == '#') {
        ref = ref.substr(1);
      }
      if (ref == 'body') {
        el = document.getElementsByTagName('body')[0];
      }
      else {
        el = document.getElementById(ref);
      }
    }
    else if (ref && ref.nodeType !== void 0) {
      el = ref;
    }
    return el || null;
  },

  undraggable: function(el) {
    el.ondragstart = function(){return false;};
    el.draggable = false;
  }

};

Browser.onload = function(handler) {
  if (document.readyState == 'complete') {
    handler();
  } else {
    window.addEventListener('load', handler);
  }
};




var classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    tagOrIdSelectorRE = /^#?[\w-]+$/;

function Elements(sel) {
  if ((this instanceof Elements) == false) {
    return new Elements(sel);
  }
  this.elements = [];
  this.select(sel);
  this.tmp = new El();
}

Elements.prototype = {
  size: function() {
    return this.elements.length;
  },

  select: function(sel) {
    this.elements = Elements.__select(sel);
    return this;
  },

  addClass: function(className) {
    this.forEach(function(el) { el.addClass(className); });
    return this;
  },

  removeClass: function(className) {
    this.forEach(function(el) { el.removeClass(className); })
    return this;
  },

  forEach: function(callback, ctx) {
    var tmp = this.tmp;
    for (var i=0, len=this.elements.length; i<len; i++) {
      tmp.el = this.elements[i];
      callback.call(ctx, tmp, i);
    }
    return this;
  }
};

Elements.__select = function(selector, root) {
  root = root || document;
  var els;
  if (classSelectorRE.test(selector)) {
    els = Elements.__getElementsByClassName(RegExp.$1, root);
  }
  else if (tagSelectorRE.test(selector)) {
    els = root.getElementsByTagName(selector);
  }
  else if (document.querySelectorAll) {
    try {
      els = root.querySelectorAll(selector)
    } catch (e) {
      error("Invalid selector:", selector);
    }
  } else {
    error("This browser doesn't support CSS query selectors");
  }
  //return Array.prototype.slice.call(els);
  return Utils.toArray(els);
}

Elements.__getElementsByClassName = function(cname, node) {
  if (node.getElementsByClassName) {
    return node.getElementsByClassName(cname);
  }
  var a = [];
  var re = new RegExp('(^| )'+cname+'( |$)');
  var els = node.getElementsByTagName("*");
  for (var i=0, j=els.length; i<j; i++)
    if (re.test(els[i].className)) a.push(els[i]);
  return a;
};

// Converts dash-separated names (e.g. background-color) to camelCase (e.g. backgroundColor)
// Doesn't change names that are already camelCase
//
El.toCamelCase = function(str) {
  var cc = str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() });
  return cc;
};

El.fromCamelCase = function(str) {
  var dashed = str.replace(/([A-Z])/g, "-$1").toLowerCase();
  return dashed;
};

El.setStyle = function(el, name, val) {
  var jsName = El.toCamelCase(name);
  if (el.style[jsName] == void 0) {
    trace("[Element.setStyle()] css property:", jsName);
    return;
  }
  var cssVal = val;
  if (isFinite(val)) {
    cssVal = String(val); // problem if converted to scientific notation
    if (jsName != 'opacity' && jsName != 'zIndex') {
      cssVal += "px";
    }
  }
  el.style[jsName] = cssVal;
}

El.findAll = function(sel, root) {
  return Elements.__select(sel, root);
};

function El(ref) {
  if (!ref) error("Element() needs a reference");
  if (ref instanceof El) {
    return ref;
  }
  else if (this instanceof El === false) {
    return new El(ref);
  }

  var node;
  if (Utils.isString(ref)) {
    if (El.isHTML(ref)) {
      var parent = El('div').html(ref).node();
      node = parent.childNodes.length  == 1 ? parent.childNodes[0] : parent;
    } else if (tagOrIdSelectorRE.test(ref)) {
      node = Browser.getElement(ref) || document.createElement(ref); // TODO: detect type of argument
    } else {
      node = Elements.__select(ref)[0];
    }
  } else if (ref.tagName) {
    node = ref;
  }
  if (!node) error("Unmatched element selector:", ref);
  this.el = node;
}

Utils.inherit(El, EventDispatcher); //

El.removeAll = function(sel) {
  var arr = Elements.__select(sel);
  Utils.forEach(arr, function(el) {
    El(el).remove();
  });
};

El.isHTML = function(str) {
  return str && str[0] == '<'; // TODO: improve
};

Utils.extend(El.prototype, {

  clone: function() {
    var el = this.el.cloneNode(true);
    if (el.nodeName == 'SCRIPT') {
      // Assume scripts are templates and convert to divs, so children
      //    can
      el = El('div').addClass(el.className).html(el.innerHTML).node();
    }
    el.id = Utils.getUniqueName();
    this.el = el;
    return this;
  },

  node: function() {
    return this.el;
  },

  width: function() {
   return this.el.offsetWidth;
  },

  height: function() {
    return this.el.offsetHeight;
  },

  top: function() {
    return this.el.offsetTop;
  },

  left: function() {
    return this.el.offsetLeft;
  },

  // Apply inline css styles to this Element, either as string or object.
  //
  css: function(css, val) {
    if (val != null) {
      El.setStyle(this.el, css, val);
    }
    else if (Utils.isString(css)) {
      Browser.addCSS(this.el, css);
    }
    else if (Utils.isObject(css)) {
      Utils.forEachProperty(css, function(val, key) {
        El.setStyle(this.el, key, val);
      }, this);
    }
    return this;
  },

  attr: function(obj, value) {
    if (Utils.isString(obj)) {
      if (arguments.length == 1) {
        return this.el.getAttribute(obj);
      }
      this.el[obj] = value;
    }
    else if (!value) {
      Opts.copyAllParams(this.el, obj);
    }
    return this;
  },


  remove: function(sel) {
    this.el.parentNode && this.el.parentNode.removeChild(this.el);
    return this;
  },

  addClass: function(className) {
    Browser.addClass(this.el, className);
    return this;
  },

  removeClass: function(className) {
    Browser.removeClass(this.el, className);
    return this;
  },

  classed: function(className, b) {
    this[b ? 'addClass' : 'removeClass'](className);
    return this;
  },

  hasClass: function(className) {
    return Browser.hasClass(this.el, className);
  },

  toggleClass: function(cname) {
    if (this.hasClass(cname)) {
      this.removeClass(cname);
    } else {
      this.addClass(cname);
    }
  },

  computedStyle: function() {
    return Browser.getElementStyle(this.el);
  },

  visible: function() {
    if (this._hidden !== undefined) {
      return !this._hidden;
    }
    var style = this.computedStyle();
    return style.display != 'none' && style.visibility != 'hidden';
  },

  showCSS: function(css) {
    if (!css) {
      return this._showCSS || "display:block;";
    }
    this._showCSS = css;
    return this;
  },

  hideCSS: function(css) {
    if (!css) {
      return this._hideCSS || "display:none;";
    }
    this._hideCSS = css;
    return this;
  },

  hide: function(css) {
    if (this.visible()) {
      // var styles = Browser.getElementStyle(this.el);
      // this._display = styles.display;
      this.css(css || this.hideCSS());
      this._hidden = true;
    }
    return this;
  },

  show: function(css) {
    if (!this.visible()) {
      this.css(css || this.showCSS());
      this._hidden = false;
    }
    return this;
  },

  init: function(callback) {
    if (!this.el['data-el-init']) {
      callback(this);
      this.el['data-el-init'] = true;
    }
    return this;
  },

  html: function(html) {
    if (arguments.length == 0) {
      return this.el.innerHTML;
    } else {
      this.el.innerHTML = html;
      return this;
    }
  },

  text: function(obj) {
    if (Utils.isArray(obj)) {
      for (var i=0, el = this; i<obj.length && el; el=el.sibling(), i++) {
        el.text(obj[i]);
      }
    } else {
      this.html(obj);
    }
    return this;
  },

  // Shorthand for attr('id', <name>)
  id: function(id) {
    if (id) {
      this.el.id = id;
      return this;
    }
    return this.el.id;
  },

  findChild: function(sel) {
    var node = Elements.__select(sel, this.el)[0];
    if (!node) error("Unmatched selector:", sel);
    return new El(node);
  },

  appendTo: function(ref) {
    var parent = ref instanceof El ? ref.el : Browser.getElement(ref);
    if (this._sibs) {
      for (var i=0, len=this._sibs.length; i<len; i++) {
        parent.appendChild(this._sibs[i]);
      }
    }
    parent.appendChild(this.el);
    return this;
  },

  /**
   * Called with tagName: create new El as sibling of this El
   * No argument: traverse to next sibling
   */
  sibling: function(arg) {
    trace("Use newSibling or nextSibling instead of El.sibling()")
    return arg ? this.newSibling(arg) : this.nextSibling();
  },

  nextSibling: function() {
    return this.el.nextSibling ? new El(this.el.nextSibling) : null;
  },

  newSibling: function(tagName) {
    var el = this.el,
        sib = document.createElement(tagName),
        e = new El(sib),
        par = el.parentNode;
    if (par) {
      el.nextSibling ? par.insertBefore(sib, el.nextSibling) : par.appendChild(sib);
    } else {
      e._sibs = this._sibs || [];
      e._sibs.push(el);
    }
    return e;
  },


  /**
   * Called with tagName: Create new El, append as child to current El
   * Called with no arg: Traverse to first child.
   */
  child: function(arg) {
    error("Use El.newChild or El.firstChild instead of El.child()");
    return arg ? this.newChild(arg) : this.firstChild();
  },

  firstChild: function() {
    var ch = this.el.firstChild;
    while (ch.nodeType != 1) { // skip text nodes
      ch = ch.nextSibling;
    }
    return new El(ch);
  },

  appendChild: function(ref) {
    var el = El(ref);
    this.el.appendChild(el.el);
    return this;
  },

  newChild: function(tagName) {
    var ch = document.createElement(tagName);
    this.el.appendChild(ch);
    return new El(ch);
  },

  // Traverse to parent node
  //
  parent: function(sel) {
    sel && error("El.parent() no longer takes an argument; see findParent()")
    var p = this.el && this.el.parentNode;
    return p ? new El(p) : null;
  },

  findParent: function(tagName) {
    // error("TODO: use selector instead of tagname")
    var p = this.el && this.el.parentNode;
    if (tagName) {
      tagName = tagName.toUpperCase();
      while (p && p.tagName != tagName) {
        p = p.parentNode;
      }
    }
    return p ? new El(p) : null;
  },

  // Remove all children of this element
  //
  empty: function() {
    this.el.innerHTML = '';
    return this;
  }

});

// use DOM handler for certain events
// TODO: find a better way distinguising DOM events and other events registered on El
// e.g. different methods
//
//El.prototype.__domevents = Utils.arrayToIndex("click,mousedown,mousemove,mouseup".split(','));
El.prototype.__on = El.prototype.on;
El.prototype.on = function(type, func, ctx) {
  if (ctx) {
    error("[El#on()] Third argument no longer supported.");
  }
  if (this.constructor == El) {
    this.el.addEventListener(type, func);
  } else {
    this.__on.apply(this, arguments);
  }
  return this;
};

El.prototype.__removeEventListener = El.prototype.removeEventListener;
El.prototype.removeEventListener = function(type, func) {
  if (this.constructor == El) {
    this.el.addEventListener(type, func);
  } else {
    this.__removeEventListener.apply(this, arguments);
  }
  return this;
};




function ElementPosition(ref) {
  var self = this,
      el = El(ref),
      pageX = 0,
      pageY = 0,
      width = 0,
      height = 0;

  el.on('mouseover', update);
  window.onorientationchange && window.addEventListener('orientationchange', update);
  window.addEventListener('scroll', update);
  window.addEventListener('resize', update);

  // trigger an update, e.g. when map container is resized
  this.update = function() {
    update();
  };

  this.resize = function(w, h) {
    el.css('width', w).css('height', h);
    update();
  };

  this.width = function() { return width };
  this.height = function() { return height };
  this.position = function() {
    return {
      element: el.node(),
      pageX: pageX,
      pageY: pageY,
      width: width,
      height: height
    };
  };

  function update() {
    var div = el.node(),
        xy = Browser.getPageXY(div),
        w = div.clientWidth,
        h = div.clientHeight,
        x = xy.x,
        y = xy.y,
        resized = w != width || h != height,
        moved = x != pageX || y != pageY;
    if (resized || moved) {
      pageX = x, pageY = y, width = w, height = h;
      self.dispatchEvent('change', self.position());
      if (resized) {
        self.dispatchEvent('resize', self.position());
      }
    }
  }
  update();
}

Utils.inherit(ElementPosition, EventDispatcher);




function Timer() {
  var self = this,
      interval = 25,
      id, duration, start, prev;

  this.start = function(ms) {
    var now = +new Date();
    duration = ms;
    start = now;
    if (!id) { // not currently running
      prev = now;
      startTick();
    }
  };

  this.stop = function() {
    clearTimeout(id);
    id = null;
  };

  function startTick() {
    id = setTimeout(onTick, interval);
  }

  function onTick() {
    var now = +new Date(),
        elapsed = now - start,
        pct = Math.min((elapsed + 10) / duration, 1),
        done = pct >= 1,
        evt = {
          done: done, pct: pct, time: now, elapsed: elapsed,
          scale: (now - prev) / interval
        };
        prev = now;
    if (done) {
      id = null;
    } else {
      startTick();
    }
    self.dispatchEvent('tick', evt);
  }
}

Utils.inherit(Timer, EventDispatcher);

function Tween(ease) {
  var self = this,
      timer = new Timer(),
      start, end;

  timer.on('tick', onTick);

  this.start = function(a, b, duration) {
    start = a;
    end = b;
    timer.start(duration || 500);
  };

  function onTick(e) {
    var pct = ease ? ease(e.pct) : e.pct,
        val = end * pct + start * (1 - pct);
    self.dispatchEvent('change', {value: val});
  }
}

Utils.inherit(Tween, EventDispatcher);

Tween.sineInOut = function(n) {
  return 0.5 - Math.cos(n * Math.PI) / 2;
};

Tween.quadraticOut = function(n) {
  return 1 - Math.pow((1 - n), 2);
};




// @mouse: MouseArea object
function MouseWheel(mouse) {
  var self = this,
      prevWheelTime = 0,
      currDirection = 0,
      timer = new Timer().addEventListener('tick', onTick),
      sustainTime = 60,
      fadeTime = 80;

  if (window.onmousewheel !== undefined) { // ie, webkit
    window.addEventListener('mousewheel', handleWheel);
  } else { // firefox
    window.addEventListener('DOMMouseScroll', handleWheel);
  }

  function handleWheel(evt) {
    var direction = 1; // 1 = zoom in / scroll up, -1 = zoom out / scroll down
    if (!mouse.isOver()) return;
    evt.preventDefault();
    if (evt.wheelDelta) {
      direction = evt.wheelDelta > 0 ? 1 : -1;
    } else if (evt.detail) {
      direction = evt.detail > 0 ? -1 : 1;
    }
    prevWheelTime = +new Date();
    if (!currDirection) {
      self.dispatchEvent('mousewheelstart');
    }
    currDirection = direction;
    timer.start(sustainTime + fadeTime);
  }

  function onTick(evt) {
    var elapsed = evt.time - prevWheelTime,
        fadeElapsed = elapsed - sustainTime,
        scale = evt.scale,
        obj;
    if (evt.done) {
      currDirection = 0;
    } else {
      if (fadeElapsed > 0) {
        // Decelerate if the timer fires during 'fade time' (for smoother zooming)
        scale *= Tween.quadraticOut((fadeTime - fadeElapsed) / fadeTime);
      }
      obj = utils.extend({direction: currDirection, multiplier: scale}, mouse.mouseData());
      self.dispatchEvent('mousewheel', obj);
    }
  }
}

Utils.inherit(MouseWheel, EventDispatcher);




function MouseArea(element) {
  var pos = new ElementPosition(element),
      _areaPos = pos.position(),
      _self = this,
      _dragging = false,
      _isOver = false,
      _moveEvt,
      _downEvt;

  pos.on('change', function() {_areaPos = pos.position()});

  // TODO: think about touch events
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  element.addEventListener('mouseover', onAreaEnter);
  element.addEventListener('mousemove', onAreaEnter);
  element.addEventListener('mouseout', onAreaOut);
  element.addEventListener('mousedown', onAreaDown);
  element.addEventListener('dblclick', onAreaDblClick);

  function onAreaDown(e) {
    e.preventDefault(); // prevent text selection cursor on drag
  }

  function onAreaEnter() {
    if (!_isOver) {
      _isOver = true;
      _self.dispatchEvent('enter');
    }
  }

  function onAreaOut(e) {
    _isOver = false;
    _self.dispatchEvent('leave');
  }

  function onMouseUp(e) {
    var evt = procMouseEvent(e),
        elapsed, dx, dy;
    if (_dragging) {
      _dragging = false;
      _self.dispatchEvent('dragend', evt);
    }
    if (_downEvt) {
      elapsed = evt.time - _downEvt.time;
      dx = evt.pageX - _downEvt.pageX;
      dy = evt.pageY - _downEvt.pageY;
      if (elapsed < 500 && Math.sqrt(dx * dx + dy * dy) < 6) {
        _self.dispatchEvent('click', evt);
      }
      _downEvt = null;
    }
  }

  function onMouseDown(e) {
    if (e.button != 2 && e.which != 3) { // ignore right-click
      _downEvt = _moveEvt;
    }
  }

  function onMouseMove(e) {
    _moveEvt = procMouseEvent(e, _moveEvt);
    if (!_dragging && _downEvt && _downEvt.hover) {
      _dragging = true;
      _self.dispatchEvent('dragstart', procMouseEvent(e));
    }

    if (_dragging) {
      var obj = {
        dragX: _moveEvt.pageX - _downEvt.pageX,
        dragY: _moveEvt.pageY - _downEvt.pageY
      };
      _self.dispatchEvent('drag', Utils.extend(obj, _moveEvt));
    }
  }

  function onAreaDblClick(e) {
    if (_isOver) _self.dispatchEvent('dblclick', procMouseEvent(e));
  }

  function procMouseEvent(e, prev) {
    var pageX = e.pageX,
        pageY = e.pageY;

    return {
      shiftKey: e.shiftKey,
      time: +new Date,
      pageX: pageX,
      pageY: pageY,
      hover: _isOver,
      x: pageX - _areaPos.pageX,
      y: pageY - _areaPos.pageY,
      dx: prev ? pageX - prev.pageX : 0,
      dy: prev ? pageY - prev.pageY : 0
    };
  }

  this.isOver = function() {
    return _isOver;
  }

  this.isDown = function() {
    return !!_downEvt;
  }

  this.mouseData = function() {
    return Utils.extend({}, _moveEvt);
  }
}

Utils.inherit(MouseArea, EventDispatcher);





var api = {};
var MapShaper = api.internal = {};
var geom = api.geom = {};
var utils = api.utils = Utils.extend({}, Utils);

MapShaper.LOGGING = false;
MapShaper.TRACING = false;
MapShaper.VERBOSE = false;

api.enableLogging = function() {
  MapShaper.LOGGING = true;
  return api;
};

api.printError = function(err) {
  var msg;
  if (utils.isString(err)) {
    err = new APIError(err);
  }
  if (MapShaper.LOGGING && err.name == 'APIError') {
    if (err.message) {
      message("Error:", err.message);
    }
    message("Run mapshaper -h to view help");
  } else {
    throw err;
  }
};

function APIError(msg) {
  var err = new Error(msg);
  err.name = 'APIError';
  return err;
}

var warning = function() {
  message("Warning: " + MapShaper.formatLogArgs(arguments));
};

var message = function() {
  if (MapShaper.LOGGING) {
    MapShaper.logArgs(arguments);
  }
};

var verbose = function() {
  if (MapShaper.VERBOSE && MapShaper.LOGGING) {
    MapShaper.logArgs(arguments);
  }
};

var trace = function() {
  if (MapShaper.TRACING) {
    MapShaper.logArgs(arguments);
  }
};

MapShaper.formatLogArgs = function(args) {
  return utils.toArray(args).join(' ');
};

// Format an array of (preferably short) strings in columns for console logging.
MapShaper.formatStringsAsGrid = function(arr) {
  // TODO: variable column width
  var longest = arr.reduce(function(len, str) {
        return Math.max(len, str.length);
      }, 0),
      colWidth = longest + 1,
      perLine = Math.floor(80 / colWidth) || 1;
  return arr.reduce(function(str, name, i) {
    if (i > 0 && i % perLine === 0) str += '\n';
    return str + ' ' + utils.rpad(name, colWidth-1, ' ');
  }, '');
};

MapShaper.logArgs = function(args) {
  if (utils.isArrayLike(args)) {
    (console.error || console.log).call(console, MapShaper.formatLogArgs(args));
  }
};

function absArcId(arcId) {
  return arcId >= 0 ? arcId : ~arcId;
}

utils.wildcardToRegExp = function(name) {
  var rxp = name.split('*').map(function(str) {
    return utils.regexEscape(str);
  }).join('.*');
  return new RegExp(rxp);
};

MapShaper.expandoBuffer = function(constructor, rate) {
  var capacity = 0,
      k = rate >= 1 ? rate : 1.2,
      buf;
  return function(size) {
    if (size > capacity) {
      capacity = Math.ceil(size * k);
      buf = new constructor(capacity);
    }
    return buf;
  };
};

MapShaper.copyElements = function(src, i, dest, j, n, rev) {
  if (src === dest && j > i) error ("copy error");
  var inc = 1,
      offs = 0;
  if (rev) {
    inc = -1;
    offs = n - 1;
  }
  for (var k=0; k<n; k++, offs += inc) {
    dest[k + j] = src[i + offs];
  }
};

MapShaper.extendBuffer = function(src, newLen, copyLen) {
  var len = Math.max(src.length, newLen);
  var n = copyLen || src.length;
  var dest = new src.constructor(len);
  MapShaper.copyElements(src, 0, dest, 0, n);
  return dest;
};

MapShaper.mergeNames = function(name1, name2) {
  var merged = "";
  if (name1 && name2) {
    merged = utils.findStringPrefix(name1, name2).replace(/[-_]$/, '');
  }
  return merged;
};

utils.findStringPrefix = function(a, b) {
  var i = 0;
  for (var n=a.length; i<n; i++) {
    if (a[i] !== b[i]) break;
  }
  return a.substr(0, i);
};

// Similar to isFinite() but returns false for null
utils.isFiniteNumber = function(val) {
  return isFinite(val) && val !== null;
};

MapShaper.getWorldBounds = function(e) {
  e = utils.isFiniteNumber(e) ? e : 1e-10;
  return [-180 + e, -90 + e, 180 - e, 90 - e];
};

MapShaper.probablyDecimalDegreeBounds = function(b) {
  var world = MapShaper.getWorldBounds(-1), // add a bit of excess
      bbox = (b instanceof Bounds) ? b.toArray() : b;
  return containsBounds(world, bbox);
};

MapShaper.layerHasGeometry = function(lyr) {
  return MapShaper.layerHasPaths(lyr) || MapShaper.layerHasPoints(lyr);
};

MapShaper.layerHasPaths = function(lyr) {
  return lyr.shapes && (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline');
};

MapShaper.layerHasPoints = function(lyr) {
  return lyr.shapes && lyr.geometry_type == 'point';
};

MapShaper.requirePolygonLayer = function(lyr, msg) {
  if (!lyr || lyr.geometry_type !== 'polygon') stop(msg || "Expected a polygon layer");
};

MapShaper.requirePathLayer = function(lyr, msg) {
  if (!lyr || !MapShaper.layerHasPaths(lyr)) stop(msg || "Expected a polygon or polyline layer");
};




utils.replaceFileExtension = function(path, ext) {
  var info = utils.parseLocalPath(path);
  return info.pathbase + '.' + ext;
};

utils.getPathSep = function(path) {
  // TODO: improve
  return path.indexOf('/') == -1 && path.indexOf('\\') != -1 ? '\\' : '/';
};

// Parse the path to a file without using Node
// Assumes: not a directory path
utils.parseLocalPath = function(path) {
  var obj = {},
      sep = utils.getPathSep(path),
      parts = path.split(sep),
      i;

  if (parts.length == 1) {
    obj.filename = parts[0];
    obj.directory = "";
  } else {
    obj.filename = parts.pop();
    obj.directory = parts.join(sep);
  }
  i = obj.filename.lastIndexOf('.');
  if (i > -1) {
    obj.extension = obj.filename.substr(i + 1);
    obj.basename = obj.filename.substr(0, i);
    obj.pathbase = path.substr(0, path.lastIndexOf('.'));
  } else {
    obj.extension = "";
    obj.basename = obj.filename;
    obj.pathbase = path;
  }
  return obj;
};

utils.getFileBase = function(path) {
  return utils.parseLocalPath(path).basename;
};

utils.getFileExtension = function(path) {
  return utils.parseLocalPath(path).extension;
};

utils.getPathBase = function(path) {
  return utils.parseLocalPath(path).pathbase;
};

MapShaper.getCommonFileBase = function(names) {
  return names.reduce(function(memo, name, i) {
    if (i === 0) {
      memo = utils.getFileBase(name);
    } else {
      memo = MapShaper.mergeNames(memo, name);
    }
    return memo;
  }, "");
};






// Guess the type of a data file from file extension, or return null if not sure
MapShaper.guessInputFileType = function(file) {
  var ext = utils.getFileExtension(file || '').toLowerCase(),
      type = null;
  if (ext == 'dbf' || ext == 'shp' || ext == 'prj') {
    type = ext;
  } else if (/json$/.test(ext)) {
    type = 'json';
  }
  return type;
};

MapShaper.guessInputContentType = function(content) {
  var type = null;
  if (utils.isString(content)) {
    type = MapShaper.stringIsJsonObject(content) ? 'json' : 'text';
  } else if (utils.isObject(content) && content.type) {
    type = 'json';
  }
  return type;
};

MapShaper.guessInputType = function(file, content) {
  return MapShaper.guessInputFileType(file) || MapShaper.guessInputContentType(content);
};

MapShaper.stringIsJsonObject = function(str) {
  return /^\s*\{/.test(String(str));
};

// Infer output format by considering file name and (optional) input format
MapShaper.inferOutputFormat = function(file, inputFormat) {
  var ext = utils.getFileExtension(file).toLowerCase(),
      format = null;
  if (ext == 'shp') {
    format = 'shapefile';
  } else if (ext == 'dbf') {
    format = 'dbf';
  } else if (/json$/.test(ext)) {
    format = 'geojson';
    if (ext == 'topojson' || inputFormat == 'topojson' && ext != 'geojson') {
      format = 'topojson';
    }
  } else if (/csv|tsv|txt$/.test(ext)) {
    format = 'dsv';
  } else if (inputFormat) {
    format = inputFormat;
  }
  return format;
};

MapShaper.isSupportedOutputFormat = function(fmt) {
  var types = ['geojson', 'topojson', 'dsv', 'dbf', 'shapefile'];
  return types.indexOf(fmt) > -1;
};

// Assumes file at @path is one of Mapshaper's supported file types
MapShaper.isBinaryFile = function(path) {
  var ext = utils.getFileExtension(path).toLowerCase();
  return ext == 'shp' || ext == 'dbf' || ext == 'zip'; // GUI accepts zip files
};

// Detect extensions of some unsupported file types, for cmd line validation
MapShaper.filenameIsUnsupportedOutputType = function(file) {
  var rxp = /\.(shx|prj|xls|xlsx|gdb|sbn|sbx|xml|kml)$/i;
  return rxp.test(file);
};




function Message(str) {
  var wrapper = El('div').appendTo('#page-wrapper').addClass('error-wrapper');
  var box = El('div').appendTo(wrapper).addClass('error-box g-info-box');
  var msg = El('div').addClass('error-message').appendTo(box);
  var close = El('div').addClass("g-panel-btn error-btn active").appendTo(box).html('close');

  new SimpleButton(close).on('click', remove);

  message(str);

  function message(str) {
    msg.html(str);
  }

  function remove() {
    wrapper.remove();
  }
}



var gui = api.gui = {};
var error = stop; // replace default error() function
window.mapshaper = api;

api.enableLogging();

// Show a popup error message, then throw an error
function stop() {
  var msg = gui.formatMessageArgs(arguments);
  new Message(msg);
  throw new APIError(msg);
}

gui.browserIsSupported = function() {
  return Env.inBrowser && Env.canvas && typeof ArrayBuffer != 'undefined' &&
    typeof Blob != 'undefined' && typeof File != 'undefined';
};

gui.formatMessageArgs = function(args) {
  // remove cli annotation (if present)
  return MapShaper.formatLogArgs(args).replace(/^\[[^\]]+\] ?/, '');
};

gui.isReadableFileType = function(filename) {
  return !!MapShaper.guessInputFileType(filename);
};

// Run a series of tasks in sequence. Each task can be run after a timeout.
// TODO: add node-style error handling
gui.queueSync = function() {
  var tasks = [],
      timeouts = [];
  return {
    defer: function(task, timeout) {
      tasks.push(task);
      timeouts.push(timeout | 0);
      return this;
    },
    await: function(done) {
      var retn;
      runNext();
      function runNext() {
        var task = tasks.shift(),
            ms = timeouts.shift();
        if (task) {
          setTimeout(function() {
            retn = task(retn);
            runNext();
          }, ms);
        } else {
          done(retn);
        }
      }
    } // await()
  };
};




function draggable(ref) {
  var xdown, ydown;
  var el = El(ref),
      dragging = false,
      obj = new EventDispatcher();
  Browser.undraggable(el.node());
  el.on('mousedown', function(e) {
    xdown = e.pageX;
    ydown = e.pageY;
    window.addEventListener('mousemove', onmove);
    window.addEventListener('mouseup', onrelease);
  });

  function onrelease(e) {
    window.removeEventListener('mousemove', onmove);
    window.removeEventListener('mouseup', onrelease);
    if (dragging) {
      dragging = false;
      obj.dispatchEvent('dragend');
    }
  }

  function onmove(e) {
    if (!dragging) {
      dragging = true;
      obj.dispatchEvent('dragstart');
    }
    obj.dispatchEvent('drag', {dx: e.pageX - xdown, dy: e.pageY - ydown});
  }
  return obj;
}

function Slider(ref, opts) {
  var _el = El(ref);
  var _self = this;
  var defaults = {
    space: 7
  };
  opts = utils.extend(defaults, opts);

  var _pct = 0;
  var _track,
      _handle,
      _handleLeft = opts.space;

  function size() {
    return _track ? _track.width() - opts.space * 2 : 0;
  }

  this.track = function(ref) {
    if (ref && !_track) {
      _track = El(ref);
      _handleLeft = _track.el.offsetLeft + opts.space;
      updateHandlePos();
    }
    return _track;
  };

  this.handle = function(ref) {
    var startX;
    if (ref && !_handle) {
      _handle = El(ref);
      draggable(_handle)
        .on('drag', function(e) {
          setHandlePos(startX + e.dx, true);
        })
        .on('dragstart', function(e) {
          startX = position();
          _self.dispatchEvent('start');
        })
        .on('dragend', function(e) {
          _self.dispatchEvent('end');
        });
      updateHandlePos();
    }
    return _handle;
  };

  function position() {
    return Math.round(_pct * size());
  }

  this.pct = function(pct) {
    if (pct >= 0 && pct <= 1) {
      _pct = pct;
      updateHandlePos();
    }
    return _pct;
  };

  function setHandlePos(x, fire) {
    x = utils.clamp(x, 0, size());
    var pct = x / size();
    if (pct != _pct) {
      _pct = pct;
      _handle.css('left', _handleLeft + x);
      _self.dispatchEvent('change', {pct: _pct});
    }
  }

  function updateHandlePos() {
    var x = _handleLeft + Math.round(position());
    if (_handle) _handle.css('left', x);
  }
}

utils.inherit(Slider, EventDispatcher);


function ClickText(ref) {
  var _el = El(ref);
  var _self = this;
  var _max = Infinity,
      _min = -Infinity,
      _formatter = function(v) {return String(v);},
      _validator = function(v) {return !isNaN(v);},
      _parser = function(s) {return parseFloat(s);},
      _value = 0;

  _el.on('blur', onblur);
  _el.on('keydown', onpress);

  function onpress(e) {
    if (e.keyCode == 27) { // esc
      _self.value(_value); // reset input field to current value
      _el.el.blur();
    } else if (e.keyCode == 13) { // enter
      _el.el.blur();
    }
  }

  // Validate input contents.
  // Update internal value and fire 'change' if valid
  //
  function onblur() {
    var val = _parser(_el.el.value);
    if (val === _value) {
      // return;
    }
    if (_validator(val)) {
      _self.value(val);
      _self.dispatchEvent('change', {value:_self.value()});
    } else {
      _self.value(_value);
      _self.dispatchEvent('error'); // TODO: improve
    }
  }

  this.bounds = function(min, max) {
    _min = min;
    _max = max;
    return this;
  };

  this.validator = function(f) {
    _validator = f;
    return this;
  };

  this.formatter = function(f) {
    _formatter = f;
    return this;
  };

  this.parser = function(f) {
    _parser = f;
    return this;
  };

  this.value = function(arg) {
    if (arg == void 0) {
      // var valStr = this.el.value;
      // return _parser ? _parser(valStr) : parseFloat(valStr);
      return _value;
    }
    var val = utils.clamp(arg, _min, _max);
    if (!_validator(val)) {
      error("ClickText#value() invalid value:", arg);
    } else {
      _value = val;
    }
    _el.el.value = _formatter(val);
    return this;
  };
}

utils.inherit(ClickText, EventDispatcher);


function Checkbox(ref) {
  var _el = El(ref);
}

utils.inherit(Checkbox, EventDispatcher);

function SimpleButton(ref) {
  var _el = El(ref),
      _self = this,
      _active = _el.hasClass('active');

  _el.on('click', function(e) {
    if (_active) _self.dispatchEvent('click');
    return false;
  });

  this.active = function(a) {
    if (a === void 0) return _active;
    if (a !== _active) {
      _active = a;
      _el.toggleClass('active');
    }
    return this;
  };
}

utils.inherit(SimpleButton, EventDispatcher);




var SimplifyControl = function() {
  var _value = 1;
  var el = El('#g-simplify-control');
  var slider = new Slider("#g-simplify-control .g-slider");
  slider.handle("#g-simplify-control .g-handle");
  slider.track("#g-simplify-control .g-track");
  slider.on('change', function(e) {
    var pct = fromSliderPct(e.pct);
    text.value(pct);
    onchange(pct);
  });
  slider.on('start', function(e) {
    control.dispatchEvent('simplify-start');
  }).on('end', function(e) {
    control.dispatchEvent('simplify-end');
  });

  var text = new ClickText("#g-simplify-control .g-clicktext");
  text.bounds(0, 1);
  text.formatter(function(val) {
    if (isNaN(val)) return '-';

    var pct = val * 100;
    var decimals = 0;
    if (pct <= 0) decimals = 1;
    else if (pct < 0.001) decimals = 4;
    else if (pct < 0.01) decimals = 3;
    else if (pct < 1) decimals = 2;
    else if (pct < 100) decimals = 1;
    return utils.formatNumber(pct, decimals) + "%";
  });

  text.parser(function(s) {
    return parseFloat(s) / 100;
  });

  text.value(0);
  text.on('change', function(e) {
    var pct = e.value;
    slider.pct(toSliderPct(pct));
    control.dispatchEvent('simplify-start');
    onchange(pct);
    control.dispatchEvent('simplify-end');
  });

  function toSliderPct(p) {
    p = Math.sqrt(p);
    var pct = 1 - p;
    return pct;
  }

  function fromSliderPct(p) {
    var pct = 1 - p;
    return pct * pct;
  }

  function onchange(val) {
    if (_value != val) {
      _value = val;
      control.dispatchEvent('change', {value:val});
    }
  }

  var control = new EventDispatcher();
  control.show = function() {
    el.show();
    El('body').addClass('simplify');
  };
  control.hide = function() {
    el.hide();
    El('body').removeClass('simplify');
  };
  control.reset = function() {
    control.hide();
    control.removeEventListeners();
  };
  control.value = function(val) {
    if (!isNaN(val)) {
      // TODO: validate
      _value = val;
      slider.pct(toSliderPct(val));
      text.value(val);
    }
    return _value;
  };

  control.value(_value);
  return control;
};




// List of encodings supported by iconv-lite:
// https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings

// Return list of supported encodings
MapShaper.getEncodings = function() {
  var iconv = require('iconv-lite');
  iconv.encodingExists('ascii'); // make iconv load its encodings
  return Object.keys(iconv.encodings);
};

MapShaper.encodingIsSupported = function(raw) {
  var enc = MapShaper.standardizeEncodingName(raw);
  return utils.contains(MapShaper.getEncodings(), enc);
};

MapShaper.decodeString = function(buf, encoding) {
  var iconv = require('iconv-lite'),
      str = iconv.decode(buf, encoding);
  // remove BOM if present
  if (str.charCodeAt(0) == 0xfeff) {
    str = str.substr(1);
  }
  return str;
};

// Ex. convert UTF-8 to utf8
MapShaper.standardizeEncodingName = function(enc) {
  return enc.toLowerCase().replace(/[_-]/g, '');
};

MapShaper.printEncodings = function() {
  var encodings = MapShaper.getEncodings().filter(function(name) {
    // filter out some aliases and non-applicable encodings
    return !/^(_|cs|internal|ibm|isoir|singlebyte|table|[0-9]|l[0-9]|windows)/.test(name);
  });
  encodings.sort();
  console.log("Supported encodings:");
  console.log(MapShaper.formatStringsAsGrid(encodings));
};


﻿

// Try to detect the encoding of some sample text.
// Returns an encoding name or null.
// @samples Array of buffers containing sample text fields
// TODO: Improve reliability and number of detectable encodings.
MapShaper.detectEncoding = function(samples) {
  var encoding = null;
  if (MapShaper.looksLikeUtf8(samples)) {
    encoding = 'utf8';
  } else if (MapShaper.looksLikeLatin1(samples)) {
    encoding = 'latin1';
  }
  return encoding;
};

// Convert an array of text samples to a single string using a given encoding
MapShaper.decodeSamples = function(enc, samples) {
  return samples.map(function(buf) {
    return MapShaper.decodeString(buf, enc).trim();
  }).join('\n');
};

MapShaper.formatSamples = function(str) {
  return MapShaper.formatStringsAsGrid(str.split('\n'));
};

// Quick-and-dirty latin1 detection: decoded string contains mostly common ascii
// chars and almost no chars other than word chars + punctuation.
// This excludes encodings like Greek, Cyrillic or Thai, but
// is susceptible to false positives with encodings like codepage 1250 ("Eastern
// European").
MapShaper.looksLikeLatin1 = function(samples) {
  var ascii = 'abcdefghijklmnopqrstuvwxyz0123456789.\'"?-\n,;/ ', // common ascii
      extended = 'ßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ';
  var str = MapShaper.decodeSamples('latin1', samples);
  var asciiScore = MapShaper.getCharScore(str, ascii);
  var totalScore = asciiScore + MapShaper.getCharScore(str, extended);
  return totalScore > 0.98 && asciiScore > 0.7;
};

// Accept string if it doesn't contain the "replacement character"
MapShaper.looksLikeUtf8 = function(samples) {
  var str = MapShaper.decodeSamples('utf8', samples);
  return str.indexOf('\ufffd') == -1;
};

// Calc percentage of chars in a string that are present in a second string
// @chars String of chars to look for in @str
MapShaper.getCharScore = function(str, chars) {
  var index = {}, count = 0;
  str = str.toLowerCase(); //
  for (var i=0, n=chars.length; i<n; i++) {
    index[chars[i]] = 1;
  }
  for (i=0, n=str.length; i<n; i++) {
    count += index[str[i]] || 0;
  }
  return count / str.length;
};



//
// DBF format references:
// http://www.dbf2002.com/dbf-file-format.html
// http://www.digitalpreservation.gov/formats/fdd/fdd000325.shtml
// http://www.clicketyclick.dk/databases/xbase/format/index.html
// http://www.clicketyclick.dk/databases/xbase/format/data_types.html

var Dbf = {};

// source: http://webhelp.esri.com/arcpad/8.0/referenceguide/index.htm#locales/task_code.htm
Dbf.languageIds = [0x01,'437',0x02,'850',0x03,'1252',0x08,'865',0x09,'437',0x0A,'850',0x0B,'437',0x0D,'437',0x0E,'850',0x0F,'437',0x10,'850',0x11,'437',0x12,'850',0x13,'932',0x14,'850',0x15,'437',0x16,'850',0x17,'865',0x18,'437',0x19,'437',0x1A,'850',0x1B,'437',0x1C,'863',0x1D,'850',0x1F,'852',0x22,'852',0x23,'852',0x24,'860',0x25,'850',0x26,'866',0x37,'850',0x40,'852',0x4D,'936',0x4E,'949',0x4F,'950',0x50,'874',0x57,'1252',0x58,'1252',0x59,'1252',0x64,'852',0x65,'866',0x66,'865',0x67,'861',0x6A,'737',0x6B,'857',0x6C,'863',0x78,'950',0x79,'949',0x7A,'936',0x7B,'932',0x7C,'874',0x86,'737',0x87,'852',0x88,'857',0xC8,'1250',0xC9,'1251',0xCA,'1254',0xCB,'1253',0xCC,'1257'];

// Language & Language family names for some code pages
Dbf.encodingNames = {
  '932': "Japanese",
  '936': "Simplified Chinese",
  '950': "Traditional Chinese",
  '1252': "Western European",
  '949': "Korean",
  '874': "Thai",
  '1250': "Eastern European",
  '1251': "Russian",
  '1254': "Turkish",
  '1253': "Greek",
  '1257': "Baltic"
};

Dbf.lookupCodePage = function(lid) {
  var i = Dbf.languageIds.indexOf(lid);
  return i == -1 ? null : Dbf.languageIds[i+1];
};

Dbf.readAsciiString = function(bin, field) {
  var require7bit = Env.inNode;
  var str = bin.readCString(field.size, require7bit);
  if (str === null) {
    stop("DBF file contains non-ascii text data. You need to specify an encoding.\n" +
        "Run mapshaper -encodings for a list of supported encodings");
  }
  return utils.trim(str);
};

Dbf.readStringBytes = function(bin, size, buf) {
  var c;
  for (var i=0; i<size; i++) {
    c = bin.readUint8();
    if (c === 0) break;
    buf[i] = c;
  }
  return i;
};

Dbf.getEncodedStringReader = function(encoding) {
  var buf = new Buffer(256),
      isUtf8 = MapShaper.standardizeEncodingName(encoding) == 'utf8';
  return function(bin, field) {
    var eos = false,
        i = Dbf.readStringBytes(bin, field.size, buf),
        str;
    if (i === 0) {
      str = '';
    } else if (isUtf8) {
      str = buf.toString('utf8', 0, i);
    } else {
      str = MapShaper.decodeString(buf.slice(0, i), encoding); // slice references same memory
    }
    str = utils.trim(str);
    return str;
  };
};

Dbf.getStringReader = function(encoding) {
  if (!encoding || encoding === 'ascii') {
    return Dbf.readAsciiString;
  } else if (Env.inNode) {
    return Dbf.getEncodedStringReader(encoding);
  } else {
    // TODO: user browserify or other means of decoding string data in the browser
    error("[Dbf.getStringReader()] Non-ascii encodings only supported in Node.");
  }
};

Dbf.bufferContainsHighBit = function(buf, n) {
  for (var i=0; i<n; i++) {
    if (buf[i] >= 128) return true;
  }
  return false;
};

Dbf.readNumber = function(bin, field) {
  var str = bin.readCString(field.size);
  return parseFloat(str);
};

Dbf.readInt = function(bin, field) {
  return bin.readInt32();
};

Dbf.readBool = function(bin, field) {
  var c = bin.readCString(field.size),
      val = null;
  if (/[ty]/i.test(c)) val = true;
  else if (/[fn]/i.test(c)) val = false;
  return val;
};

Dbf.readDate = function(bin, field) {
  var str = bin.readCString(field.size),
      yr = str.substr(0, 4),
      mo = str.substr(4, 2),
      day = str.substr(6, 2);
  return new Date(Date.UTC(+yr, +mo - 1, +day));
};

// Truncate and/or uniqify a name (if relevant params are present)
Dbf.adjustFieldName = function(name, maxLen, i) {
  var name2, suff;
  maxLen = maxLen || 256;
  if (!i) {
    name2 = name.substr(0, maxLen);
  } else {
    suff = String(i);
    if (suff.length == 1) {
      suff = '_' + suff;
    }
    name2 = name.substr(0, maxLen - suff.length) + suff;
  }
  return name2;
};

// Resolve name conflicts in field names by appending numbers
// @fields Array of field names
// @maxLen (optional) Maximum chars in name
//
Dbf.getUniqFieldNames = function(fields, maxLen) {
  var used = {};
  return fields.map(function(name) {
    var i = 0,
        validName;
    do {
      validName = Dbf.adjustFieldName(name, maxLen, i);
      i++;
    } while (validName in used);
    used[validName] = true;
    return validName;
  });
};

// cf. http://code.google.com/p/stringencoding/
//
// @src is a Buffer or ArrayBuffer or filename
//
function DbfReader(src, encoding) {
  if (utils.isString(src)) {
    error("[DbfReader] Expected a buffer, not a string");
  }
  this.bin = new BinArray(src);
  this.header = this.readHeader(this.bin);
  this.encoding = encoding ? encoding : this.findStringEncoding();
  // console.log("encoding:", this.encoding, "id:", this.header.ldid)
}

DbfReader.prototype.rows = function() {
  return this.header.recordCount;
};

DbfReader.prototype.findStringEncoding = function() {
  // check the ldid (language driver id) (an obsolete way to specify which
  // codepage to use for text encoding.)
  // ArcGIS up to v.10.1 sets ldid and encoding based on the 'locale' of the
  // user's Windows system :P
  //
  var ldid = this.header.ldid,
      codepage = Dbf.lookupCodePage(ldid),
      samples = this.getNonAsciiSamples(50),
      only7bit = samples.length === 0,
      encoding, msg;

  if (codepage && ldid != 87) {
    // if 8-bit data is found and codepage is detected, use the codepage,
    // except ldid 87, which some GIS software uses regardless of encoding.
    encoding = codepage;
  } else if (only7bit) {
    // Text with no 8-bit chars should be compatible with 7-bit ascii
    // (Most encodings are supersets of ascii)
    encoding = 'ascii';
  }

  // As a last resort, try to guess the encoding:
  if (!encoding) {
    encoding = MapShaper.detectEncoding(samples);
  }
  if (!encoding) {
    stop("[dbf] You need to specify the text encoding of this dbf file.\n" +
        "Run mapshaper -encodings for a list of supported encodings");
  }

  // Show a sample of decoded text if non-ascii-range text has been found
  if (samples.length > 0) {
    msg = "[dbf] Detected encoding: " + encoding;
    if (encoding in Dbf.encodingNames) {
      msg += " (" + Dbf.encodingNames[encoding] + ")";
    }
    message(msg);
    msg = MapShaper.decodeSamples(encoding, samples);
    msg = MapShaper.formatStringsAsGrid(msg.split('\n'));
    message("[dbf] Sample text:" + (msg.length > 60 ? '\n' : '') + msg);
  }
  return encoding;
};



// Return up to @size buffers containing text samples
// with at least one byte outside the 7-bit ascii range.
// TODO: remove duplication with readRows()
DbfReader.prototype.getNonAsciiSamples = function(size) {
  var samples = [];
  var stringFields = this.header.fields.filter(function(f) {
    return f.type == 'C';
  });
  var rowOffs = this.getRowOffset();
  var buf = new Buffer(256);
  var f, chars;
  for (var r=0, rows=this.rows(); r<rows; r++) {
    for (var c=0, cols=stringFields.length; c<cols; c++) {
      if (samples.length >= size) break;
      f = stringFields[c];
      this.bin.position(rowOffs(r) + f.columnOffset);
      chars = Dbf.readStringBytes(this.bin, f.size, buf);
      if (chars > 0 && Dbf.bufferContainsHighBit(buf, chars)) {
        samples.push(new Buffer(buf.slice(0, chars))); // make a copy
      }
    }
  }
  return samples;
};

DbfReader.prototype.getRowOffset = function() {
  var start = this.header.headerSize,
      recLen = this.header.recordSize;
  return function(r) {
    return start + recLen * r;
  };
};

DbfReader.prototype.getRecordReader = function(header, encoding) {
  var fields = header.fields,
      readers = fields.map(this.getFieldReader, this),
      uniqNames = Dbf.getUniqFieldNames(utils.pluck(fields, 'name')),
      rowOffs = this.getRowOffset(),
      bin = this.bin;
  return function(r) {
    var rec = {},
        offs = rowOffs(r);
    for (var c=0, cols=fields.length; c<cols; c++) {
      bin.position(offs + fields[c].columnOffset);
      rec[uniqNames[c]] = readers[c](bin, fields[c]);
    }
    return rec;
  };
};

// @f Field metadata from dbf header
DbfReader.prototype.getFieldReader = function(f) {
  var type = f.type,
      r = null;
  if (type == 'I') {
    r = Dbf.readInt;
  } else if (type == 'F' || type == 'N') {
    r = Dbf.readNumber;
  } else if (type == 'L') {
    r = Dbf.readBool;
  } else if (type == 'D') {
    r = Dbf.readDate;
  } else if (type == 'C') {
    r = Dbf.getStringReader(this.encoding);
  } else {
    message("[dbf] Field \"" + field.name + "\" has an unsupported type (" + field.type + ") -- converting to null values");
    r = function() {return null;};
  }
  return r;
};

DbfReader.prototype.readRows = function() {
  var data = [],
      reader = this.getRecordReader(this.header, this.encoding);
  for (var r=0, rows=this.rows(); r<rows; r++) {
    data.push(reader(r));
  }
  return data;
};

DbfReader.prototype.readHeader = function(bin, encoding) {
  bin.position(0).littleEndian();
  var header = {
    version: bin.readInt8(),
    updateYear: bin.readUint8(),
    updateMonth: bin.readUint8(),
    updateDay: bin.readUint8(),
    recordCount: bin.readUint32(),
    headerSize: bin.readUint16(),
    recordSize: bin.readUint16(),
    incompleteTransaction: bin.skipBytes(2).readUint8(),
    encrypted: bin.readUint8(),
    mdx: bin.skipBytes(12).readUint8(),
    ldid: bin.readUint8()
  };
  var colOffs = 1; // first column starts on second byte of record
  var field;
  bin.skipBytes(2);
  header.fields = [];
  // stop at ascii newline or carriage return (LF is standard, CR has been used)
  while (bin.peek() != 0x0D && bin.peek() != 0x0A) {
    field = this.readFieldHeader(bin, encoding);
    field.columnOffset = colOffs;
    header.fields.push(field);
    colOffs += field.size;
  }
  if (colOffs != header.recordSize)
    error("Record length mismatch; header:", header.recordSize, "detected:", colOffs);
  return header;
};

DbfReader.prototype.readFieldHeader = function(bin, encoding) {
  return {
    name: bin.readCString(11),
    type: String.fromCharCode(bin.readUint8()),
    address: bin.readUint32(),
    size: bin.readUint8(),
    decimals: bin.readUint8(),
    id: bin.skipBytes(2).readUint8(),
    position: bin.skipBytes(2).readUint8(),
    indexFlag: bin.skipBytes(7).readUint8()
  };
};

// export for testing
MapShaper.Dbf = Dbf;
MapShaper.DbfReader = DbfReader;




Dbf.exportRecords = function(arr, encoding) {
  encoding = encoding || 'ascii';
  var fields = Dbf.getFieldNames(arr);
  var uniqFields = Dbf.getUniqFieldNames(fields, 10);
  var rows = arr.length;
  var fieldData = fields.map(function(name) {
    return Dbf.getFieldInfo(arr, name, encoding);
  });

  var headerBytes = Dbf.getHeaderSize(fieldData.length),
      recordBytes = Dbf.getRecordSize(utils.pluck(fieldData, 'size')),
      fileBytes = headerBytes + rows * recordBytes + 1;

  var buffer = new ArrayBuffer(fileBytes);
  var bin = new BinArray(buffer).littleEndian();
  var now = new Date();

  // write header
  bin.writeUint8(3);
  bin.writeUint8(now.getFullYear() - 1900);
  bin.writeUint8(now.getMonth() + 1);
  bin.writeUint8(now.getDate());
  bin.writeUint32(rows);
  bin.writeUint16(headerBytes);
  bin.writeUint16(recordBytes);
  bin.skipBytes(17);
  bin.writeUint8(0); // language flag; TODO: improve this
  bin.skipBytes(2);

  // field subrecords
  fieldData.reduce(function(recordOffset, obj, i) {
    var fieldName = uniqFields[i];
    bin.writeCString(fieldName, 11);
    bin.writeUint8(obj.type.charCodeAt(0));
    bin.writeUint32(recordOffset);
    bin.writeUint8(obj.size);
    bin.writeUint8(obj.decimals);
    bin.skipBytes(14);
    return recordOffset + obj.size;
  }, 1);

  bin.writeUint8(0x0d); // "field descriptor terminator"
  if (bin.position() != headerBytes) {
    error("Dbf#exportRecords() header size mismatch; expected:", headerBytes, "written:", bin.position());
  }

  arr.forEach(function(rec, i) {
    var start = bin.position();
    bin.writeUint8(0x20); // delete flag; 0x20 valid 0x2a deleted
    for (var j=0, n=fieldData.length; j<n; j++) {
      fieldData[j].write(i, bin);
    }
    if (bin.position() - start != recordBytes) {
      error("#exportRecords() Error exporting record:", rec);
    }
  });

  bin.writeUint8(0x1a); // end-of-file

  if (bin.position() != fileBytes) {
    error("Dbf#exportRecords() file size mismatch; expected:", fileBytes, "written:", bin.position());
  }
  return buffer;
};


Dbf.getFieldNames = function(records) {
  if (!records || !records.length) {
    return [];
  }
  var names = Object.keys(records[0]);
  names.sort(); // kludge: sorting gives correct order when truncating fields
  return names;
};


Dbf.getHeaderSize = function(numFields) {
  return 33 + numFields * 32;
};

Dbf.getRecordSize = function(fieldSizes) {
  return utils.sum(fieldSizes) + 1; // delete byte plus data bytes
};

/*
Dbf.getValidFieldName = function(name) {
  // TODO: handle non-ascii chars in name
  return name.substr(0, 10); // max 10 chars
};
*/

Dbf.initNumericField = function(info, arr, name) {
  var MAX_FIELD_SIZE = 18,
      size;

  data = this.getNumericFieldInfo(arr, name);
  info.decimals = data.decimals;
  size = Math.max(data.max.toFixed(info.decimals).length,
      data.min.toFixed(info.decimals).length);
  if (size > MAX_FIELD_SIZE) {
    size = MAX_FIELD_SIZE;
    info.decimals -= size - MAX_FIELD_SIZE;
    if (info.decimals < 0) {
      error ("Dbf#getFieldInfo() Out-of-range error.");
    }
  }
  info.size = size;

  var formatter = Dbf.getDecimalFormatter(size, info.decimals);
  info.write = function(i, bin) {
    var rec = arr[i],
        str = formatter(rec[name]);
    if (str.length < size) {
      str = utils.lpad(str, size, ' ');
    }
    bin.writeString(str, size);
  };
};

Dbf.initBooleanField = function(info, arr, name) {
  info.size = 1;
  info.write = function(i, bin) {
    var val = arr[i][name],
        c;
    if (val === true) c = 'T';
    else if (val === false) c = 'F';
    else c = '?';
    bin.writeString(c);
  };
};

Dbf.initDateField = function(info, arr, name) {
  info.size = 8;
  info.write = function(i, bin) {
    var d = arr[i][name],
        str;
    if (d instanceof Date === false) {
      str = '00000000';
    } else {
      str = utils.lpad(d.getUTCFullYear(), 4, '0') +
            utils.lpad(d.getUTCMonth() + 1, 2, '0') +
            utils.lpad(d.getUTCDate(), 2, '0');
    }
    bin.writeString(str);
  };
};

Dbf.initStringField = function(info, arr, name, encoding) {
  var formatter = Dbf.getStringWriter(encoding);
  var maxLen = 0;
  var values = arr.map(function(rec) {
    var buf = formatter(rec[name]);
    maxLen = Math.max(maxLen, buf.byteLength);
    return buf;
  });
  var size = Math.min(maxLen, 254);
  info.size = size;
  info.write = function(i, bin) {
    var buf = values[i],
        bytes = Math.min(size, buf.byteLength),
        idx = bin.position();
    bin.writeBuffer(buf, bytes, 0);
    bin.position(idx + size);
  };
};

Dbf.getFieldInfo = function(arr, name, encoding) {
  var type = this.discoverFieldType(arr, name),
      info = {
        name: name,
        type: type,
        decimals: 0
      };
  if (type == 'N') {
    Dbf.initNumericField(info, arr, name);
  } else if (type == 'C') {
    Dbf.initStringField(info, arr, name, encoding);
  } else if (type == 'L') {
    Dbf.initBooleanField(info, arr, name);
  } else if (type == 'D') {
    Dbf.initDateField(info, arr, name);
  } else {
    error("[dbf] Type error exporting field:", name);
  }
  return info;
};

Dbf.discoverFieldType = function(arr, name) {
  var val;
  for (var i=0, n=arr.length; i<n; i++) {
    val = arr[i][name];
    if (utils.isString(val)) return "C";
    if (utils.isNumber(val)) return "N";
    if (utils.isBoolean(val)) return "L";
    if (val instanceof Date) return "D";
  }
  return "null" ;
};

Dbf.getDecimalFormatter = function(size, decimals) {
  // TODO: find better way to handle nulls
  var nullValue = ' '; // ArcGIS may use 0
  return function(val) {
    // TODO: handle invalid values better
    var valid = utils.isFiniteNumber(val),
        strval = valid ? val.toFixed(decimals) : String(nullValue);
    return utils.lpad(strval, size, ' ');
  };
};

Dbf.getNumericFieldInfo = function(arr, name) {
  var maxDecimals = 0,
      limit = 15,
      min = Infinity,
      max = -Infinity,
      k = 1,
      val, decimals;
  for (var i=0, n=arr.length; i<n; i++) {
    val = arr[i][name];
    if (!utils.isFiniteNumber(val)) {
      continue;
    }
    decimals = 0;
    if (val < min) min = val;
    if (val > max) max = val;
    while (val * k % 1 !== 0) {
      if (decimals == limit) {
        // TODO: verify limit, remove oflo message, round overflowing values
        // trace ("#getNumericFieldInfo() Number field overflow; value:", val);
        break;
      }
      decimals++;
      k *= 10;
    }
    if (decimals > maxDecimals) maxDecimals = decimals;
  }
  return {
    decimals: maxDecimals,
    min: min,
    max: max
  };
};

// Return function to convert a JS str to an ArrayBuffer containing encoded str.
Dbf.getStringWriter = function(encoding) {
  if (encoding === 'ascii') {
    return Dbf.getStringWriterAscii();
  } else if (Env.inNode) {
    return Dbf.getStringWriterEncoded(encoding);
  }
  error("[Dbf.getStringWriter()] Non-ascii encodings only supported in Node.");
};

// TODO: handle non-ascii chars. Option: switch to
// utf8 encoding if non-ascii chars are found.
Dbf.getStringWriterAscii = function() {
  return function(val) {
    var str = String(val),
        n = str.length,
        dest = new ArrayBuffer(n),
        view = new Uint8ClampedArray(dest);
    for (var i=0; i<n; i++) {
      view[i] = str.charCodeAt(i);
    }
    return dest;
  };
};

Dbf.getStringWriterEncoded = function(encoding) {
  var iconv = require('iconv-lite');
  return function(val) {
    var buf = iconv.encode(val, encoding);
    return BinArray.toArrayBuffer(buf);
  };
};




var dataFieldRxp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

function DataTable(obj) {
  var records;
  if (utils.isArray(obj)) {
    records = obj;
  } else {
    records = [];
    // integer object: create empty records
    if (utils.isInteger(obj)) {
      for (var i=0; i<obj; i++) {
        records.push({});
      }
    } else if (obj) {
      error("[DataTable] Invalid constructor argument:", obj);
    }
  }

  this.exportAsDbf = function(encoding) {
    return Dbf.exportRecords(records, encoding);
  };

  this.getRecords = function() {
    return records;
  };
}

var dataTableProto = {
  fieldExists: function(name) {
    return utils.contains(this.getFields(), name);
  },

  exportAsJSON: function() {
    return JSON.stringify(this.getRecords());
  },

  addField: function(name, init) {
    var useFunction = utils.isFunction(init);
    if (!utils.isNumber(init) && !utils.isString(init) && !useFunction) {
      error("DataTable#addField() requires a string, number or function for initialization");
    }
    if (this.fieldExists(name)) error("DataTable#addField() tried to add a field that already exists:", name);
    if (!dataFieldRxp.test(name)) error("DataTable#addField() invalid field name:", name);

    this.getRecords().forEach(function(obj, i) {
      obj[name] = useFunction ? init(obj, i) : init;
    });
  },

  addIdField: function() {
    this.addField('FID', function(obj, i) {
      return i;
    });
  },

  deleteField: function(f) {
    this.getRecords().forEach(function(o) {
      delete o[f];
    });
  },

  indexOn: function(f) {
    this._index = utils.indexOn(this.getRecords(), f);
  },

  getIndexedRecord: function(val) {
    return this._index && this._index[val] || null;
  },

  clearIndex: function() {
    this._index = null;
  },

  getFields: function() {
    var records = this.getRecords();
    return records.length > 0 ? Object.keys(records[0]) : [];
  },

  update: function(f) {
    var records = this.getRecords();
    for (var i=0, n=records.length; i<n; i++) {
      records[i] = f(records[i], i);
    }
  },

  clone: function() {
    var records2 = this.getRecords().map(function(rec) {
      return utils.extend({}, rec);
    });
    return new DataTable(records2);
  },

  size: function() {
    return this.getRecords().length;
  }
};

utils.extend(DataTable.prototype, dataTableProto);

// export for testing
MapShaper.DataTable = DataTable;




function distance3D(ax, ay, az, bx, by, bz) {
  var dx = ax - bx,
    dy = ay - by,
    dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distanceSq(ax, ay, bx, by) {
  var dx = ax - bx,
      dy = ay - by;
  return dx * dx + dy * dy;
}

function distance2D(ax, ay, bx, by) {
  var dx = ax - bx,
      dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceSq3D(ax, ay, az, bx, by, bz) {
  var dx = ax - bx,
      dy = ay - by,
      dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

function getRoundingFunction(inc) {
  if (!utils.isNumber(inc) || inc === 0) {
    error("Rounding increment must be a non-zero number.");
  }
  var inv = 1 / inc;
  if (inv > 1) inv = Math.round(inv);
  return function(x) {
    return Math.round(x * inv) / inv;
    // these alternatives show rounding error after JSON.stringify()
    // return Math.round(x / inc) / inv;
    // return Math.round(x / inc) * inc;
    // return Math.round(x * inv) * inc;
  };
}

// Return id of nearest point to x, y, among x0, y0, x1, y1, ...
function nearestPoint(x, y, x0, y0) {
  var minIdx = -1,
      minDist = Infinity,
      dist;
  for (var i = 0, j = 2, n = arguments.length; j < n; i++, j += 2) {
    dist = distanceSq(x, y, arguments[j], arguments[j+1]);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}

function lineIntersection(s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y, s2p2x, s2p2y) {
  var den = determinant2D(s1p2x - s1p1x, s1p2y - s1p1y, s2p2x - s2p1x, s2p2y - s2p1y);
  if (den === 0) return false;
  var m = orient2D(s2p1x, s2p1y, s2p2x, s2p2y, s1p1x, s1p1y) / den;
  var x = s1p1x + m * (s1p2x - s1p1x);
  var y = s1p1y + m * (s1p2y - s1p1y);
  return [x, y];
}

// Find intersection between two 2D segments.
// Return [x, y] point if segments intersect at a single point
// Return false if segments do not touch or are colinear
function segmentIntersection(s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y, s2p2x, s2p2y) {
  // Source: Sedgewick, _Algorithms in C_
  // (Tried various other functions that failed owing to floating point errors)
  var p = false;
  var hit = orient2D(s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y) *
      orient2D(s1p1x, s1p1y, s1p2x, s1p2y, s2p2x, s2p2y) <= 0 &&
      orient2D(s2p1x, s2p1y, s2p2x, s2p2y, s1p1x, s1p1y) *
      orient2D(s2p1x, s2p1y, s2p2x, s2p2y, s1p2x, s1p2y) <= 0;

  if (hit) {
    p = lineIntersection(s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y, s2p2x, s2p2y);
    if (p) { // colinear if p is false -- treating this as no intersection
      // Re-order operands so intersection point is closest to s1p1 (better numerical accuracy)
      // Source: Jonathan Shewchuk http://www.cs.berkeley.edu/~jrs/meshpapers/robnotes.pdf
      var nearest = nearestPoint(p[0], p[1], s1p1x, s1p1y, s1p2x, s1p2y, s2p1x, s2p1y, s2p2x, s2p2y);
      if (nearest == 1) {
        // use b a c d
        p = lineIntersection(s1p2x, s1p2y, s1p1x, s1p1y, s2p1x, s2p1y, s2p2x, s2p2y);
      } else if (nearest == 2) {
        // use c d a b
        p = lineIntersection(s2p1x, s2p1y, s2p2x, s2p2y, s1p1x, s1p1y, s1p2x, s1p2y);
      } else if (nearest == 3) {
        // use d c a b
        p = lineIntersection(s2p2x, s2p2y, s2p1x, s2p1y, s1p1x, s1p1y, s1p2x, s1p2y);
      }
    }
  }
  return p;
}

// Determinant of matrix
//  | a  b |
//  | c  d |
function determinant2D(a, b, c, d) {
  return a * d - b * c;
}

// Source: Jonathan Shewchuk http://www.cs.berkeley.edu/~jrs/meshpapers/robnotes.pdf
function orient2D(x0, y0, x1, y1, x2, y2) {
  return determinant2D(x0 - x2, y0 - y2, x1 - x2, y1 - y2);
}

// atan2() makes this function fairly slow, replaced by ~2x faster formula
function innerAngle2(ax, ay, bx, by, cx, cy) {
  var a1 = Math.atan2(ay - by, ax - bx),
      a2 = Math.atan2(cy - by, cx - bx),
      a3 = Math.abs(a1 - a2);
  if (a3 > Math.PI) {
    a3 = 2 * Math.PI - a3;
  }
  return a3;
}

// Return angle abc in range [0, 2PI) or NaN if angle is invalid
// (e.g. if length of ab or bc is 0)
/*
function signedAngle2(ax, ay, bx, by, cx, cy) {
  var a1 = Math.atan2(ay - by, ax - bx),
      a2 = Math.atan2(cy - by, cx - bx),
      a3 = a2 - a1;

  if (ax == bx && ay == by || bx == cx && by == cy) {
    a3 = NaN; // Use NaN for invalid angles
  } else if (a3 >= Math.PI * 2) {
    a3 = 2 * Math.PI - a3;
  } else if (a3 < 0) {
    a3 = a3 + 2 * Math.PI;
  }
  return a3;
}
*/

function standardAngle(a) {
  var twoPI = Math.PI * 2;
  while (a < 0) {
    a += twoPI;
  }
  while (a >= twoPI) {
    a -= twoPI;
  }
  return a;
}

function signedAngle(ax, ay, bx, by, cx, cy) {
  if (ax == bx && ay == by || bx == cx && by == cy) {
    return NaN; // Use NaN for invalid angles
  }
  var abx = ax - bx,
      aby = ay - by,
      cbx = cx - bx,
      cby = cy - by,
      dotp = abx * cbx + aby * cby,
      crossp = abx * cby - aby * cbx,
      a = Math.atan2(crossp, dotp);
  return standardAngle(a);
}

// Calc bearing in radians at lng1, lat1
function bearing(lng1, lat1, lng2, lat2) {
  var D2R = Math.PI / 180;
  lng1 *= D2R;
  lng2 *= D2R;
  lat1 *= D2R;
  lat2 *= D2R;
  var y = Math.sin(lng2-lng1) * Math.cos(lat2),
      x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lng2-lng1);
  return Math.atan2(y, x);
}

// Calc angle of turn from ab to bc, in range [0, 2PI)
// Receive lat-lng values in degrees
function signedAngleSph(alng, alat, blng, blat, clng, clat) {
  if (alng == blng && alat == blat || blng == clng && blat == clat) {
    return NaN;
  }
  var b1 = bearing(blng, blat, alng, alat), // calc bearing at b
      b2 = bearing(blng, blat, clng, clat),
      a = Math.PI * 2 + b1 - b2;
  return standardAngle(a);
}

// Convert arrays of lng and lat coords (xsrc, ysrc) into
// x, y, z coords on the surface of a sphere with radius 6378137
// (the radius of spherical Earth datum in meters)
//
function convLngLatToSph(xsrc, ysrc, xbuf, ybuf, zbuf) {
  var deg2rad = Math.PI / 180,
      r = 6378137;
  for (var i=0, len=xsrc.length; i<len; i++) {
    var lng = xsrc[i] * deg2rad,
        lat = ysrc[i] * deg2rad,
        cosLat = Math.cos(lat);
    xbuf[i] = Math.cos(lng) * cosLat * r;
    ybuf[i] = Math.sin(lng) * cosLat * r;
    zbuf[i] = Math.sin(lat) * r;
  }
}

// TODO: make this safe for small angles
function innerAngle(ax, ay, bx, by, cx, cy) {
  var ab = distance2D(ax, ay, bx, by),
      bc = distance2D(bx, by, cx, cy),
      theta, dotp;
  if (ab === 0 || bc === 0) {
    theta = 0;
  } else {
    dotp = ((ax - bx) * (cx - bx) + (ay - by) * (cy - by)) / (ab * bc);
    if (dotp >= 1 - 1e-14) {
      theta = 0;
    } else if (dotp <= -1 + 1e-14) {
      theta = Math.PI;
    } else {
      theta = Math.acos(dotp); // consider using other formula at small dp
    }
  }
  return theta;
}

function innerAngle3D(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var ab = distance3D(ax, ay, az, bx, by, bz),
      bc = distance3D(bx, by, bz, cx, cy, cz),
      theta, dotp;
  if (ab === 0 || bc === 0) {
    theta = 0;
  } else {
    dotp = ((ax - bx) * (cx - bx) + (ay - by) * (cy - by) + (az - bz) * (cz - bz)) / (ab * bc);
    if (dotp >= 1) {
      theta = 0;
    } else if (dotp <= -1) {
      theta = Math.PI;
    } else {
      theta = Math.acos(dotp); // consider using other formula at small dp
    }
  }
  return theta;
}

function triangleArea(ax, ay, bx, by, cx, cy) {
  var area = Math.abs(((ay - cy) * (bx - cx) + (by - cy) * (cx - ax)) / 2);
  return area;
}

function detSq(ax, ay, bx, by, cx, cy) {
  var det = ax * by - ax * cy + bx * cy - bx * ay + cx * ay - cx * by;
  return det * det;
}

function cosine(ax, ay, bx, by, cx, cy) {
  var den = distance2D(ax, ay, bx, by) * distance2D(bx, by, cx, cy),
      cos = 0;
  if (den > 0) {
    cos = ((ax - bx) * (cx - bx) + (ay - by) * (cy - by)) / den;
    if (cos > 1) cos = 1; // handle fp rounding error
    else if (cos < -1) cos = -1;
  }
  return cos;
}

function cosine3D(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var den = distance3D(ax, ay, az, bx, by, bz) * distance3D(bx, by, bz, cx, cy, cz),
      cos = 0;
  if (den > 0) {
    cos = ((ax - bx) * (cx - bx) + (ay - by) * (cy - by) + (az - bz) * (cz - bz)) / den;
    if (cos > 1) cos = 1; // handle fp rounding error
    else if (cos < -1) cos = -1;
  }
  return cos;
}

function triangleArea3D(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var area = 0.5 * Math.sqrt(detSq(ax, ay, bx, by, cx, cy) +
    detSq(ax, az, bx, bz, cx, cz) + detSq(ay, az, by, bz, cy, cz));
  return area;
}

// Given point B and segment AC, return the distSq from B to the nearest
// point on AC
// Receive the distSq of segments AB, BC, AC
//
function pointSegDistSq(ab2, bc2, ac2) {
  var dist2;
  if (ac2 === 0) {
    dist2 = ab2;
  } else if (ab2 >= bc2 + ac2) {
    dist2 = bc2;
  } else if (bc2 >= ab2 + ac2) {
    dist2 = ab2;
  } else {
    var dval = (ab2 + ac2 - bc2);
    dist2 = ab2 -  dval * dval / ac2  * 0.25;
  }
  if (dist2 < 0) {
    dist2 = 0;
  }
  return dist2;
}

MapShaper.calcArcBounds = function(xx, yy, start, len) {
  var xmin = Infinity,
      ymin = Infinity,
      xmax = -Infinity,
      ymax = -Infinity,
      i = start | 0,
      n = isNaN(len) ? xx.length - i : len + i,
      x, y;
  for (; i<n; i++) {
    x = xx[i];
    y = yy[i];
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  if (xmin > xmax || ymin > ymax) {
    error("#calcArcBounds() null bounds");
  }
  return [xmin, ymin, xmax, ymax];
};

MapShaper.reversePathCoords = function(arr, start, len) {
  var i = start,
      j = start + len - 1,
      tmp;
  while (i < j) {
    tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    i++;
    j--;
  }
};

// merge B into A
function mergeBounds(a, b) {
  if (b[0] < a[0]) a[0] = b[0];
  if (b[1] < a[1]) a[1] = b[1];
  if (b[2] > a[2]) a[2] = b[2];
  if (b[3] > a[3]) a[3] = b[3];
}

function containsBounds(a, b) {
  return a[0] <= b[0] && a[2] >= b[2] && a[1] <= b[1] && a[3] >= b[3];
}

function boundsArea(b) {
  return (b[2] - b[0]) * (b[3] - b[1]);
}

// export functions so they can be tested
utils.extend(geom, {
  getRoundingFunction: getRoundingFunction,
  segmentIntersection: segmentIntersection,
  distance3D: distance3D,
  innerAngle: innerAngle,
  innerAngle2: innerAngle2,
  signedAngle: signedAngle,
  bearing: bearing,
  signedAngleSph: signedAngleSph,
  standardAngle: standardAngle,
  convLngLatToSph: convLngLatToSph,
  innerAngle3D: innerAngle3D,
  triangleArea: triangleArea,
  triangleArea3D: triangleArea3D,
  cosine: cosine,
  cosine3D: cosine3D
});




// export for testing
MapShaper.ArcCollection = ArcCollection;
MapShaper.ArcIter = ArcIter;

// An interface for managing a collection of paths.
// Constructor signatures:
//
// ArcCollection(arcs)
//    arcs is an array of polyline arcs; each arc is an array of points: [[x0, y0], [x1, y1], ... ]
//
// ArcCollection(nn, xx, yy)
//    nn is an array of arc lengths; xx, yy are arrays of concatenated coords;
function ArcCollection() {
  var _xx, _yy,  // coordinates data
      _ii, _nn,  // indexes, sizes
      _zz, _zlimit = 0, // simplification
      _bb, _allBounds, // bounding boxes
      _arcIter, _filteredArcIter; // path iterators

  if (arguments.length == 1) {
    initLegacyArcs(arguments[0]);  // want to phase this out
  } else if (arguments.length == 3) {
    initXYData.apply(this, arguments);
  } else {
    error("ArcCollection() Invalid arguments");
  }

  function initLegacyArcs(arcs) {
    var xx = [], yy = [];
    var nn = arcs.map(function(points) {
      var n = points ? points.length : 0;
      for (var i=0; i<n; i++) {
        xx.push(points[i][0]);
        yy.push(points[i][1]);
      }
      return n;
    });
    initXYData(nn, xx, yy);
  }

  function initXYData(nn, xx, yy) {
    var size = nn.length;
    if (nn instanceof Array) nn = new Uint32Array(nn);
    if (xx instanceof Array) xx = new Float64Array(xx);
    if (yy instanceof Array) yy = new Float64Array(yy);
    _xx = xx;
    _yy = yy;
    _nn = nn;
    _zz = null;
    _filteredArcIter = null;

    // generate array of starting idxs of each arc
    _ii = new Uint32Array(size);
    for (var idx = 0, j=0; j<size; j++) {
      _ii[j] = idx;
      idx += nn[j];
    }

    if (idx != _xx.length || _xx.length != _yy.length) {
      error("ArcCollection#initXYData() Counting error");
    }

    initBounds();
    // Pre-allocate some path iterators for repeated use.
    _arcIter = new ArcIter(_xx, _yy);
    return this;
  }

  function initZData(zz) {
    if (!zz) {
      _zz = null;
      _filteredArcIter = null;
    } else {
      if (zz.length != _xx.length) error("ArcCollection#initZData() mismatched arrays");
      if (zz instanceof Array) zz = new Float64Array(zz);
      _zz = zz;
      _filteredArcIter = new FilteredArcIter(_xx, _yy, _zz);
    }
  }

  function initBounds() {
    var data = calcArcBounds(_xx, _yy, _nn);
    _bb = data.bb;
    _allBounds = data.bounds;
  }

  function calcArcBounds(xx, yy, nn) {
    var numArcs = nn.length,
        bb = new Float64Array(numArcs * 4),
        bounds = new Bounds(),
        arcOffs = 0,
        arcLen,
        j, b;
    for (var i=0; i<numArcs; i++) {
      arcLen = nn[i];
      if (arcLen > 0) {
        j = i * 4;
        b = MapShaper.calcArcBounds(xx, yy, arcOffs, arcLen);
        bb[j++] = b[0];
        bb[j++] = b[1];
        bb[j++] = b[2];
        bb[j] = b[3];
        arcOffs += arcLen;
        bounds.mergeBounds(b);
      }
    }
    return {
      bb: bb,
      bounds: bounds
    };
  }

  this.updateVertexData = function(nn, xx, yy, zz) {
    initXYData(nn, xx, yy);
    initZData(zz || null);
  };

  // Give access to raw data arrays...
  this.getVertexData = function() {
    return {
      xx: _xx,
      yy: _yy,
      zz: _zz,
      bb: _bb,
      nn: _nn,
      ii: _ii
    };
  };

  this.getCopy = function() {
    var copy = new ArcCollection(new Int32Array(_nn), new Float64Array(_xx),
        new Float64Array(_yy));
    if (_zz) copy.setThresholds(new Float64Array(_zz));
    return copy;
  };

  function getFilteredPointCount() {
    var zz = _zz, z = _zlimit;
    if (!zz || !z) return this.getPointCount();
    var count = 0;
    for (var i=0, n = zz.length; i<n; i++) {
      if (zz[i] >= z) count++;
    }
    return count;
  }

  function getFilteredVertexData() {
    var len2 = getFilteredPointCount();
    var arcCount = _nn.length;
    var xx2 = new Float64Array(len2),
        yy2 = new Float64Array(len2),
        zz2 = new Float64Array(len2),
        nn2 = new Int32Array(arcCount),
        i=0, i2 = 0,
        n, n2;

    for (var arcId=0; arcId < arcCount; arcId++) {
      n2 = 0;
      n = _nn[arcId];
      for (var end = i+n; i < end; i++) {
        if (_zz[i] >= _zlimit) {
          xx2[i2] = _xx[i];
          yy2[i2] = _yy[i];
          zz2[i2] = _zz[i];
          i2++;
          n2++;
        }
      }
      if (n2 < 2) error("Collapsed arc"); // endpoints should be z == Infinity
      nn2[arcId] = n2;
    }
    return {
      xx: xx2,
      yy: yy2,
      zz: zz2,
      nn: nn2
    };
  }

  this.getFilteredCopy = function() {
    if (!_zz || _zlimit === 0) return this.getCopy();
    var data = getFilteredVertexData();
    var copy = new ArcCollection(data.nn, data.xx, data.yy);
    copy.setThresholds(data.zz);
    return copy;
  };

  // Return arcs as arrays of [x, y] points (intended for testing).
  this.toArray = function() {
    return utils.range(this.size()).map(function(i) {
      return this.getArc(i).toArray();
    }, this);
  };

  this.toString = function() {
    return JSON.stringify(this.toArray());
  };

  // Snap coordinates to a grid of @quanta locations on both axes
  // This may snap nearby points to the same coordinates.
  // Consider a cleanup pass to remove dupes, make sure collapsed arcs are
  //   removed on export.
  //
  this.quantize = function(quanta) {
    var bb1 = this.getBounds(),
        bb2 = new Bounds(0, 0, quanta-1, quanta-1),
        transform = bb1.getTransform(bb2),
        inverse = transform.invert();

    this.applyTransform(transform, true);
    this.applyTransform(inverse);
  };

  // Return average segment length (with simplification)
  this.getAvgSegment = function() {
    var sum = 0, count = 0;
    this.forEachSegment(function(i, j, xx, yy) {
      var dx = xx[i] - xx[j],
          dy = yy[i] - yy[j];
      sum += Math.sqrt(dx * dx + dy * dy);
      count++;
    });
    return sum / count || 0;
  };

  // Return average magnitudes of dx, dy (with simplification)
  this.getAvgSegment2 = function() {
    var dx = 0, dy = 0, count = 0;
    this.forEachSegment(function(i, j, xx, yy) {
      dx += Math.abs(xx[i] - xx[j]);
      dy += Math.abs(yy[i] - yy[j]);
      count++;
    });
    return [dx / count || 0, dy / count || 0];
  };

  this.forEachArcSegment = function(arcId, cb) {
    var fw = arcId >= 0,
        absId = fw ? arcId : ~arcId,
        zlim = this.getRetainedInterval(),
        n = _nn[absId],
        i = fw ? _ii[absId] : _ii[absId] + n - 1,
        step = fw ? 1 : -1,
        count = 0,
        prev;

    for (var j = 0; j < n; j++, i += step) {
      if (zlim === 0 || _zz[i] >= zlim) {
        if (count > 0) {
          cb(prev, i, _xx, _yy);
        }
        prev = i;
        count++;
      }
    }
  };

  this.forEachSegment = function(cb) {
    for (var i=0, n=this.size(); i<n; i++) {
      this.forEachArcSegment(i, cb);
    }
  };

  // Apply a linear transform to the data, with or without rounding.
  //
  this.applyTransform = function(t, round) {
    var xx = _xx, yy = _yy, x, y;
    if (round && typeof round != 'function') {
      round = Math.round;
    }
    if (!t) {
      t = new Transform(); // null transform
    }
    for (var i=0, n=xx.length; i<n; i++) {
      x = xx[i] * t.mx + t.bx;
      y = yy[i] * t.my + t.by;
      if (round) {
        x = round(x);
        y = round(y);
      }
      xx[i] = x;
      yy[i] = y;
    }
    initBounds();
  };

  // Return an ArcIter object for each path in the dataset
  //
  this.forEach = function(cb) {
    for (var i=0, n=this.size(); i<n; i++) {
      cb(this.getArcIter(i), i);
    }
  };

  // Iterate over arcs with access to low-level data
  //
  this.forEach2 = function(cb) {
    for (var arcId=0, n=this.size(); arcId<n; arcId++) {
      cb(_ii[arcId], _nn[arcId], _xx, _yy, _zz, arcId);
    }
  };

  this.forEach3 = function(cb) {
    var start, end, xx, yy, zz;
    for (var arcId=0, n=this.size(); arcId<n; arcId++) {
      start = _ii[arcId];
      end = start + _nn[arcId];
      xx = _xx.subarray(start, end);
      yy = _yy.subarray(start, end);
      if (_zz) zz = _zz.subarray(start, end);
      cb(xx, yy, zz, arcId);
    }
  };

  // Remove arcs that don't pass a filter test and re-index arcs
  // Return array mapping original arc ids to re-indexed ids. If arr[n] == -1
  // then arc n was removed. arr[n] == m indicates that the arc at n was
  // moved to index m.
  // Return null if no arcs were re-indexed (and no arcs were removed)
  //
  this.filter = function(cb) {
    var map = new Int32Array(this.size()),
        goodArcs = 0,
        goodPoints = 0;
    for (var i=0, n=this.size(); i<n; i++) {
      if (cb(this.getArcIter(i), i)) {
        map[i] = goodArcs++;
        goodPoints += _nn[i];
      } else {
        map[i] = -1;
      }
    }
    if (goodArcs === this.size()) {
      return null;
    } else {
      condenseArcs(map);
      if (goodArcs === 0) {
        // no remaining arcs
      }
      return map;
    }
  };

  function condenseArcs(map) {
    var goodPoints = 0,
        goodArcs = 0,
        copyElements = MapShaper.copyElements,
        k, arcLen;
    for (var i=0, n=map.length; i<n; i++) {
      k = map[i];
      arcLen = _nn[i];
      if (k > -1) {
        copyElements(_xx, _ii[i], _xx, goodPoints, arcLen);
        copyElements(_yy, _ii[i], _yy, goodPoints, arcLen);
        if (_zz) copyElements(_zz, _ii[i], _zz, goodPoints, arcLen);
        _nn[k] = arcLen;
        goodPoints += arcLen;
        goodArcs++;
      }
    }

    initXYData(_nn.subarray(0, goodArcs), _xx.subarray(0, goodPoints),
        _yy.subarray(0, goodPoints));
    if (_zz) initZData(_zz.subarray(0, goodPoints));
  }

  this.dedupCoords = function() {
    var n, n2, arcLen,
        i = 0, i2 = 0,
        zz = _zz;
    for (var arcId=0, size = _nn.length; arcId < size; arcId++) {
      arcLen = _nn[arcId];
      n = 0;
      n2 = 0;
      while (n < arcLen) {
        if (n === 0 || _xx[i] != _xx[i-1] || _yy[i] != _yy[i-1]) {
          if (i != i2) {
            _xx[i2] = _xx[i];
            _yy[i2] = _yy[i];
            if (zz) zz[i2] = zz[i];
          }
          n2++;
          i2++;
        }
        i++;
        n++;
      }
      if (n2 == 1) {
        _nn[arcId] = 0;
        i2--;
      } else {
        _nn[arcId] = n2;
      }
      // if (n2 == 1) console.log(arcId)
    }
    var dupes = i - i2;
    if (dupes > 0) {
      initXYData(_nn, _xx.subarray(0, i2), _yy.subarray(0, i2));
      initZData(zz);
    }
    return dupes;
  };

  this.getVertex = function(arcId, nth) {
    var i = this.indexOfVertex(arcId, nth);
    return {
      x: _xx[i],
      y: _yy[i]
    };
  };

  this.indexOfVertex = function(arcId, nth) {
    var absId = arcId < 0 ? ~arcId : arcId,
        len = _nn[absId];
    if (nth < 0) nth = len + nth;
    if (absId != arcId) nth = len - nth - 1;
    if (nth < 0 || nth >= len) error("[ArcCollection] out-of-range vertex id");
    return _ii[absId] + nth;
  };

  // Test whether the vertex at index @idx is the endpoint of an arc
  this.pointIsEndpoint = function(idx) {
    var ii = _ii,
        nn = _nn;
    for (var j=0, n=ii.length; j<n; j++) {
      if (idx === ii[j] || idx === ii[j] + nn[j] - 1) return true;
    }
    return false;
  };

  // Tests if arc endpoints have same x, y coords
  // (arc may still have collapsed);
  this.arcIsClosed = function(arcId) {
    var i = this.indexOfVertex(arcId, 0),
        j = this.indexOfVertex(arcId, -1);
    return i != j && _xx[i] == _xx[j] && _yy[i] == _yy[j];
  };

  // Tests if first and last segments mirror each other
  // A 3-vertex arc with same endpoints tests true
  this.arcIsLollipop = function(arcId) {
    var len = this.getArcLength(arcId),
        i, j;
    if (len <= 2 || !this.arcIsClosed(arcId)) return false;
    i = this.indexOfVertex(arcId, 1);
    j = this.indexOfVertex(arcId, -2);
    return _xx[i] == _xx[j] && _yy[i] == _yy[j];
  };

  this.arcIsDegenerate = function(arcId) {
    var iter = this.getArcIter(arcId);
    var i = 0,
        x, y;
    while (iter.hasNext()) {
      if (i > 0) {
        if (x != iter.x || y != iter.y) return false;
      }
      x = iter.x;
      y = iter.y;
      i++;
    }
    return true;
  };

  this.getArcLength = function(arcId) {
    return _nn[absArcId(arcId)];
  };

  this.getArcIter = function(arcId) {
    var fw = arcId >= 0,
        i = fw ? arcId : ~arcId,
        iter = _zz && _zlimit ? _filteredArcIter : _arcIter;
    if (i >= _nn.length) {
      error("[#getArcId() out-of-range arc id:", arcId);
    }
    return iter.init(_ii[i], _nn[i], fw, _zlimit);
  };

  this.getShapeIter = function(ids) {
    return new ShapeIter(this).init(ids);
  };

  // Add simplification data to the dataset
  // @thresholds is either a single typed array or an array of arrays of removal thresholds for each arc;
  //
  this.setThresholds = function(thresholds) {
    var n = this.getPointCount(),
        zz = null;
    if (!thresholds) {
      // nop
    } else if (thresholds.length == n) {
      zz = thresholds;
    } else if (thresholds.length == this.size()) {
      zz = flattenThresholds(thresholds, n);
    } else {
      error("Invalid threshold data");
    }
    initZData(zz);
    return this;
  };

  function flattenThresholds(arr, n) {
    var zz = new Float64Array(n),
        i = 0;
    arr.forEach(function(arr) {
      for (var j=0, n=arr.length; j<n; i++, j++) {
        zz[i] = arr[j];
      }
    });
    if (i != n) error("Mismatched thresholds");
    return zz;
  }

  // bake in current simplification level, if any
  this.flatten = function() {
    if (_zlimit > 0) {
      var data = getFilteredVertexData();
      this.updateVertexData(data.nn, data.xx, data.yy);
      _zlimit = 0;
    } else {
      _zz = null;
    }
  };

  this.getRetainedInterval = function() {
    return _zlimit;
  };

  this.setRetainedInterval = function(z) {
    _zlimit = z;
    return this;
  };

  this.getRetainedPct = function() {
    return this.getPctByThreshold(_zlimit);
  };

  this.setRetainedPct = function(pct) {
    if (pct >= 1) {
      _zlimit = 0;
    } else {
      _zlimit = this.getThresholdByPct(pct);
      _zlimit = MapShaper.clampIntervalByPct(_zlimit, pct);
    }
    return this;
  };

  // Return array of z-values that can be removed for simplification
  //
  this.getRemovableThresholds = function(nth) {
    if (!_zz) error("ArcCollection#getRemovableThresholds() Missing simplification data.");
    var skip = nth | 1,
        arr = new Float64Array(Math.ceil(_zz.length / skip)),
        z;
    for (var i=0, j=0, n=this.getPointCount(); i<n; i+=skip) {
      z = _zz[i];
      if (z != Infinity) {
        arr[j++] = z;
      }
    }
    return arr.subarray(0, j);
  };

  this.getArcThresholds = function(arcId) {
    if (!(arcId >= 0 && arcId < this.size())) {
      error("ArcCollection#getArcThresholds() invalid arc id:", arcId);
    }
    var start = _ii[arcId],
        end = start + _nn[arcId];
    return _zz.subarray(start, end);
  };

  this.getPctByThreshold = function(val) {
    var arr, rank, pct;
    if (val > 0) {
      arr = this.getRemovableThresholds();
      rank = utils.findRankByValue(arr, val);
      pct = arr.length > 0 ? 1 - (rank - 1) / arr.length : 1;
    } else {
      pct = 1;
    }
    return pct;
  };

  this.getThresholdByPct = function(pct) {
    var tmp = this.getRemovableThresholds(),
        rank, z;
    if (tmp.length === 0) { // No removable points
      rank = 0;
    } else {
      rank = Math.floor((1 - pct) * (tmp.length + 2));
    }

    if (rank <= 0) {
      z = 0;
    } else if (rank > tmp.length) {
      z = Infinity;
    } else {
      z = utils.findValueByRank(tmp, rank);
    }
    return z;
  };

  this.arcIntersectsBBox = function(i, b1) {
    var b2 = _bb,
        j = i * 4;
    return b2[j] <= b1[2] && b2[j+2] >= b1[0] && b2[j+3] >= b1[1] && b2[j+1] <= b1[3];
  };

  this.arcIsContained = function(i, b1) {
    var b2 = _bb,
        j = i * 4;
    return b2[j] >= b1[0] && b2[j+2] <= b1[2] && b2[j+1] >= b1[1] && b2[j+3] <= b1[3];
  };

  this.arcIsSmaller = function(i, units) {
    var bb = _bb,
        j = i * 4;
    return bb[j+2] - bb[j] < units && bb[j+3] - bb[j+1] < units;
  };

  // TODO: allow datasets in lat-lng coord range to be flagged as planar
  this.isPlanar = function() {
    return !MapShaper.probablyDecimalDegreeBounds(this.getBounds());
  };

  this.size = function() {
    return _ii && _ii.length || 0;
  };

  this.getPointCount = function() {
    return _xx && _xx.length || 0;
  };

  this.getBounds = function() {

    return _allBounds;
  };

  this.getSimpleShapeBounds = function(arcIds, bounds) {
    bounds = bounds || new Bounds();
    for (var i=0, n=arcIds.length; i<n; i++) {
      this.mergeArcBounds(arcIds[i], bounds);
    }
    return bounds;
  };

  this.getMultiShapeBounds = function(shapeIds, bounds) {
    bounds = bounds || new Bounds();
    if (shapeIds) { // handle null shapes
      for (var i=0, n=shapeIds.length; i<n; i++) {
        this.getSimpleShapeBounds(shapeIds[i], bounds);
      }
    }
    return bounds;
  };

  this.mergeArcBounds = function(arcId, bounds) {
    if (arcId < 0) arcId = ~arcId;
    var offs = arcId * 4;
    bounds.mergeBounds(_bb[offs], _bb[offs+1], _bb[offs+2], _bb[offs+3]);
  };

  this.getArc = function(id) {
    return new Arc(this).init(id);
  };

  this.getMultiPathShape = function(arr) {
    if (!arr || arr.length > 0 === false) {
      error("#getMultiPathShape() Missing arc ids");
    } else {
      return new MultiShape(this).init(arr);
    }
  };
}

ArcCollection.prototype.inspect = function() {
  var n = this.getPointCount(), str;
  if (n < 50) {
    str = JSON.stringify(this.toArray());
  } else {
    str = '[ArcCollection (' + this.size() + ')]';
  }
  return str;
};

function Arc(src) {
  this.src = src;
}

Arc.prototype = {
  init: function(id) {
    this.id = id;
    return this;
  },
  pathCount: 1,
  getPathIter: function(i) {
    return this.src.getArcIter(this.id);
  },

  inBounds: function(bbox) {
    return this.src.arcIntersectsBBox(this.id, bbox);
  },

  // Return arc coords as an array of [x, y] points
  toArray: function() {
    var iter = this.getPathIter(),
        coords = [];
    while (iter.hasNext()) {
      coords.push([iter.x, iter.y]);
    }
    return coords;
  },

  smallerThan: function(units) {
    return this.src.arcIsSmaller(this.id, units);
  }
};

//
function MultiShape(src) {
  this.singleShape = new SimpleShape(src);
}

MultiShape.prototype = {
  init: function(parts) {
    this.pathCount = parts ? parts.length : 0;
    this.parts = parts || [];
    return this;
  },
  getPathIter: function(i) {
    return this.getPath(i).getPathIter();
  },
  getPath: function(i) {
    if (i < 0 || i >= this.parts.length) error("MultiShape#getPart() invalid part id:", i);
    return this.singleShape.init(this.parts[i]);
  },
  // Return array of SimpleShape objects, one for each path
  getPaths: function() {
    return this.parts.map(function(ids) {
      return this.singleShape.init(ids);
    }, this);
  }
};

function SimpleShape(src) {
  this.pathIter = new ShapeIter(src);
  this.ids = null;
}

SimpleShape.prototype = {
  pathCount: 1,
  init: function(ids) {
    this.pathIter.init(ids);
    this.ids = ids; // kludge for TopoJSON export -- rethink
    return this;
  },
  getPathIter: function() {
    return this.pathIter;
  }
};

// Constructor takes arrays of coords: xx, yy, zz (optional)
//
// Iterate over the points of an arc
// properties: x, y
// method: hasNext()
// usage:
//   while (iter.hasNext()) {
//     iter.x, iter.y; // do something w/ x & y
//   }
//
function ArcIter(xx, yy) {
  this._i = 0;
  this._inc = 1;
  this._stop = 0;
  this._xx = xx;
  this._yy = yy;
  this.i = 0;
  this.x = 0;
  this.y = 0;
}

ArcIter.prototype.init = function(i, len, fw) {
  if (fw) {
    this._i = i;
    this._inc = 1;
    this._stop = i + len;
  } else {
    this._i = i + len - 1;
    this._inc = -1;
    this._stop = i - 1;
  }
  return this;
};

ArcIter.prototype.hasNext = function() {
  var i = this._i;
  if (i == this._stop) return false;
  this._i = i + this._inc;
  this.x = this._xx[i];
  this.y = this._yy[i];
  this.i = i;
  return true;
};

function FilteredArcIter(xx, yy, zz) {
  var _zlim = 0,
      _i = 0,
      _inc = 1,
      _stop = 0;

  this.init = function(i, len, fw, zlim) {
    _zlim = zlim || 0;
    if (fw) {
      _i = i;
      _inc = 1;
      _stop = i + len;
    } else {
      _i = i + len - 1;
      _inc = -1;
      _stop = i - 1;
    }
    return this;
  };

  this.hasNext = function() {
    // using local vars is significantly faster when skipping many points
    var zarr = zz,
        i = _i,
        j = i,
        zlim = _zlim,
        stop = _stop,
        inc = _inc;
    if (i == stop) return false;
    do {
      j += inc;
    } while (j != stop && zarr[j] < zlim);
    _i = j;
    this.x = xx[i];
    this.y = yy[i];
    this.i = i;
    return true;
  };
}

// Iterate along a path made up of one or more arcs.
// Similar interface to ArcIter()
//
function ShapeIter(arcs) {
  this._arcs = arcs;
  this._i = 0;
  this._n = 0;
  this.x = 0;
  this.y = 0;

  this.hasNext = function() {
    var arc = this._arc;
    if (this._i >= this._n) {
      return false;
    } else if (arc.hasNext()) {
      this.x = arc.x;
      this.y = arc.y;
      return true;
    } else {
      this.nextArc();
      return this.hasNext();
    }
  };
}

ShapeIter.prototype.init = function(ids) {
  this._ids = ids;
  this._n = ids.length;
  this.reset();
  return this;
};

ShapeIter.prototype.nextArc = function() {
  var i = this._i + 1;
  if (i < this._n) {
    this._arc = this._arcs.getArcIter(this._ids[i]);
    if (i > 0) this._arc.hasNext(); // skip first point
  }
  this._i = i;
};

ShapeIter.prototype.reset = function() {
  this._i = -1;
  this.nextArc();
};




// Utility functions for working with ArcCollection and arrays of arc ids.

// @counts A typed array for accumulating count of each abs arc id
//   (assume it won't overflow)
MapShaper.countArcsInShapes = function(shapes, counts) {
  MapShaper.traverseShapes(shapes, null, function(obj) {
    var arcs = obj.arcs,
        id;
    for (var i=0; i<arcs.length; i++) {
      id = arcs[i];
      if (id < 0) id = ~id;
      counts[id]++;
    }
  });
};

// Returns subset of shapes in @shapes that contain one or more arcs in @arcIds
MapShaper.findShapesByArcId = function(shapes, arcIds, numArcs) {
  var index = numArcs ? new Uint8Array(numArcs) : [],
      found = [];
  arcIds.forEach(function(id) {
    index[absArcId(id)] = 1;
  });
  shapes.forEach(function(shp, shpId) {
    var isHit = false;
    MapShaper.forEachArcId(shp || [], function(id) {
      isHit = isHit || index[absArcId(id)] == 1;
    });
    if (isHit) {
      found.push(shpId);
    }
  });
  return found;
};

// @shp An element of the layer.shapes array
//   (may be null, or, depending on layer type, an array of points or an array of arrays of arc ids)
MapShaper.cloneShape = function(shp) {
  if (!shp) return null;
  return shp.map(function(part) {
    return part.concat();
  });
};

MapShaper.cloneShapes = function(arr) {
  return utils.isArray(arr) ? arr.map(MapShaper.cloneShape) : null;
};

// a and b are arrays of arc ids
MapShaper.pathsAreIdentical = function(a, b) {
  if (a.length != b.length) return false;
  for (var i=0, n=a.length; i<n; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
};

MapShaper.reversePath = function(ids) {
  ids.reverse();
  for (var i=0, n=ids.length; i<n; i++) {
    ids[i] = ~ids[i];
  }
};

MapShaper.clampIntervalByPct = function(z, pct) {
  if (pct <= 0) z = Infinity;
  else if (pct >= 1) z = 0;
  return z;
};

// Return id of the vertex between @start and @end with the highest
// threshold that is less than @zlim, or -1 if none
//
MapShaper.findNextRemovableVertex = function(zz, zlim, start, end) {
  var tmp, jz = 0, j = -1, z;
  if (start > end) {
    tmp = start;
    start = end;
    end = tmp;
  }
  for (var i=start+1; i<end; i++) {
    z = zz[i];
    if (z < zlim && z > jz) {
      j = i;
      jz = z;
    }
  }
  return j;
};

MapShaper.forEachPoint = function(lyr, cb) {
  if (lyr.geometry_type != 'point') {
    error("[forEachPoint()] Expects a point layer");
  }
  lyr.shapes.forEach(function(shape) {
    var n = shape ? shape.length : 0;
    for (var i=0; i<n; i++) {
      cb(shape[i]);
    }
  });
};

// Visit each arc id in a shape (array of array of arc ids)
// Use non-undefined return values of callback @cb as replacements.
MapShaper.forEachArcId = function(arr, cb) {
  var item;
  for (var i=0; i<arr.length; i++) {
    item = arr[i];
    if (item instanceof Array) {
      MapShaper.forEachArcId(item, cb);
    } else if (utils.isInteger(item)) {
      var val = cb(item);
      if (val !== void 0) {
        arr[i] = val;
      }
    } else if (item) {
      error("Non-integer arc id in:", arr);
    }
  }
};

MapShaper.forEachPath = function(paths, cb) {
  MapShaper.editPaths(paths, cb);
};

MapShaper.editPaths = function(paths, cb) {
  if (!paths) return null; // null shape
  if (!utils.isArray(paths)) error("[editPaths()] Expected an array, found:", arr);
  var nulls = 0,
      n = paths.length,
      retn;

  for (var i=0; i<n; i++) {
    retn = cb(paths[i], i);
    if (retn === null) {
      nulls++;
      paths[i] = null;
    } else if (utils.isArray(retn)) {
      paths[i] = retn;
    }
  }
  if (nulls == n) {
    return null;
  } else if (nulls > 0) {
    return paths.filter(function(ids) {return !!ids;});
  } else {
    return paths;
  }
};

MapShaper.forEachPathSegment = function(shape, arcs, cb) {
  MapShaper.forEachArcId(shape, function(arcId) {
    arcs.forEachArcSegment(arcId, cb);
  });
};

MapShaper.traverseShapes = function traverseShapes(shapes, cbArc, cbPart, cbShape) {
  var segId = 0;
  shapes.forEach(function(parts, shapeId) {
    if (!parts || parts.length === 0) return; // null shape
    var arcIds, arcId;
    if (cbShape) {
      cbShape(shapeId);
    }
    for (var i=0, m=parts.length; i<m; i++) {
      arcIds = parts[i];
      if (cbPart) {
        cbPart({
          i: i,
          shapeId: shapeId,
          shape: parts,
          arcs: arcIds
        });
      }

      if (cbArc) {
        for (var j=0, n=arcIds.length; j<n; j++, segId++) {
          arcId = arcIds[j];
          cbArc({
            i: j,
            shapeId: shapeId,
            partId: i,
            arcId: arcId,
            segId: segId
          });
        }
      }
    }
  });
};

MapShaper.arcHasLength = function(id, coords) {
  var iter = coords.getArcIter(id), x, y;
  if (iter.hasNext()) {
    x = iter.x;
    y = iter.y;
    while (iter.hasNext()) {
      if (iter.x != x || iter.y != y) return true;
    }
  }
  return false;
};

MapShaper.filterEmptyArcs = function(shape, coords) {
  if (!shape) return null;
  var shape2 = [];
  shape.forEach(function(ids) {
    var path = [];
    for (var i=0; i<ids.length; i++) {
      if (MapShaper.arcHasLength(ids[i], coords)) {
        path.push(ids[i]);
      }
    }
    if (path.length > 0) shape2.push(path);
  });
  return shape2.length > 0 ? shape2 : null;
};

// Bundle holes with their containing rings for Topo/GeoJSON polygon export.
// Assumes outer rings are CW and inner (hole) rings are CCW.
// @paths array of objects with path metadata -- see MapShaper.exportPathData()
//
// TODO: Improve reliability. Currently uses winding order, area and bbox to
//   identify holes and their enclosures -- could be confused by strange
//   geometry.
//
MapShaper.groupPolygonRings = function(paths) {
  var pos = [],
      neg = [];
  if (paths) {
    paths.forEach(function(path) {
      if (path.area > 0) {
        pos.push(path);
      } else if (path.area < 0) {
        neg.push(path);
      } else {
        // verbose("Zero-area ring, skipping");
      }
    });
  }

  var output = pos.map(function(part) {
    return [part];
  });

  neg.forEach(function(hole) {
    var containerId = -1,
        containerArea = 0;
    for (var i=0, n=pos.length; i<n; i++) {
      var part = pos[i],
          contained = part.bounds.contains(hole.bounds) && part.area > -hole.area;
      if (contained && (containerArea === 0 || part.area < containerArea)) {
        containerArea = part.area;
        containerId = i;
      }
    }
    if (containerId == -1) {
      verbose("[groupPolygonRings()] polygon hole is missing a containing ring, dropping.");
    } else {
      output[containerId].push(hole);
    }
  });
  return output;
};

MapShaper.getPathMetadata = function(shape, arcs, type) {
  return (shape || []).map(function(ids) {
    if (!utils.isArray(ids)) throw new Error("expected array");
    return {
      ids: ids,
      area: type == 'polygon' ? geom.getPlanarPathArea(ids, arcs) : 0,
      bounds: arcs.getSimpleShapeBounds(ids)
    };
  });
};




// utility functions for datasets and layers

// Copy layer data, but leave new layer unnamed
MapShaper.copyLayer = function(lyr) {
  var copy = utils.extend({}, lyr);
  if (lyr.data) {
    copy.data = lyr.data.clone();
  }
  if (lyr.shapes) {
    copy.shapes = MapShaper.cloneShapes(lyr.shapes);
  }
  return copy;
};

MapShaper.getDatasetBounds = function(data) {
  var bounds = new Bounds();
  data.layers.forEach(function(lyr) {
    var lyrbb = MapShaper.getLayerBounds(lyr, data.arcs);
    if (lyrbb) bounds.mergeBounds(lyrbb);
  });
  return bounds;
};

MapShaper.getFeatureCount = function(lyr) {
  var count = 0;
  if (lyr.data) {
    count = lyr.data.size();
  } else if (lyr.shapes) {
    count = lyr.shapes.length;
  }
  return count;
};

MapShaper.getLayerBounds = function(lyr, arcs) {
  var bounds = null;
  if (lyr.geometry_type == 'point') {
    bounds = new Bounds();
    MapShaper.forEachPoint(lyr, function(p) {
      bounds.mergePoint(p[0], p[1]);
    });
  } else if (lyr.geometry_type == 'polygon' || lyr.geometry_type == 'polyline') {
    bounds = MapShaper.getPathBounds(lyr.shapes, arcs);
  } else {
    // just return null if layer has no bounds
    // error("Layer is missing a valid geometry type");
  }
  return bounds;
};

MapShaper.getPathBounds = function(shapes, arcs) {
  var bounds = new Bounds();
  MapShaper.forEachArcId(shapes, function(id) {
    arcs.mergeArcBounds(id, bounds);
  });
  return bounds;
};

// replace cut layers in-sequence (to maintain layer indexes)
// append any additional new layers
MapShaper.replaceLayers = function(dataset, cutLayers, newLayers) {
  // modify a copy in case cutLayers == dataset.layers
  var currLayers = dataset.layers.concat();
  utils.repeat(Math.max(cutLayers.length, newLayers.length), function(i) {
    var cutLyr = cutLayers[i],
        newLyr = newLayers[i],
        idx = cutLyr ? currLayers.indexOf(cutLyr) : currLayers.length;

    if (cutLyr) {
      currLayers.splice(idx, 1);
    }
    if (newLyr) {
      currLayers.splice(idx, 0, newLyr);
    }
  });
  dataset.layers = currLayers;
};

// @target is a layer identifier or a comma-sep. list of identifiers
// an identifier is a literal name, a name containing "*" wildcard or
// a 0-based array index
MapShaper.findMatchingLayers = function(layers, target) {
  var ii = [];
  target.split(',').forEach(function(id) {
    var i = Number(id),
        rxp = utils.wildcardToRegExp(id);
    if (utils.isInteger(i)) {
      ii.push(i); // TODO: handle out-of-range index
    } else {
      layers.forEach(function(lyr, i) {
        if (rxp.test(lyr.name)) ii.push(i);
      });
    }
  });

  ii = utils.uniq(ii); // remove dupes
  return ii.map(function(i) {
    return layers[i];
  });
};

/*
MapShaper.validateLayer = function(lyr, arcs) {
  var type = lyr.geometry_type;
  if (!utils.isArray(lyr.shapes)) {
    error("Layer is missing shapes property");
  }
  if (lyr.data && lyr.data.size() != lyr.shapes.length) {
    error("Layer contains mismatched data table and shapes");
  }
  if (arcs && arcs instanceof ArcCollection === false) {
    error("Expected an ArcCollection");
  }
  if (type == 'polygon' || type == 'polyline') {
    if (!arcs) error("Missing ArcCollection for a", type, "layer");
    // TODO: validate shapes, make sure ids are w/in arc range
  } else if (type == 'point') {
    // TODO: validate shapes
  } else if (type === null) {
    // TODO: make sure shapes are all null
  }
};

// Simple integrity checks
MapShaper.validateDataset = function(data) {
  if (!data) invalid("Missing dataset object");
  if (!utils.isArray(data.layers) || data.layers.length > 0 === false)
    invalid("Missing layers");
  data.layers.forEach(function(lyr) {
    try {
      MapShaper.validateLayer(lyr, data.arcs);
    } catch (e) {
      invalid(e.message);
    }
  });

  function invalid(msg) {
    error("[validateDataset()] " + msg);
  }
};
*/




// Calculations for planar geometry of shapes
// TODO: consider 3D versions of some of these

geom.getPlanarShapeArea = function(shp, arcs) {
  return (shp || []).reduce(function(area, ids) {
    return area + geom.getPlanarPathArea(ids, arcs);
  }, 0);
};

geom.getSphericalShapeArea = function(shp, arcs) {
  if (arcs.isPlanar()) {
    error("[getSphericalShapeArea()] Function requires decimal degree coordinates");
  }
  return (shp || []).reduce(function(area, ids) {
    return area + geom.getSphericalPathArea(ids, arcs);
  }, 0);
};

// Return path with the largest (area) bounding box
// @shp array of array of arc ids
// @arcs ArcCollection
geom.getMaxPath = function(shp, arcs) {
  var maxArea = 0;
  return (shp || []).reduce(function(maxPath, path) {
    var bbArea = arcs.getSimpleShapeBounds(path).area();
    if (bbArea > maxArea) {
      maxArea = bbArea;
      maxPath = path;
    }
    return maxPath;
  }, null);
};

// @ids array of arc ids
// @arcs ArcCollection
geom.getAvgPathXY = function(ids, arcs) {
  var iter = arcs.getShapeIter(ids);
  if (!iter.hasNext()) return null;
  var x0 = iter.x,
      y0 = iter.y,
      count = 0,
      sumX = 0,
      sumY = 0;
  while (iter.hasNext()) {
    count++;
    sumX += iter.x;
    sumY += iter.y;
  }
  if (count === 0 || iter.x !== x0 || iter.y !== y0) {
    sumX += x0;
    sumY += y0;
    count++;
  }
  return {
    x: sumX / count,
    y: sumY / count
  };
};

// Return true if point is inside or on boundary of a shape
//
geom.testPointInPolygon = function(x, y, shp, arcs) {
  var isIn = false,
      isOn = false;
  if (shp) {
    shp.forEach(function(ids) {
      var inRing = geom.testPointInRing(x, y, ids, arcs);
      if (inRing == 1) {
        isIn = !isIn;
      } else if (inRing == -1) {
        isOn = true;
      }
    });
  }
  return isOn || isIn;
};


geom.getPointToPathDistance = function(px, py, ids, arcs) {
  var iter = arcs.getShapeIter(ids);
  if (!iter.hasNext()) return Infinity;
  var ax = iter.x,
      ay = iter.y,
      paSq = distanceSq(px, py, ax, ay),
      pPathSq = paSq,
      pbSq, abSq,
      bx, by;

  while (iter.hasNext()) {
    bx = iter.x;
    by = iter.y;
    pbSq = distanceSq(px, py, bx, by);
    abSq = distanceSq(ax, ay, bx, by);
    pPathSq = Math.min(pPathSq, pointSegDistSq(paSq, pbSq, abSq));
    ax = bx;
    ay = by;
    paSq = pbSq;
  }
  return Math.sqrt(pPathSq);
};

geom.getYIntercept = function(x, ax, ay, bx, by) {
  return ay + (x - ax) * (by - ay) / (bx - ax);
};

geom.getXIntercept = function(y, ax, ay, bx, by) {
  return ax + (y - ay) * (bx - ax) / (by - ay);
};

// Return unsigned distance of a point to a shape
//
geom.getPointToShapeDistance = function(x, y, shp, arcs) {
  var minDist = (shp || []).reduce(function(minDist, ids) {
    var pathDist = geom.getPointToPathDistance(x, y, ids, arcs);
    return Math.min(minDist, pathDist);
  }, Infinity);
  return minDist;
};

// Test if point (x, y) is inside, outside or on the boundary of a polygon ring
// Return 0: outside; 1: inside; -1: on boundary
//
geom.testPointInRing = function(x, y, ids, arcs) {
  /*
  // arcs.getSimpleShapeBounds() doesn't apply simplification, can't use here
  if (!arcs.getSimpleShapeBounds(ids).containsPoint(x, y)) {
    return false;
  }
  */
  var isIn = false,
      isOn = false;
  MapShaper.forEachPathSegment(ids, arcs, function(a, b, xx, yy) {
    var result = geom.testRayIntersection(x, y, xx[a], yy[a], xx[b], yy[b]);
    if (result == 1) {
      isIn = !isIn;
    } else if (isNaN(result)) {
      isOn = true;
    }
  });
  return isOn ? -1 : (isIn ? 1 : 0);
};

// test if a vertical ray originating at (x, y) intersects a segment
// returns 1 if intersection, 0 if no intersection, NaN if point touches segment
// (Special rules apply to endpoint intersections, to support point-in-polygon testing.)
geom.testRayIntersection = function(x, y, ax, ay, bx, by) {
  var val = geom.getRayIntersection(x, y, ax, ay, bx, by);
  if (val != val) {
    return NaN;
  }
  return val == -Infinity ? 0 : 1;
};

geom.getRayIntersection = function(x, y, ax, ay, bx, by) {
  var hit = -Infinity, // default: no hit
      yInt;

  // case: p is entirely above, left or right of segment
  if (x < ax && x < bx || x > ax && x > bx || y > ay && y > by) {
      // no intersection
  }
  // case: px aligned with a segment vertex
  else if (x === ax || x === bx) {
    // case: vertical segment or collapsed segment
    if (x === ax && x === bx) {
      // p is on segment
      if (y == ay || y == by || y > ay != y > by) {
        hit = NaN;
      }
      // else: no hit
    }
    // case: px equal to ax (only)
    else if (x === ax) {
      if (y === ay) {
        hit = NaN;
      } else if (bx < ax && y < ay) {
        // only score hit if px aligned to rightmost endpoint
        hit = ay;
      }
    }
    // case: px equal to bx (only)
    else {
      if (y === by) {
        hit = NaN;
      } else if (ax < bx && y < by) {
        // only score hit if px aligned to rightmost endpoint
        hit = by;
      }
    }
  // case: px is between endpoints
  } else {
    yInt = geom.getYIntercept(x, ax, ay, bx, by);
    if (yInt > y) {
      hit = yInt;
    } else if (yInt == y) {
      hit = NaN;
    }
  }
  return hit;
};

geom.getSphericalPathArea = function(ids, arcs) {
  var iter = arcs.getShapeIter(ids),
      sum = 0,
      started = false,
      deg2rad = Math.PI / 180,
      x, y, xp, yp;
  while (iter.hasNext()) {
    x = iter.x * deg2rad;
    y = Math.sin(iter.y * deg2rad);
    if (started) {
      sum += (x - xp) * (2 + y + yp);
    } else {
      started = true;
    }
    xp = x;
    yp = y;
  }
  return sum / 2 * 6378137 * 6378137;
};

// Get path area from an array of [x, y] points
// TODO: consider removing duplication with getPathArea(), e.g. by
//   wrapping points in an iterator.
//
geom.getPlanarPathArea2 = function(points) {
  var sum = 0,
      ax, ay, bx, by, dx, dy, p;
  for (var i=0, n=points.length; i<n; i++) {
    p = points[i];
    if (i === 0) {
      ax = 0;
      ay = 0;
      dx = -p[0];
      dy = -p[1];
    } else {
      ax = p[0] + dx;
      ay = p[1] + dy;
      sum += ax * by - bx * ay;
    }
    bx = ax;
    by = ay;
  }
  return sum / 2;
};

geom.getPlanarPathArea = function(ids, arcs) {
  var iter = arcs.getShapeIter(ids),
      sum = 0,
      ax, ay, bx, by, dx, dy;
  if (iter.hasNext()) {
    ax = 0;
    ay = 0;
    dx = -iter.x;
    dy = -iter.y;
    while (iter.hasNext()) {
      bx = ax;
      by = ay;
      ax = iter.x + dx;
      ay = iter.y + dy;
      sum += ax * by - bx * ay;
    }
  }
  return sum / 2;
};

geom.countVerticesInPath = function(ids, arcs) {
  var iter = arcs.getShapeIter(ids),
      count = 0;
  while (iter.hasNext()) count++;
  return count;
};

geom.getPathBounds = function(points) {
  var bounds = new Bounds();
  for (var i=0, n=points.length; i<n; i++) {
    bounds.mergePoint(points[i][0], points[i][1]);
  }
  return bounds;
};

geom.transposePoints = function(points) {
  var xx = [], yy = [], n=points.length;
  for (var i=0; i<n; i++) {
    xx.push(points[i][0]);
    yy.push(points[i][1]);
  }
  return [xx, yy];
};




// Get function to Hash an x, y point to a non-negative integer
function getXYHash(size) {
  var buf = new ArrayBuffer(16),
      floats = new Float64Array(buf),
      uints = new Uint32Array(buf),
      lim = size | 0;
  if (lim > 0 === false) {
    throw new Error("Invalid size param: " + size);
  }

  return function(x, y) {
    var u = uints, h;
    floats[0] = x;
    floats[1] = y;
    h = u[0] ^ u[1];
    h = h << 5 ^ h >> 7 ^ u[2] ^ u[3];
    return (h & 0x7fffffff) % lim;
  };
}



// Used for building topology
//
function ArcIndex(pointCount) {
  var hashTableSize = Math.ceil(pointCount * 0.25),
      hash = getXYHash(hashTableSize),
      hashTable = new Int32Array(hashTableSize),
      chainIds = [],
      arcs = [],
      arcPoints = 0;

  utils.initializeArray(hashTable, -1);

  this.addArc = function(xx, yy) {
    var end = xx.length - 1,
        key = hash(xx[end], yy[end]),
        chainId = hashTable[key],
        arcId = arcs.length;

    hashTable[key] = arcId;
    arcs.push([xx, yy]);
    arcPoints += xx.length;
    chainIds.push(chainId);
    return arcId;
  };

  // Look for a previously generated arc with the same sequence of coords, but in the
  // opposite direction. (This program uses the convention of CW for space-enclosing rings, CCW for holes,
  // so coincident boundaries should contain the same points in reverse sequence).
  //
  this.findArcNeighbor = function(xx, yy, start, end, getNext) {
    var next = getNext(start),
        key = hash(xx[start], yy[start]),
        arcId = hashTable[key],
        arcX, arcY, len;

    while (arcId != -1) {
      // check endpoints and one segment...
      // it would be more rigorous but slower to identify a match
      // by comparing all segments in the coordinate sequence
      arcX = arcs[arcId][0];
      arcY = arcs[arcId][1];
      len = arcX.length;
      if (arcX[0] === xx[end] && arcX[len-1] === xx[start] && arcX[len-2] === xx[next] &&
          arcY[0] === yy[end] && arcY[len-1] === yy[start] && arcY[len-2] === yy[next]) {
        return arcId;
      }
      arcId = chainIds[arcId];
    }
    return -1;
  };

  this.getVertexData = function() {
    var xx = new Float64Array(arcPoints),
        yy = new Float64Array(arcPoints),
        nn = new Uint32Array(arcs.length),
        copied = 0;
    arcs.forEach(function(arc, i) {
      var len = arc[0].length;
      MapShaper.copyElements(arc[0], 0, xx, copied, len);
      MapShaper.copyElements(arc[1], 0, yy, copied, len);
      nn[i] = len;
      copied += len;
    });
    return {
      xx: xx,
      yy: yy,
      nn: nn
    };
  };
}




// Converts all polygon and polyline paths in a dataset to a topological format,
// (in-place);
api.buildTopology = function(dataset) {
  if (!dataset.arcs) return;
  var raw = dataset.arcs.getVertexData(),
      cooked = MapShaper.buildPathTopology(raw.nn, raw.xx, raw.yy);
  dataset.arcs.updateVertexData(cooked.nn, cooked.xx, cooked.yy);
  dataset.layers.forEach(function(lyr) {
    if (lyr.geometry_type == 'polyline' || lyr.geometry_type == 'polygon') {
      lyr.shapes = MapShaper.replaceArcIds(lyr.shapes, cooked.paths);
    }
  });
};

// buildPathTopology() converts non-topological paths into
// a topological format
//
// Arguments:
//    xx: [Array|Float64Array],   // x coords of each point in the dataset
//    yy: [Array|Float64Array],   // y coords ...
//    nn: [Array]  // length of each path
//
// (x- and y-coords of all paths are concatenated into two arrays)
//
// Returns:
// {
//    xx, yy (array)   // coordinate data
//    nn: (array)      // points in each arc
//    paths: (array)   // Paths are arrays of one or more arc id.
// }
//
// Negative arc ids in the paths array indicate a reversal of arc -(id + 1)
//
MapShaper.buildPathTopology = function(nn, xx, yy) {
  var pointCount = xx.length,
      index = new ArcIndex(pointCount),
      typedArrays = !!(xx.subarray && yy.subarray),
      slice, array;

  var pathIds = initPathIds(pointCount, nn);

  if (typedArrays) {
    array = Float64Array;
    slice = xx.subarray;
  } else {
    array = Array;
    slice = Array.prototype.slice;
  }

  var chainIds = initPointChains(xx, yy);
  var pointId = 0;
  var paths = [];
  utils.forEach(nn, function(pathLen) {
    var arcs = pathLen < 2 ? null : convertPath(pointId, pointId + pathLen - 1);
    pointId += pathLen;
    paths.push(arcs);
  });
  var obj = index.getVertexData();
  obj.paths = paths;
  return obj;

  function nextPoint(id) {
    var partId = pathIds[id];
    if (pathIds[id+1] === partId) {
      return id + 1;
    }
    var len = nn[partId];
    return sameXY(id, id - len + 1) ? id - len + 2 : -1;
  }

  function prevPoint(id) {
    var partId = pathIds[id];
    if (pathIds[id - 1] === partId) {
      return id - 1;
    }
    var len = nn[partId];
    return sameXY(id, id + len - 1) ? id + len - 2 : -1;
  }

  function sameXY(a, b) {
    return xx[a] == xx[b] && yy[a] == yy[b];
  }

  // Convert a non-topological path to one or more topological arcs
  // @start, @end are ids of first and last points in the path
  // TODO: don't allow id ~id pairs
  //
  function convertPath(start, end) {
    var arcIds = [],
        firstNodeId = -1,
        arcStartId;

    // Visit each point in the path, up to but not including the last point
    //
    for (var i = start; i < end; i++) {
      if (pointIsArcEndpoint(i)) {
        if (firstNodeId > -1) {
          arcIds.push(addEdge(arcStartId, i));
        } else {
          firstNodeId = i;
        }
        arcStartId = i;
      }
    }

    // Identify the final arc in the path
    //
    if (firstNodeId == -1) {
      // Not in an arc, i.e. no nodes have been found...
      // Assuming that path is either an island or is congruent with one or more rings
      arcIds.push(addRing(start, end));
    }
    else if (firstNodeId == start) {
      // path endpoint is a node;
      if (!pointIsArcEndpoint(end)) {
        error("Topology error"); // TODO: better error handling
      }
      arcIds.push(addEdge(arcStartId, i));
    } else {
      // final arc wraps around
      arcIds.push(addEdge(arcStartId, end, start + 1, firstNodeId));
    }

    return arcIds;
  }

  // @a and @b are ids of two points with same x, y coords
  // Return false if adjacent points match, either in fw or rev direction
  //
  function brokenEdge(a, b) {
    var xarr = xx, yarr = yy; // local vars: faster
    var aprev = prevPoint(a),
        anext = nextPoint(a),
        bprev = prevPoint(b),
        bnext = nextPoint(b);
    if (aprev == -1 || anext == -1 || bprev == -1 || bnext == -1) {
      return true;
    }
    else if (xarr[aprev] == xarr[bnext] && xarr[anext] == xarr[bprev] &&
      yarr[aprev] == yarr[bnext] && yarr[anext] == yarr[bprev]) {
      return false;
    }
    else if (xarr[aprev] == xarr[bprev] && xarr[anext] == xarr[bnext] &&
      yarr[aprev] == yarr[bprev] && yarr[anext] == yarr[bnext]) {
      return false;
    }
    return true;
  }

  // Test if a point @id is an endpoint of a topological path
  //
  function pointIsArcEndpoint(id) {
    var chainId = chainIds[id];
    if (chainId == id) {
      // point is unique -- point is arc endpoint iff it is start or end of an open path
      return nextPoint(id) == -1 || prevPoint(id) == -1;
    }
    do {
      if (brokenEdge(id, chainId)) {
        // there is a discontinuity at @id -- point is arc endpoint
        return true;
      }
      chainId = chainIds[chainId];
    } while (id != chainId);
    // path parallels all adjacent paths at @id -- point is not arc endpoint
    return false;
  }

  function mergeArcParts(src, startId, endId, startId2, endId2) {
    var len = endId - startId + endId2 - startId2 + 2,
        dest = new array(len),
        j = 0, i;
    for (i=startId; i <= endId; i++) {
      dest[j++] = src[i];
    }
    for (i=startId2; i <= endId2; i++) {
      dest[j++] = src[i];
    }
    if (j != len) error("mergeArcParts() counting error.");
    return dest;
  }

  function addEdge(startId1, endId1, startId2, endId2) {
    var splitArc = arguments.length == 4,
        start = startId1,
        end = splitArc ? endId2 : endId1,
        arcId, xarr, yarr;

    // Look for previously identified arc, in reverse direction (normal topology)
    arcId = index.findArcNeighbor(xx, yy, start, end, nextPoint);
    if (arcId >= 0) return ~arcId;

    // Look for matching arc in same direction
    // (Abnormal topology, but we're accepting it because real-world Shapefiles
    //   sometimes have duplicate paths)
    arcId = index.findArcNeighbor(xx, yy, end, start, prevPoint);
    if (arcId >= 0) return arcId;

    if (splitArc) {
      xarr = mergeArcParts(xx, startId1, endId1, startId2, endId2);
      yarr = mergeArcParts(yy, startId1, endId1, startId2, endId2);
    } else {
      xarr = slice.call(xx, startId1, endId1 + 1);
      yarr = slice.call(yy, startId1, endId1 + 1);
    }
    return index.addArc(xarr, yarr);
  }

  //
  //
  function addRing(startId, endId) {
    var chainId = chainIds[startId],
        pathId = pathIds[startId],
        arcId;

    while (chainId != startId) {
      if (pathIds[chainId] < pathId) {
        break;
      }
      chainId = chainIds[chainId];
    }

    if (chainId == startId) {
      return addEdge(startId, endId);
    }

    for (var i=startId; i<endId; i++) {
      arcId = index.findArcNeighbor(xx, yy, i, i, nextPoint);
      if (arcId >= 0) return ~arcId;

      arcId = index.findArcNeighbor(xx, yy, i, i, prevPoint);
      if (arcId >= 0) return arcId;
    }

    error("Unmatched ring; id:", pathId, "len:", nn[pathId]);
  }
};

// Create a lookup table for path ids; path ids are indexed by point id
//
function initPathIds(size, pathSizes) {
  var pathIds = new Int32Array(size),
      j = 0;
  for (var pathId=0, pathCount=pathSizes.length; pathId < pathCount; pathId++) {
    for (var i=0, n=pathSizes[pathId]; i<n; i++, j++) {
      pathIds[j] = pathId;
    }
  }
  return pathIds;
}

// Return an array with data for chains of vertices with same x, y coordinates
// Array contains ids of next point in each chain.
// Unique vertices link to themselves (i.e. arr[n] == n)
//
function initPointChains(xx, yy) {
  var pointCount = xx.length,
      // Performance doesn't improve much above ~1.3 * point count
      hashTableSize = Math.floor(pointCount * 1.4),
      hash = getXYHash(hashTableSize),
      // Hash table is temporary storage for building chains of coincident points.
      // Hash bins contain the id of the first point in a chain.
      hashTable = new Int32Array(hashTableSize),
      chainIds = new Int32Array(pointCount), // Array to be filled with chain data
      key, headId, x, y;

  utils.initializeArray(hashTable, -1);

  for (var i=0; i<pointCount; i++) {
    x = xx[i];
    y = yy[i];
    key = hash(x, y);

    while (true) {
      headId = hashTable[key];
      if (headId == -1) {
        // case -- first coordinate in chain: start new chain, point to self
        hashTable[key] = i;
        chainIds[i] = i;
        break;
      }
      if (xx[headId] == x && yy[headId] == y) {
        // case -- extending a chain: insert new point after head of chain
        chainIds[i] = chainIds[headId];
        chainIds[headId] = i;
        break;
      }
      // Current hash location is taken by a different point;
      // try the next location (linear probing).
      key = (key + 1) % hashTableSize;
    }
  }
  return chainIds;
}

MapShaper.replaceArcIds = function(src, replacements) {
  return src.map(function(shape) {
    return replaceArcsInShape(shape, replacements);
  });

  function replaceArcsInShape(shape, replacements) {
    if (!shape) return null;
    return shape.map(function(path) {
      return replaceArcsInPath(path, replacements);
    });
  }

  function replaceArcsInPath(path, replacements) {
    return path.reduce(function(memo, id) {
      var abs = absArcId(id);
      var topoPath = replacements[abs];
      if (topoPath) {
        if (id < 0) {
          topoPath = topoPath.concat(); // TODO: need to copy?
          MapShaper.reversePath(topoPath);
        }
        for (var i=0, n=topoPath.length; i<n; i++) {
          memo.push(topoPath[i]);
        }
      }
      return memo;
    }, []);
  }
};




MapShaper.getHighPrecisionSnapInterval = function(arcs) {
  var bb = arcs.getBounds();
  if (!bb.hasBounds()) return 0;
  var maxCoord = Math.max(Math.abs(bb.xmin), Math.abs(bb.ymin),
      Math.abs(bb.xmax), Math.abs(bb.ymax));
  return maxCoord * 1e-14;
};

MapShaper.snapCoords = function(arcs, threshold) {
    var avgDist = arcs.getAvgSegment(),
        autoSnapDist = avgDist * 0.0025,
        snapDist = autoSnapDist;

  if (threshold > 0) {
    snapDist = threshold;
    message(utils.format("Applying snapping threshold of %s -- %.6f times avg. segment length", threshold, threshold / avgDist));
  }

  var snapCount = MapShaper.snapCoordsByInterval(arcs, snapDist);
  if (snapCount > 0) arcs.dedupCoords();
  message(utils.format("Snapped %s point%s", snapCount, "s?"));
};

// Snap together points within a small threshold
//
MapShaper.snapCoordsByInterval = function(arcs, snapDist) {
  var snapCount = 0,
      data = arcs.getVertexData();

  // Get sorted coordinate ids
  // Consider: speed up sorting -- try bucket sort as first pass.
  //
  var ids = utils.sortCoordinateIds(data.xx);
  for (var i=0, n=ids.length; i<n; i++) {
    snapCount += snapPoint(i, snapDist, ids, data.xx, data.yy);
  }
  return snapCount;

  function snapPoint(i, limit, ids, xx, yy) {
    var j = i,
        n = ids.length,
        x = xx[ids[i]],
        y = yy[ids[i]],
        snaps = 0,
        id2, dx, dy;

    while (++j < n) {
      id2 = ids[j];
      dx = xx[id2] - x;
      if (dx > limit) break;
      dy = yy[id2] - y;
      if (dx === 0 && dy === 0 || dx * dx + dy * dy > limit * limit) continue;
      xx[id2] = x;
      yy[id2] = y;
      snaps++;
    }
    return snaps;
  }
};

utils.sortCoordinateIds = function(a) {
  var n = a.length,
      ids = new Uint32Array(n);
  for (var i=0; i<n; i++) {
    ids[i] = i;
  }
  utils.quicksortIds(a, ids, 0, ids.length-1);
  return ids;
};

/*
// Returns array of array ids, in ascending order.
// @a array of numbers
//
utils.sortCoordinateIds = function(a) {
  return utils.bucketSortIds(a);
};

// This speeds up sorting of large datasets (~2x faster for 1e7 values)
// worth the additional code?
utils.bucketSortIds = function(a, n) {
  var len = a.length,
      ids = new Uint32Array(len),
      bounds = utils.getArrayBounds(a),
      buckets = Math.ceil(n > 0 ? n : len / 10),
      counts = new Uint32Array(buckets),
      offsets = new Uint32Array(buckets),
      i, j, offs, count;

  // get bucket sizes
  for (i=0; i<len; i++) {
    j = bucketId(a[i], bounds.min, bounds.max, buckets);
    counts[j]++;
  }

  // convert counts to offsets
  offs = 0;
  for (i=0; i<buckets; i++) {
    offsets[i] = offs;
    offs += counts[i];
  }

  // assign ids to buckets
  for (i=0; i<len; i++) {
    j = bucketId(a[i], bounds.min, bounds.max, buckets);
    offs = offsets[j]++;
    ids[offs] = i;
  }

  // sort each bucket with quicksort
  for (i = 0; i<buckets; i++) {
    count = counts[i];
    if (count > 1) {
      offs = offsets[i] - count;
      utils.quicksortIds(a, ids, offs, offs + count - 1);
    }
  }
  return ids;

  function bucketId(val, min, max, buckets) {
    var id = (buckets * (val - min) / (max - min)) | 0;
    return id < buckets ? id : buckets - 1;
  }
};
*/

utils.quicksortIds = function (a, ids, lo, hi) {
  if (hi - lo > 24) {
    var pivot = a[ids[lo + hi >> 1]],
        i = lo,
        j = hi,
        tmp;
    while (i <= j) {
      while (a[ids[i]] < pivot) i++;
      while (a[ids[j]] > pivot) j--;
      if (i <= j) {
        tmp = ids[i];
        ids[i] = ids[j];
        ids[j] = tmp;
        i++;
        j--;
      }
    }
    if (j > lo) utils.quicksortIds(a, ids, lo, j);
    if (i < hi) utils.quicksortIds(a, ids, i, hi);
  } else {
    utils.insertionSortIds(a, ids, lo, hi);
  }
};

utils.insertionSortIds = function(arr, ids, start, end) {
  var id, i, j;
  for (j = start + 1; j <= end; j++) {
    id = ids[j];
    for (i = j - 1; i >= start && arr[id] < arr[ids[i]]; i--) {
      ids[i+1] = ids[i];
    }
    ids[i+1] = id;
  }
};




MapShaper.NodeCollection = NodeCollection;

// @arcs ArcCollection
// @filter Optional filter function, arcIds that return false are excluded
//
function NodeCollection(arcs, filter) {
  if (utils.isArray(arcs)) {
    arcs = new ArcCollection(arcs);
  }
  var arcData = arcs.getVertexData(),
      nn = arcData.nn,
      xx = arcData.xx,
      yy = arcData.yy;

  var nodeData = MapShaper.findNodeTopology(arcs, filter);

  if (nn.length * 2 != nodeData.chains.length) error("[NodeCollection] count error");

  // TODO: could check that arc collection hasn't been modified, using accessor function
  Object.defineProperty(this, 'arcs', {value: arcs});

  this.toArray = function() {
    var flags = new Uint8Array(nodeData.xx.length),
        nodes = [];
    utils.forEach(nodeData.chains, function(next, i) {
      if (flags[i] == 1) return;
      nodes.push([nodeData.xx[i], nodeData.yy[i]]);
      while (flags[next] != 1) {
        flags[next] = 1;
        next = nodeData.chains[next];
      }
    });
    return nodes;
  };

  this.debugNode = function(arcId) {
    if (!MapShaper.TRACING) return;
    var ids = [arcId];
    this.forEachConnectedArc(arcId, function(id) {
      ids.push(id);
    });

    message("node ids:",  ids);
    ids.forEach(printArc);

    function printArc(id) {
      var str = id + ": ";
      var len = arcs.getArcLength(id);
      if (len > 0) {
        var p1 = arcs.getVertex(id, -1);
        str += utils.format("[%f, %f]", p1.x, p1.y);
        if (len > 1) {
          var p2 = arcs.getVertex(id, -2);
          str += utils.format(", [%f, %f]", p2.x, p2.y);
          if (len > 2) {
            var p3 = arcs.getVertex(id, 0);
            str += utils.format(", [%f, %f]", p3.x, p3.y);
          }
          str += " len: " + distance2D(p1.x, p1.y, p2.x, p2.y);
        }
      } else {
        str = "[]";
      }
      message(str);
    }
  };

  this.forEachConnectedArc = function(arcId, cb) {
    var nextId = nextConnectedArc(arcId),
        i = 0;
    while (nextId != arcId) {
      cb(nextId, i++);
      nextId = nextConnectedArc(nextId);
    }
  };

  // Returns the id of the first identical arc or @arcId if none found
  // TODO: find a better function name
  this.findMatchingArc = function(arcId) {
    var verbose = arcId ==  -12794 || arcId == 19610;
    var nextId = nextConnectedArc(arcId),
        match = arcId;
    while (nextId != arcId) {
      if (testArcMatch(arcId, nextId)) {
        if (absArcId(nextId) < absArcId(match)) match = nextId;
      }
      nextId = nextConnectedArc(nextId);
    }
    if (match != arcId) {
      trace("found identical arc:", arcId, "->", match);
      // this.debugNode(arcId);
    }
    return match;
  };

  function testArcMatch(a, b) {
    var absA = a >= 0 ? a : ~a,
        absB = b >= 0 ? b : ~b,
        lenA = nn[absA];
    if (lenA < 2) {
      // Don't throw error on collapsed arcs -- assume they will be handled
      //   appropriately downstream.
      // error("[testArcMatch() defective arc; len:", lenA);
      return false;
    }
    if (lenA != nn[absB]) return false;
    if (testVertexMatch(a, b, -1) &&
        testVertexMatch(a, b, 1) &&
        testVertexMatch(a, b, -2)) {
      return true;
    }
    return false;
  }

  function testVertexMatch(a, b, i) {
    var ai = arcs.indexOfVertex(a, i),
        bi = arcs.indexOfVertex(b, i);
    return xx[ai] == xx[bi] && yy[ai] == yy[bi];
  }

  // return arcId of next arc in the chain, pointed towards the shared vertex
  function nextConnectedArc(arcId) {
    var fw = arcId >= 0,
        absId = fw ? arcId : ~arcId,
        nodeId = fw ? absId * 2 + 1: absId * 2, // if fw, use end, if rev, use start
        chainedId = nodeData.chains[nodeId],
        nextAbsId = chainedId >> 1,
        nextArcId = chainedId & 1 == 1 ? nextAbsId : ~nextAbsId;

    if (chainedId < 0 || chainedId >= nodeData.chains.length) error("out-of-range chain id");
    if (absId >= nn.length) error("out-of-range arc id");
    if (nodeData.chains.length <= nodeId) error("out-of-bounds node id");
    return nextArcId;
  }

  // expose for testing
  this.internal = {
    testArcMatch: testArcMatch,
    testVertexMatch: testVertexMatch
  };
}

MapShaper.findNodeTopology = function(arcs, filter) {
  var n = arcs.size() * 2,
      xx2 = new Float64Array(n),
      yy2 = new Float64Array(n),
      ids2 = new Int32Array(n);

  arcs.forEach2(function(i, n, xx, yy, zz, arcId) {
    if (filter && !filter(arcId)) {
      return;
    }
    var start = i,
        end = i + n - 1,
        start2 = arcId * 2,
        end2 = start2 + 1;
    xx2[start2] = xx[start];
    yy2[start2] = yy[start];
    ids2[start2] = arcId;
    xx2[end2] = xx[end];
    yy2[end2] = yy[end];
    ids2[end2] = arcId;
  });

  var chains = initPointChains(xx2, yy2);
  return {
    xx: xx2,
    yy: yy2,
    ids: ids2,
    chains: chains
  };
};




// PolygonIndex indexes the coordinates in one polygon feature for efficient
// point-in-polygon tests

MapShaper.PolygonIndex = PolygonIndex;

function PolygonIndex(shape, arcs) {
  var data = arcs.getVertexData(),
      polygonBounds = arcs.getMultiShapeBounds(shape),
      boundsLeft,
      p1Arr, p2Arr,
      bucketCount,
      bucketOffsets,
      bucketWidth;

  init();

  // Return 0 if outside, 1 if inside, -1 if on boundary
  this.pointInPolygon = function(x, y) {
    if (!polygonBounds.containsPoint(x, y)) {
      return false;
    }
    var bucketId = getBucketId(x);
    var count = countCrosses(x, y, bucketId);
    if (bucketId > 0) {
      count += countCrosses(x, y, bucketId - 1);
    }
    if (bucketId < bucketCount - 1) {
      count += countCrosses(x, y, bucketId + 1);
    }
    count += countCrosses(x, y, bucketCount); // check oflo bucket
    if (isNaN(count)) return -1;
    return count % 2 == 1 ? 1 : 0;
  };

  function init() {
    var xx = data.xx,
        segCount = 0,
        bucketId = 0,
        bucketLeft = boundsLeft,
        segId = 0,
        segments,
        lastX,
        head, tail,
        a, b, i, j, xmin, xmax;

    // get sorted array of segment ids
    MapShaper.forEachPathSegment(shape, arcs, function() {
      segCount++;
    });
    segments = new Uint32Array(segCount * 2);
    i = 0;
    MapShaper.forEachPathSegment(shape, arcs, function(a, b, xx, yy) {
      segments[i++] = a;
      segments[i++] = b;
    });
    MapShaper.sortSegmentIds(xx, segments);

    // populate buckets
    p1Arr = new Uint32Array(segCount);
    p2Arr = new Uint32Array(segCount);
    bucketCount = Math.ceil(segCount / 100);
    bucketOffsets = new Uint32Array(bucketCount + 1);
    lastX = xx[segments[segments.length - 2]]; // xmin of last segment
    bucketLeft = boundsLeft = xx[segments[0]]; // xmin of first segment
    bucketWidth = (lastX - boundsLeft) / bucketCount;
    head = 0;
    tail = segCount - 1;

    while (bucketId < bucketCount && segId < segCount) {
      j = segId * 2;
      a = segments[j];
      b = segments[j+1];
      xmin = xx[a];
      xmax = xx[b];

      if (xmin > bucketLeft + bucketWidth && bucketId < bucketCount - 1) {
        bucketId++;
        bucketLeft = bucketId * bucketWidth + boundsLeft;
        bucketOffsets[bucketId] = head;
      } else {
        if (getBucketId(xmin) != bucketId) console.log("wrong bucket");
        if (xmin < bucketLeft) error("out-of-range");
        if (xmax - xmin >= 0 === false) error("invalid segment");
        if (xmax > bucketLeft + 2 * bucketWidth) {
          p1Arr[tail] = a;
          p2Arr[tail] = b;
          tail--;
        } else {
          p1Arr[head] = a;
          p2Arr[head] = b;
          head++;
        }
        segId++;
      }
    }
    bucketOffsets[bucketCount] = head;
    if (head != tail + 1) error("counting error; head:", head, "tail:", tail);
  }

  function countCrosses(x, y, bucketId) {
    var offs = bucketOffsets[bucketId],
        n = (bucketId == bucketCount) ? p1Arr.length - offs : bucketOffsets[bucketId + 1] - offs,
        count = 0,
        xx = data.xx,
        yy = data.yy,
        a, b;

    for (var i=0; i<n; i++) {
      a = p1Arr[i + offs];
      b = p2Arr[i + offs];
      count += geom.testRayIntersection(x, y, xx[a], yy[a], xx[b], yy[b]);
    }
    return count;
  }

  function getBucketId(x) {
    var i = Math.floor((x - boundsLeft) / bucketWidth);
    if (i < 0) i = 0;
    if (i >= bucketCount) i = bucketCount - 1;
    return i;
  }

}




MapShaper.PathIndex = PathIndex;

function PathIndex(shapes, arcs) {
  var _index;
  // var totalArea = arcs.getBounds().area();
  var totalArea = MapShaper.getPathBounds(shapes, arcs).area();
  init(shapes);

  function init(shapes) {
    var boxes = [];

    shapes.forEach(function(shp, shpId) {
      var n = shp ? shp.length : 0;
      for (var i=0; i<n; i++) {
        addPath(shp[i], shpId);
      }
    });

    _index = require('rbush')();
    _index.load(boxes);

    function addPath(ids, shpId) {
      var bounds = arcs.getSimpleShapeBounds(ids);
      var bbox = bounds.toArray();
      bbox.ids = ids;
      bbox.bounds = bounds;
      bbox.id = shpId;
      boxes.push(bbox);
      // TODO: Better test for whether or not to index a path
      if (bounds.area() > totalArea * 0.02) {
        bbox.index = new PolygonIndex([ids], arcs);
      }
    }
  }

  this.findEnclosingShape = function(p) {
    var shpId = -1;
    var shapes = findPointHitShapes(p);
    shapes.forEach(function(paths) {
      if (testPointInRings(p, paths)) {
        shpId = paths[0].id;
      }
    });
    return shpId;
  };

  this.pointIsEnclosed = function(p) {
    return testPointInRings(p, findPointHitRings(p));
  };

  this.arcIsEnclosed = function(arcId) {
    return this.pointIsEnclosed(getTestPoint(arcId));
  };

  // Test if a polygon ring is contained within an indexed ring
  // Not a true polygon-in-polygon test
  // Assumes that the target ring does not cross an indexed ring at any point
  // or share a segment with an indexed ring. (Intersecting rings should have
  // been detected previously).
  //
  this.pathIsEnclosed = function(pathIds) {
    var arcId = pathIds[0];
    var p = getTestPoint(arcId);
    return this.pointIsEnclosed(p);
  };

  // return array of paths that are contained within a path, or null if none
  // @pathIds Array of arc ids comprising a closed path
  this.findEnclosedPaths = function(pathIds) {
    var pathBounds = arcs.getSimpleShapeBounds(pathIds),
        cands = _index.search(pathBounds.toArray()),
        paths = [],
        index;

    if (cands.length > 6) {
      index = new PolygonIndex([pathIds], arcs);
    }


    cands.forEach(function(cand) {
      var p = getTestPoint(cand.ids[0]);
      var isEnclosed = index ?
        index.pointInPolygon(p[0], p[1]) : pathContainsPoint(pathIds, pathBounds, p);
      if (isEnclosed) {
        paths.push(cand.ids);
      }
    });
    return paths.length > 0 ? paths : null;
  };

  this.findPathsInsideShape = function(shape) {
    var paths = [];
    shape.forEach(function(ids) {
      var enclosed = this.findEnclosedPaths(ids);
      if (enclosed) {
        paths = xorArrays(paths, enclosed);
      }
    }, this);
    return paths.length > 0 ? paths : null;
  };

  function testPointInRings(p, cands) {
    var isOn = false,
        isIn = false;
    cands.forEach(function(cand) {
      var inRing = cand.index ?
        cand.index.pointInPolygon(p[0], p[1]) :
        pathContainsPoint(cand.ids, cand.bounds, p);
      if (inRing == -1) {
        isOn = true;
      } else if (inRing == 1) {
        isIn = !isIn;
      }
    });
    return isOn || isIn;
  }

  function findPointHitShapes(p) {
    var rings = findPointHitRings(p),
        shapes = [],
        shape, bbox;
    if (rings.length > 0) {
      rings.sort(function(a, b) {return a.id - b.id;});
      for (var i=0; i<rings.length; i++) {
        bbox = rings[i];
        if (i === 0 || bbox.id != rings[i-1].id) {
          shapes.push(shape=[]);
        }
        shape.push(bbox);
      }
    }
    return shapes;
  }

  function findPointHitRings(p) {
    var x = p[0],
        y = p[1];
    return _index.search([x, y, x, y]);
  }

  function getTestPoint(arcId) {
    // test point halfway along first segment because ring might still be
    // enclosed if a segment endpoint touches an indexed ring.
    var p0 = arcs.getVertex(arcId, 0),
        p1 = arcs.getVertex(arcId, 1);
    return [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2];
  }

  function pathContainsPoint(pathIds, pathBounds, p) {
    if (pathBounds.containsPoint(p[0], p[1]) === false) return 0;
    // A contains B iff some point on B is inside A
    return geom.testPointInRing(p[0], p[1], pathIds, arcs);
  }

  function xorArrays(a, b) {
    var xor = [];
    a.forEach(function(el) {
      if (b.indexOf(el) == -1) xor.push(el);
    });
    b.forEach(function(el) {
      if (xor.indexOf(el) == -1) xor.push(el);
    });
    return xor;
  }
}




// Convert an array of intersections into an ArcCollection (for display)
//
MapShaper.getIntersectionPoints = function(intersections) {
  return intersections.map(function(obj) {
        return [obj.x, obj.y];
      });
};

var count = 0;

// Identify intersecting segments in an ArcCollection
//
// Method: bin segments into horizontal stripes
// Segments that span stripes are assigned to all intersecting stripes
// To find all intersections:
// 1. Assign each segment to one or more bins
// 2. Find intersections inside each bin (ignoring duplicate intersections)
//
MapShaper.findSegmentIntersections = (function() {

  // Re-use buffer for temp data -- Chrome's gc starts bogging down
  // if large buffers are repeatedly created.
  var buf;
  function getUint32Array(count) {
    var bytes = count * 4;
    if (!buf || buf.byteLength < bytes) {
      buf = new ArrayBuffer(bytes);
    }
    return new Uint32Array(buf, 0, count);
  }

  return function(arcs) {
    var bounds = arcs.getBounds(),
        // TODO: handle spherical bounds
        spherical = !arcs.isPlanar() &&
            containsBounds(MapShaper.getWorldBounds(), bounds.toArray()),
        ymin = bounds.ymin,
        yrange = bounds.ymax - ymin,
        stripeCount = MapShaper.calcSegmentIntersectionStripeCount(arcs),
        stripeSizes = new Uint32Array(stripeCount),
        i;

    function stripeId(y) {
      return Math.floor((stripeCount-1) * (y - ymin) / yrange);
    }

    // Count segments in each stripe
    arcs.forEachSegment(function(id1, id2, xx, yy) {
      var s1 = stripeId(yy[id1]),
          s2 = stripeId(yy[id2]);
      while (true) {
        stripeSizes[s1] = stripeSizes[s1] + 2;
        if (s1 == s2) break;
        s1 += s2 > s1 ? 1 : -1;
      }
    });

    // Allocate arrays for segments in each stripe
    var stripeData = getUint32Array(utils.sum(stripeSizes)),
        offs = 0;
    var stripes = [];
    utils.forEach(stripeSizes, function(stripeSize) {
      var start = offs;
      offs += stripeSize;
      stripes.push(stripeData.subarray(start, offs));
    });
    // Assign segment ids to each stripe
    utils.initializeArray(stripeSizes, 0);

    arcs.forEachSegment(function(id1, id2, xx, yy) {
      var s1 = stripeId(yy[id1]),
          s2 = stripeId(yy[id2]),
          count, stripe;
      while (true) {
        count = stripeSizes[s1];
        stripeSizes[s1] = count + 2;
        stripe = stripes[s1];
        stripe[count] = id1;
        stripe[count+1] = id2;
        if (s1 == s2) break;
        s1 += s2 > s1 ? 1 : -1;
      }
    });

    // Detect intersections among segments in each stripe.
    var raw = arcs.getVertexData(),
        intersections = [],
        index = {},
        arr;
    for (i=0; i<stripeCount; i++) {
      arr = MapShaper.intersectSegments(stripes[i], raw.xx, raw.yy, spherical);
      if (arr.length > 0) {
        extendIntersections(intersections, arr, i);
      }
    }
    return intersections;

    // Add intersections from a bin, but avoid duplicates.
    function extendIntersections(intersections, arr, stripeId) {
      arr.forEach(function(obj, i) {
        var key = MapShaper.getIntersectionKey(obj.a, obj.b);
        if (key in index === false) {
          intersections.push(obj);
          index[key] = true;
        }
      });
    }
  };
})();

MapShaper.calcSegmentIntersectionStripeCount = function(arcs) {
  var yrange = arcs.getBounds().height(),
      segLen = arcs.getAvgSegment2()[1],
      count = 1;
  if (segLen > 0 && yrange > 0) {
    count = Math.ceil(yrange / segLen / 20);
  }
  return count || 1;
};

// Get an indexable key that is consistent regardless of point sequence
// @a, @b endpoint ids in format [i, j]
MapShaper.getIntersectionKey = function(a, b) {
  return a.concat(b).sort().join(',');
};

// Find intersections among a group of line segments
// TODO: handle case where a segment starts and ends at the same point (i.e. duplicate coords);
//
// @ids: Array of indexes: [s0p0, s0p1, s1p0, s1p1, ...] where xx[sip0] <= xx[sip1]
// @xx, @yy: Arrays of x- and y-coordinates
//
MapShaper.intersectSegments = function(ids, xx, yy, spherical) {
  var lim = ids.length - 2,
      intersections = [];
  var s1p1, s1p2, s2p1, s2p2,
      s1p1x, s1p2x, s2p1x, s2p2x,
      s1p1y, s1p2y, s2p1y, s2p2y,
      hit, i, j;


  // Sort segments by xmin, to allow efficient exclusion of segments with
  // non-overlapping x extents.
  MapShaper.sortSegmentIds(xx, ids); // sort by ascending xmin

  i = 0;
  while (i < lim) {
    s1p1 = ids[i];
    s1p2 = ids[i+1];
    s1p1x = xx[s1p1];
    s1p2x = xx[s1p2];
    s1p1y = yy[s1p1];
    s1p2y = yy[s1p2];
    count++;

    j = i;
    while (j < lim) {
      j += 2;
      s2p1 = ids[j];
      s2p1x = xx[s2p1];
      count++;

      if (s1p2x < s2p1x) break; // x extent of seg 2 is greater than seg 1: done with seg 1
      //if (s1p2x <= s2p1x) break; // this misses point-segment intersections when s1 or s2 is vertical

      s2p1y = yy[s2p1];
      s2p2 = ids[j+1];
      s2p2x = xx[s2p2];
      s2p2y = yy[s2p2];

      // skip segments with non-overlapping y ranges
      if (s1p1y >= s2p1y) {
        if (s1p1y > s2p2y && s1p2y > s2p1y && s1p2y > s2p2y) continue;
      } else {
        if (s1p1y < s2p2y && s1p2y < s2p1y && s1p2y < s2p2y) continue;
      }

      // skip segments that share an endpoint
      if (s1p1x == s2p1x && s1p1y == s2p1y || s1p1x == s2p2x && s1p1y == s2p2y ||
          s1p2x == s2p1x && s1p2y == s2p1y || s1p2x == s2p2x && s1p2y == s2p2y) {
        // TODO: don't reject segments that share exactly one endpoint and fold back on themselves
        continue;
      }

      // test two candidate segments for intersection
      hit = segmentIntersection(s1p1x, s1p1y, s1p2x, s1p2y,
          s2p1x, s2p1y, s2p2x, s2p2y);

      if (hit) {
        intersections.push({
          x: hit[0],
          y: hit[1],
          a: getEndpointIds(s1p1, s1p2, hit),
          b: getEndpointIds(s2p1, s2p2, hit)
        });
      }
    }
    i += 2;
  }
  return intersections;

  // @p is an [x, y] location along a segment defined by ids @id1 and @id2
  // return array [i, j] where i and j are the same endpoint ids with i <= j
  // if @p coincides with an endpoint, return the id of that endpoint twice
  function getEndpointIds(id1, id2, p) {
    var i = id1 < id2 ? id1 : id2,
        j = i === id1 ? id2 : id1;
    if (xx[i] == p[0] && yy[i] == p[1]) {
      j = i;
    } else if (xx[j] == p[0] && yy[j] == p[1]) {
      i = j;
    }
    return [i, j];
  }
};

MapShaper.orderSegmentIds = function(xx, ids, spherical) {
  function swap(i, j) {
    var tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  for (var i=0, n=ids.length; i<n; i+=2) {
    if (xx[ids[i]] > xx[ids[i+1]]) {
      swap(i, i+1);
    }
  }
};

MapShaper.sortSegmentIds = function(xx, ids) {
  MapShaper.orderSegmentIds(xx, ids);
  MapShaper.quicksortSegmentIds(xx, ids, 0, ids.length-2);
};

MapShaper.insertionSortSegmentIds = function(arr, ids, start, end) {
  var id, id2;
  for (var j = start + 2; j <= end; j+=2) {
    id = ids[j];
    id2 = ids[j+1];
    for (var i = j - 2; i >= start && arr[id] < arr[ids[i]]; i-=2) {
      ids[i+2] = ids[i];
      ids[i+3] = ids[i+1];
    }
    ids[i+2] = id;
    ids[i+3] = id2;
  }
};

MapShaper.quicksortSegmentIds = function (a, ids, lo, hi) {
  var i = lo,
      j = hi,
      pivot, tmp;
  while (i < hi) {
    pivot = a[ids[(lo + hi >> 2) << 1]]; // avoid n^2 performance on sorted arrays
    while (i <= j) {
      while (a[ids[i]] < pivot) i+=2;
      while (a[ids[j]] > pivot) j-=2;
      if (i <= j) {
        tmp = ids[i];
        ids[i] = ids[j];
        ids[j] = tmp;
        tmp = ids[i+1];
        ids[i+1] = ids[j+1];
        ids[j+1] = tmp;
        i+=2;
        j-=2;
      }
    }

    if (j - lo < 40) MapShaper.insertionSortSegmentIds(a, ids, lo, j);
    else MapShaper.quicksortSegmentIds(a, ids, lo, j);
    if (hi - i < 40) {
      MapShaper.insertionSortSegmentIds(a, ids, i, hi);
      return;
    }
    lo = i;
    j = hi;
  }
};




// Return function for splitting self-intersecting polygon rings
// Returned function receives a single path, returns an array of paths
// Assumes that any intersections occur at vertices, not along segments
// (requires that MapShaper.divideArcs() has already been run)
//
MapShaper.getSelfIntersectionSplitter = function(nodes) {

  function contains(arr, el) {
    for (var i=0, n=arr.length; i<n; i++) {
      if (arr[i] === el) return true;
    }
    return false;
  }

  // If arc @enterId enters a node with more than one open routes leading out:
  //   return array of sub-paths
  // else return null
  function dividePathAtNode(path, enterId) {
    var count = 0,
        subPaths = null,
        exitIds, firstExitId;
    nodes.forEachConnectedArc(enterId, function(arcId) {
      var exitId = ~arcId;
      // TODO: remove performance bottleneck
      // contains() is faster than native array.indexOf(), could do better.
      // if (path.indexOf(exitId) > -1) { // ignore arcs that are not on this path
      if (contains(path, exitId)) { // ignore arcs that are not on this path
        if (count === 0) {
          firstExitId = exitId;
        } else if (count === 1) {
          exitIds = [firstExitId, exitId];
        } else {
          exitIds.push(exitId);
        }
        count++;
      }
    });
    if (exitIds) {
      subPaths = MapShaper.splitPathByIds(path, exitIds);
      // recursively divide each sub-path
      return subPaths.reduce(function(memo, subPath) {
        return memo.concat(dividePath(subPath));
      }, []);
    }
    return null;
  }

  function dividePath(path) {
    var subPaths = null;
    for (var i=0; i<path.length - 1; i++) { // don't need to check last arc
      subPaths = dividePathAtNode(path, path[i]);
      if (subPaths) {
        return subPaths;
      }
    }
    // indivisible path -- remove any spikes
    MapShaper.removeSpikesInPath(path);
    return path.length > 0 ? [path] : [];
  }

  return dividePath;
};

// @path An array of arc ids
// @ids An array of two or more start ids
MapShaper.splitPathByIds = function(path, ids) {
  var n = ids.length;
  var ii = ids.map(function(id) {
    var idx = path.indexOf(id);
    if (idx == -1) error("[splitPathByIds()] Path is missing id:", id);
    return idx;
  });
  utils.genericSort(ii, true);
  var subPaths = ii.map(function(idx, i) {
    var split;
    if (i == n-1) {
      // place first path item first
      split = path.slice(0, ii[0]).concat(path.slice(idx));
    } else {
      split = path.slice(idx, ii[i+1]);
    }
    return split;
  });

  // make sure first sub-path starts with arc at path[0]
  if (ii[0] !== 0) {
    subPaths.unshift(subPaths.pop());
  }
  if (subPaths[0][0] !== path[0]) {
    error("[splitPathByIds()] Indexing error");
  }
  return subPaths;
};




// Functions for dividing polygons and polygons at points where arc-segments intersect

// Divide a collection of arcs at points where segments intersect
// and re-index the paths of all the layers that reference the arc collection.
// (in-place)
MapShaper.divideArcs = function(dataset) {
  var arcs = dataset.arcs;
  T.start();
  T.start();
  var snapDist = MapShaper.getHighPrecisionSnapInterval(arcs);
  var snapCount = MapShaper.snapCoordsByInterval(arcs, snapDist);
  var dupeCount = arcs.dedupCoords();
  T.stop('snap points');
  if (snapCount > 0 || dupeCount > 0) {
    T.start();
    // Detect topology again if coordinates have changed
    api.buildTopology(dataset);
    T.stop('rebuild topology');
  }

  // clip arcs at points where segments intersect
  T.start();
  var map = MapShaper.insertClippingPoints(arcs);
  T.stop('insert clipping points');
  T.start();
  // update arc ids in arc-based layers and clean up arc geometry
  // to remove degenerate arcs and duplicate points
  var nodes = new NodeCollection(arcs);
  dataset.layers.forEach(function(lyr) {
    if (MapShaper.layerHasPaths(lyr)) {
      MapShaper.updateArcIds(lyr.shapes, map, nodes);
      // TODO: consider alternative -- avoid creating degenerate arcs
      // in insertClippingPoints()
      MapShaper.cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
    }
  });
  T.stop('update arc ids / clean geometry');
  T.stop("divide arcs");
  return nodes;
};

MapShaper.updateArcIds = function(shapes, map, nodes) {
  var arcCount = nodes.arcs.size(),
      shape2;
  for (var i=0; i<shapes.length; i++) {
    shape2 = [];
    MapShaper.forEachPath(shapes[i], remapPathIds);
    shapes[i] = shape2;
  }

  function remapPathIds(ids) {
    if (!ids) return; // null shape
    var ids2 = [];
    for (var j=0; j<ids.length; j++) {
      remapArcId(ids[j], ids2);
    }
    shape2.push(ids2);
  }

  function remapArcId(id, ids) {
    var rev = id < 0,
        absId = rev ? ~id : id,
        min = map[absId],
        max = (absId >= map.length - 1 ? arcCount : map[absId + 1]) - 1,
        id2;
    do {
      if (rev) {
        id2 = ~max;
        max--;
      } else {
        id2 = min;
        min++;
      }
      // If there are duplicate arcs, always use the same one
      if (nodes) {
        id2 = nodes.findMatchingArc(id2);
      }
      ids.push(id2);
    } while (max - min >= 0);
  }
};

// divide a collection of arcs at points where line segments cross each other
// @arcs ArcCollection
// returns array that maps original arc ids to new arc ids
MapShaper.insertClippingPoints = function(arcs) {
  var points = MapShaper.findClippingPoints(arcs),
      p;

  // TODO: avoid some or all of the following if no points need to be added

  // original arc data
  var pointTotal0 = arcs.getPointCount(),
      arcTotal0 = arcs.size(),
      data = arcs.getVertexData(),
      xx0 = data.xx,
      yy0 = data.yy,
      nn0 = data.nn,
      i0 = 0,
      n0, arcLen0;

  // new arc data
  var pointTotal1 = pointTotal0 + points.length * 2,
      xx1 = new Float64Array(pointTotal1),
      yy1 = new Float64Array(pointTotal1),
      nn1 = [],  // number of arcs may vary
      i1 = 0,
      n1;

  var map = new Uint32Array(arcTotal0);

  // sort from last point to first point
  points.sort(function(a, b) {
    return b.i - a.i || b.pct - a.pct;
  });
  p = points.pop();

  for (var id0=0, id1=0; id0 < arcTotal0; id0++) {
    arcLen0 = nn0[id0];
    map[id0] = id1;
    n0 = 0;
    n1 = 0;
    while (n0 < arcLen0) {
      n1++;
      xx1[i1] = xx0[i0];
      yy1[i1++] = yy0[i0];
      while (p && p.i === i0) {
        xx1[i1] = p.x;
        yy1[i1++] = p.y;
        n1++;
        nn1[id1++] = n1; // end current arc at intersection
        n1 = 0;          // begin new arc

        xx1[i1] = p.x;
        yy1[i1++] = p.y;
        n1++;
        p = points.pop();
      }
      n0++;
      i0++;
    }
    nn1[id1++] = n1;
  }

  if (i1 != pointTotal1) error("[insertClippingPoints()] Counting error");
  arcs.updateVertexData(nn1, xx1, yy1, null);

  // segment-point intersections create duplicate points
  // TODO: consider removing call to dedupCoords() -- empty arcs are removed by cleanShapes()
  arcs.dedupCoords();
  return map;
};

MapShaper.findClippingPoints = function(arcs) {
  var intersections = MapShaper.findSegmentIntersections(arcs),
      data = arcs.getVertexData(),
      xx = data.xx,
      yy = data.yy,
      points = [];

  intersections.forEach(function(o) {
    var p1 = getSegmentIntersection(o.x, o.y, o.a),
        p2 = getSegmentIntersection(o.x, o.y, o.b);
    if (p1) points.push(p1);
    if (p2) points.push(p2);
  });

  // remove 1. points that are at arc endpoints and 2. duplicate points
  // (kludgy -- look into preventing these cases, which are caused by T intersections)
  var index = {};
  return points.filter(function(p) {
    var key = p.i + "," + p.pct;
    if (key in index) return false;
    index[key] = true;
    if (p.pct <= 0 && arcs.pointIsEndpoint(p.i) ||
        p.pct >= 1 && arcs.pointIsEndpoint(p.j)) {
      return false;
    }
    return true;
  });

  function getSegmentIntersection(x, y, ids) {
    var i = ids[0],
        j = ids[1],
        dx = xx[j] - xx[i],
        dy = yy[j] - yy[i],
        pct;
    if (i > j) error("[findClippingPoints()] Out-of-sequence arc ids");
    if (dx === 0 && dy === 0) {
      pct = 0;
    } else if (Math.abs(dy) > Math.abs(dx)) {
      pct = (y - yy[i]) / dy;
    } else {
      pct = (x - xx[i]) / dx;
    }

    if (pct < 0 || pct > 1) {
      verbose("[findClippingPoints()] Off-segment intersection (caused by rounding error");
      trace("pct:", pct, "dx:", dx, "dy:", dy, 'x:', x, 'y:', y, 'xx[i]:', xx[i], 'xx[j]:', xx[j], 'yy[i]:', yy[i], 'yy[j]:', yy[j]);
      trace("xpct:", (x - xx[i]) / dx, 'ypct:', (y - yy[i]) / dy);
      if (pct < 0) pct = 0;
      if (pct > 1) pct = 1;
    }

    return {
        pct: pct,
        i: i,
        j: j,
        x: x,
        y: y
      };
  }
};




// Functions for redrawing polygons for clipping / erasing / flattening / division

MapShaper.setBits = function(src, flags, mask) {
  return (src & ~mask) | (flags & mask);
};

MapShaper.andBits = function(src, flags, mask) {
  return src & (~mask | flags);
};

MapShaper.setRouteBits = function(bits, id, flags) {
  var abs = absArcId(id),
      mask;
  if (abs == id) { // fw
    mask = ~3;
  } else {
    mask = ~0x30;
    bits = bits << 4;
  }
  flags[abs] &= (bits | mask);
};

MapShaper.getRouteBits = function(id, flags) {
  var abs = absArcId(id),
      bits = flags[abs];
  if (abs != id) bits = bits >> 4;
  return bits & 7;
};


// enable arc pathways in a single shape or array of shapes
// Uses 8 bits to control traversal of each arc
// 0-3: forward arc; 4-7: rev arc
// 0: fw path is visible
// 1: fw path is open for traversal
// ...
//
MapShaper.openArcRoutes = function(arcIds, arcs, flags, fwd, rev, dissolve, orBits) {
  MapShaper.forEachArcId(arcIds, function(id) {
    var isInv = id < 0,
        absId = isInv ? ~id : id,
        currFlag = flags[absId],
        openFwd = isInv ? rev : fwd,
        openRev = isInv ? fwd : rev,
        newFlag = currFlag;

    // error condition: lollipop arcs can cause problems; ignore these
    if (arcs.arcIsLollipop(id)) {
      trace('lollipop');
      newFlag = 0; // unset (i.e. make invisible)
    } else {
      if (openFwd) {
        newFlag |= 3; // visible / open
      }
      if (openRev) {
        newFlag |= 0x30; // visible / open
      }

      // placing this in front of dissolve - dissolve has to be able to hide
      // arcs that are set to visible
      if (orBits > 0) {
        newFlag |= orBits;
      }

      // dissolve hides arcs that have both fw and rev pathways open
      if (dissolve && (newFlag & 0x22) === 0x22) {
        newFlag &= ~0x11; // make invisible
      }
    }

    flags[absId] = newFlag;
  });
};

MapShaper.closeArcRoutes = function(arcIds, arcs, flags, fwd, rev, hide) {
  MapShaper.forEachArcId(arcIds, function(id) {
    var isInv = id < 0,
        absId = isInv ? ~id : id,
        currFlag = flags[absId],
        mask = 0xff,
        closeFwd = isInv ? rev : fwd,
        closeRev = isInv ? fwd : rev;

    if (closeFwd) {
      if (hide) mask &= ~1;
      mask ^= 0x2;
    }
    if (closeRev) {
      if (hide) mask &= ~0x10;
      mask ^= 0x20;
    }

    flags[absId] = currFlag & mask;
  });
};

// Return a function for generating a path across a field of intersecting arcs
// TODO: add option to calculate angle on sphere for lat-lng coords
//
MapShaper.getPathFinder = function(nodes, useRoute, routeIsVisible, chooseRoute, spherical) {
  var arcs = nodes.arcs,
      coords = arcs.getVertexData(),
      xx = coords.xx,
      yy = coords.yy,
      calcAngle = spherical ? geom.signedAngleSph : geom.signedAngle;

  function getNextArc(prevId) {
    var ai = arcs.indexOfVertex(prevId, -2),
        ax = xx[ai],
        ay = yy[ai],
        bi = arcs.indexOfVertex(prevId, -1),
        bx = xx[bi],
        by = yy[bi],
        nextId = NaN,
        nextAngle = 0;

    nodes.forEachConnectedArc(prevId, function(candId) {
      if (!routeIsVisible(~candId)) return;
      if (arcs.getArcLength(candId) < 2) error("[pathfinder] defective arc");

      var ci = arcs.indexOfVertex(candId, -2),
          cx = xx[ci],
          cy = yy[ci],

          // sanity check: make sure both arcs share the same vertex;
          di = arcs.indexOfVertex(candId, -1),
          dx = xx[di],
          dy = yy[di],
          candAngle;
      if (dx !== bx || dy !== by) {
        message("cd:", cx, cy, dx, dy, 'arc:', candId);
        error("Error in node topology");
      }

      candAngle = calcAngle(ax, ay, bx, by, cx, cy);

      if (candAngle > 0) {
        if (nextAngle === 0) {
          nextId = candId;
          nextAngle = candAngle;
        } else {
          var choice = chooseRoute(~nextId, nextAngle, ~candId, candAngle, prevId);
          if (choice == 2) {
            nextId = candId;
            nextAngle = candAngle;
          }
        }
      } else {
        // candAngle is NaN or 0
        trace("#getNextArc() Invalid angle; id:", candId, "angle:", candAngle);
        nodes.debugNode(prevId);
      }
    });

    if (nextId === prevId) {
      // TODO: confirm that this can't happen
      nodes.debugNode(prevId);
      error("#getNextArc() nextId === prevId");
    }
    return ~nextId; // reverse arc to point onwards
  }

  return function(startId) {
    var path = [],
        nextId, msg,
        candId = startId,
        verbose = false;

    do {
      if (verbose) msg = (nextId === undefined ? " " : "  " + nextId) + " -> " + candId;
      if (useRoute(candId)) {
        path.push(candId);
        nextId = candId;
        if (verbose) message(msg);
        candId = getNextArc(nextId);
        if (verbose && candId == startId ) message("  o", geom.getPlanarPathArea(path, arcs));
      } else {
        if (verbose) message(msg + " x");
        return null;
      }

      if (candId == ~nextId) {
        trace("dead-end"); // TODO: handle or prevent this error condition
        return null;
      }
    } while (candId != startId);
    return path.length === 0 ? null : path;
  };
};

// types: "dissolve" "flatten"
// Returns a function for flattening or dissolving a collection of rings
// Assumes rings are oriented in CW direction
//
MapShaper.getRingIntersector = function(nodes, type, flags, spherical) {
  var arcs = nodes.arcs;
  var findPath = MapShaper.getPathFinder(nodes, useRoute, routeIsActive, chooseRoute, spherical);
  flags = flags || new Uint8Array(arcs.size());

  return function(rings) {
    var dissolve = type == 'dissolve',
        openFwd = true,
        openRev = type == 'flatten',
        output;
    // even single rings get transformed (e.g. to remove spikes)
    if (rings.length > 0) {
      output = [];
      MapShaper.openArcRoutes(rings, arcs, flags, openFwd, openRev, dissolve);
      MapShaper.forEachPath(rings, function(ids) {
        var path;
        for (var i=0, n=ids.length; i<n; i++) {
          path = findPath(ids[i]);
          if (path) {
            output.push(path);
          }
        }
      });
      MapShaper.closeArcRoutes(rings, arcs, flags, openFwd, openRev, true);
    } else {
      output = rings;
    }
    return output;
  };

  function chooseRoute(id1, angle1, id2, angle2, prevId) {
    var route = 1;
    if (angle1 == angle2) {
      trace("[chooseRoute()] parallel routes, unsure which to choose");
      //MapShaper.debugRoute(id1, id2, nodes.arcs);
    } else if (angle2 < angle1) {
      route = 2;
    }
    return route;
  }

  function routeIsActive(arcId) {
    var bits = MapShaper.getRouteBits(arcId, flags);
    return (bits & 1) == 1;
  }

  function useRoute(arcId) {
    var route = MapShaper.getRouteBits(arcId, flags),
        isOpen = false;

    if (route == 3) {
      isOpen = true;
      MapShaper.setRouteBits(1, arcId, flags); // close the path, leave visible
    }

    return isOpen;
  }
};

MapShaper.debugFlags = function(flags) {
  var arr = [];
  utils.forEach(flags, function(flag) {
    arr.push(bitsToString(flag));
  });
  message(arr);

  function bitsToString(bits) {
    var str = "";
    for (var i=0; i<8; i++) {
      str += (bits & (1 << i)) > 0 ? "1" : "0";
      if (i < 7) str += ' ';
      if (i == 3) str += ' ';
    }
    return str;
  }
};

/*
// Print info about two arcs whose first segments are parallel
//
MapShaper.debugRoute = function(id1, id2, arcs) {
  var n1 = arcs.getArcLength(id1),
      n2 = arcs.getArcLength(id2),
      len1 = 0,
      len2 = 0,
      p1, p2, pp1, pp2, ppp1, ppp2,
      angle1, angle2;

      console.log("chooseRoute() lengths:", n1, n2, 'ids:', id1, id2);
  for (var i=0; i<n1 && i<n2; i++) {
    p1 = arcs.getVertex(id1, i);
    p2 = arcs.getVertex(id2, i);
    if (i === 0) {
      if (p1.x != p2.x || p1.y != p2.y) {
        error("chooseRoute() Routes should originate at the same point)");
      }
    }

    if (i > 1) {
      angle1 = signedAngle(ppp1.x, ppp1.y, pp1.x, pp1.y, p1.x, p1.y);
      angle2 = signedAngle(ppp2.x, ppp2.y, pp2.x, pp2.y, p2.x, p2.y);

      console.log("angles:", angle1, angle2, 'lens:', len1, len2);
      // return;
    }

    if (i >= 1) {
      len1 += distance2D(p1.x, p1.y, pp1.x, pp1.y);
      len2 += distance2D(p2.x, p2.y, pp2.x, pp2.y);
    }

    if (i == 1 && (n1 == 2 || n2 == 2)) {
      console.log("arc1:", pp1, p1, "len:", len1);
      console.log("arc2:", pp2, p2, "len:", len2);
    }

    ppp1 = pp1;
    ppp2 = pp2;
    pp1 = p1;
    pp2 = p2;
  }
  return 1;
};
*/




// Returns a function that separates rings in a polygon into space-enclosing rings
// and holes. Also fixes self-intersections.
//
MapShaper.getHoleDivider = function(nodes, spherical) {
  var split = MapShaper.getSelfIntersectionSplitter(nodes);

  return function(rings, cw, ccw) {
    var pathArea = spherical ? geom.getSphericalPathArea : geom.getPlanarPathArea;
    MapShaper.forEachPath(rings, function(ringIds) {
      var splitRings = split(ringIds);
      if (splitRings.length === 0) {
        trace("[getRingDivider()] Defective path:", ringIds);
      }
      splitRings.forEach(function(ringIds, i) {
        var ringArea = pathArea(ringIds, nodes.arcs);
        if (ringArea > 0) {
          cw.push(ringIds);
        } else if (ringArea < 0) {
          ccw.push(ringIds);
        }
      });
    });
  };
};




// clean polygon or polyline shapes, in-place
//
MapShaper.cleanShapes = function(shapes, arcs, type) {
  for (var i=0, n=shapes.length; i<n; i++) {
    shapes[i] = MapShaper.cleanShape(shapes[i], arcs, type);
  }
};

// Remove defective arcs and zero-area polygon rings
// Don't remove duplicate points
// Don't remove spikes (between arcs or within arcs)
// Don't check winding order of polygon rings
MapShaper.cleanShape = function(shape, arcs, type) {
  return MapShaper.editPaths(shape, function(path) {
    var cleaned = MapShaper.cleanPath(path, arcs);
    if (type == 'polygon' && cleaned) {
      MapShaper.removeSpikesInPath(cleaned); // assumed by divideArcs()
      if (geom.getPlanarPathArea(cleaned, arcs) === 0) {
        cleaned = null;
      }
    }
    return cleaned;
  });
};

MapShaper.cleanPath = function(path, arcs) {
  var nulls = 0;
  for (var i=0, n=path.length; i<n; i++) {
    if (arcs.arcIsDegenerate(path[i])) {
      nulls++;
      path[i] = null;
    }
  }
  return nulls > 0 ? path.filter(function(id) {return id !== null;}) : path;
};

// Remove pairs of ids where id[n] == ~id[n+1] or id[0] == ~id[n-1];
// (in place)
MapShaper.removeSpikesInPath = function(ids) {
  var n = ids.length;
  if (n >= 2) {
    if (ids[0] == ~ids[n-1]) {
      ids.pop();
      ids.shift();
    } else {
      for (var i=1; i<n; i++) {
        if (ids[i-1] == ~ids[i]) {
          ids.splice(i-1, 2);
          break;
        }
      }
    }
    if (ids.length < n) {
      MapShaper.removeSpikesInPath(ids);
    }
  }
};


// TODO: Need to rethink polygon repair: these function can cause problems
// when part of a self-intersecting polygon is removed
//
MapShaper.repairPolygonGeometry = function(layers, dataset, opts) {
  var nodes = MapShaper.divideArcs(dataset);
  layers.forEach(function(lyr) {
    MapShaper.repairSelfIntersections(lyr, nodes);
  });
  return layers;
};

// Remove any small shapes formed by twists in each ring
// // OOPS, NO // Retain only the part with largest area
// // this causes problems when a cut-off hole has a matching ring in another polygon
// TODO: consider cases where cut-off parts should be retained
//
MapShaper.repairSelfIntersections = function(lyr, nodes) {
  var splitter = MapShaper.getSelfIntersectionSplitter(nodes);

  lyr.shapes = lyr.shapes.map(function(shp, i) {
    return cleanPolygon(shp);
  });

  function cleanPolygon(shp) {
    var cleanedPolygon = [];
    MapShaper.forEachPath(shp, function(ids) {
      // TODO: consider returning null if path can't be split
      var splitIds = splitter(ids);
      if (splitIds.length === 0) {
        error("[cleanPolygon()] Defective path:", ids);
      } else if (splitIds.length == 1) {
        cleanedPolygon.push(splitIds[0]);
      } else {
        var shapeArea = geom.getPlanarPathArea(ids, nodes.arcs),
            sign = shapeArea > 0 ? 1 : -1,
            mainRing;

        var maxArea = splitIds.reduce(function(max, ringIds, i) {
          var pathArea = geom.getPlanarPathArea(ringIds, nodes.arcs) * sign;
          if (pathArea > max) {
            mainRing = ringIds;
            max = pathArea;
          }
          return max;
        }, 0);

        if (mainRing) {
          cleanedPolygon.push(mainRing);
        }
      }
    });
    return cleanedPolygon.length > 0 ? cleanedPolygon : null;
  }
};




// Import path data from a non-topological source (Shapefile, GeoJSON, etc)
// in preparation for identifying topology.
// @reservedPoints (optional) estimate of points in dataset, for allocating buffers
//
function PathImporter(opts, reservedPoints) {
  opts = opts || {};

  var bufSize = reservedPoints > 0 ? reservedPoints : 20000,
      xx = new Float64Array(bufSize),
      yy = new Float64Array(bufSize),
      buf = new Float64Array(1024),
      shapes = [],
      nn = [],
      collectionType = null,
      round = null,
      pathId = -1,
      shapeId = -1,
      pointId = 0,
      dupeCount = 0,
      skippedPathCount = 0;

  if (opts.precision) {
    round = getRoundingFunction(opts.precision);
  }

  function addShapeType(t) {
    if (!collectionType) {
      collectionType = t;
    } else if (t != collectionType) {
      collectionType = "mixed";
    }
  }

  function checkBuffers(needed) {
    if (needed > xx.length) {
      var newLen = Math.max(needed, Math.ceil(xx.length * 1.5));
      xx = MapShaper.extendBuffer(xx, newLen, pointId);
      yy = MapShaper.extendBuffer(yy, newLen, pointId);
    }
  }

  function getPointBuf(n) {
    var len = n * 2;
    if (buf.length < len) {
      buf = new Float64Array(Math.ceil(len * 1.3));
    }
    return buf;
  }

  this.startShape = function() {
    shapes[++shapeId] = null;
  };

  function appendToShape(part) {
    var currShape = shapes[shapeId] || (shapes[shapeId] = []);
    currShape.push(part);
  }

  function appendPath(n, type) {
    addShapeType(type);
    pathId++;
    nn[pathId] = n;
    appendToShape([pathId]);
  }

  function roundPoints(points, round) {
    points.forEach(function(p) {
      p[0] = round(p[0]);
      p[1] = round(p[1]);
    });
  }

  // Import coordinates from an array with coordinates in format: [x, y, x, y, ...]
  //
  this.importPathFromFlatArray = function(arr, type, len, start) {
    var i = start || 0,
        end = i + len,
        n = 0,
        x, y, prevX, prevY;

    checkBuffers(pointId + len);
    while (i < end) {
      x = arr[i++];
      y = arr[i++];
      if (round) {
        x = round(x);
        y = round(y);
      }
      if (i > 0 && x == prevX && y == prevY) {
        dupeCount++;
      } else {
        xx[pointId] = x;
        yy[pointId] = y;
        pointId++;
        n++;
      }
      prevY = y;
      prevX = x;
    }

    appendPath(n, type);

  };

  // Import an array of [x, y] Points
  //
  this.importPath = function(points, type) {
    var n = points.length,
        buf = getPointBuf(n),
        j = 0;
    for (var i=0; i < n; i++) {
      buf[j++] = points[i][0];
      buf[j++] = points[i][1];
    }
    this.importPathFromFlatArray(buf, type, j, 0);
  };

  this.importPoints = function(points) {
    addShapeType('point');
    if (round) {
      roundPoints(points, round);
    }
    points.forEach(appendToShape);
  };

  this.importLine = function(points) {
    this.importPath(points, 'polyline');
  };

  this.importPolygon = function(points, isHole) {
    var area = geom.getPlanarPathArea2(points);

    if (isHole === true && area > 0 || isHole === false && area < 0) {
      verbose("Warning: reversing", isHole ? "a CW hole" : "a CCW ring");
      points.reverse();
    }
    this.importPath(points, 'polygon');
  };

  // Return topological shape data
  // Apply any requested snapping and rounding
  // Remove duplicate points, check for ring inversions
  //
  this.done = function() {
    var arcs;

    // possible values: polygon, polyline, point, mixed, null
    if (collectionType == 'mixed') {
      stop("[PathImporter] Mixed feature types are not allowed");
    } else if (collectionType == 'polygon' || collectionType == 'polyline') {

      if (dupeCount > 0) {
        verbose(utils.format("Removed %,d duplicate point%s", dupeCount, "s?"));
      }
      if (skippedPathCount > 0) {
        // TODO: consider showing details about type of error
        message(utils.format("Removed %,d path%s with defective geometry", skippedPathCount, "s?"));
      }

      if (pointId > 0) {
        if (pointId < xx.length) {
          xx = xx.subarray(0, pointId);
          yy = yy.subarray(0, pointId);
        }
        arcs = new ArcCollection(nn, xx, yy);

        // TODO: move shape validation after snapping (which may corrupt shapes)
        if (opts.auto_snap || opts.snap_interval) {
          T.start();
          MapShaper.snapCoords(arcs, opts.snap_interval);
          T.stop("Snapping points");
        }

        MapShaper.cleanShapes(shapes, arcs, collectionType);
      } else {
        message("No geometries were imported");
        collectionType = null;
      }
    } else if (collectionType == 'point' || collectionType === null) {
      // pass
    } else {
      error("Unexpected collection type:", collectionType);
    }

    // TODO: remove empty arcs, collapsed arcs
    // ...

    return {
      arcs: arcs || null,
      info: {},
      layers: [{
        name: '',
        geometry_type: collectionType,
        shapes: shapes
      }]
    };
  };
}




MapShaper.exportPointData = function(points) {
  var data, path;
  if (!points || points.length === 0) {
    data = {partCount: 0, pointCount: 0};
  } else {
    path = {
      points: points,
      pointCount: points.length,
      bounds: geom.getPathBounds(points)
    };
    data = {
      bounds: path.bounds,
      pathData: [path],
      partCount: 1,
      pointCount: path.pointCount
    };
  }
  return data;
};

// TODO: remove duplication with MapShaper.getPathMetadata()
MapShaper.exportPathData = function(shape, arcs, type) {
  // kludge until Shapefile exporting is refactored
  if (type == 'point') return MapShaper.exportPointData(shape);

  var pointCount = 0,
      bounds = new Bounds(),
      paths = [];

  if (shape && (type == 'polyline' || type == 'polygon')) {
    shape.forEach(function(arcIds, i) {
      var iter = arcs.getShapeIter(arcIds),
          path = MapShaper.exportPathCoords(iter),
          valid = true;
      if (type == 'polygon') {
        path.area = geom.getPlanarPathArea2(path.points);
        valid = path.pointCount > 3 && path.area !== 0;
      } else if (type == 'polyline') {
        valid = path.pointCount > 1;
      }
      if (valid) {
        pointCount += path.pointCount;
        path.bounds = geom.getPathBounds(path.points);
        bounds.mergeBounds(path.bounds);
        paths.push(path);
      } else {
        verbose("Skipping a collapsed", type, "path");
      }
    });
  }

  return {
    pointCount: pointCount,
    pathData: paths,
    pathCount: paths.length,
    bounds: bounds
  };
};

MapShaper.exportPathCoords = function(iter) {
  var points = [],
      i = 0,
      x, y, prevX, prevY;
  while (iter.hasNext()) {
    x = iter.x;
    y = iter.y;
    if (i === 0 || prevX != x || prevY != y) {
      points.push([x, y]);
      i++;
    }
    prevX = x;
    prevY = y;
  }
  return {
    points: points,
    pointCount: points.length
  };
};




MapShaper.getFormattedStringify = function(numArrayKeys) {
  var keyIndex = utils.arrayToIndex(numArrayKeys);
  var quoteStr = '\u1000\u2FD5\u0310'; // TODO: avoid using a string that might be present in the content
  var stripRxp = new RegExp('"' + quoteStr + '|' + quoteStr + '"', 'g');
  var indentChars = '\t';

  function replace(key, val) {
    // pre-format coordinate arrays
    if (key in keyIndex && utils.isArray(val)) {
      var str = JSON.stringify(val);
      // skip arrays containing strings (problem with double-quote escaping)
      if (str.indexOf('"' == -1)) {
        return quoteStr + str.replace(/,/g, ', ') + quoteStr;
      }
    }
    return val;
  }

  return function(obj) {
    var json = JSON.stringify(obj, replace, indentChars);
    return json.replace(stripRxp, '');
  };
};




var GeoJSON = MapShaper.geojson = {};
GeoJSON.ID_FIELD = "FID"; // default field name of imported *JSON feature ids

MapShaper.importGeoJSON = function(src, opts) {
  var srcObj = utils.isString(src) ? JSON.parse(src) : src,
      supportedGeometries = Object.keys(GeoJSON.pathImporters),
      idField = opts.id_field || GeoJSON.ID_FIELD,
      properties = null,
      geometries, srcCollection, importer, dataset;

  // Convert single feature or geometry into a collection with one member
  if (srcObj.type == 'Feature') {
    srcCollection = {
      type: 'FeatureCollection',
      features: [srcObj]
    };
  } else if (utils.contains(supportedGeometries, srcObj.type)) {
    srcCollection = {
      type: 'GeometryCollection',
      geometries: [srcObj]
    };
  } else {
    srcCollection = srcObj;
  }

  if (srcCollection.type == 'FeatureCollection') {
    properties = [];
    geometries = srcCollection.features.map(function(feat) {
      var rec = feat.properties || {};
      if ('id' in feat) {
        rec[idField] = feat.id;
      }
      properties.push(rec);
      return feat.geometry;
    });
  } else if (srcCollection.type == 'GeometryCollection') {
    geometries = srcCollection.geometries;
  } else {
    stop("[-i] Unsupported GeoJSON type:", srcCollection.type);
  }

  if (!geometries) {
    stop("[-i] Missing geometry data");
  }

  // Import GeoJSON geometries
  importer = new PathImporter(opts);
  geometries.forEach(function(geom) {
    importer.startShape();
    if (geom) {
      GeoJSON.importGeometry(geom, importer);
    }
  });
  dataset = importer.done();

  if (properties) {
    dataset.layers[0].data = new DataTable(properties);
  }
  MapShaper.importCRS(dataset, srcObj);

  return dataset;
};

GeoJSON.translateGeoJSONType = function(type) {
  return GeoJSON.typeLookup[type] || null;
};

GeoJSON.typeLookup = {
  LineString: 'polyline',
  MultiLineString: 'polyline',
  Polygon: 'polygon',
  MultiPolygon: 'polygon',
  Point: 'point',
  MultiPoint: 'point'
};

GeoJSON.importGeometry = function(geom, importer) {
  var type = geom.type;
  if (type in GeoJSON.pathImporters) {
    GeoJSON.pathImporters[type](geom.coordinates, importer);
  } else if (type == 'GeometryCollection') {
    geom.geometries.forEach(function(geom) {
      GeoJSON.importGeometry(geom, importer);
    });
  } else {
    verbose("TopoJSON.importGeometryCollection() Unsupported geometry type:", geom.type);
  }
};

// Functions for importing geometry coordinates using a PathImporter
//
GeoJSON.pathImporters = {
  LineString: function(coords, importer) {
    importer.importLine(coords);
  },
  MultiLineString: function(coords, importer) {
    for (var i=0; i<coords.length; i++) {
      GeoJSON.pathImporters.LineString(coords[i], importer);
    }
  },
  Polygon: function(coords, importer) {
    for (var i=0; i<coords.length; i++) {
      importer.importPolygon(coords[i], i > 0);
    }
  },
  MultiPolygon: function(coords, importer) {
    for (var i=0; i<coords.length; i++) {
      GeoJSON.pathImporters.Polygon(coords[i], importer);
    }
  },
  Point: function(coord, importer) {
    importer.importPoints([coord]);
  },
  MultiPoint: function(coords, importer) {
    importer.importPoints(coords);
  }
};

MapShaper.exportGeoJSON = function(dataset, opts) {
  var extension = "json";
  if (opts.output_file) {
    // override default output extension if output filename is given
    extension = utils.getFileExtension(opts.output_file);
  }
  return dataset.layers.map(function(lyr) {
    return {
      content: MapShaper.exportGeoJSONString(lyr, dataset, opts),
      filename: lyr.name ? lyr.name + '.' + extension : ""
    };
  });
};

// @opt value of id-field option (empty, string or array of strings)
// @fields array
MapShaper.getIdField = function(fields, opt) {
  var ids = [];
  if (utils.isString(opt)) {
    ids.push(opt);
  } else if (utils.isArray(opt)) {
    ids = opt;
  }
  ids.push(GeoJSON.ID_FIELD); // default id field
  return utils.find(ids, function(name) {
    return utils.contains(fields, name);
  });
};

MapShaper.exportProperties = function(table, opts) {
  var fields = table ? table.getFields() : [],
      idField = MapShaper.getIdField(fields, opts.id_field),
      deleteId = idField == GeoJSON.ID_FIELD, // delete default field, not user-set fields
      properties, records;
  if (opts.drop_table || opts.cut_table || fields.length === 0 || deleteId && fields.length == 1) {
    return null;
  }
  records = table.getRecords();
  if (deleteId) {
    properties = records.map(function(rec) {
      rec = utils.extend({}, rec); // copy rec;
      delete rec[idField];
      return rec;
    });
  } else {
    properties = records;
  }
  return properties;
};

MapShaper.exportIds = function(table, opts) {
  var fields = table ? table.getFields() : [],
      idField = MapShaper.getIdField(fields, opts.id_field);
  if (!idField) return null;
  return table.getRecords().map(function(rec) {
    return idField in rec ? rec[idField] : null;
  });
};

MapShaper.importCRS = function(dataset, jsonObj) {
  if ('crs' in jsonObj) {
    dataset.info.input_crs = jsonObj.crs;
  }
};

// @jsonObj is a top-level GeoJSON or TopoJSON object
MapShaper.exportCRS = function(dataset, jsonObj) {
  var info = dataset.info || {};
  if ('output_crs' in info) {
    jsonObj.crs = info.output_crs;
  } else if ('input_crs' in info) {
    jsonObj.crs = info.input_crs;
  }
};


MapShaper.exportGeoJSONString = function(lyr, dataset, opts) {
  opts = opts || {};
  var properties = MapShaper.exportProperties(lyr.data, opts),
      arcs = dataset.arcs,
      ids = MapShaper.exportIds(lyr.data, opts),
      useFeatures = !!(properties || ids),
      stringify = JSON.stringify;

  if (opts.prettify) {
    stringify = MapShaper.getFormattedStringify(['bbox', 'coordinates']);
  }
  if (properties && properties.length !== lyr.shapes.length) {
    error("[-o] Mismatch between number of properties and number of shapes");
  }

  var output = {
    type: useFeatures ? 'FeatureCollection' : 'GeometryCollection'
  };

  MapShaper.exportCRS(dataset, output);

  if (opts.bbox) {
    var bounds = MapShaper.getLayerBounds(lyr, arcs);
    if (bounds.hasBounds()) {
      output.bbox = bounds.toArray();
    }
  }

  output[useFeatures ? 'features' : 'geometries'] = ['$'];

  // serialize features one at a time to avoid allocating lots of arrays
  // TODO: consider serializing once at the end, for clarity
  var objects = lyr.shapes.reduce(function(memo, shape, i) {
    var obj = MapShaper.exportGeoJSONGeometry(shape, arcs, lyr.geometry_type),
        str;
    if (useFeatures) {
      obj = {
        type: "Feature",
        properties: properties && properties[i] || null,
        geometry: obj
      };
    } else if (obj === null) {
      return memo; // null geometries not allowed in GeometryCollection, skip them
    }
    if (ids) {
      obj.id = ids[i];
    }
    str = stringify(obj);
    return memo === "" ? str : memo + ",\n" + str;
  }, "");

  return stringify(output).replace(/[\t ]*"\$"[\t ]*/, objects);
};

MapShaper.exportGeoJSONObject = function(lyr, arcs, opts) {
  return JSON.parse(MapShaper.exportGeoJSONString(lyr, arcs, opts));
};

// export GeoJSON or TopoJSON point geometry
GeoJSON.exportPointGeom = function(points, arcs) {
  var geom = null;
  if (points.length == 1) {
    geom = {
      type: "Point",
      coordinates: points[0]
    };
  } else if (points.length > 1) {
    geom = {
      type: "MultiPoint",
      coordinates: points
    };
  }
  return geom;
};

GeoJSON.exportLineGeom = function(ids, arcs) {
  var obj = MapShaper.exportPathData(ids, arcs, "polyline");
  if (obj.pointCount === 0) return null;
  var coords = obj.pathData.map(function(path) {
    return path.points;
  });
  return coords.length == 1 ? {
    type: "LineString",
    coordinates: coords[0]
  } : {
    type: "MultiLineString",
    coordinates: coords
  };
};

GeoJSON.exportPolygonGeom = function(ids, arcs) {
  var obj = MapShaper.exportPathData(ids, arcs, "polygon");
  if (obj.pointCount === 0) return null;
  var groups = MapShaper.groupPolygonRings(obj.pathData);
  var coords = groups.map(function(paths) {
    return paths.map(function(path) {
      return path.points;
    });
  });
  return coords.length == 1 ? {
    type: "Polygon",
    coordinates: coords[0]
  } : {
    type: "MultiPolygon",
    coordinates: coords
  };
};

MapShaper.exportGeoJSONGeometry = function(shape, arcs, type) {
  return shape ? GeoJSON.exporters[type](shape, arcs) : null;
};

GeoJSON.exporters = {
  polygon: GeoJSON.exportPolygonGeom,
  polyline: GeoJSON.exportLineGeom,
  point: GeoJSON.exportPointGeom
};



var TopoJSON = {};

// Iterate over all arrays of arc is in a geometry object
// @cb callback: function(ids)
// callback returns undefined or an array of replacement ids
//
TopoJSON.forEachPath = function forEachPath(obj, cb) {
  var iterators = {
        GeometryCollection: function(o) {o.geometries.forEach(eachGeom);},
        LineString: function(o) {
          var retn = cb(o.arcs);
          if (retn) o.arcs = retn;
        },
        MultiLineString: function(o) {eachMultiPath(o.arcs);},
        Polygon: function(o) {eachMultiPath(o.arcs);},
        MultiPolygon: function(o) {o.arcs.forEach(eachMultiPath);}
      };

  eachGeom(obj);

  function eachGeom(o) {
    if (o.type in iterators) {
      iterators[o.type](o);
    }
  }

  function eachMultiPath(arr) {
    var retn;
    for (var i=0; i<arr.length; i++) {
      retn = cb(arr[i]);
      if (retn) arr[i] = retn;
    }
  }
};

TopoJSON.forEachArc = function forEachArc(obj, cb) {
  TopoJSON.forEachPath(obj, function(ids) {
    var retn;
    for (var i=0; i<ids.length; i++) {
      retn = cb(ids[i]);
      if (utils.isInteger(retn)) {
        ids[i] = retn;
      }
    }
  });
};




TopoJSON.decodeArcs = function(arcs, transform) {
  var mx = transform.scale[0],
      my = transform.scale[1],
      bx = transform.translate[0],
      by = transform.translate[1];

  arcs.forEach(function(arc) {
    var prevX = 0,
        prevY = 0,
        xy, x, y;
    for (var i=0, len=arc.length; i<len; i++) {
      xy = arc[i];
      x = xy[0] + prevX;
      y = xy[1] + prevY;
      xy[0] = x * mx + bx;
      xy[1] = y * my + by;
      prevX = x;
      prevY = y;
    }
  });
};

// TODO: consider removing dupes...
TopoJSON.roundCoords = function(arcs, precision) {
  var round = getRoundingFunction(precision),
      p;
  arcs.forEach(function(arc) {
    for (var i=0, len=arc.length; i<len; i++) {
      p = arc[i];
      p[0] = round(p[0]);
      p[1] = round(p[1]);
    }
  });
};

TopoJSON.importObject = function(obj, opts) {
  if (obj.type != 'GeometryCollection') {
    obj = {
      type: "GeometryCollection",
      geometries: [obj]
    };
  }
  return TopoJSON.importGeometryCollection(obj, opts);
};

TopoJSON.importGeometryCollection = function(obj, opts) {
  var importer = new TopoJSON.GeometryImporter(opts);
  obj.geometries.forEach(importer.addGeometry, importer);
  return importer.done();
};

//
//
TopoJSON.GeometryImporter = function(opts) {
  var idField = opts && opts.id_field || GeoJSON.ID_FIELD,
      properties = [],
      shapes = [], // topological ids
      collectionType = null;

  this.addGeometry = function(geom) {
    var type = GeoJSON.translateGeoJSONType(geom.type),
        shapeId = shapes.length,
        rec = geom.properties,
        shape = null;

    if ('id' in geom) {
      rec = rec || {};
      rec[idField] = geom.id;
    }
    if (rec) {
      properties[shapeId] = rec;
    }
    if (type == 'point') {
      shape = this.importPointGeometry(geom);
    } else if (geom.type in TopoJSON.pathImporters) {
      shape = TopoJSON.pathImporters[geom.type](geom.arcs);
    } else {
      if (geom.type) {
        verbose("[TopoJSON] Unknown geometry type:", geom.type);
      }
      // null geometry -- ok
    }
    shapes.push(shape);
    this.updateCollectionType(type);
  };

  this.importPointGeometry = function(geom) {
    var shape = null;
    if (geom.type == 'Point') {
      shape = [geom.coordinates];
    } else if (geom.type == 'MultiPoint') {
      shape = geom.coordinates;
    } else {
      stop("Invalid TopoJSON point geometry:", geom);
    }
    return shape;
  };

  this.updateCollectionType = function(type) {
    if (!collectionType) {
      collectionType = type;
    } else if (type && collectionType != type) {
      collectionType = 'mixed';
    }
  };

  this.done = function() {
    var lyr = {
      shapes: shapes,
      geometry_type: collectionType
    };
    if (properties.length > 0) {
      lyr.data = new DataTable(properties);
    }
    // console.log(lyr.shapes)
    return lyr;
  };
};

TopoJSON.pathImporters = {
  LineString: function(arcs) {
    return [arcs];
  },
  MultiLineString: function(arcs) {
    return arcs;
  },
  Polygon: function(arcs) {
    return arcs;
  },
  MultiPolygon: function(arcs) {
    return arcs.reduce(function(memo, arr) {
      return memo ? memo.concat(arr) : arr;
    }, null);
  }
};




api.convertPolygonsToInnerLines = function(lyr, arcs) {
  if (lyr.geometry_type != 'polygon') {
    stop("[innerlines] Layer not polygon type");
  }
  var arcs2 = MapShaper.convertShapesToArcs(lyr.shapes, arcs.size(), 'inner'),
      lyr2 = MapShaper.convertArcsToLineLayer(arcs2);
  if (lyr2.shapes.length === 0) {
    message("[innerlines] No shared boundaries were found in layer: [" + (lyr.name || "unnamed") + "]");
  }
  lyr2.name = lyr.name;
  return lyr2;
};

api.convertPolygonsToTypedLines = function(lyr, arcs, fields) {
  if (lyr.geometry_type != 'polygon') {
    stop("[lines] Layer not polygon type");
  }
  var arcCount = arcs.size(),
      outerArcs = MapShaper.convertShapesToArcs(lyr.shapes, arcCount, 'outer'),
      typeCode = 0,
      allArcs = [],
      allData = [];

  function addArcs(typeArcs) {
    var typeData = utils.repeat(typeArcs.length, function(i) {
          return {TYPE: typeCode};
        }) || [];
    allArcs = utils.merge(typeArcs, allArcs);
    allData = utils.merge(typeData, allData);
    typeCode++;
  }

  addArcs(outerArcs);

  if (utils.isArray(fields)) {
    if (!lyr.data) {
      stop("[lines] missing a data table:");
    }
    fields.forEach(function(field) {
      if (!lyr.data.fieldExists(field)) {
        stop("[lines] unknown data field:", field);
      }
      var dissolved = api.dissolvePolygons(lyr, arcs, {field: field}),
          dissolvedArcs = MapShaper.convertShapesToArcs(dissolved.shapes, arcCount, 'inner');
      dissolvedArcs = utils.difference(dissolvedArcs, allArcs);
      addArcs(dissolvedArcs);
    });
  }

  var innerArcs = MapShaper.convertShapesToArcs(lyr.shapes, arcCount, 'inner');
  innerArcs = utils.difference(innerArcs, allArcs);
  addArcs(innerArcs);

  var lyr2 = MapShaper.convertArcsToLineLayer(allArcs, allData);
  lyr2.name = lyr.name;
  return lyr2;
};

MapShaper.convertArcsToLineLayer = function(arcs, data) {
  var shapes = MapShaper.convertArcsToShapes(arcs),
      lyr = {
        geometry_type: 'polyline',
        shapes: shapes
      };
  if (data) {
    lyr.data = new DataTable(data);
  }
  return lyr;
};

MapShaper.convertArcsToShapes = function(arcs) {
  return arcs.map(function(id) {
    return [[id]];
  });
};

MapShaper.convertShapesToArcs = function(shapes, arcCount, type) {
  type = type || 'all';
  var counts = new Uint8Array(arcCount),
      arcs = [],
      count;

  MapShaper.countArcsInShapes(shapes, counts);

  for (var i=0, n=counts.length; i<n; i++) {
    count = counts[i];
    if (count > 0) {
      if (type == 'all' || type == 'outer' && count == 1 ||
          type == 'inner' && count > 1) {
        arcs.push(i);
      }
    }
  }
  return arcs;
};




// Dissolve arcs that can be merged without affecting topology of @layers;
// remove arcs that are not referenced by any layer; remap arc ids
// in layers. (In-place).
MapShaper.dissolveArcs = function(dataset) {
  var arcs = dataset.arcs,
      layers = dataset.layers.filter(MapShaper.layerHasPaths),
      test = MapShaper.getArcDissolveTest(layers, arcs),
      groups = [],
      totalPoints = 0,
      arcIndex = new Int32Array(arcs.size()), // maps old arc ids to new ids
      arcStatus = new Uint8Array(arcs.size());
      // arcStatus: 0 = unvisited, 1 = dropped, 2 = remapped, 3 = remapped + reversed
  layers.forEach(function(lyr) {
    // modify copies of the original shapes; original shapes should be unmodified
    // (need to test this)
    lyr.shapes = lyr.shapes.map(function(shape) {
      return MapShaper.editPaths(shape && shape.concat(), translatePath);
    });
  });
  MapShaper.dissolveArcCollection(arcs, groups, totalPoints);

  function translatePath(path) {
    var pointCount = 0;
    var path2 = [];
    var group, arcId, absId, arcLen, fw, arcId2;

    for (var i=0, n=path.length; i<n; i++) {
      arcId = path[i];
      absId = absArcId(arcId);
      fw = arcId === absId;

      if (arcs.arcIsDegenerate(arcId)) {
        // skip
      } else if (arcStatus[absId] === 0) {
        arcLen = arcs.getArcLength(arcId);

        if (group && test(path[i-1], arcId)) {
          if (arcLen > 0) {
            arcLen--; // shared endpoint not counted;
          }
          group.push(arcId);  // arc data is appended to previous arc
          arcStatus[absId] = 1; // arc is dropped from output
        } else {
          // new group (i.e. new dissolved arc)
          group = [arcId];
          arcIndex[absId] = groups.length;
          groups.push(group);
          arcStatus[absId] = fw ? 2 : 3; // 2: unchanged; 3: reversed
        }
        pointCount += arcLen;
      } else {
        group = null;
      }

      if (arcStatus[absId] > 1) {
        // arc is retained (and renumbered) in the dissolved path.
        arcId2 = arcIndex[absId];
        if (fw && arcStatus[absId] == 3 || !fw && arcStatus[absId] == 2) {
          arcId2 = ~arcId2;
        }
        path2.push(arcId2);
      }
    }
    totalPoints += pointCount;
    return path2;
  }
};

MapShaper.dissolveArcCollection = function(arcs, groups, len2) {
  var nn2 = new Uint32Array(groups.length),
      xx2 = new Float64Array(len2),
      yy2 = new Float64Array(len2),
      src = arcs.getVertexData(),
      zz2 = src.zz ? new Float64Array(len2) : null,
      offs = 0;

  groups.forEach(function(group, newId) {
    group.forEach(function(oldId, i) {
      extendDissolvedArc(oldId, newId);
    });
  });

  arcs.updateVertexData(nn2, xx2, yy2, zz2);

  function extendDissolvedArc(oldId, newId) {
    var absId = absArcId(oldId),
        rev = oldId < 0,
        n = src.nn[absId],
        i = src.ii[absId],
        n2 = nn2[newId];

    if (n > 0) {
      if (n2 > 0) {
        n--;
        if (!rev) i++;
      }
      MapShaper.copyElements(src.xx, i, xx2, offs, n, rev);
      MapShaper.copyElements(src.yy, i, yy2, offs, n, rev);
      if (zz2) MapShaper.copyElements(src.zz, i, zz2, offs, n, rev);
      nn2[newId] += n;
      offs += n;
    }
  }
};

MapShaper.getArcDissolveTest = function(layers, arcs) {
  var nodes = MapShaper.getFilteredNodeCollection(layers, arcs),
      count = 0,
      lastId;

  return function(id1, id2) {
    if (id1 == id2 || id1 == ~id2) return false; // error condition; throw error?
    count = 0;
    nodes.forEachConnectedArc(id1, countArc);
    return count == 1 && lastId == ~id2;
  };

  function countArc(arcId, i) {
    count++;
    lastId = arcId;
  }
};

MapShaper.getFilteredNodeCollection = function(layers, arcs) {
  var counts = MapShaper.countArcReferences(layers, arcs),
      test = function(arcId) {
        return counts[absArcId(arcId)] > 0;
      };
  return new NodeCollection(arcs, test);
};

MapShaper.countArcReferences = function(layers, arcs) {
  var counts = new Uint32Array(arcs.size());
  layers.forEach(function(lyr) {
    MapShaper.countArcsInShapes(lyr.shapes, counts);
  });
  return counts;
};




api.explodeFeatures = function(lyr, arcs, opts) {
  var properties = lyr.data ? lyr.data.getRecords() : null,
      explodedProperties = properties ? [] : null,
      explodedShapes = [],
      explodedLyr = utils.extend({}, lyr);

  lyr.shapes.forEach(function(shp, shpId) {
    var exploded;
    if (!shp) {
      explodedShapes.push(null);
    } else {
      if (lyr.geometry_type == 'polygon' && shp.length > 1) {
        exploded = MapShaper.explodePolygon(shp, arcs);
      } else {
        exploded = MapShaper.explodeShape(shp);
      }
      utils.merge(explodedShapes, exploded);
    }

    explodedLyr.shapes = explodedShapes;
    if (explodedProperties) {
      for (var i=0, n=exploded ? exploded.length : 1; i<n; i++) {
        explodedProperties.push(MapShaper.cloneProperties(properties[shpId]));
      }
    }
  });

  explodedLyr.shapes = explodedShapes;
  if (explodedProperties) {
    explodedLyr.data = new DataTable(explodedProperties);
  }
  return explodedLyr;
};

MapShaper.explodeShape = function(shp) {
  return shp.map(function(part) {
    return [part.concat()];
  });
};

MapShaper.explodePolygon = function(shape, arcs) {
  var paths = MapShaper.getPathMetadata(shape, arcs, "polygon");
  var groups = MapShaper.groupPolygonRings(paths);
  return groups.map(function(shape) {
    return shape.map(function(path) {
      return path.ids;
    });
  });
};

MapShaper.cloneProperties = function(obj) {
  var clone = {};
  for (var key in obj) {
    clone[key] = obj[key];
  }
  return clone;
};




TopoJSON.getPresimplifyFunction = function(width) {
  var quanta = 10000,  // enough resolution for pixel-level detail at 1000px width and 10x zoom
      k = quanta / width;
  return function(z) {
    // could substitute a rounding function with decimal precision
    return z === Infinity ? 0 : Math.ceil(z * k);
  };
};




// Convert a dataset object to a TopoJSON topology object
TopoJSON.exportTopology = function(src, opts) {
  var dataset = TopoJSON.copyDatasetForExport(src),
      arcs = dataset.arcs,
      topology = {type: "Topology"},
      bounds;

  // generate arcs and transform
  if (arcs && arcs.size() > 0) {
    bounds = MapShaper.getDatasetBounds(dataset);
    if (opts.bbox && bounds.hasBounds()) {
      topology.bbox = bounds.toArray();
    }
    if (!opts.no_quantization) {
      topology.transform = TopoJSON.transformDataset(dataset, bounds, opts);
    }
    topology.arcs = TopoJSON.exportArcs(arcs, bounds, opts);
    if (topology.transform) {
      TopoJSON.deltaEncodeArcs(topology.arcs);
    }
  } else {
    // some datasets may lack arcs; spec seems to require an array anyway
    topology.arcs = [];
  }

  // export layers as TopoJSON named objects
  topology.objects = dataset.layers.reduce(function(objects, lyr, i) {
    var name = lyr.name || "layer" + (i + 1);
    objects[name] = TopoJSON.exportLayer(lyr, arcs, opts);
    return objects;
  }, {});

  // retain crs data if relevant
  MapShaper.exportCRS(dataset, topology);
  return topology;
};

// Clone arc data (this gets modified in place during TopoJSON export)
// Shallow-copy shape data in each layer (gets replaced with remapped shapes)
TopoJSON.copyDatasetForExport = function(dataset) {
  var copy = {info: dataset.info};
  copy.layers = dataset.layers.map(function(lyr) {
    var shapes = lyr.shapes ? lyr.shapes.concat() : null;
    return utils.defaults({shapes: shapes}, lyr);
  });
  if (dataset.arcs) {
    copy.arcs = dataset.arcs.getFilteredCopy();
  }
  return copy;
};

TopoJSON.transformDataset = function(dataset, bounds, opts) {
  var bounds2 = TopoJSON.calcExportBounds(bounds, dataset.arcs, opts),
      transform = bounds.getTransform(bounds2),
      inv = transform.invert();
  dataset.arcs.applyTransform(transform, true); // flag -> round coords
  MapShaper.dissolveArcs(dataset); // dissolve/prune arcs for more compact output
  // TODO: think about handling geometrical errors introduced by quantization,
  // e.g. segment intersections and collapsed polygon rings.
  return {
    scale: [inv.mx, inv.my],
    translate: [inv.bx, inv.by]
  };
};

// Export arcs as arrays of [x, y] and possibly [z] coordinates
TopoJSON.exportArcs = function(arcs, bounds, opts) {
  var fromZ = null,
      output = [];
  if (opts.presimplify) {
    // Calculate simplification thresholds if none exist
    if (!arcs.getVertexData().zz) {
      MapShaper.simplifyPaths(arcs, opts);
    }
    fromZ = TopoJSON.getPresimplifyFunction(bounds.width());
  }
  arcs.forEach2(function(i, n, xx, yy, zz) {
    var arc = [], p;
    for (var j=i + n; i<j; i++) {
      p = [xx[i], yy[i]];
      if (fromZ) {
        p.push(fromZ(zz[i]));
      }
      arc.push(p);
    }
    output.push(arc.length > 1 ? arc : null);
  });
  return output;
};

// Apply delta encoding in-place to an array of topojson arcs
TopoJSON.deltaEncodeArcs = function(arcs) {
  arcs.forEach(function(arr) {
    var ax, ay, bx, by, p;
    for (var i=0, n=arr.length; i<n; i++) {
      p = arr[i];
      bx = p[0];
      by = p[1];
      if (i > 0) {
        p[0] = bx - ax;
        p[1] = by - ay;
      }
      ax = bx;
      ay = by;
    }
  });
};

// Calculate the x, y extents that map to an integer unit in topojson output
// as a fraction of the x- and y- extents of the average segment.
TopoJSON.calcExportResolution = function(arcs, k) {
  // TODO: think about the effect of long lines, e.g. from polar cuts.
  var xy = arcs.getAvgSegment2();
  return [xy[0] * k, xy[1] * k];
};

// Calculate the bounding box of quantized topojson coordinates using one
// of several methods.
TopoJSON.calcExportBounds = function(bounds, arcs, opts) {
  var unitXY, xmax, ymax;
  if (opts.topojson_precision > 0) {
    unitXY = TopoJSON.calcExportResolution(arcs, opts.topojson_precision);
  } else if (opts.quantization > 0) {
    unitXY = [bounds.width() / (opts.quantization-1), bounds.height() / (opts.quantization-1)];
  } else if (opts.precision > 0) {
    unitXY = [opts.precision, opts.precision];
  } else {
    // default -- auto quantization at 0.02 of avg. segment len
    unitXY = TopoJSON.calcExportResolution(arcs, 0.02);
  }
  xmax = Math.ceil(bounds.width() / unitXY[0]);
  ymax = Math.ceil(bounds.height() / unitXY[1]);
  return new Bounds(0, 0, xmax, ymax);
};

TopoJSON.exportProperties = function(geometries, table, opts) {
  var properties = MapShaper.exportProperties(table, opts),
      ids = MapShaper.exportIds(table, opts);
  geometries.forEach(function(geom, i) {
    if (properties) {
      geom.properties = properties[i];
    }
    if (ids) {
      geom.id = ids[i];
    }
  });
};

// Export a mapshaper layer as a GeometryCollection
TopoJSON.exportLayer = function(lyr, arcs, opts) {
  var n = MapShaper.getFeatureCount(lyr),
      geometries = [];
  // initialize to null geometries
  for (var i=0; i<n; i++) {
    geometries[i] = {type: null};
  }
  if (MapShaper.layerHasGeometry(lyr)) {
    TopoJSON.exportGeometries(geometries, lyr.shapes, arcs, lyr.geometry_type);
  }
  if (lyr.data) {
    TopoJSON.exportProperties(geometries, lyr.data, opts);
  }
  return {
    type: "GeometryCollection",
    geometries: geometries
  };
};

TopoJSON.exportGeometries = function(geometries, shapes, coords, type) {
  var exporter = TopoJSON.exporters[type];
  if (exporter && shapes) {
    shapes.forEach(function(shape, i) {
      if (shape && shape.length > 0) {
        geometries[i] = exporter(shape, coords);
      }
    });
  }
};

TopoJSON.exportPolygonGeom = function(shape, coords) {
  var geom = {};
  shape = MapShaper.filterEmptyArcs(shape, coords);
  if (!shape || shape.length === 0) {
    geom.type = null;
  } else if (shape.length > 1) {
    geom.arcs = MapShaper.explodePolygon(shape, coords);
    if (geom.arcs.length == 1) {
      geom.arcs = geom.arcs[0];
      geom.type = "Polygon";
    } else {
      geom.type = "MultiPolygon";
    }
  } else {
    geom.arcs = shape;
    geom.type = "Polygon";
  }
  return geom;
};

TopoJSON.exportLineGeom = function(shape, coords) {
  var geom = {};
  shape = MapShaper.filterEmptyArcs(shape, coords);
  if (!shape || shape.length === 0) {
    geom.type = null;
  } else if (shape.length == 1) {
    geom.type = "LineString";
    geom.arcs = shape[0];
  } else {
    geom.type = "MultiLineString";
    geom.arcs = shape;
  }
  return geom;
};

TopoJSON.exporters = {
  polygon: TopoJSON.exportPolygonGeom,
  polyline: TopoJSON.exportLineGeom,
  point: GeoJSON.exportPointGeom
};




MapShaper.topojson = TopoJSON;

// Convert a TopoJSON topology into mapshaper's internal format
// Side-effect: data in topology is modified
//
MapShaper.importTopoJSON = function(topology, opts) {
  var layers = [],
      dataset, arcs;

  if (utils.isString(topology)) {
    topology = JSON.parse(topology);
  }

  if (topology.arcs && topology.arcs.length > 0) {
    // TODO: apply transform to ArcCollection, not input arcs
    if (topology.transform) {
      TopoJSON.decodeArcs(topology.arcs, topology.transform);
    }

    if (opts && opts.precision) {
      TopoJSON.roundCoords(topology.arcs, opts.precision);
    }

    arcs = new ArcCollection(topology.arcs);
  }

  utils.forEachProperty(topology.objects, function(object, name) {
    var lyr = TopoJSON.importObject(object, opts);

    if (MapShaper.layerHasPaths(lyr)) {
      MapShaper.cleanShapes(lyr.shapes, arcs, lyr.geometry_type);
    }

    lyr.name = name;
    layers.push(lyr);
  });

  dataset = {
    layers: layers,
    arcs: arcs,
    info: {}
  };

  MapShaper.importCRS(dataset, topology);

  return dataset;
};

MapShaper.exportTopoJSON = function(dataset, opts) {
  var topology = TopoJSON.exportTopology(dataset, opts),
      stringify = JSON.stringify,
      filename;
  if (opts.prettify) {
    stringify = MapShaper.getFormattedStringify('coordinates,arcs,bbox,translate,scale'.split(','));
  }
  if (opts.output_file) {
    filename = opts.output_file;
  } else if (dataset.info && dataset.info.input_files) {
    // use base name of input file(s)
    filename = (MapShaper.getCommonFileBase(dataset.info.input_files) || 'output') + '.json';
  } else {
    filename = 'output.json';
  }

  return [{
    content: stringify(topology),
    filename: filename
  }];
};


var ShpType = {
  NULL: 0,
  POINT: 1,
  POLYLINE: 3,
  POLYGON: 5,
  MULTIPOINT: 8,
  POINTZ: 11,
  POLYLINEZ: 13,
  POLYGONZ: 15,
  MULTIPOINTZ: 18,
  POINTM: 21,
  POLYLINEM: 23,
  POLYGONM: 25,
  MULIPOINTM: 28,
  MULTIPATCH: 31 // not supported
};

ShpType.isPolygonType = function(t) {
  return t == 5 || t == 15 || t == 25;
};

ShpType.isPolylineType = function(t) {
  return t == 3 || t == 13 || t == 23;
};

ShpType.isMultiPartType = function(t) {
  return ShpType.isPolygonType(t) || ShpType.isPolylineType(t);
};

ShpType.isMultiPointType = function(t) {
  return t == 8 || t == 18 || t == 28;
};

ShpType.isZType = function(t) {
  return utils.contains([11,13,15,18], t);
};

ShpType.isMType = function(t) {
  return ShpType.isZType(t) || utils.contains([21,23,25,28], t);
};

ShpType.hasBounds = function(t) {
  return ShpType.isMultiPartType(t) || ShpType.isMultiPointType(t);
};





var NullRecord = function() {
  return {
    isNull: true,
    pointCount: 0,
    partCount: 0,
    byteLength: 12
  };
};

// Returns a constructor function for a shape record class with
//   properties and methods for reading coordinate data.
//
// Record properties
//   type, isNull, byteLength, pointCount, partCount (all types)
//
// Record methods
//   read(), readPoints() (all types)
//   readBounds(), readCoords()  (all but single point types)
//   readPartSizes() (polygon and polyline types)
//   readZBounds(), readZ() (Z types except POINTZ)
//   readMBounds(), readM(), hasM() (M and Z types, except POINT[MZ])
//
function ShpRecordClass(type) {
  var hasBounds = ShpType.hasBounds(type),
      hasParts = ShpType.isMultiPartType(type),
      hasZ = ShpType.isZType(type),
      hasM = ShpType.isMType(type),
      singlePoint = !hasBounds,
      mzRangeBytes = singlePoint ? 0 : 16,
      constructor;

  if (type === 0) {
    return NullRecord;
  }

  // @bin is a BinArray set to the first data byte of a shape record
  constructor = function ShapeRecord(bin, bytes) {
    var pos = bin.position();
    this.id = bin.bigEndian().readUint32();
    this.type = bin.littleEndian().skipBytes(4).readUint32();
    if (this.type === 0) {
      return new NullRecord();
    }
    if (bytes > 0 !== true || (this.type != type && this.type !== 0)) {
      error("Unable to read a shape -- .shp file may be corrupted");
    }
    this.byteLength = bytes; // bin.readUint32() * 2 + 8; // bytes in content section + 8 header bytes
    if (singlePoint) {
      this.pointCount = 1;
      this.partCount = 1;
    } else {
      bin.skipBytes(32); // skip bbox
      this.partCount = hasParts ? bin.readUint32() : 1;
      this.pointCount = bin.readUint32();
    }
    this._data = function() {
      return bin.position(pos);
    };
  };

  // base prototype has methods shared by all Shapefile types except NULL type
  // (Type-specific methods are mixed in below)
  var proto = {
    // return offset of [x, y] point data in the record
    _xypos: function() {
      var offs = 12; // skip header & record type
      if (!singlePoint) offs += 4; // skip point count
      if (hasBounds) offs += 32;
      if (hasParts) offs += 4 * this.partCount + 4; // skip part count & index
      return offs;
    },

    readCoords: function() {
      if (this.pointCount === 0) return null;
      var partSizes = this.readPartSizes(),
          xy = this._data().skipBytes(this._xypos());

      return partSizes.map(function(pointCount) {
        return xy.readFloat64Array(pointCount * 2);
      });
    },

    readXY: function() {
      if (this.pointCount === 0) return null;
      return this._data().skipBytes(this._xypos()).readFloat64Array(this.pointCount * 2);
    },

    readPoints: function() {
      var xy = this.readXY(),
          zz = hasZ ? this.readZ() : null,
          mm = hasM && this.hasM() ? this.readM() : null,
          points = [], p;

      for (var i=0, n=xy.length / 2; i<n; i++) {
        p = [xy[i*2], xy[i*2+1]];
        if (zz) p.push(zz[i]);
        if (mm) p.push(mm[i]);
        points.push(p);
      }
      return points;
    },

    read: function() {
      return this.readPoints();
    },

    readPartSizes: function() {
      if (this.partCount == 1) return [this.pointCount];
      if (this.partCount === 0) return [];
      var partLen,
          startId = 0,
          sizes = [],
          bin = this._data().skipBytes(56); // skip to second entry in part index
      for (var i=0, n=this.partCount; i<n; i++) {
        if (i < n - 1)
          partLen = bin.readUint32() - startId;
        else
          partLen = this.pointCount - startId;

        if (partLen <= 0) error("ShapeRecord#readPartSizes() corrupted part");
        sizes.push(partLen);
        startId += partLen;
      }
      return sizes;
    }
  };

  var singlePointProto = {
    read: function() {
      var n = 2;
      if (hasZ) n++;
      if (this.hasM()) n++;
      return this._data().skipBytes(12).readFloat64Array(n);
    }
  };

  var multiCoordProto = {
    readBounds: function() {
      return this._data().skipBytes(12).readFloat64Array(4);
    },

    read: function() {
      var points = this.readPoints();
      var parts = this.readPartSizes().map(function(size) {
          return points.splice(0, size);
        });
      return parts;
    }
  };

  var mProto = {
    _mpos: function() {
      var pos = this._xypos() + this.pointCount * 16;
      if (hasZ) {
        pos += this.pointCount * 8 + mzRangeBytes;
      }
      return pos;
    },

    readMBounds: function() {
      return this.hasM() ? this._data().skipBytes(this._mpos()).readFloat64Array(2) : null;
    },

    // TODO: group into parts, like readCoords()
    readM: function() {
      return this.hasM() ? this._data().skipBytes(this._mpos() + mzRangeBytes).readFloat64Array(this.pointCount) : null;
    },

    // Test if this record contains M data
    // (according to the Shapefile spec, M data is optional in a record)
    //
    hasM: function() {
      var bytesWithoutM = this._mpos(),
          bytesWithM = bytesWithoutM + this.pointCount * 8 + mzRangeBytes;
      if (this.byteLength == bytesWithoutM) {
        return false;
      } else if (this.byteLength == bytesWithM) {
        return true;
      } else {
        error("#hasM() Counting error");
      }
    }
  };

  var zProto = {
    _zpos: function() {
      return this._xypos() + this.pointCount * 16;
    },

    readZBounds: function() {
      return this._data().skipBytes(this._zpos()).readFloat64Array(2);
    },

    // TODO: group into parts, like readCoords()
    readZ: function() {
      return this._data().skipBytes(this._zpos() + mzRangeBytes).readFloat64Array(this.pointCount);
    }
  };

  if (singlePoint) {
    utils.extend(proto, singlePointProto);
  } else {
    utils.extend(proto, multiCoordProto);
  }
  if (hasZ) utils.extend(proto, zProto);
  if (hasM) utils.extend(proto, mProto);

  constructor.prototype = proto;
  proto.constructor = constructor;
  return constructor;
}




// Read data from a .shp file
// @src is an ArrayBuffer, Node.js Buffer or filename
//
//    // Example: iterating using #nextShape()
//    var reader = new ShpReader(buf), s;
//    while (s = reader.nextShape()) {
//      // process the raw coordinate data yourself...
//      var coords = s.readCoords(); // [[x,y,x,y,...], ...] Array of parts
//      var zdata = s.readZ();  // [z,z,...]
//      var mdata = s.readM();  // [m,m,...] or null
//      // .. or read the shape into nested arrays
//      var data = s.read();
//    }
//
//    // Example: reading records using a callback
//    var reader = new ShpReader(buf);
//    reader.forEachShape(function(s) {
//      var data = s.read();
//    });
//
function ShpReader(src) {
  if (this instanceof ShpReader === false) {
    return new ShpReader(src);
  }

  var file = utils.isString(src) ? new FileBytes(src) : new BufferBytes(src);
  var header = parseHeader(file.readBytes(100, 0));
  var fileSize = file.size();
  var RecordClass = new ShpRecordClass(header.type);
  var recordOffs, i, skippedBytes;

  reset();

  this.header = function() {
    return header;
  };

  // Callback interface: for each record in a .shp file, pass a
  //   record object to a callback function
  //
  this.forEachShape = function(callback) {
    var shape = this.nextShape();
    while (shape) {
      callback(shape);
      shape = this.nextShape();
    }
  };

  // Iterator interface for reading shape records
  this.nextShape = function() {
    var shape = readShapeAtOffset(recordOffs, i),
        offs2, skipped;
    if (!shape && recordOffs + 12 <= fileSize) {
      // Very rarely, in-the-wild .shp files may contain junk bytes between
      // records; it may be possible to scan past the junk to find the next record.
      shape = huntForNextShape(recordOffs + 4, i);
    }
    if (shape) {
      recordOffs += shape.byteLength;
      if (shape.id < i) {
        // Encountered in ne_10m_railroads.shp from natural earth v2.0.0
        message("[shp] Record " + shape.id + " appears more than once -- possible file corruption.");
        return this.nextShape();
      }
      i++;
    } else {
      if (skippedBytes > 0) {
        // Encountered in ne_10m_railroads.shp from natural earth v2.0.0
        message("[shp] Skipped " + skippedBytes + " bytes in .shp file -- possible data loss.");
      }
      file.close();
      reset();
    }
    return shape;
  };

  function reset() {
    recordOffs = 100;
    skippedBytes = 0;
    i = 1; // Shapefile id of first record
  }

  function parseHeader(bin) {
    var header = {
      signature: bin.bigEndian().readUint32(),
      byteLength: bin.skipBytes(20).readUint32() * 2,
      version: bin.littleEndian().readUint32(),
      type: bin.readUint32(),
      bounds: bin.readFloat64Array(4), // xmin, ymin, xmax, ymax
      zbounds: bin.readFloat64Array(2),
      mbounds: bin.readFloat64Array(2)
    };

    if (header.signature != 9994) {
      error("Not a valid .shp file");
    }

    var supportedTypes = [1,3,5,8,11,13,15,18,21,23,25,28];
    if (!utils.contains(supportedTypes, header.type))
      error("Unsupported .shp type:", header.type);

    if (header.byteLength != file.size())
      error("File size of .shp doesn't match size in header");

    return header;
  }

  function readShapeAtOffset(recordOffs, i) {
    var shape = null,
        recordSize, recordType, recordId, goodId, goodSize, goodType, bin;

    if (recordOffs + 12 <= fileSize) {
      bin = file.readBytes(12, recordOffs);
      recordId = bin.bigEndian().readUint32();
      // record size is bytes in content section + 8 header bytes
      recordSize = bin.readUint32() * 2 + 8;
      recordType = bin.littleEndian().readUint32();
      goodId = recordId == i; // not checking id ...
      goodSize = recordOffs + recordSize <= fileSize && recordSize >= 12;
      goodType = recordType === 0 || recordType == header.type;
      if (goodSize && goodType) {
        bin = file.readBytes(recordSize, recordOffs);
        shape = new RecordClass(bin, recordSize);
      }
    }
    return shape;
  }

  // TODO: add tests
  // Try to scan past unreadable content to find next record
  function huntForNextShape(start, id) {
    var offset = start,
        shape = null,
        bin, recordId, recordType;
    while (offset + 12 <= fileSize) {
      bin = file.readBytes(12, offset);
      recordId = bin.bigEndian().readUint32();
      recordType = bin.littleEndian().skipBytes(4).readUint32();
      if (recordId == id && (recordType == header.type || recordType === 0)) {
        // we have a likely position, but may still be unparsable
        shape = readShapeAtOffset(offset, id);
        break;
      }
      offset += 4; // try next integer position
    }
    skippedBytes += shape ? offset - start : fileSize - start;
    return shape;
  }
}

ShpReader.prototype.type = function() {
  return this.header().type;
};

ShpReader.prototype.getCounts = function() {
  var counts = {
    nullCount: 0,
    partCount: 0,
    shapeCount: 0,
    pointCount: 0
  };
  this.forEachShape(function(shp) {
    if (shp.isNull) counts.nullCount++;
    counts.pointCount += shp.pointCount;
    counts.partCount += shp.partCount;
    counts.shapeCount++;
  });
  return counts;
};

// Same interface as FileBytes, for reading from a buffer instead of a file.
function BufferBytes(buf) {
  var bin = new BinArray(buf),
      bufSize = bin.size();
  this.readBytes = function(len, offset) {
    if (bufSize < offset + len) error("Out-of-range error");
    bin.position(offset);
    return bin;
  };

  this.size = function() {
    return bufSize;
  };

  this.close = function() {};
}

// Read a binary file in chunks, to support files > 1GB in Node
function FileBytes(path) {
  var DEFAULT_BUF_SIZE = 0xffffff, // 16 MB
      fs = require('fs'),
      fileSize = cli.fileSize(path),
      cacheOffs = 0,
      cache, fd;

  this.readBytes = function(len, start) {
    if (fileSize < start + len) error("Out-of-range error");
    if (!cache || start < cacheOffs || start + len > cacheOffs + cache.size()) {
      updateCache(len, start);
    }
    cache.position(start - cacheOffs);
    return cache;
  };

  this.size = function() {
    return fileSize;
  };

  this.close = function() {
    if (fd) {
      fs.closeSync(fd);
      fd = null;
      cache = null;
      cacheOffs = 0;
    }
  };

  function updateCache(len, start) {
    var headroom = fileSize - start,
        bufSize = Math.min(headroom, Math.max(DEFAULT_BUF_SIZE, len)),
        buf = new Buffer(bufSize),
        bytesRead;
    if (!fd) fd = fs.openSync(path, 'r');
    bytesRead = fs.readSync(fd, buf, 0, bufSize, start);
    if (bytesRead < bufSize) error("Error reading file");
    cacheOffs = start;
    cache = new BinArray(buf);
  }
}





MapShaper.importDbfTable = function(buf, opts) {
  return new ShapefileTable(buf, opts && opts.encoding);
};

MapShaper.exportDbf = function(dataset, opts) {
  return dataset.layers.reduce(function(files, lyr) {
    if (lyr.data) {
      files = files.concat(MapShaper.exportDbfFile(lyr, dataset, opts));
    }
    return files;
  }, []);
};

MapShaper.exportDbfFile = function(lyr, dataset, opts) {
  var data = lyr.data,
      buf;
  // create empty data table if missing a table or table is being cut out
  if (!data || opts.cut_table || opts.drop_table) {
    data = new DataTable(lyr.shapes.length);
  }
  // dbfs should have at least one column; add id field if none
  if (data.getFields().length === 0) {
    data.addIdField();
  }
  buf = data.exportAsDbf(opts.encoding || dataset.info.dbf_encoding);
  if (utils.isInteger(opts.ldid)) {
    new Uint8Array(buf)[29] = opts.ldid; // set language driver id
  }
  // TODO: also export .cpg page
  return [{
    content: buf,
    filename: lyr.name + '.dbf'
  }];
};

// Implements the DataTable api for DBF file data.
// We avoid touching the raw DBF field data if possible. This way, we don't need
// to parse the DBF at all in common cases, like importing a Shapefile, editing
// just the shapes and exporting in Shapefile format.
// TODO: consider accepting just the filename, so buffer doesn't consume memory needlessly.
//
function ShapefileTable(buf, encoding) {
  var reader = new DbfReader(buf, encoding),
      table;
  this.encoding = reader.encoding; // expose import encoding, etc

  function getTable() {
    if (!table) {
      // export DBF records on first table access
      table = new DataTable(reader.readRows());
      reader = null;
      buf = null; // null out references to DBF data for g.c.
    }
    return table;
  }

  this.exportAsDbf = function(encoding) {
    // export original dbf string if records haven't been touched.
    return table ? table.exportAsDbf(encoding) : reader.bin.buffer();
  };

  this.getRecords = function() {
    return getTable().getRecords();
  };

  this.getFields = function() {
    return reader ? utils.pluck(reader.header.fields, 'name') : table.getFields();
  };

  this.size = function() {
    return reader ? reader.rows() : table.size();
  };
}

utils.extend(ShapefileTable.prototype, dataTableProto);
MapShaper.ShapefileTable = ShapefileTable;




MapShaper.translateShapefileType = function(shpType) {
  if (utils.contains([ShpType.POLYGON, ShpType.POLYGONM, ShpType.POLYGONZ], shpType)) {
    return 'polygon';
  } else if (utils.contains([ShpType.POLYLINE, ShpType.POLYLINEM, ShpType.POLYLINEZ], shpType)) {
    return 'polyline';
  } else if (utils.contains([ShpType.POINT, ShpType.POINTM, ShpType.POINTZ,
      ShpType.MULTIPOINT, ShpType.MULTIPOINTM, ShpType.MULTIPOINTZ], shpType)) {
    return 'point';
  }
  return null;
};

MapShaper.getShapefileType = function(type) {
  if (type === null) return ShpType.NULL;
  return {
    polygon: ShpType.POLYGON,
    polyline: ShpType.POLYLINE,
    point: ShpType.MULTIPOINT  // TODO: use POINT when possible
  }[type] || null;
};

// Read Shapefile data from a file, ArrayBuffer or Buffer
// @src filename or buffer
MapShaper.importShp = function(src, opts) {
  var reader = new ShpReader(src),
      shpType = reader.type(),
      type = MapShaper.translateShapefileType(shpType),
      maxPoints = Math.round(reader.header().byteLength / 16), // for reserving buffer space
      importer = new PathImporter(opts, maxPoints);

  if (!type) {
    stop("Unsupported Shapefile type:", shpType);
  }
  if (ShpType.isZType(shpType)) {
    message("Warning: Shapefile Z data will be lost.");
  } else if (ShpType.isMType(shpType)) {
    message("Warning: Shapefile M data will be lost.");
  }

  // TODO: test cases: null shape; non-null shape with no valid parts
  reader.forEachShape(function(shp) {
    importer.startShape();
    if (shp.isNull) return;
    if (type == 'point') {
      importer.importPoints(shp.readPoints());
    } else {
      var xy = shp.readXY(),
          parts = shp.readPartSizes(),
          start = 0,
          len;

      for (var i=0; i<parts.length; i++) {
        len = parts[i] * 2;
        importer.importPathFromFlatArray(xy, type, len, start);
        start += len;
      }
    }
  });

  return importer.done();
};


// Convert a dataset to Shapefile files
MapShaper.exportShapefile = function(dataset, opts) {
  return dataset.layers.reduce(function(files, lyr) {
    var prj = MapShaper.exportPrjFile(lyr, dataset);
    files = files.concat(MapShaper.exportShpAndShxFiles(lyr, dataset, opts));
    files = files.concat(MapShaper.exportDbfFile(lyr, dataset, opts));
    if (prj) files.push(prj);
    return files;
  }, []);
};

MapShaper.exportPrjFile = function(lyr, dataset) {
  var content, prj, path;
  if (Env.inNode && dataset.info.input_files && dataset.info.input_format == 'shapefile') {
    path = utils.replaceFileExtension(dataset.info.input_files[0], 'prj');
    if (cli.isFile(path)) {
      content = cli.readFile(path, 'utf-8');
    }
  } else if (dataset.info.output_prj) {
    content = dataset.info.output_prj;
  }
  if (content) {
    prj = {
      content: content,
      filename: lyr.name + '.prj'
    };
  }
  return prj;
};

MapShaper.exportShpAndShxFiles = function(layer, dataset, opts) {
  var geomType = layer.geometry_type;
  var shpType = MapShaper.getShapefileType(geomType);
  if (shpType === null) {
    error("[exportShpAndShx()] Unable to export geometry type:", geomType);
  }

  var fileBytes = 100;
  var bounds = new Bounds();
  var shapeBuffers = layer.shapes.map(function(shape, i) {
    var pathData = MapShaper.exportPathData(shape, dataset.arcs, geomType);
    var rec = MapShaper.exportShpRecord(pathData, i+1, shpType);
    fileBytes += rec.buffer.byteLength;
    if (rec.bounds) bounds.mergeBounds(rec.bounds);
    return rec.buffer;
  });

  // write .shp header section
  var shpBin = new BinArray(fileBytes, false)
    .writeInt32(9994)
    .skipBytes(5 * 4)
    .writeInt32(fileBytes / 2)
    .littleEndian()
    .writeInt32(1000)
    .writeInt32(shpType);

  if (bounds.hasBounds()) {
    shpBin.writeFloat64(bounds.xmin || 0) // using 0s as empty value
      .writeFloat64(bounds.ymin || 0)
      .writeFloat64(bounds.xmax || 0)
      .writeFloat64(bounds.ymax || 0);
  } else {
    // no bounds -- assume no shapes or all null shapes -- using 0s as bbox
    shpBin.skipBytes(4 * 8);
  }

  shpBin.skipBytes(4 * 8); // skip Z & M type bounding boxes;

  // write .shx header
  var shxBytes = 100 + shapeBuffers.length * 8;
  var shxBin = new BinArray(shxBytes, false)
    .writeBuffer(shpBin.buffer(), 100) // copy .shp header to .shx
    .position(24)
    .bigEndian()
    .writeInt32(shxBytes/2)
    .position(100);

  // write record sections of .shp and .shx
  shapeBuffers.forEach(function(buf, i) {
    var shpOff = shpBin.position() / 2,
        shpSize = (buf.byteLength - 8) / 2; // alternative: shxBin.writeBuffer(buf, 4, 4);
    shxBin.writeInt32(shpOff);
    shxBin.writeInt32(shpSize);
    shpBin.writeBuffer(buf);
  });

  return [{
      content: shpBin.buffer(),
      filename: layer.name + ".shp"
    }, {
      content: shxBin.buffer(),
      filename: layer.name + ".shx"
    }];
};

// Returns an ArrayBuffer containing a Shapefile record for one shape
//   and the bounding box of the shape.
// TODO: remove collapsed rings, convert to null shape if necessary
//
MapShaper.exportShpRecord = function(data, id, shpType) {
  var bounds = null,
      bin = null;
  if (data.pointCount > 0) {
    var multiPart = ShpType.isMultiPartType(shpType),
        partIndexIdx = 52,
        pointsIdx = multiPart ? partIndexIdx + 4 * data.pathCount : 48,
        recordBytes = pointsIdx + 16 * data.pointCount,
        pointCount = 0;

    bounds = data.bounds;
    bin = new BinArray(recordBytes, false)
      .writeInt32(id)
      .writeInt32((recordBytes - 8) / 2)
      .littleEndian()
      .writeInt32(shpType)
      .writeFloat64(bounds.xmin)
      .writeFloat64(bounds.ymin)
      .writeFloat64(bounds.xmax)
      .writeFloat64(bounds.ymax);

    if (multiPart) {
      bin.writeInt32(data.pathCount);
    } else {
      if (data.pathData.length > 1) {
        error("[exportShpRecord()] Tried to export multiple paths as type:", shpType);
      }
    }

    bin.writeInt32(data.pointCount);

    data.pathData.forEach(function(path, i) {
      if (multiPart) {
        bin.position(partIndexIdx + i * 4).writeInt32(pointCount);
      }
      bin.position(pointsIdx + pointCount * 16);

      var points = path.points;
      for (var j=0, len=points.length; j<len; j++) {
        bin.writeFloat64(points[j][0]);
        bin.writeFloat64(points[j][1]);
      }
      pointCount += j;
    });
    if (data.pointCount != pointCount)
      error("Shp record point count mismatch; pointCount:",
          pointCount, "data.pointCount:", data.pointCount);

  } else {
    // no data -- export null record
    bin = new BinArray(12, false)
      .writeInt32(id)
      .writeInt32(2)
      .littleEndian()
      .writeInt32(0);
  }

  return {bounds: bounds, buffer: bin.buffer()};
};




// Parse content of one or more input files and return a dataset
// @obj: file data, indexed by file type
// File data objects have two properties:
//    content: Buffer, ArrayBuffer, String or Object
//    filename: String or null
//
MapShaper.importContent = function(obj, opts) {
  var dataset, content, fileFmt, data;
  opts = opts || {};
  if (obj.json) {
    data = obj.json;
    content = data.content;
    if (utils.isString(content)) {
      content = JSON.parse(content);
    }
    if (content.type == 'Topology') {
      fileFmt = 'topojson';
      dataset = MapShaper.importTopoJSON(content, opts);
    } else if (content.type) {
      fileFmt = 'geojson';
      dataset = MapShaper.importGeoJSON(content, opts);
    }
  } else if (obj.text) {
    fileFmt = 'dsv';
    data = obj.text;
    dataset = MapShaper.importDelim(data.content, opts);
  } else if (obj.shp) {
    fileFmt = 'shapefile';
    data = obj.shp;
    dataset = MapShaper.importShapefile(obj, opts);
  } else if (obj.dbf) {
    fileFmt = 'dbf';
    data = obj.dbf;
    dataset = MapShaper.importDbf(obj, opts);
  }

  if (!dataset) {
    stop("Missing an expected input type");
  }

  // Convert to topological format, if needed
  if (dataset.arcs && !opts.no_topology && fileFmt != 'topojson') {
    T.start();
    api.buildTopology(dataset);
    T.stop("Process topology");
  }

  // Use file basename for layer name, except TopoJSON, which uses object names
  if (fileFmt != 'topojson') {
    MapShaper.setLayerName(dataset.layers[0], MapShaper.filenameToLayerName(data.filename || ''));
  }

  // Add input filename and format to the dataset's 'info' object
  // (this is useful when exporting if format or name has not been specified.)
  if (data.filename) {
    dataset.info.input_files = [data.filename];
  }
  dataset.info.input_format = fileFmt;

  return dataset;
};

// Deprecated (included for compatibility with older tests)
MapShaper.importFileContent = function(content, filename, opts) {
  var type = MapShaper.guessInputType(filename, content),
      input = {};
  input[type] = {filename: filename, content: content};
  return MapShaper.importContent(input, opts);
};

MapShaper.importShapefile = function(obj, opts) {
  var shpSrc = obj.shp.content || obj.shp.filename, // content may be missing
      dataset = MapShaper.importShp(shpSrc, opts),
      lyr = dataset.layers[0],
      dbf;
  if (obj.dbf) {
    dbf = MapShaper.importDbf(obj, opts);
    utils.extend(dataset.info, dbf.info);
    lyr.data = dbf.layers[0].data;
    if (lyr.data.size() != lyr.shapes.length) {
      message("[shp] Mismatched .dbf and .shp record count -- possible data loss.");
    }
  }
  return dataset;
};

MapShaper.importDbf = function(input, opts) {
  var table;
  opts = utils.extend({}, opts);
  if (input.cpg && !opts.encoding) {
    opts.encoding = input.cpg.content;
  }
  table = MapShaper.importDbfTable(input.dbf.content, opts);
  return {
    info: {dbf_encoding: table.encoding},
    layers: [{data: table}]
  };
};

MapShaper.filenameToLayerName = function(path) {
  var name = 'layer1';
  var obj = utils.parseLocalPath(path);
  if (obj.basename && obj.extension) { // exclude paths like '/dev/stdin'
    name = obj.basename;
  }
  return name;
};

// initialize layer name using filename
MapShaper.setLayerName = function(lyr, path) {
  if (!lyr.name) {
    lyr.name = utils.getFileBase(path);
  }
};




function ProgressBar(el) {
  var size = 80,
      posCol = '#285d7e',
      negCol = '#bdced6',
      outerRadius = size / 2,
      innerRadius = outerRadius / 2,
      cx = outerRadius,
      cy = outerRadius,
      bar = El('div').appendTo(el).addClass('progress-bar'),
      canv = El('canvas').appendTo(bar).node(),
      ctx = canv.getContext('2d'),
      msg = El('div').appendTo(bar);

  canv.width = size;
  canv.height = size;

  this.update = function(pct, str) {
    var twoPI = Math.PI * 2;
    ctx.clearRect(0, 0, size, size);
    if (pct > 0) {
      drawCircle(negCol, outerRadius, twoPI);
      drawCircle(posCol, outerRadius, twoPI * pct);
      drawCircle(null, innerRadius, twoPI);
    }
    msg.html(str || '');
  };

  this.remove = function() {
    bar.remove();
  };

  function drawCircle(color, radius, radians) {
    var halfPI = Math.PI / 2;
    if (!color) ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = color || '#000';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -halfPI, radians - halfPI, false);
    ctx.closePath();
    ctx.fill();
    if (!color) ctx.globalCompositeOperation = 'source-over';
  }
}




// Cache and merge data from Shapefile component files (.prj, .dbf, shp) in
// whatever order they are received in.
//
gui.receiveShapefileComponent = (function() {
  var cache = {};

  function merge() {
    var dataset = cache.shp,
        lyr, info;
    if (dataset) {
      lyr = dataset.layers[0];
      info = dataset.info;
      // only use prj or dbf if the dataset lacks this info
      // (the files could be intended for a future re-import of .shp content)
      if (cache.prj && !info.output_prj) {
        info.output_prj = cache.prj;
      }
      if (cache.dbf && !lyr.data) {
        // TODO: detect dbf encoding instead of using ascii
        // (Currently, records are read if Shapefile is converted to *JSON).
        lyr.data = new ShapefileTable(cache.dbf, 'ascii');
        delete cache.dbf;
        if (lyr.data.size() != lyr.shapes.length) {
          lyr.data = null;
          stop("Different number of records in .shp and .dbf files");
        }
      }
    }
  }

  // @content: imported dataset if .shp, raw file content if other file type
  return function(path, content) {
    var name = utils.getFileBase(path),
        ext = utils.getFileExtension(path).toLowerCase();
    if (name != cache.name) {
      cache = {name: name};
    }
    cache[ext] = content;
    merge();
  };
}());

gui.importFile = function(file, opts, cb) {
  var reader = new FileReader(),
      isBinary = MapShaper.isBinaryFile(file.name);
  reader.onload = function(e) {
    gui.inputFileContent(file.name, reader.result, opts, cb);
  };
  // TODO: improve to handle encodings, etc.
  if (isBinary) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file, 'UTF-8');
  }
};

gui.inputFileContent = function(path, content, importOpts, cb) {
  var type = MapShaper.guessInputFileType(path),
      size = content.byteLength || content.length, // ArrayBuffer or string
      delay = 25, // timeout in ms; should be long enough for Firefox to refresh.
      progressBar, dataset, queue;

  // these file types can be imported and edited right away
  if (type == 'shp' || type == 'json') {
    El("#mshp-intro-screen").hide();
    progressBar = new ProgressBar('#page-wrapper');
    progressBar.update(0.2, "Importing");
    if (size < 4e7) progressBar.remove(); // don't show for small datasets
    // Import data with a delay before each step, so browser can refresh the progress bar
    queue = gui.queueSync()
      .defer(function() {
        importOpts.files = [path]; // TODO: try to remove this
        dataset = MapShaper.importFileContent(content, path, importOpts);
      }, delay);
    if (importOpts.method) {
      queue.defer(function() {
        progressBar.update(0.6, "Presimplifying");
      })
      .defer(function() {
        if (dataset.arcs) {
          MapShaper.simplifyPaths(dataset.arcs, importOpts);
          if (importOpts.keep_shapes) {
            MapShaper.keepEveryPolygon(dataset.arcs, dataset.layers);
          }
        }
      }, delay);
    }
    queue.await(function() {
      if (type == 'shp') {
        gui.receiveShapefileComponent(path, dataset);
      }
      progressBar.remove();
      cb(null, dataset);
    });
  } else if (type == 'dbf' || type == 'prj') {
    // merge auxiliary Shapefile files with .shp content
    gui.receiveShapefileComponent(path, content);

  } else {
    console.log("Unexpected file type: " + path + '; ignoring');
  }
};



// init zip.js
zip.workerScripts = {
  // deflater: ['z-worker.js', 'deflate.js'], // use zip.js deflater
  // TODO: find out why it was necessary to rename pako_deflate.min.js
  deflater: ['z-worker.js', 'pako.deflate.js', 'codecs.js'],
  inflater: ['z-worker.js', 'pako.inflate.js', 'codecs.js']
};

// @file: Zip file
// @cb: function(err, <files>)
//
gui.readZipFile = function(file, cb) {
  var _files = [];
  zip.createReader(new zip.BlobReader(file), importZipContent, onError);

  function onError(err) {
    cb(err);
  }

  function onDone() {
    cb(null, _files);
  }

  function importZipContent(reader) {
    var _entries;
    reader.getEntries(readEntries);

    function readEntries(entries) {
      _entries = entries || [];
      readNext();
    }

    function readNext() {
      if (_entries.length > 0) {
        readEntry(_entries.pop());
      } else {
        reader.close();
        onDone();
      }
    }

    function readEntry(entry) {
      var filename = entry.filename,
          isValid = !entry.directory && gui.isReadableFileType(filename) &&
              !/^__MACOSX/.test(filename); // ignore "resource-force" files
      if (isValid) {
        entry.getData(new zip.BlobWriter(), function(file) {
          file.name = filename; // Give the Blob a name, like a File object
          _files.push(file);
          readNext();
        });
      } else {
        readNext();
      }
    }
  }
};




// @cb function(<FileList>)
//
function DropControl(cb) {
  var el = El('#page-wrapper');
  el.on('dragleave', ondrag);
  el.on('dragover', ondrag);
  el.on('drop', ondrop);
  function ondrag(e) {
    // blocking drag events enables drop event
    e.preventDefault();
  }
  function ondrop(e) {
    e.preventDefault();
    cb(e.dataTransfer.files);
  }
}

// @el DOM element for select button
// @cb function(<FileList>)
//
function FileChooser(el, cb) {
  var btn = El(el).on('click', function() {
    input.el.click();
  });
  var input = El('form')
    .addClass('g-file-control').appendTo('body')
    .newChild('input')
    .attr('type', 'file')
    .attr('multiple', 'multiple')
    .on('change', onchange);

  function onchange(e) {
    var files = e.target.files;
    // files may be undefined (e.g. if user presses 'cancel' after a file has been selected)
    if (files) {
      // disable the button while files are being processed
      btn.addClass('selected');
      input.attr('disabled', true);
      cb(files);
      btn.removeClass('selected');
      input.attr('disabled', false);
    }
  }
}

function ImportControl(editor) {
  new DropControl(readFiles);
  new FileChooser('#g-shp-import-btn', readFiles);

  var precisionInput = new ClickText("#g-import-precision-opt")
    .bounds(0, Infinity)
    .formatter(function(str) {
      var val = parseFloat(str);
      return !val ? '' : String(val);
    })
    .validator(function(str) {
      return str === '' || utils.isNumber(parseFloat(str));
    });

  function readFiles(files) {
    utils.forEach((files || []), readFile);
  }

  function getImportOpts() {
    var method = El('#g-simplification-menu input[name=method]:checked').attr('value') || null;
    return {
      method: method,
      no_repair: !El("#g-repair-intersections-opt").node().checked,
      keep_shapes: !!El("#g-import-retain-opt").node().checked,
      auto_snap: !!El("#g-snap-points-opt").node().checked,
      precision: precisionInput.value()
    };
  }

  function importFile(file) {
    var opts = getImportOpts();
    gui.importFile(file, opts, function(err, dataset) {
      if (dataset) {
        editor.editDataset(dataset, opts);
      }
    });
  }

  // @file a File object
  function readFile(file) {
    var name = file.name,
        ext = utils.getFileExtension(name).toLowerCase();
    if (ext == 'zip') {
      gui.readZipFile(file, function(err, files) {
        if (err) {
          console.log("Zip file loading failed:");
          throw err;
        }
        readFiles(files);
      });
    } else if (gui.isReadableFileType(name)) {
      importFile(file);
    } else {
      console.log("File can't be imported:", name, "-- skipping.");
    }
  }
}




api.dissolvePolygons2 = function(lyr, dataset, opts) {
  MapShaper.requirePolygonLayer(lyr, "[dissolve] only supports polygon type layers");
  var nodes = MapShaper.divideArcs(dataset);
  return MapShaper.dissolvePolygonLayer(lyr, nodes, opts);
};

MapShaper.dissolvePolygonLayer = function(lyr, nodes, opts) {
  opts = opts || {};
  var getGroupId = MapShaper.getCategoryClassifier(opts.field, lyr.data);
  var lyr2 = {data: null};
  var groups = lyr.shapes.reduce(function(groups, shape, i) {
    var i2 = getGroupId(i);
    if (i2 in groups === false) {
      groups[i2] = [];
    }
    MapShaper.extendShape(groups[i2], shape);
    return groups;
  }, []);

  T.start();
  var dissolve = MapShaper.getPolygonDissolver(nodes);
  lyr2.shapes = groups.map(function(group) {
    return dissolve(group);
  });
  T.stop('dissolve2');

  if (lyr.data) {
    lyr2.data = new DataTable(MapShaper.calcDissolveData(lyr.data.getRecords(), getGroupId, opts));
  }
  return utils.defaults(lyr2, lyr);
};

MapShaper.concatShapes = function(shapes) {
  return shapes.reduce(function(memo, shape) {
    MapShaper.extendShape(memo, shape);
    return memo;
  }, []);
};

MapShaper.extendShape = function(dest, src) {
  if (src) {
    for (var i=0, n=src.length; i<n; i++) {
      dest.push(src[i]);
    }
  }
};

MapShaper.getPolygonDissolver = function(nodes, spherical) {
  spherical = spherical && !nodes.arcs.isPlanar();
  var flags = new Uint8Array(nodes.arcs.size());
  var divide = MapShaper.getHoleDivider(nodes, spherical);
  var flatten = MapShaper.getRingIntersector(nodes, 'flatten', flags, spherical);
  var dissolve = MapShaper.getRingIntersector(nodes, 'dissolve', flags, spherical);

  return function(shp) {
    if (!shp) return null;
    var cw = [],
        ccw = [];

    divide(shp, cw, ccw);
    cw = flatten(cw);
    ccw.forEach(MapShaper.reversePath);
    ccw = flatten(ccw);
    ccw.forEach(MapShaper.reversePath);

    var shp2 = MapShaper.appendHolestoRings(cw, ccw);
    var dissolved = dissolve(shp2);
    return dissolved.length > 0 ? dissolved : null;
  };
};

// TODO: to prevent invalid holes,
// could erase the holes from the space-enclosing rings.
MapShaper.appendHolestoRings = function(cw, ccw) {
  for (var i=0, n=ccw.length; i<n; i++) {
    cw.push(ccw[i]);
  }
  return cw;
};




MapShaper.setCoordinatePrecision = function(dataset, precision) {
  var round = geom.getRoundingFunction(precision),
      dissolvePolygon;

  if (dataset.arcs) {
    // need to discard z data if present (it doesn't survive cleaning)
    dataset.arcs.flatten();
    // round coords
    dataset.arcs.applyTransform(null, round);

    var nodes = MapShaper.divideArcs(dataset);
    dissolvePolygon = MapShaper.getPolygonDissolver(nodes);
  }

  dataset.layers.forEach(function(lyr) {
    if (MapShaper.layerHasPoints(lyr)) {
      MapShaper.roundPoints(lyr, round);
    } else if (lyr.geometry_type == 'polygon' && dissolvePolygon) {
      // clean each polygon -- use dissolve function remove spikes
      // TODO implement proper clean/repair function
      lyr.shapes = lyr.shapes.map(dissolvePolygon);
    }
  });
};

MapShaper.roundPoints = function(lyr, round) {
  MapShaper.forEachPoint(lyr, function(p) {
    p[0] = round(p[0]);
    p[1] = round(p[1]);
  });
};




// Generate output content from a dataset object
MapShaper.exportDelim = function(dataset, opts) {
  var delim = MapShaper.getExportDelimiter(dataset.info, opts),
      ext = MapShaper.getDelimFileExtension(delim, opts);
  return dataset.layers.map(function(lyr) {
    return {
      // TODO: consider supporting encoding= option
      content: MapShaper.exportDelimTable(lyr, delim),
      filename: (lyr.name || 'output') + '.' + ext
    };
  });
};

MapShaper.exportDelimTable = function(lyr, delim) {
  var dsv = require("./lib/d3/d3-dsv.js").dsv(delim);
  return dsv.format(lyr.data.getRecords());
};

MapShaper.getExportDelimiter = function(info, opts) {
  var delim = ','; // default
  var outputExt = opts.output_file ? utils.getFileExtension(opts.output_file) : '';
  if (opts.delimiter) {
    delim = opts.delimiter;
  } else if (outputExt == 'tsv') {
    delim = '\t';
  } else if (outputExt == 'csv') {
    delim = ',';
  } else if (info.input_delimiter) {
    delim = info.input_delimiter;
  }
  return delim;
};

// If output filename is not specified, use the delimiter char to pick
// an extension.
MapShaper.getDelimFileExtension = function(delim, opts) {
  var ext = 'txt'; // default
  if (opts.output_file) {
    ext = utils.getFileExtension(opts.output_file);
  } else if (delim == '\t') {
    ext = 'tsv';
  } else if (delim == ',') {
    ext = 'csv';
  }
  return ext;
};




// Return an array of objects with "filename" "filebase" "extension" and
// "content" attributes.
//
MapShaper.exportFileContent = function(dataset, opts) {
  var outFmt = opts.format = MapShaper.getOutputFormat(dataset, opts),
      exporter = MapShaper.exporters[outFmt],
      layers = dataset.layers,
      files = [];

  if (!outFmt) {
    error("[o] Missing output format");
  } else if (!exporter) {
    error("[o] Unknown export format:", outFmt);
  }

  if (opts.output_file && outFmt != 'topojson') {
    layers.forEach(function(lyr) {
      lyr.name = utils.getFileBase(opts.output_file);
    });
  }

  if (opts.precision) {
    MapShaper.setCoordinatePrecision(dataset, opts.precision);
  }

  MapShaper.validateLayerData(layers);
  MapShaper.assignUniqueLayerNames(layers);

  if (opts.cut_table) {
    files = MapShaper.exportDataTables(layers, opts).concat(files);
  }

  files = exporter(dataset, opts).concat(files);
  // If rounding or quantization are applied during export, bounds may
  // change somewhat... consider adding a bounds property to each layer during
  // export when appropriate.
  if (opts.bbox_index) {
    files.push(MapShaper.createIndexFile(dataset));
  }

  MapShaper.validateFileNames(files);
  return files;
};

MapShaper.exporters = {
  geojson: MapShaper.exportGeoJSON,
  topojson: MapShaper.exportTopoJSON,
  shapefile: MapShaper.exportShapefile,
  dsv: MapShaper.exportDelim,
  dbf: MapShaper.exportDbf
};

MapShaper.getOutputFormat = function(dataset, opts) {
  var outFile = opts.output_file || null,
      inFmt = dataset.info && dataset.info.input_format,
      outFmt = null;

  if (opts.format) {
    outFmt = opts.format;
  } else if (outFile) {
    outFmt = MapShaper.inferOutputFormat(outFile, inFmt);
  } else if (inFmt) {
    outFmt = inFmt;
  }
  return outFmt;
};

// Generate json file with bounding boxes and names of each export layer
// TODO: consider making this a command, or at least make format settable
//
MapShaper.createIndexFile = function(dataset) {
  var index = dataset.layers.map(function(lyr) {
    var bounds = MapShaper.getLayerBounds(lyr, dataset.arcs);
    return {
      bbox: bounds.toArray(),
      name: lyr.name
    };
  });

  return {
    content: JSON.stringify(index),
    filename: "bbox-index.json"
  };
};

MapShaper.validateLayerData = function(layers) {
  layers.forEach(function(lyr) {
    if (!lyr.geometry_type) {
      // allowing data-only layers
      if (lyr.shapes && utils.some(lyr.shapes, function(o) {
        return !!o;
      })) {
        error("[export] A layer contains shape records and a null geometry type");
      }
    } else {
      if (!utils.contains(['polygon', 'polyline', 'point'], lyr.geometry_type)) {
        error ("[export] A layer has an invalid geometry type:", lyr.geometry_type);
      }
      if (!lyr.shapes) {
        error ("[export] A layer is missing shape data");
      }
    }
  });
};

MapShaper.validateFileNames = function(files) {
  var index = {};
  files.forEach(function(file, i) {
    var filename = file.filename;
    if (!filename) error("[o] Missing a filename for file" + i);
    if (filename in index) error("[o] Duplicate filename", filename);
    index[filename] = true;
  });
};

MapShaper.assignUniqueLayerNames = function(layers) {
  var names = layers.map(function(lyr) {
    return lyr.name || "layer";
  });
  var uniqueNames = MapShaper.uniqifyNames(names);
  layers.forEach(function(lyr, i) {
    lyr.name = uniqueNames[i];
  });
};

/*
MapShaper.getDefaultFileExtension = function(fileType) {
  var ext = "";
  if (fileType == 'shapefile') {
    ext = 'shp';
  } else if (fileType == 'geojson' || fileType == 'topojson') {
    ext = "json";
  }
  return ext;
};
*/

MapShaper.exportDataTables = function(layers, opts) {
  var tables = [];
  layers.forEach(function(lyr) {
    if (lyr.data) {
      tables.push({
        content: lyr.data.exportAsJSON(), // TODO: other formats
        filename: (lyr.name ? lyr.name + '-' : '') + 'table.json'
      });
    }
  });
  return tables;
};

MapShaper.uniqifyNames = function(names) {

  var counts = utils.countValues(names),
      index = {},
      suffix;
  return names.map(function(name) {
    var count = counts[name],
        i = 1;
    if (count > 1 || name in index) {
      do {
        suffix = String(i);
        if (/[0-9]$/.test(name)) {
          suffix = '-' + suffix;
        }
        i++;
      } while ((name + suffix) in index);
      name = name + suffix;
    }
    index[name] = true;
    return name;
  });
};




// Export buttons and their behavior
//
var ExportControl = function() {
  var downloadSupport = typeof URL != 'undefined' && URL.createObjectURL &&
    typeof document.createElement("a").download != "undefined" ||
    !!window.navigator.msSaveBlob;
  var dataset, anchor, blobUrl;

  El('#g-export-control').show();

  if (!downloadSupport) {
    El('#g-export-control .g-label').text("Exporting is not supported in this browser");
  } else {
    anchor = El('#g-export-control').newChild('a').attr('href', '#').node();
    El('#g-export-buttons').css('display:inline');
    exportButton("#g-geojson-btn", "geojson");
    shpBtn = exportButton("#g-shapefile-btn", "shapefile");
    topoBtn = exportButton("#g-topojson-btn", "topojson");
  }

  this.setDataset = function(d) {
    dataset = d;
    return this;
  };

  function exportButton(selector, format) {
    var btn = new SimpleButton(selector).active(true).on('click', onClick);
    function onClick(e) {
      btn.active(false);
      setTimeout(function() {
        exportAs(format, function(err) {
          btn.active(true);
          if (err) error(err);
        });
      }, 10);
    }
  }

  function exportAs(format, done) {
    var opts = {format: format}, // TODO: implement other export opts
        files;

    try {
      files = MapShaper.exportFileContent(dataset, opts);
    } catch(e) {
      return done(e.message);
    }

    if (!utils.isArray(files) || files.length === 0) {
      done("Nothing to export");
    } else if (files.length == 1) {
      saveBlob(files[0].filename, new Blob([files[0].content]), done);
    } else {
      name = MapShaper.getCommonFileBase(utils.pluck(files, 'filename')) || "out";
      saveZipFile(name + ".zip", files, done);
    }
  }

  function saveBlob(filename, blob, done) {
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
      done();
    }
    try {
      // revoke previous download url, if any. TODO: do this when download completes (how?)
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
    } catch(e) {
      done("Mapshaper can't export files from this browser. Try switching to Chrome or Firefox.");
      return;
    }

    // TODO: handle errors
    anchor.href = blobUrl;
    anchor.download = filename;
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    anchor.dispatchEvent(clickEvent);
    done();
  }

  function saveZipFile(zipfileName, files, done) {
    var toAdd = files;
    try {
      zip.createWriter(new zip.BlobWriter("application/zip"), addFile, zipError);
    } catch(e) {
      // TODO: show proper error message, not alert
      done("This browser doesn't support Zip file creation.");
    }

    function zipError(msg) {
      var str = "Error creating Zip file";
      if (msg) {
        str += ": " + (msg.message || msg);
      }
      done(str);
    }

    function addFile(archive) {
      if (toAdd.length === 0) {
        archive.close(function(blob) {
          saveBlob(zipfileName, blob, done);
        });
      } else {
        var obj = toAdd.pop(),
            blob = new Blob([obj.content]);
        archive.add(obj.filename, new zip.BlobReader(blob), function() {addFile(archive);});
      }
    }
  }
};




// Combine detection and repair for cli
//
api.findAndRepairIntersections = function(arcs) {
  T.start();
  var intersections = MapShaper.findSegmentIntersections(arcs),
      unfixable = MapShaper.repairIntersections(arcs, intersections),
      countPre = intersections.length,
      countPost = unfixable.length,
      countFixed = countPre > countPost ? countPre - countPost : 0;
  T.stop('Find and repair intersections');
  return {
    intersections_initial: countPre,
    intersections_remaining: countPost,
    intersections_repaired: countFixed
  };
};


// Try to resolve a collection of line-segment intersections by rolling
// back simplification along intersecting segments.
//
// Limitation of this method: it can't remove intersections that are present
// in the original dataset.
//
// @arcs ArcCollection object
// @intersections (Array) Output from MapShaper.findSegmentIntersections()
// Returns array of unresolved intersections, or empty array if none.
//
MapShaper.repairIntersections = function(arcs, intersections) {
  var raw = arcs.getVertexData(),
      zz = raw.zz,
      yy = raw.yy,
      xx = raw.xx,
      zlim = arcs.getRetainedInterval();

  while (repairAll(intersections) > 0) {
    // After each repair pass, check for new intersections that may have been
    // created as a by-product of repairing one set of intersections.
    //
    // Issue: several hit-detection passes through a large dataset may be slow.
    // Possible optimization: only check for intersections among segments that
    // intersect bounding boxes of segments touched during previous repair pass.
    // Need an efficient way of checking up to thousands of bounding boxes.
    // Consider indexing boxes for n * log(k) or better performance.
    //
    intersections = MapShaper.findSegmentIntersections(arcs);
  }

  return intersections;

  // Find the z value of the next vertex that should be re-introduced into
  // a set of two intersecting segments in order to remove the intersection.
  // Add the z-value and id of this point to the intersection object @obj.
  //
  function setPriority(obj) {
    var i = MapShaper.findNextRemovableVertex(zz, zlim, obj.a[0], obj.a[1]),
        j = MapShaper.findNextRemovableVertex(zz, zlim, obj.b[0], obj.b[1]),
        zi = i == -1 ? Infinity : zz[i],
        zj = j == -1 ? Infinity : zz[j],
        tmp;

    if (zi == Infinity && zj == Infinity) {
      // No more points available to add; unable to repair.
      return Infinity;
    }

    if (zi > zj && zi < Infinity || zj == Infinity) {
      obj.newId = i;
      obj.z = zi;
    } else {
      obj.newId = j;
      obj.z = zj;
      tmp = obj.a;
      obj.a = obj.b;
      obj.b = tmp;
      // obj.ids = [ids[2], ids[3], ids[0], ids[1]];
    }
    return obj.z;
  }

  function repairAll(intersections) {
    var repairs = 0,
        loops = 0,
        intersection, segIds, pairs, pair, len;

    intersections = intersections.filter(function(obj) {
      return setPriority(obj) != Infinity;
    });

    utils.sortOn(intersections, 'z', !!"ascending");

    while (intersections.length > 0) {
      len = intersections.length;
      intersection = intersections.pop();
      segIds = getIntersectionCandidates(intersection);
      pairs = MapShaper.intersectSegments(segIds, xx, yy);

      if (pairs.length === 0) continue;
      if (pairs.length == 1) {
        // single intersection found: re-introduce a vertex to one of the
        // intersecting segments.
        pair = pairs[0];
        if (setPriority(pair) == Infinity) continue;
        pairs = splitSegmentPair(pair);
        zz[pair.newId] = zlim;
        repairs++;
      } else {
        // found multiple intersections along two segments, because
        // vertices have been re-introduced after intersection was first added.
        // They get pushed back on the stack below
      }

      for (var i=0; i<pairs.length; i++) {
        pair = pairs[i];
        if (setPriority(pair) < Infinity) {
          intersections.push(pair);
        }
      }

      if (intersections.length >= len) {
        sortIntersections(intersections, len-1);
      }

      if (++loops > 500000) {
        verbose("Caught an infinite loop at intersection:", intersection);
        return 0;
      }
    }

    return repairs;
  }

  // Use insertion sort to move newly pushed intersections to their sorted position
  function sortIntersections(arr, start) {
    for (var i=start; i<arr.length; i++) {
      var obj = arr[i];
      for (var j = i-1; j >= 0; j--) {
        if (arr[j].z <= obj.z) {
          break;
        }
        arr[j+1] = arr[j];
      }
      arr[j+1] = obj;
    }
  }

  function splitSegmentPair(obj) {
    var start = obj.a[0],
        end = obj.a[1],
        middle = obj.newId;
    if (!(start < middle && middle < end || start > middle && middle > end)) {
      error("[splitSegment()] Indexing error --", obj);
    }
    return [
      getSegmentPair(start, middle, obj.b[0], obj.b[1]),
      getSegmentPair(middle, end, obj.b[0], obj.b[1])
    ];
  }

  function getSegmentPair(s1p1, s1p2, s2p1, s2p2) {
    return {
      a: xx[s1p1] > xx[s1p2] ? [s1p2, s1p1] : [s1p1, s1p2],
      b: [s2p1, s2p2]
    };
  }

  function getIntersectionCandidates(obj) {
    var segments = [];
    addSegmentVertices(segments, obj.a);
    addSegmentVertices(segments, obj.b);
    return segments;
  }

  // Gat all segments defined by two endpoints and the vertices between
  // them that are at or above the current simplification threshold.
  // @ids Accumulator array
  function addSegmentVertices(ids, seg) {
    var start, end, prev;
    if (seg[0] <= seg[1]) {
      start = seg[0];
      end = seg[1];
    } else {
      start = seg[1];
      end = seg[0];
    }
    prev = start;
    for (var i=start+1; i<=end; i++) {
      if (zz[i] >= zlim) {
        if (xx[prev] < xx[i]) {
          ids.push(prev, i);
        } else {
          ids.push(i, prev);
        }
        prev = i;
      }
    }
  }
};




function RepairControl(map) {
  var el = El("#g-intersection-display"),
      _self = this,
      readout = el.findChild("#g-intersection-count"),
      btn = el.findChild("#g-repair-btn"),
      _pointLyr = {geometry_type: "point", shapes: []},
      _dataset, _currXX, _displayGroup;

  this.setDataset = function(dataset) {
    _dataset = dataset.arcs ? dataset : null;
    this.clear();
  };

  this.show = function() {
    el.show();
  };

  this.hide = function() {
    this.clear();
    el.hide();
  };

  this.reset = function() {
    this.hide();
    this.removeEventListeners();
  };

  // Display intersections for dataset's current level of arc simplification
  this.update = function() {
    var XX, showBtn, pct;
    if (!_dataset) return;
    if (!_displayGroup) {
      _displayGroup = map.addLayer({layers:[_pointLyr]});
    }

    if (_dataset.arcs.getRetainedInterval() > 0) {
      XX = MapShaper.findSegmentIntersections(_dataset.arcs);
      showBtn = XX.length > 0;
    } else { // no simplification
      if (!_dataset.info.repair) {
        _dataset.info.repair = {
          initialXX: MapShaper.findSegmentIntersections(_dataset.arcs)
        };
      }
      XX = _dataset.info.repair.initialXX;
      showBtn = false;
    }
    showIntersections(XX);
    btn.classed('disabled', !showBtn);
  };

  btn.on('click', function() {
    T.start();
    var fixed = MapShaper.repairIntersections(_dataset.arcs, _currXX);
    T.stop('Fix intersections');
    btn.addClass('disabled');
    showIntersections(fixed);
    _self.dispatchEvent('repair');
  });

  this.clear = function() {
    _currXX = null;
    if (_displayGroup) _displayGroup.hide();
  };

  function showIntersections(XX) {
    var n = XX.length;
    if (n === 0) {
      _displayGroup.hide();
    } else {
      _pointLyr.shapes[0] = MapShaper.getIntersectionPoints(XX);
      _displayGroup
        .showLayer(_pointLyr)
        .setStyle({
          dotSize: n < 20 && 5 || n < 500 && 4 || 3,
          squareDot: true,
          dotColor: "#F24400"
        })
        .refresh();
    }
    var msg = utils.format("%s line intersection%s", n, n != 1 ? 's' : '');
    readout.text(msg);
    _currXX = XX;
  }
}

utils.inherit(RepairControl, EventDispatcher);




MapShaper.drawShapes = function(shapes, style, ctx) {
  if (style.dotColor) {
    this.drawPoints(shapes, style, ctx);
  } else {
    this.drawPaths(shapes, style, ctx);
  }
};

MapShaper.drawPoints = function(paths, style, ctx) {
  var midCol = style.dotColor || "rgba(255, 50, 50, 0.5)",
      endCol = style.nodeColor || midCol,
      midSize = style.dotSize || 3,
      endSize = style.nodeSize >= 0 ? style.nodeSize : midSize,
      drawPoint = style.squareDot ? drawSquare : drawCircle,
      prevX, prevY;

  paths.forEach(function(vec) {
    if (vec.hasNext()) {
      drawPoint(vec.x, vec.y, endSize, endCol, ctx);
    }
    if (vec.hasNext()) {
      prevX = vec.x;
      prevY = vec.y;
      while (vec.hasNext()) {
        drawPoint(prevX, prevY, midSize, midCol, ctx);
        prevX = vec.x;
        prevY = vec.y;
      }
      drawPoint(prevX, prevY, endSize, endCol, ctx);
    }
  });
};

MapShaper.drawPaths = function(paths, style, ctx) {
  var stroked = style.strokeColor && style.strokeWidth !== 0,
      filled = !!style.fillColor;

  if (stroked) {
    ctx.lineWidth = style.strokeWidth || 1;
    ctx.strokeStyle = style.strokeColor;
    //ctx.lineJoin = 'round';
  }
  if (filled) {
    ctx.fillStyle = style.fillColor;
  }

  paths.forEach(function(vec) {
    if (vec.hasNext()) {
      ctx.beginPath();
      ctx.moveTo(vec.x, vec.y);
      while (vec.hasNext()) {
        ctx.lineTo(vec.x, vec.y);
      }
      if (filled) ctx.fill();
      if (stroked) ctx.stroke();
    }
  });
};

function drawCircle(x, y, size, col, ctx) {
  if (size > 0) {
    ctx.beginPath();
    ctx.fillStyle = col;
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2, true);
    ctx.fill();
  }
}

function drawSquare(x, y, size, col, ctx) {
  if (size > 0) {
    var offs = size / 2;
    x = Math.round(x - offs);
    y = Math.round(y - offs);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, size, size);
  }
}


function CanvasLayer() {
  var canvas = El('canvas').css('position:absolute;').node(),
      ctx = canvas.getContext('2d');

  this.getContext = function() {
    return ctx;
  };

  this.prepare = function(w, h) {
    if (w != canvas.width || h != canvas.height) {
      this.resize(w, h);
    } else {
      this.clear();
    }
  };

  this.resize = function(w, h) {
    canvas.width = w;
    canvas.height = h;
  };

  this.clear = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  this.getElement = function() {
    return El(canvas);
  };
}




MapShaper.simplifyArcsFast = function(arcs, dist) {
  var xx = [],
      yy = [],
      nn = [],
      count;
  for (var i=0, n=arcs.size(); i<n; i++) {
    count = MapShaper.simplifyPathFast([i], arcs, dist, xx, yy);
    nn.push(count);
  }
  return new ArcCollection(nn, xx, yy);
};

MapShaper.simplifyShapeFast = function(shp, arcs, dist) {
  if (!shp || !dist) return null;
  var xx = [],
      yy = [],
      nn = [],
      shp2 = [];

  shp.forEach(function(path) {
    var count = MapShaper.simplifyPathFast(path, arcs, dist, xx, yy);
    if (count > 0) {
      shp2.push([nn.length]);
      nn.push(count);
    }
  });
  return {
    shape: shp2,
    arcs: new ArcCollection(nn, xx, yy)
  };
};

MapShaper.simplifyPathFast = function(path, arcs, dist, xx, yy) {
  var iter = arcs.getShapeIter(path),
      count = 0,
      prevX, prevY, x, y;
  while (iter.hasNext()) {
    x = iter.x;
    y = iter.y;
    if (count === 0 || distance2D(x, y, prevX, prevY) > dist) {
      xx.push(x);
      yy.push(y);
      prevX = x;
      prevY = y;
      count++;
    }
  }
  if (count > 2 && (x != prevX || y != prevY)) {
    xx.push(x);
    yy.push(y);
    count++;
  }
  while (count < 4 && count > 0) {
    xx.pop();
    yy.pop();
    count--;
  }
  return count;
};




// A wrapper for ArcCollection that converts source coords to screen coords
// and filters paths to speed up rendering.
//
function FilteredArcCollection(unfilteredArcs) {
  var _ext,
      _sortedThresholds,
      filteredArcs,
      filteredSegLen;

  init();

  function init() {
    var size = unfilteredArcs.getPointCount(),
        cutoff = 5e5,
        nth;
    if (!!unfilteredArcs.getVertexData().zz) {
      // If we have simplification data...
      // Sort simplification thresholds for all non-endpoint vertices
      // for quick conversion of simplification percentage to threshold value.
      // For large datasets, use every nth point, for faster sorting.
      nth = Math.ceil(size / cutoff);
      _sortedThresholds = unfilteredArcs.getRemovableThresholds(nth);
      utils.quicksort(_sortedThresholds, false);
      // For large datasets, create a filtered copy of the data for faster rendering
      if (size > cutoff) {
        filteredArcs = initFilteredArcs(unfilteredArcs, _sortedThresholds);
        filteredSegLen = filteredArcs.getAvgSegment();
      }
    } else {
      if (size > cutoff) {
        // generate filtered arcs when no simplification data is present
        filteredSegLen = unfilteredArcs.getAvgSegment() * 4;
        filteredArcs = MapShaper.simplifyArcsFast(unfilteredArcs, filteredSegLen);
      }
    }
  }

  // Use simplification data to create a low-detail copy of arcs, for faster
  // rendering when zoomed-out.
  function initFilteredArcs(arcs, sortedThresholds) {
    var filterPct = 0.08;
    var filterZ = sortedThresholds[Math.floor(filterPct * sortedThresholds.length)];
    var filteredArcs = arcs.setRetainedInterval(filterZ).getFilteredCopy();
    arcs.setRetainedPct(1); // clear simplification
    return filteredArcs;
  }

  function getArcData() {
    // Use a filtered version of arcs at small scales
    var unitsPerPixel = 1/_ext.getTransform().mx,
        useFiltering = filteredArcs && unitsPerPixel > filteredSegLen * 1.5;
    return useFiltering ? filteredArcs : unfilteredArcs;
  }

  this.update = function(arcs) {
    unfilteredArcs = arcs;
    init();
  };

  this.setRetainedPct = function(pct) {
    if (_sortedThresholds) {
      var z = _sortedThresholds[Math.floor(pct * _sortedThresholds.length)];
      z = MapShaper.clampIntervalByPct(z, pct);
      this.setRetainedInterval(z);
    } else {
      unfilteredArcs.setRetainedPct(pct);
    }
  };

  this.setRetainedInterval = function(z) {
    unfilteredArcs.setRetainedInterval(z);
    if (filteredArcs) {
      filteredArcs.setRetainedInterval(z);
    }
  };

  this.setMapExtent = function(ext) {
    _ext = ext;
  };

  this.forEach = function(cb) {
    var src = getArcData(),
        arc = new Arc(src),
        minPathLen = 0.8 * _ext.getPixelSize(),
        wrapPath = getPathWrapper(_ext),
        geoBounds = _ext.getBounds(),
        geoBBox = geoBounds.toArray(),
        allIn = geoBounds.contains(src.getBounds());

    // don't drop more paths at less than full extent (i.e. zoomed far out)
    if (_ext.scale() < 1) minPathLen *= _ext.scale();

    for (var i=0, n=src.size(); i<n; i++) {
      arc.init(i);
      if (arc.smallerThan(minPathLen)) continue;
      if (!allIn && !arc.inBounds(geoBBox)) continue;
      cb(wrapPath(arc.getPathIter()));
    }
  };
}

function FilteredPointCollection(shapes) {
  var _ext;

  this.forEach = function(cb) {
    var iter = new PointIter();
    var wrapped = getPointWrapper(_ext)(iter);
    for (var i=0, n=shapes.length; i<n; i++) {
      iter.setPoints(shapes[i]);
      cb(wrapped);
    }
  };

  this.setMapExtent = function(ext) {
    _ext = ext;
  };
}

function getPathWrapper(ext) {
  return getDisplayWrapper(ext, "path");
}

function getPointWrapper(ext) {
  return getDisplayWrapper(ext, "point");
}

// @ext MapExtent
// @type 'point'|'path'
function getDisplayWrapper(ext, type) {
  // Wrap point iterator to convert geographic coordinates to pixels
  //   and skip over invisible clusters of points (i.e. smaller than a pixel)
  var transform = ext.getTransform(),
      bounds = ext.getBounds(),
      started = false,
      wrapped = null;

  var wrapper = {
    x: 0,
    y: 0,
    hasNext: function() {
      var t = transform, mx = t.mx, my = t.my, bx = t.bx, by = t.by;
      var minSegLen = 0.6; // min pixel size of a drawn segment
      var iter = wrapped,
          isFirst = !started,
          pointMode = type == 'point',
          x, y, prevX, prevY,
          i = 0;
      if (!isFirst) {
        prevX = this.x;
        prevY = this.y;
      }
      while (iter.hasNext()) {
        i++;
        x = iter.x * mx + bx;
        y = iter.y * my + by;
        if (pointMode) {
           if (bounds.containsPoint(iter.x, iter.y)) break;
        } else if (isFirst || Math.abs(x - prevX) > minSegLen || Math.abs(y - prevY) > minSegLen) {
          break;
        }
      }
      if (i === 0) return false;
      started = true;
      this.x = x;
      this.y = y;
      return true;
    }
  };
  return function(iter) {
    started = false;
    wrapped = iter;
    return wrapper;
  };
}

function PointIter() {
  var _i, _points;

  this.setPoints = function(arr) {
    _points = arr;
    _i = 0;
  };

  this.hasNext = function() {
    var n = _points ? _points.length : 0,
        p;
    if (_i < n) {
      p = _points[_i++];
      this.x = p[0];
      this.y = p[1];
      return true;
    }
    return false;
  };
}




// Interface for displaying the points and paths in a dataset
//
function LayerGroup(dataset) {
  var _surface = new CanvasLayer(),
      _filteredArcs = dataset.arcs ? new FilteredArcCollection(dataset.arcs) : null,
      _bounds = MapShaper.getDatasetBounds(dataset),
      _draw,
      _shapes,
      _style,
      _map;

  this.showLayer = function(lyr) {
    // TODO: make sure lyr is in dataset
    if (lyr.geometry_type == 'point') {
      _shapes = new FilteredPointCollection(lyr.shapes);
      _draw = MapShaper.drawPoints;
    } else {
      // TODO: show shapes, not arcs
      _shapes = _filteredArcs;
      _draw = MapShaper.drawPaths;
    }
    return this;
  };

  this.getBounds = function() {
    return _bounds;
  };

  this.getDataset = function() {
    return dataset;
  };

  this.setStyle = function(style) {
    _style = style;
    return this;
  };

  this.hide = function() {
    _surface.clear();
    _shapes = null;
  };

  this.setRetainedPct = function(pct) {
    _filteredArcs.setRetainedPct(pct);
    return this;
  };

  this.refresh = function() {
    if (_map && _shapes && _style) {
      var ext = _map.getExtent();
      _surface.prepare(ext.width(), ext.height());
      _shapes.setMapExtent(ext);
      _draw(_shapes, _style, _surface.getContext());
    }
  };

  this.remove = function() {
    if (_surface) {
      _surface.getElement().remove();
    }
  };

  this.setMap = function(map) {
    _map = map;
    _surface.getElement().appendTo(map.getElement());
  };
}




function HighlightBox(el) {
  var stroke = 2,
      box = El('div').addClass('zoom-box').appendTo(el).hide();
  this.show = function(x1, y1, x2, y2) {
    var w = Math.abs(x1 - x2),
        h = Math.abs(y1 - y2);
    box.show();
    box.css({
      top: Math.min(y1, y2),
      left: Math.min(x1, x2),
      width: w - stroke * 2,
      height: h - stroke * 2
    });
  };
  this.hide = function() {
    box.hide();
  };
}




function MapNav(ext, root) {
  var p = ext.position(),
      mouse = new MouseArea(p.element),
      wheel = new MouseWheel(mouse),
      zoomBox = new HighlightBox('body'),
      buttons = El('div').addClass('nav-buttons').appendTo(root),
      zoomTween = new Tween(Tween.sineInOut),
      shiftDrag = false,
      zoomScale = 2.5,
      dragStartEvt, _fx, _fy; // zoom foci, [0,1]

  navBtn("images/home.png").appendTo(buttons).on('click', function() {ext.reset();});
  navBtn("images/zoomin.png").appendTo(buttons).on('click', zoomIn);
  navBtn("images/zoomout.png").appendTo(buttons).on('click', zoomOut);

  zoomTween.on('change', function(e) {
    ext.rescale(e.value, _fx, _fy);
  });

  mouse.on('dblclick', function(e) {
    zoomByPct(zoomScale, e.x / ext.width(), e.y / ext.height());
  });

  mouse.on('dragstart', function(e) {
    shiftDrag = !!e.shiftKey;
    if (shiftDrag) {
      dragStartEvt = e;
    }
  });

  mouse.on('drag', function(e) {
    if (shiftDrag) {
      zoomBox.show(e.pageX, e.pageY, dragStartEvt.pageX, dragStartEvt.pageY);
    } else {
      ext.pan(e.dx, e.dy);
    }
  });

  mouse.on('dragend', function(e) {
    var bounds;
    if (shiftDrag) {
      shiftDrag = false;
      bounds = new Bounds(e.x, e.y, dragStartEvt.x, dragStartEvt.y);
      zoomBox.hide();
      if (bounds.width() > 5 && bounds.height() > 5) {
        zoomToBox(bounds);
      }
    }
  });

  wheel.on('mousewheel', function(e) {
    var k = 1 + (0.11 * e.multiplier),
        delta = e.direction > 0 ? k : 1 / k;
    ext.rescale(ext.scale() * delta, e.x / ext.width(), e.y / ext.height());
  });

  function zoomIn() {
    zoomByPct(zoomScale, 0.5, 0.5);
  }

  function zoomOut() {
    zoomByPct(1/zoomScale, 0.5, 0.5);
  }

  // @box Bounds with pixels from t,l corner of map area.
  function zoomToBox(box) {
    var pct = Math.max(box.width() / ext.width(), box.height() / ext.height()),
        fx = box.centerX() / ext.width() * (1 + pct) - pct / 2,
        fy = box.centerY() / ext.height() * (1 + pct) - pct / 2;
    zoomByPct(1 / pct, fx, fy);
  }

  // @pct Change in scale (2 = 2x zoom)
  // @fx, @fy zoom focus, [0, 1]
  function zoomByPct(pct, fx, fy) {
    _fx = fx;
    _fy = fy;
    zoomTween.start(ext.scale(), ext.scale() * pct, 400);
  }

  function navBtn(url) {
    return El('div').addClass('nav-btn')
      .on('dblclick', function(e) {e.stopPropagation();}) // block dblclick zoom
      .newChild('img')
      .attr('src', url).parent();
  }
}




function MapExtent(el, opts) {
  var _position = new ElementPosition(el),
      _padPix = opts.padding,
      _scale = 1,
      _cx,
      _cy,
      _contentBounds;

  _position.on('resize', function() {
    this.dispatchEvent('change');
    this.dispatchEvent('navigate');
    this.dispatchEvent('resize');
  }, this);

  this.reset = function() {
    this.recenter(_contentBounds.centerX(), _contentBounds.centerY(), 1);
  };

  this.recenter = function(cx, cy, scale) {
    if (!scale) scale = _scale;
    if (!(cx == _cx && cy == _cy && scale == _scale)) {
      _cx = cx;
      _cy = cy;
      _scale = scale;
      this.dispatchEvent('change');
      this.dispatchEvent('navigate');
    }
  };

  this.pan = function(xpix, ypix) {
    var t = this.getTransform();
    this.recenter(_cx - xpix / t.mx, _cy - ypix / t.my);
  };

  // Zoom to @scale (a multiple of the map's full scale)
  // @xpct, @ypct: optional focus, [0-1]...
  this.rescale = function(scale, xpct, ypct) {
    if (arguments.length < 3) {
      xpct = 0.5;
      ypct = 0.5;
    }
    var b = this.getBounds(),
        fx = b.xmin + xpct * b.width(),
        fy = b.ymax - ypct * b.height(),
        dx = b.centerX() - fx,
        dy = b.centerY() - fy,
        ds = _scale / scale,
        dx2 = dx * ds,
        dy2 = dy * ds,
        cx = fx + dx2,
        cy = fy + dy2;
    this.recenter(cx, cy, scale);
  };

  this.resize = _position.resize;
  this.width = _position.width;
  this.height = _position.height;
  this.position = _position.position;

  // get zoom factor (1 == full extent, 2 == 2x zoom, etc.)
  this.scale = function() {
    return _scale;
  };

  this.getPixelSize = function() {
    return 1 / this.getTransform().mx;
  };

  // Get params for converting geographic coords to pixel coords
  this.getTransform = function() {
    // get transform (y-flipped);
    var viewBounds = new Bounds(0, 0, _position.width(), _position.height());
    return this.getBounds().getTransform(viewBounds, true);
  };

  this.getBounds = function() {
    return centerAlign(calcBounds(_cx, _cy, _scale));
  };

  // Update the extent of 'full' zoom without navigating the current view
  this.setBounds = function(b) {
    var prev = _contentBounds;
    _contentBounds = b;
    if (prev) {
      _scale = _scale * centerAlign(b).width() / centerAlign(prev).width();
    } else {
      _cx = b.centerX();
      _cy = b.centerY();
    }
  };

  function calcBounds(cx, cy, scale) {
    var w = _contentBounds.width() / scale,
        h = _contentBounds.height() / scale;
    return new Bounds(cx - w/2, cy - h/2, cx + w/2, cy + h/2);
  }

  // Receive: Geographic bounds of content to be centered in the map
  // Return: Geographic bounds of map window centered on @_contentBounds,
  //    with padding applied
  function centerAlign(_contentBounds) {
    var bounds = _contentBounds.clone(),
        wpix = _position.width() - 2 * _padPix,
        hpix = _position.height() - 2 * _padPix,
        padGeo;
    if (wpix <= 0 || hpix <= 0) {
      return new Bounds(0, 0, 0, 0);
    }
    bounds.fillOut(wpix / hpix);
    padGeo = _padPix * bounds.width() / wpix; // per-pixel scale
    bounds.padBounds(padGeo, padGeo, padGeo, padGeo);
    return bounds;
  }
}

utils.inherit(MapExtent, EventDispatcher);




function MshpMap(el) {
  var _root = El(el),
      _ext = new MapExtent(_root, {padding: 12}),
      _nav = new MapNav(_ext, _root),
      _groups = [];

  _ext.on('change', refreshLayers);

  function refreshLayers() {
    _groups.forEach(function(lyr) {
      lyr.refresh();
    });
  }

  function getContentBounds() {
    return _groups.reduce(function(memo, lyr) {
      memo.mergeBounds(lyr.getBounds());
      return memo;
    }, new Bounds());
  }

  this.getExtent = function() {
    return _ext;
  };

  this.refresh = function() {
    refreshLayers();
  };

  this.addLayer = function(dataset) {
    var lyr = new LayerGroup(dataset);
    lyr.setMap(this);
    _groups.push(lyr);
    _ext.setBounds(getContentBounds());
    return lyr;
  };

  this.findLayer = function(dataset) {
    return utils.find(_groups, function(lyr) {
      return lyr.getDataset() == dataset;
    });
  };

  this.removeLayer = function(targetLyr) {
    _groups = _groups.reduce(function(memo, lyr) {
      if (lyr == targetLyr) {
        lyr.remove();
      } else {
        memo.push(lyr);
      }
      return memo;
    }, []);
  };

  this.getElement = function() {
    return _root;
  };
}

utils.inherit(MshpMap, EventDispatcher);




MapShaper.Heap = Heap; // export for testing

// A minheap data structure used for computing Visvalingam simplification data.
//
function Heap() {
  var capacity = 0,
      itemsInHeap = 0,
      dataArr,
      heapArr,
      indexArr;

  this.init = function(values) {
    var i;
    dataArr = values;
    itemsInHeap = values.length;
    prepareHeap(itemsInHeap);
    for (i=0; i<itemsInHeap; i++) {
      insert(i, i);
    }
    for (i=(itemsInHeap-2) >> 1; i >= 0; i--) {
      downHeap(i);
    }
  };

  function prepareHeap(size) {
    if (size > capacity) {
      capacity = Math.ceil(size * 1.2);
      heapArr = new Int32Array(capacity);
      indexArr = new Int32Array(capacity);
    }
  }

  this.size = function() {
    return itemsInHeap;
  };

  // Update a single value and re-heap.
  this.updateValue = function(valId, val) {
    var heapIdx = indexArr[valId];
    dataArr[valId] = val;
    if (heapIdx < 0 || heapIdx >= itemsInHeap) {
      error("[heap] Out-of-range heap index.");
    }
    downHeap(upHeap(heapIdx));
  };

  this.testHeapOrder = function() {
    checkNode(0, -Infinity);
    return true;
  };

  // Return the idx of the lowest-value item in the heap
  //
  this.pop = function() {
    if (itemsInHeap <= 0) error("Tried to pop from an empty heap.");
    var minValId = heapArr[0],
        lastIdx = --itemsInHeap;
    if (itemsInHeap > 0) {
      insert(0, heapArr[lastIdx]); // copy last item in heap into root position
      downHeap(0);
    }
    return minValId;
  };

  // Associate a heap idx with the id of a value in valuesArr
  //
  function insert(heapIdx, valId) {
    indexArr[valId] = heapIdx;
    heapArr[heapIdx] = valId;
  }

  // Check that heap is ordered starting at a given node
  // (traverses heap recursively)
  //
  function checkNode(heapIdx, parentVal) {
    if (heapIdx >= itemsInHeap) {
      return;
    }
    var val = dataArr[heapArr[heapIdx]];
    if (parentVal > val) error("Heap is out-of-order");
    var childIdx = heapIdx * 2 + 1;
    checkNode(childIdx, val);
    checkNode(childIdx + 1, val);
  }

  function upHeap(currIdx) {
    var valId = heapArr[currIdx],
        currVal = dataArr[valId],
        parentIdx, parentValId;

    // Move item up in the heap until it's at the top or is heavier than its parent
    //
    while (currIdx > 0) {
      parentIdx = (currIdx - 1) >> 1; // integer division by two gives idx of parent
      parentValId = heapArr[parentIdx];
      if (dataArr[parentValId] <= currVal) {
        break;
      }
      // out-of-order; swap child && parent
      insert(currIdx, parentValId);
      insert(parentIdx, valId);
      currIdx = parentIdx;
    }
    return currIdx;
  }

  // Swap item at @idx with any lighter children
  function downHeap(startIdx) {
    var data = dataArr, heap = heapArr, n = itemsInHeap, // local vars, faster
        currIdx = startIdx,
        valId = heap[currIdx],
        currVal = data[valId],
        firstChildIdx = 2 * currIdx + 1,
        secondChildIdx, minChildIdx, childValId;

    while (firstChildIdx < n) {
      minChildIdx = firstChildIdx;
      secondChildIdx = firstChildIdx + 1;
      if (secondChildIdx < n && data[heap[firstChildIdx]] > data[heap[secondChildIdx]]) {
        minChildIdx = secondChildIdx;
      }
      childValId = heap[minChildIdx];
      if (currVal <= data[childValId]) {
        break;
      }
      insert(currIdx, childValId);
      insert(minChildIdx, valId);

      // descend in the heap:
      currIdx = minChildIdx;
      firstChildIdx = 2 * currIdx + 1;
    }
  }
}




var Visvalingam = {};

Visvalingam.getArcCalculator = function(metric, is3D) {
  var heap = new Heap(),
      prevBuf = MapShaper.expandoBuffer(Int32Array),
      nextBuf = MapShaper.expandoBuffer(Int32Array),
      calc = is3D ?
        function(b, c, d, xx, yy, zz) {
          return metric(xx[b], yy[b], zz[b], xx[c], yy[c], zz[c], xx[d], yy[d], zz[d]);
        } :
        function(b, c, d, xx, yy) {
          return metric(xx[b], yy[b], xx[c], yy[c], xx[d], yy[d]);
        };

  // Calculate Visvalingam simplification data for an arc
  // @kk (Float64Array|Array) Receives calculated simplification thresholds
  // @xx, @yy, (@zz) Buffers containing vertex coordinates
  return function calcVisvalingam(kk, xx, yy, zz) {
    var arcLen = kk.length,
        prevArr = prevBuf(arcLen),
        nextArr = nextBuf(arcLen),
        val, maxVal = -Infinity,
        b, c, d; // indexes of points along arc

    if (zz && !is3D) {
      error("[visvalingam] Received z-axis data for 2D simplification");
    } else if (!zz && is3D) {
      error("[visvalingam] Missing z-axis data for 3D simplification");
    } else if (kk.length > xx.length) {
      error("[visvalingam] Incompatible data arrays:", kk.length, xx.length);
    }

    // Initialize Visvalingam "effective area" values and references to
    //   prev/next points for each point in arc.
    for (c=0; c<arcLen; c++) {
      b = c-1;
      d = c+1;
      if (b < 0 || d >= arcLen) {
        val = Infinity; // endpoint maxVals
      } else {
        val = calc(b, c, d, xx, yy, zz);
      }
      kk[c] = val;
      nextArr[c] = d;
      prevArr[c] = b;
    }
    heap.init(kk);

    // Calculate removal thresholds for each internal point in the arc
    //
    while (heap.size() > 0) {
      c = heap.pop(); // Remove the point with the least effective area.
      val = kk[c];
      if (val === Infinity) {
        break;
      }
      if (val >= maxVal === false) {
        error("[visvalingam] Values should increase, but:", maxVal, val);
      }
      maxVal = val;

      // Recompute effective area of neighbors of the removed point.
      b = prevArr[c];
      d = nextArr[c];
      if (b > 0) {
        val = calc(prevArr[b], b, d, xx, yy, zz);
        // don't give updated values a lesser value than the last popped vertex
        heap.updateValue(b, Math.max(maxVal, val));
      }
      if (d < arcLen-1) {
        val = calc(b, d, nextArr[d], xx, yy, zz);
        heap.updateValue(d, Math.max(maxVal, val));
      }
      nextArr[b] = d;
      prevArr[d] = b;
    }
  };
};

Visvalingam.standardMetric = triangleArea;
Visvalingam.standardMetric3D = triangleArea3D;

Visvalingam.weightedMetric = function(ax, ay, bx, by, cx, cy) {
  var area = triangleArea(ax, ay, bx, by, cx, cy),
      cos = cosine(ax, ay, bx, by, cx, cy);
  return Visvalingam.weight(cos) * area;
};

Visvalingam.weightedMetric3D = function(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var area = triangleArea3D(ax, ay, az, bx, by, bz, cx, cy, cz),
      cos = cosine3D(ax, ay, az, bx, by, bz, cx, cy, cz);
  return Visvalingam.weight(cos) * area;
};

// Weight triangle area by inverse cosine
// Standard weighting favors 90-deg angles; this curve peaks at 120 deg.
Visvalingam.weight = function(cos) {
  var k = 0.7;
  return -cos * k + 1;
};

Visvalingam.getPathSimplifier = function(name, use3D) {
  var metric = (use3D ? Visvalingam.metrics3D : Visvalingam.metrics2D)[name];
  if (!metric) {
    error("[visvalingam] Unknown metric:", name);
  }
  return Visvalingam.scaledSimplify(Visvalingam.getArcCalculator(metric, use3D));
};

Visvalingam.scaledSimplify = function(f) {
  return function(kk, xx, yy, zz) {
    f(kk, xx, yy, zz);
    for (var i=1, n=kk.length - 1; i<n; i++) {
      // convert area metric to a linear equivalent
      kk[i] = Math.sqrt(kk[i]) * 0.65;
    }
  };
};

Visvalingam.metrics2D = {
  visvalingam: Visvalingam.standardMetric,
  mapshaper: Visvalingam.weightedMetric
};

Visvalingam.metrics3D = {
  visvalingam: Visvalingam.standardMetric3D,
  mapshaper: Visvalingam.weightedMetric3D
};




var DouglasPeucker = {};

DouglasPeucker.metricSq3D = function(ax, ay, az, bx, by, bz, cx, cy, cz) {
  var ab2 = distanceSq3D(ax, ay, az, bx, by, bz),
      ac2 = distanceSq3D(ax, ay, az, cx, cy, cz),
      bc2 = distanceSq3D(bx, by, bz, cx, cy, cz);
  return pointSegDistSq(ab2, bc2, ac2);
};

DouglasPeucker.metricSq = function(ax, ay, bx, by, cx, cy) {
  var ab2 = distanceSq(ax, ay, bx, by),
      ac2 = distanceSq(ax, ay, cx, cy),
      bc2 = distanceSq(bx, by, cx, cy);
  return pointSegDistSq(ab2, bc2, ac2);
};

// @dest array to contain point removal thresholds
// @xx, @yy arrays of x, y coords of a path
// @zz (optional) array of z coords for spherical simplification
//
DouglasPeucker.calcArcData = function(dest, xx, yy, zz) {
  var len = dest.length,
      useZ = !!zz;

  dest[0] = dest[len-1] = Infinity;
  if (len > 2) {
    procSegment(0, len-1, 1, Number.MAX_VALUE);
  }

  function procSegment(startIdx, endIdx, depth, distSqPrev) {
    // get endpoint coords
    var ax = xx[startIdx],
        ay = yy[startIdx],
        cx = xx[endIdx],
        cy = yy[endIdx],
        az, cz;
    if (useZ) {
      az = zz[startIdx];
      cz = zz[endIdx];
    }

    var maxDistSq = 0,
        maxIdx = 0,
        distSqLeft = 0,
        distSqRight = 0,
        distSq;

    for (var i=startIdx+1; i<endIdx; i++) {
      if (useZ) {
        distSq = DouglasPeucker.metricSq3D(ax, ay, az, xx[i], yy[i], zz[i], cx, cy, cz);
      } else {
        distSq = DouglasPeucker.metricSq(ax, ay, xx[i], yy[i], cx, cy);
      }

      if (distSq >= maxDistSq) {
        maxDistSq = distSq;
        maxIdx = i;
      }
    }

    // Case -- threshold of parent segment is less than threshold of curr segment
    // Curr max point is assigned parent's threshold, so parent is not removed
    // before child as simplification is increased.
    //
    if (distSqPrev < maxDistSq) {
      maxDistSq = distSqPrev;
    }

    if (maxIdx - startIdx > 1) {
      distSqLeft = procSegment(startIdx, maxIdx, depth+1, maxDistSq);
    }
    if (endIdx - maxIdx > 1) {
      distSqRight = procSegment(maxIdx, endIdx, depth+1, maxDistSq);
    }

    // Case -- max point of curr segment is highest-threshold point of an island polygon
    // Give point the same threshold as the next-highest point, to prevent
    // a 3-vertex degenerate ring.
    if (depth == 1 && ax == cx && ay == cy) {
      maxDistSq = Math.max(distSqLeft, distSqRight);
    }

    dest[maxIdx] =  Math.sqrt(maxDistSq);
    return maxDistSq;
  }
};




api.simplify = function(arcs, opts) {
  if (!arcs) stop("[simplify] Missing path data");
  T.start();
  MapShaper.simplifyPaths(arcs, opts);

  if (utils.isNumber(opts.pct)) {
    arcs.setRetainedPct(opts.pct);
  } else if (utils.isNumber(opts.interval)) {
    arcs.setRetainedInterval(opts.interval);
  } else {
    stop("[simplify] missing pct or interval parameter");
  }
  T.stop("Calculate simplification");

  if (!opts.no_repair) {
    var info = api.findAndRepairIntersections(arcs);
    cli.printRepairMessage(info);
  }
};

// Calculate simplification thresholds for each vertex of an arc collection
// (modifies @arcs ArcCollection in-place)
MapShaper.simplifyPaths = function(arcs, opts) {
  var use3D = !opts.cartesian && !arcs.isPlanar();
  var simplifyPath = MapShaper.getSimplifyFunction(opts.method || 'mapshaper', use3D);
  arcs.setThresholds(new Float64Array(arcs.getPointCount())); // Create array to hold simplification data
  if (use3D) {
    MapShaper.simplifyPaths3D(arcs, simplifyPath);
    MapShaper.protectWorldEdges(arcs);
  } else {
    MapShaper.simplifyPaths2D(arcs, simplifyPath);
  }
};

MapShaper.simplifyPaths2D = function(arcs, simplify) {
  arcs.forEach3(function(xx, yy, kk, i) {
    simplify(kk, xx, yy);
  });
};

MapShaper.simplifyPaths3D = function(arcs, simplify) {
  var xbuf = MapShaper.expandoBuffer(Float64Array),
      ybuf = MapShaper.expandoBuffer(Float64Array),
      zbuf = MapShaper.expandoBuffer(Float64Array);
  arcs.forEach3(function(xx, yy, kk, i) {
    var n = xx.length,
        xx2 = xbuf(n),
        yy2 = ybuf(n),
        zz2 = zbuf(n);
    geom.convLngLatToSph(xx, yy, xx2, yy2, zz2);
    simplify(kk, xx2, yy2, zz2);
  });
};

MapShaper.getSimplifyFunction = function(method, use3D) {
  if (method == 'dp') {
    return DouglasPeucker.calcArcData;
  } else { // assuming Visvalingam simplification
    return Visvalingam.getPathSimplifier(method, use3D);
  }
};

// Protect polar coordinates and coordinates at the prime meridian from
// being removed before other points in a path.
// Assume: coordinates are in decimal degrees
//
MapShaper.protectWorldEdges = function(arcs) {
  // Need to handle coords with rounding errors:
  // -179.99999999999994 in test/test_data/ne/ne_110m_admin_0_scale_rank.shp
  // 180.00000000000003 in ne/ne_50m_admin_0_countries.shp
  var bb1 = MapShaper.getWorldBounds(1e-12),
      bb2 = arcs.getBounds().toArray();
  if (containsBounds(bb1, bb2) === true) return; // return if content doesn't reach edges
  arcs.forEach3(function(xx, yy, zz) {
    var maxZ = 0,
    x, y;
    for (var i=0, n=zz.length; i<n; i++) {
      x = xx[i];
      y = yy[i];
      if (x > bb1[2] || x < bb1[0] || y < bb1[1] || y > bb1[3]) {
        if (maxZ === 0) {
          maxZ = MapShaper.findMaxThreshold(zz);
        }
        if (zz[i] !== Infinity) { // don't override lock value
          zz[i] = maxZ;
        }
      }
    }
  });
};

// Return largest value in an array, ignoring Infinity (lock value)
//
MapShaper.findMaxThreshold = function(zz) {
  var z, maxZ = 0;
  for (var i=0, n=zz.length; i<n; i++) {
    z = zz[i];
    if (z > maxZ && z < Infinity) {
      maxZ = z;
    }
  }
  return maxZ;
};




api.keepEveryPolygon =
MapShaper.keepEveryPolygon = function(arcData, layers) {
  T.start();
  layers.forEach(function(lyr) {
    if (lyr.geometry_type == 'polygon') {
      MapShaper.protectLayerShapes(arcData, lyr.shapes);
    }
  });
  T.stop("Protect shapes");
};

MapShaper.protectLayerShapes = function(arcData, shapes) {
  shapes.forEach(function(shape) {
    MapShaper.protectShape(arcData, shape);
  });
};

// Protect a single shape from complete removal by simplification
// @arcData an ArcCollection
// @shape an array containing one or more arrays of arc ids, or null if null shape
//
MapShaper.protectShape = function(arcData, shape) {
  var maxArea = 0,
      arcCount = shape ? shape.length : 0,
      maxRing, area;
  // Find ring with largest bounding box
  for (var i=0; i<arcCount; i++) {
    area = arcData.getSimpleShapeBounds(shape[i]).area();
    if (area > maxArea) {
      maxRing = shape[i];
      maxArea = area;
    }
  }

  if (!maxRing || maxRing.length === 0) {
    // invald shape
    verbose("[protectShape()] Invalid shape:", shape);
  } else if (maxRing.length == 1) {
    MapShaper.protectIslandRing(arcData, maxRing);
  } else {
    MapShaper.protectMultiRing(arcData, maxRing);
  }
};

// Add two vertices to the ring to form a triangle.
// Assuming that this will inflate the ring.
// Consider using the function for multi-arc rings, which
//   calculates ring area...
MapShaper.protectIslandRing = function(arcData, ring) {
  var added = MapShaper.lockMaxThreshold(arcData, ring);
  if (added == 1) {
    added += MapShaper.lockMaxThreshold(arcData, ring);
  }
  if (added < 2) verbose("[protectIslandRing()] Failed on ring:", ring);
};

MapShaper.protectMultiRing = function(arcData, ring) {
  var zlim = arcData.getRetainedInterval(),
      minArea = 0, // 0.00000001, // Need to handle rounding error?
      area, added;
  arcData.setRetainedInterval(Infinity);
  area = geom.getPlanarPathArea(ring, arcData);
  while (area <= minArea) {
    added = MapShaper.lockMaxThreshold(arcData, ring);
    if (added === 0) {
      verbose("[protectMultiRing()] Failed on ring:", ring);
      break;
    }
    area = geom.getPlanarPathArea(ring, arcData);
  }
  arcData.setRetainedInterval(zlim);
};

// Protect the vertex or vertices with the largest non-infinite
// removal threshold in a ring.
//
MapShaper.lockMaxThreshold = function(arcData, ring) {
  var targZ = 0,
      targArcId,
      raw = arcData.getVertexData(),
      arcId, id, z,
      start, end;

  for (var i=0; i<ring.length; i++) {
    arcId = ring[i];
    if (arcId < 0) arcId = ~arcId;
    start = raw.ii[arcId];
    end = start + raw.nn[arcId] - 1;
    id = MapShaper.findNextRemovableVertex(raw.zz, Infinity, start, end);
    if (id == -1) continue;
    z = raw.zz[id];
    if (z > targZ) {
      targZ = z;
      targArcId = arcId;
    }
  }
  if (targZ > 0) {
    // There may be more than one vertex with the target Z value; lock them all.
    start = raw.ii[targArcId];
    end = start + raw.nn[targArcId] - 1;
    return MapShaper.replaceInArray(raw.zz, targZ, Infinity, start, end);
  }
  return 0;
};

MapShaper.replaceInArray = function(zz, value, replacement, start, end) {
  var count = 0;
  for (var i=start; i<=end; i++) {
    if (zz[i] === value) {
      zz[i] = replacement;
      count++;
    }
  }
  return count;
};




if (Env.inBrowser) {
  Browser.onload(function() {
    if (!gui.browserIsSupported()) {
      El("#mshp-not-supported").show();
      return;
    }
    var editor = new Editor(),
        importer = new ImportControl(editor);
    El('#mshp-import').show(); // show import screen
  });
}

function Editor() {
  var datasets = [];
  var foregroundStyle = {
        strokeColor: "#335",
        dotColor: "#223",
        squareDot: true
      };
  var bgStyle = {
        strokeColor: "#aaa",
        dotColor: "#aaa",
        squareDot: true
      };
  var map, exporter, slider, repair;

  this.editDataset = function(dataset, opts) {
    datasets.push(dataset);
    if (datasets.length > 2) {
      map.findLayer(datasets.shift()).remove();
    }
    if (datasets.length > 1) {
      map.findLayer(datasets[0]).setStyle(bgStyle);
    } else {
      startEditing();
    }

    editDataset(dataset, opts);
  };

  function startEditing() {
    map = new MshpMap("#mshp-main-map");
    exporter = new ExportControl();
    repair = new RepairControl(map);
    slider = new SimplifyControl();
    El("#mshp-main-page").show();
  }

  function editDataset(dataset, opts) {
    var group = map.addLayer(dataset);
    group.showLayer(dataset.layers[0]).setStyle(foregroundStyle);
    exporter.setDataset(dataset);

    // hide widgets if visible and remove any old event handlers
    slider.reset();
    repair.reset();
    map.refresh(); // redraw all map layers

    if (opts.method && dataset.arcs) {
      slider.show();
      slider.value(dataset.arcs.getRetainedPct());
      slider.on('change', function(e) {
        group.setRetainedPct(e.value).refresh();
      });
      if (!opts.no_repair) {
        repair.setDataset(dataset);
        // use timeout so map appears before the repair control calculates
        // intersection data, which can take a little while
        setTimeout(initRepair, 10);
      }
    }

    function initRepair() {
      repair.show();
      repair.update();
      slider.on('simplify-start', function() {
        repair.clear();
      });
      slider.on('simplify-end', function() {
        repair.update();
      });
      repair.on('repair', function() {
        group.refresh();
      });
    }
  }
}

}());
