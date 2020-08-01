/* const {log, xx} = require("../lib/tools") */


const
   moment = require("moment")

moment.locale('ru')

module.exports.moment = moment
module.exports.xx = this

exports.isJsonString = function (str)
{
   try
   {
      JSON.parse(str)
   } catch (e)
   {
      return false
   }
   return true
}

exports.esc = function (str)
{
   return (str + '')
      .replace(/[\\"']/g, '\\$&')
      .replace(/\u0000/g, '\\0')
}

exports.unesc = function (str)
{
   return (str + '')
      .replace(/\\(.?)/g, function (s, n1)
      {
         switch (n1)
         {
            case '\\':
               return '\\'
            case '0':
               return '\u0000'
            case '':
               return ''
            default:
               return n1
         }
      })
}

// метка времени в миллисекундах
exports.tsNow = function ()
{
   //moment()*1
   //Date.now()
   return moment().valueOf()
}

// метка времени в секундах
exports.tssNow = function ()
{
   // moment().unix()
   // moment().format('X') * 1
   return moment().unix()
}

// метку времени в 0000-00-00 00:00:00
exports.ts2dt = function (ts)
{
   return moment(ts, 'x').format("YYYY-MM-DD HH:mm:ss")
}

exports.tss2dt = function (ts)
{
   return moment(ts, 'X').format("YYYY-MM-DD HH:mm:ss")
}

// строку 0000-00-00 00:00:00 в 00-00-0000 00:00:00
exports.humanDateTime = function (dt, delimeter)
{
   if (typeof delimeter === 'undefined')
   {
      delimeter = '-'
   }
   return moment(dt, `YYYY${delimeter}MM${delimeter}DD HH:mm:ss`).format("DD-MM-YYYY HH:mm:ss")
}

exports.base64decode = function ($str)
{

   return Buffer.from($str, 'base64').toString('utf8')
}

exports.base64encode = function ($obj)
{
   return Buffer.from($obj).toString('base64')
}

exports.isArray = function (v)
{
   return typeof (v) === 'object' && typeof (v.length) === 'number'
}
exports.isObject = function (v)
{
   return v && typeof v === "object"
}
exports.isFunction = function (v)
{
   return toString.apply(v) === '[object Function]'
}
exports.isNumber = function (v)
{
   return typeof v === 'number' // && $$.isFinite(v)
}
exports.isString = function (v)
{
   return typeof v === 'string'
}
exports.isBoolean = function (v)
{
   return typeof v === 'boolean'
}
exports.isDefined = function (v)
{
   return typeof v !== 'undefined'
}
exports.isEmpty = function (v, allowBlank)
{
   return v === null || v === undefined || ((typeof (v) === 'object' && typeof (v.length) === 'number' && !v.length)) || (!allowBlank ? v === '' : false)
}
exports.isPrimitive = function (v)
{
   return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

exports.twoDigits = function (d)
{
   if (0 <= d && d < 10)
   {
      return "0" + d.toString()
   }
   if (-10 < d && d < 0)
   {
      return "-0" + (-1 * d).toString()
   }
   return d.toString()
}

exports.dateTimeToMysqlFormat = function (date)
{
   return date.getUTCFullYear() + "-" + exports.twoDigits(1 + date.getUTCMonth()) + "-" + exports.twoDigits(date.getUTCDate()) + " " + exports.exports.twoDigits(date.getUTCHours()) + ":" + exports.twoDigits(date.getUTCMinutes()) + ":" + exports.twoDigits(date.getUTCSeconds())
}

exports.len = function (obj)
{
   return typeof (obj) === 'object' ? Object.keys(obj).length : obj.length
}

exports.timeoutAsync = (ms) => new Promise(res => setTimeout(res, ms))

exports.min = arr => Math.min.apply(null, arr)
exports.max = arr => Math.max.apply(null, arr)
exports.avg = arr => arr.reduce((acc, v) => acc + v) / arr.length

/*
  For ClickHouse HEX/UNHEX conversion
  @param str string|Buffer
 */
exports.toHexCodeString = str => str instanceof Buffer ? str.toString('hex') : Buffer.from(str, 'utf8').toString('hex')

exports.haveNoneAscii = str => str.match(/[^\x00-\x7F]/)

const randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min

exports.random = randomInt

const chars = "abcdefgijklmnopqrstuvwxyz0123456789ABCDEFGIJKLMNOPQRSTUVWXYZ".split("")

exports.randomChar = () => chars[randomInt(0, chars.length - 1)]

exports.randomString = (charsNum) => "".padEnd(charsNum - 1, " ").split(" ").map(() => chars[randomInt(0, chars.length - 1)]).join("")

exports.prettyJSON = o => JSON.stringify(o, null, 4)

exports.getFormData = $form =>
{
   var unindexed_array = $form.serializeArray();
   var indexed_array = {};

   $.map(unindexed_array, function (n, i)
   {
      indexed_array[n['name']] = n['value'];
   });

   return indexed_array;
}