//Prototypes for Strings
String.prototype.trim = function()
	{ return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, "")) }
String.prototype.startsWith = function(str) 
	{ return (this.match("^"+str)==str) }
String.prototype.endsWith = function(str) 
	{ return (this.match(str+"$")==str) }
String.prototype.replaceAll = function(str, str2)
	{ return (this.replace(new RegExp(str, 'g'), str2)) }
String.prototype.pad = function(length) {
	var str = '' + this;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}
Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};
   

//Constants
var E          = Math.E;
var LN2        = Math.LN2;
var LN10       = Math.LN10;
var LOG2E      = Math.LOG2E;
var LOG10E     = Math.LOG10E;
var PI         = Math.PI;
var TWO_PI	   = 2 * Math.PI;
var THIRD_PI   = Math.PI / 3;
var QUARTER_PI = Math.PI / 4;
var HALF_PI    = Math.PI / 2;
var SQRT1_2    = Math.SQRT1_2;
var SQRT2      = Math.SQRT2;

//Math functions
function abs(x) 		{	return Math.abs(x);		}
function acos(x) 		{	return Math.acos(x);	}
function asin(x) 		{	return Math.asin(x);	}
function atan(x) 		{	return Math.atan(x);	}
function atan2(x,y) 	{	return Math.atan2(x,y);	}
function ceil(x) 		{	return Math.ceil(x);	}
function cos(x) 		{	return Math.cos(x);		}
function exp(x) 		{	return Math.exp(x);		}
function floor(x) 		{	return Math.floor(x);	}
function log(x) 		{	return Math.log(x);		}
function min(x,y) 		{	return Math.min(x,y);	}
function max(x,y) 		{	return Math.max(x,y);	}
function pow(x,y) 		{	return Math.pow(x,y);	}
function sin(x) 		{	return Math.sin(x);		}
function sqrt(x) 		{	return Math.sqrt(x);	}
function sq(x)			{	return x*x;				}
function tan(x) 		{	return Math.tan(x);		}
function degrees(value) {	return value * 180. / pi;  }
function radians(value) {	return value * pi / 180.;  }
function round(x, y) 	{
	if(y == undefined)	return Math.round(x);
	else 				return Math.round(x*Math.pow(10, y)) / Math.pow(10, y);
}
function random(low, high) {
	if((low == undefined) || (high == undefined))
		return Math.random();
	else
		return range(Math.random(), low, high);
}

//Useful functions
function constrain(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function dist(x1, y1, z1, x2, y2, z2) {
	var dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
	return Math.sqrt(sq(dx) + sq(dy) + sq(dz));
}
function angle(x1, y1, x2, y2) {
	var dx = x2 - x1, dy = y2 - y1, angle = 0;
	if((dx > 0) && (dy >= 0))
	    angle = (Math.atan(dy / dx)) * 180.0 / PI;
	else if((dx <= 0) && (dy > 0))
	    angle = (-Math.atan(dx / dy) + HALF_PI) * 180.0 / PI;
	else if((dx < 0) && (dy <= 0))
	    angle = (Math.atan(dy / dx) + PI) * 180.0 / PI;
	else if((dx >= 0) && (dy < 0))
	    angle = (-Math.atan(dx / dy) + 3 * HALF_PI) * 180.0 / PI;
	return angle;
}
function norm(value, low, high) {
	if((high - low) == 0)
		return low;
	else
		return (value - low) / (high - low);
}
function range(value, low, high) {
	return value * (high - low) + low; 
}
function rangeMid(value, low, mid, high) {
	if(value < 0.5)
		return (value * 2) * (mid - low) + low;
	else
		return (value - .5) * 2 * (high - mid) + mid;
}
function map(value, low1, high1, low2, high2) {
	return range(norm(value, low1, high1), low2, high2);
}


function getRangeExp(slider) {
	var facteur = parseFloat(slider.attr("exp"));
	var seuil   = parseFloat(slider.attr("seuil"));
	var val     = parseFloat(slider.val());

	if((!isNaN(facteur)) && (facteur != 0)) {
		if(val > seuil)
			val = ((val - seuil) / (100000-seuil)) * 9 + 1;
		else if(val < -seuil)
			val = ((val + seuil) / (100000-seuil)) * 9 - 1;
		else {
			var sign = Math.sign(val);
			val = abs(val) / seuil;
			val = (exp(facteur * val - facteur) - exp(-facteur)) / (1 - exp(-facteur));
			val = sign * val;
		}
	}
	else
		val /= seuil;
	return val;
}
function setRangeExp(slider, val) {
	var rawVal = val;
	var facteur = parseFloat(slider.attr("exp"));
	var seuil   = parseFloat(slider.attr("seuil"));
	
	if((!isNaN(facteur)) && (facteur != 0)) {
		if(val > 1)
			val = (val - 1) / 9 * (100000-seuil) + seuil;
		else if(val < -1)
			val = (val + 1) / 9 * (100000-seuil) - seuil;
		else {
			var sign = Math.sign(val);
			val = abs(val);
			val = (log((val * (1 - exp(-facteur))) + exp(-facteur)) + facteur) / facteur;
			val = sign * val * seuil;
		}
	}
	else
		val *= seuil;

	slider.val(val);
	slider.trigger("input");
}




var findFirstPositiveZeroCrossingMinVal = 140;  // 128 == zero
function findFirstPositiveZeroCrossing(buf, buflen) {
	var i = 0;
	var last_zero = -1;
	var t;

	// advance until we're zero or negative
	while (i<buflen && (buf[i] > 128 ) )
		i++;

	if (i>=buflen)
		return 0;

	// advance until we're above MINVAL, keeping track of last zero.
	while (i<buflen && ((t=buf[i]) < findFirstPositiveZeroCrossingMinVal)) {
		if (t >= 128) {
			if (last_zero == -1)
				last_zero = i;
		} else
		last_zero = -1;
		i++;
	}

	// we may have jumped over MINVAL in one sample.
	if (last_zero == -1)
		last_zero = i;

	if (i==buflen)  // We didn't find any positive zero crossings
		return 0;

	// The first sample might be a zero.  If so, return it.
	if (last_zero == 0)
		return 0;

	return last_zero;
}


function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable)
			return pair[1];
	} 
}