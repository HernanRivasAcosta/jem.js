// Define the namespace
if (typeof Inaka == 'undefined') Inaka = {};
if (typeof Inaka.Jem == 'undefined') Inaka.Jem = {};

// The code
(function()
 {
   _encoder = new TextEncoder();
   _decoder = new TextDecoder();

   // API
   this.encode = function(obj, mtu = 1500)
                 {
                   var dv = new DataView(new ArrayBuffer(mtu));
                   dv.setUint8(0, 131);
                   var [dv, i] = _encodeValue(obj, dv, 1);
                   return dv.buffer.slice(0, i);
                 };
   this.decode = function(buffer)
                 {
                   var dv = new DataView(buffer);
                   if (dv.getUint8(0) != 131)
                     throw "badarg";
                   else
                     return _decodeValue(dv, 1)[0];
                 };

   // Internal functions
   function _encodeValue(value, dv, i)
   {
     if(value === null)
     {
       return _encodeNull(dv, i);
     }
     else
     {
       switch(value.constructor.name)
       {
         case "Object":  return _encodeObject(value, dv, i);
         case "Number":  return _encodeNumber(value, dv, i);
         case "Array":   return _encodeArray(value, dv, i);
         case "String":  return _encodeString(value, dv, i);
         case "Boolean": return _encodeBoolean(value, dv, i);
       }
     }
   }

   function _decodeValue(dv, i)
   {
     switch(dv.getUint8(i))
     {
       case 70:
         return [dv.getFloat64(i + 1), i + 9];
       case 97:
         return [dv.getUint8(i + 1), i + 2];
       case 98:
         return [dv.getInt32(i + 1), i + 5];
       case 100:
         return _decodeAtom(dv, i + 1);
       case 104:
         return _decodeTuple(dv, i + 1);
       case 105:
         return _decodeLargeTuple(dv, i + 1);
       case 106:
         return [[], i + 1];
       case 107:
         return _decodeShortString(dv, i + 1);
       case 108:
         return _decodeArray(dv, i + 1);
       case 109:
         return _decodeString(dv, i + 1);
       case 116:
         return _decodeObject(dv, i + 1);
       default:
         throw "bad_tag: " + dv.getUint8(i);
     }
   }

   function _encodeNull(dv, i)
   {
     dv = _getDataView(dv, i, 7);
     dv.setUint8(i, 100);
     dv.setUint16(i + 1, 4);
     dv.setUint32(i + 3, 1853189228);
     return [dv, i + 7];
   }

   function _encodeObject(obj, dv, i)
   {
     dv = _getDataView(dv, i, 5);
     dv.setUint8(i, 116);
     i += 1;
     var keys = Object.keys(obj);
     var l = keys.length
     dv.setUint32(i, l);
     i += 4;
     for(var k = 0; k < l; k++)
     {
       var key = keys[k];
       var [dv, i] = _encodeString(key, dv, i);
       var [dv, i] = _encodeValue(obj[key], dv, i);
     }
     return [dv, i];
   }

   function _decodeObject(dv, i)
   {
     var l = dv.getUint32(i);
     i += 4;
     var obj = {};
     for(var k = 0; k < l; k++)
     {
       var [key, i] = _decodeValue(dv, i);
       var [value, i] = _decodeValue(dv, i);
       obj[key] = value;
     }
     return [obj, i];
   }

   function _encodeNumber(num, dv, i)
   {
     // Check if we have a float or not
     if (num != Math.floor(num))
     {
       dv = _getDataView(dv, i, 9);
       dv.setUint8(i, 70);
       dv.setFloat64(i + 1, num);
       return [dv, i + 9];
     }
     else
     {
       if (num >= 0 && num < 255)
       {
         dv = _getDataView(dv, i, 2);
         dv.setUint8(i, 97);
         dv.setUint8(i + 1, num);
         return [dv, i + 2];
       }
       else
       {
         dv = _getDataView(dv, i, 5);
         dv.setUint8(i, 98);
         dv.setInt32(i + 1, num);
         return [dv, i + 5];
       }
     }
   }

   function _encodeArray(arr, dv, i)
   {
     dv = _getDataView(dv, i, 5);
     dv.setUint8(i, 108);
     i += 1;
     var l = arr.length;
     dv.setUint32(i, l);
     i += 4;
     for(var k = 0; k < l; k++)
     {
       var [dv, i] = _encodeValue(arr[k], dv, i);
     }
     dv = _getDataView(dv, i, 1);
     dv.setUint8(i, 106);
     return [dv, i + 1];
   }

   function _decodeTuple(dv, i)
   {
     var l = dv.getUint8(i);
     i += 1;
     var arr = [];
     for(var k = 0; k < l; k++)
     {
       var [value, i] = _decodeValue(dv, i);
       arr[k] = value;
     }
     return [arr, i];
   }

   function _decodeLargeTuple(dv, i)
   {
     var l = dv.getUint32(i);
     i += 4;
     var arr = [];
     for(var k = 0; k < l; k++)
     {
       var [value, i] = _decodeValue(dv, i);
       arr[k] = value;
     }
     return [arr, i];
   }

   function _decodeArray(dv, i)
   {
     var l = dv.getUint32(i);
     i += 4;
     var arr = [];
     for(var k = 0; k < l; k++)
     {
       var [value, i] = _decodeValue(dv, i);
       arr[k] = value;
     }
     return [arr, i + 1];
   }

   function _encodeString(str, dv, i)
   {
     let b = _encoder.encode(str);
     var l = b.length;
     dv = _getDataView(dv, i, l + 5);
     dv.setUint8(i, 109);
     i += 1;
     dv.setUint32(i, l);
     i += 4;
     for(var k = 0; k < l; k++)
     {
       dv.setUint8(i + k, b.at(k));
     }
     return [dv, i + k];
   }

   function _decodeAtom(dv, i)
   {
     var [str, i] = _decodeShortString(dv, i);
     var value;
     switch (str)
     {
       case "null":  value = null;  break;
       case "true":  value = true;  break;
       case "false": value = false; break;
       default: value = str;
     }
     return [value, i];
   }

   function _decodeShortString(dv, i)
   {
     var l = dv.getUint16(i);
     return _decodeStringOfSize(dv, i + 2, l);
   }

   function _decodeString(dv, i)
   {
     var l = dv.getUint32(i);
     return _decodeStringOfSize(dv, i + 4, l);
   }

   function _decodeStringOfSize(dv, i, l)
   {
     return [_decoder.decode(new DataView(dv.buffer, i, l)), i + l];
   }

   function _encodeBoolean(bool, dv, i)
   {
     dv = _getDataView(dv, i, 8);
     dv.setUint8(i, 100);
     if (bool)
     {
       dv.setUint16(i + 1, 4);
       dv.setUint32(i + 3, 1953658213);
       return [dv, i + 7];
     }
     else
     {
       dv.setUint16(i + 1, 5);
       dv.setUint8(i + 3, 102);
       dv.setUint32(i + 4, 1634497381);
       return [dv, i + 8];
     }
   }

   // Utils
   function _getDataView(dv, i, l)
   {
     if (dv.byteLength < i + l)
     {
       return new DataView(_expandBuffer(dv.buffer, i + l));
     }
     else
     {
       return dv;
     }
   }

   function _expandBuffer(buffer, minLength)
   {
     var tempArr = new Uint8Array(Math.max(minLength, buffer.length * 2));
     tempArr.set(buffer, 0);
     return tempArr.buffer;
   }
 }).call(Inaka.Jem);
