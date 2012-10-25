/**
 * Application router, based on Routie
 * Modified by daniel =)
 */

/**
 * The most inportant function =)
 */ 
function pathToRegexp(path, keys, sensitive, strict) {
  if (path instanceof RegExp) return path;
  if (path instanceof Array) path = '(' + path.join('|') + ')';
  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/\+/g, '__plus__')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
      keys.push({ name: key, optional: !! optional });
      slash = slash || '';
      return ''
        + (optional ? '' : slash)
        + '(?:'
        + (optional ? slash : '')
        + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
        + (optional || '');
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/__plus__/g, '(.+)')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');
};

// Check the route
function checkRoute(hash, route) {
  var params = [];
  if (route.match(hash, params)) {
    route.run(params);
    return true;
  }
  return false;
}

function getHash(){
  return window.location.hash.substring(1);
}

/**
 * The Route class
 */
var Route = function(path, name) {
  this.name = name;
  this.path = path;
  this.keys = [];
  this.fns = [];
  this.regex = pathToRegexp(this.path, this.keys, false, false);
};

Route.prototype.addHandler = function(fn, fire) {
  this.fns.push(fn);

  //check against current hash
  if (fire){
    checkRoute(getHash(), this);
  }
};

Route.prototype.removeHandler = function(fn) {
  for (var i = 0, c = this.fns.length; i < c; i++) {
    var f = this.fns[i];
    if (fn == f) {
      this.fns.splice(i, 1);
      return;
    }
  }
};

Route.prototype.run = function(params) {
  for (var i = 0, c = this.fns.length; i < c; i++) {
    this.fns[i].apply(this, params);
  }
};

Route.prototype.match = function(path, params){
  var m = this.regex.exec(path);

  if (!m) return false;

  
  for (var i = 1, len = m.length; i < len; ++i) {
    var key = this.keys[i - 1];

    var val = ('string' == typeof m[i]) ? decodeURIComponent(m[i]) : m[i];

    //if (key) {
      //params[key.name] = (undefined !== params[key.name]) ? params[key.name] : val;
    //} else {
    params.push(val);
    //}
  }

  return true;
};

Route.prototype.toURL = function(params) {
  var path = this.path;
  for (var param in params) {
    path = path.replace('/:'+param, '/'+params[param]);
  }
  path = path.replace(/\/:.*\?/, '/');
  if (path.indexOf(':') != -1) {
    throw new Error('missing parameters for url: '+path);
  }
  return path;
};

/**
 * The router class
 */ 
function Router(path, fn) {
  var self = this;
  this.initialized = false;
  
  // Initialize
  this.removeAll();

  function hashChanged() {
    self.onHashChange();
  }

  // Add listeners
  if (window.addEventListener) {
    window.addEventListener('hashchange', hashChanged);
  } else {
    window.attachEvent('onhashchange', hashChanged);
  }
  
  // Posibility to remove listeners
  this.destroy = function(){
    if (window.removeEventListener) {
      window.removeEventListener('hashchange', hashChanged);
    } else {
      window.detatchEvent('onhashchange', hashChanged);
    }
  }
  
  // Init routes
  if (path){
    this.add(path, fn);
  }
}

/**
 * On hash change
 */
Router.prototype.onHashChange = function(){
  if  (!this.initialized) return;
  
  var hash = getHash();
  var routes = this.routes;
  
  for (var i = 0, c = routes.length; i < c; i++) {
    var route = routes[i];
    if (checkRoute(hash, route))
      return;
  }
}

/**
 * Start the router
 */
Router.prototype.enable = function(){
  this.initialized = true;
  this.onHashChange();
}

/**
 * Stop the router
 */
Router.prototype.disable = function(){
  this.initialized = false;
}

Router.prototype.getHash = getHash;

Router.prototype.add = function(path, fn){
  if (typeof fn == 'function') {
    this.addHandler(path, fn);
    
  } else if (typeof path == 'object') {
    for (var p in path) {
      this.addHandler(p, path[p]);
    }
    
  } else if (typeof fn === 'undefined') {
    window.location.hash = path;
  }
}

Router.prototype.addHandler = function(path, fn) {
  var s = path.split(' ');
  var name = (s.length == 2) ? s[0] : null;
  path = (s.length == 2) ? s[1] : s[0];

  if (!this.map[path]) {
    this.map[path] = new Route(path, name, this.initialized);
    this.routes.push(this.map[path]);
  }
  this.map[path].addHandler(fn, this.initialized);
}

Router.prototype.lookup = function(name, obj) {
  var routes = this.routes;
  for (var i = 0, c = routes.length; i < c; i++) {
    var route = routes[i];
    if (route.name == name) {
      return route.toURL(obj);
    }
  }
}

Router.prototype.remove = function(path, fn) {
  var route = this.map[path];
  if (!route)
    return;
  route.removeHandler(fn);
}

Router.prototype.removeAll = function() {
  this.map = {};
  this.routes = [];
}  