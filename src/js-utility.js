// Find in array method
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.map) {
    Array.prototype.map = function (transformation) {
        if (this === null) {
            throw new TypeError('Array.prototype.map called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('transformation must be a function');
        }
        
        var result = [];
        var list = Object(this);
        var length = list.length >>> 0;
        for (var i = 0; i < length; i ++){
            var value = transformation(list[i]);
            result.push(value);
        }
        return result;
    };
}

if (!Array.prototype.removeElement) {
   Array.prototype.removeElement = function (element) {
      if (this === null) {
         throw new TypeError('Array.prototype.map called on null or undefined');
      }
      if (element === null){
         throw new TypeError('Element must not be null');
      }
      var list = Object(this);
      var index = list.indexOf(element);
      if (index > -1){
         list.splice(index, 1);
      }
      return list;
   };
}

if (!String.prototype.capitalizeWord){
   String.prototype.capitalizeWord = function () {
      if (this === null) {
         throw new TypeError('String.prototype.capitalizeWord called on null or undefined');
      }
      var word = String(this);
      return word.charAt(0).toUpperCase() + word.substring(1);
   }
}