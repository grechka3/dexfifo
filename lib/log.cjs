const moment = require('moment')
const chalk = require("chalk")
const fs = require("fs")
const path = require("path")
const EventEmitter = require("events").EventEmitter
const evt = new EventEmitter()
const tail = require("read-last-lines")

let globalName = '', logFilePath = '', lastCallStr = ''

function setGlobalName(name)
{
   globalName = name
}

function setFilePath(filePath)
{
   logFilePath = filePath
   const dirName = path.dirname(logFilePath)
   if (!fs.existsSync(dirName))
   {
      fs.mkdirSync(dirName)
   }
   return log
}

function getFilePath()
{
   return logFilePath
}


const getFileLinesCount = (fpath) =>
{
   return new Promise((resolve, reject) =>
   {
      let i
      let count = 0
      fs.createReadStream(fpath)
         .on('data', chunk =>
         {
            for (i = 0; i < chunk.length; ++i)
            {
               if (chunk[i] === 10)
               {
                  count++
               }
            }
         })
         .on('end', () =>
         {
            return resolve(count)
         })
         .on('error', (e) =>
         {
            return reject(e)
         })
   })
}


const logRotateTask = (interval, maxLines) =>
{
   setInterval(() =>
   {
      logRotate(maxLines)
   }, interval)

   return log
}

const logRotate = async (maxLines) =>
{
   try
   {
      if (!fs.existsSync(getFilePath()))
      {
         return log
      }
      const lines0 = await getFileLinesCount(getFilePath())
      if (lines0 > maxLines)
      {
         const lines = await tail.read(getFilePath(), maxLines)
         fs.writeFileSync(log.getFilePath(), lines, {
            encoding: 'utf8',
            flag: "w"
         })
      }
   } catch (e)
   {
      trace(e)
   }
}


function _prefix()
{
   return moment().format("DD-MM-YYYY HH:mm:ss") + (globalName ? ` [${globalName}]` : '') + ':'
}

function setLastCall(...data)
{
   let a = [], i = 0
   data.forEach(v =>
   {
      if (!i++)
      {
         a.push(`(${v})`)
         return
      }
      if(v instanceof Error)
      {
         a.push(v.stack)

      }
      else if (typeof v === 'object')
      {
         a.push(JSON.stringify(v, 3))
      }
      else if (typeof v === 'function')
      {
         a.push(v)
         //a.push(JSON.stringify(v))
      }
      else
      {
         a.push(v)
      }
   })
   lastCallStr = a.join(' ')
}

function flog()
{
   if (lastCallStr)
   {
      fs.writeFileSync(logFilePath, lastCallStr + "\n", {encoding: 'utf8', flag: "a"})
      evt.emit("log.flog", lastCallStr)
   }
}

function log()
{
   let args = Array.prototype.slice.call(arguments)
   args.unshift(_prefix())
   console.info.apply(console, args)
   setLastCall('I', ...args)
   return log
}

function warn()
{
   let args = Array.prototype.slice.call(arguments)
   let pref = _prefix()
   args.unshift(chalk.magenta(pref))
   console.info.apply(console, args)
   args.shift()
   args.unshift(pref)
   setLastCall('W', ...args)
   return log
}

function error()
{
   let args = Array.prototype.slice.call(arguments)
   let pref = _prefix()
   args.unshift(chalk.red(pref))
   console.info.apply(console, args)
   args.shift()
   args.unshift(pref)
   setLastCall('E', ...args)
   return log
}

function info()
{
   let args = Array.prototype.slice.call(arguments)
   let pref = _prefix()
   args.unshift(chalk.green(pref))
   console.info.apply(console, args)
   args.shift()
   args.unshift(pref)
   setLastCall('I', ...args)
   return log
}

function trace()
{
   let args = Array.prototype.slice.call(arguments)
   let pref = _prefix()
   args.unshift(pref)
   console.trace.apply(console, args)
   args.shift()
   args.unshift(pref)
   setLastCall('T', ...args)
   return log
}

function debug()
{
   let args = Array.prototype.slice.call(arguments)
   let pref = _prefix()
   args.unshift(chalk.cyan(pref))
   console.info.apply(console, args)
   args.shift()
   args.unshift(pref)
   setLastCall('D', ...args)
   return log
}

module.exports = log
module.exports.i = log
module.exports.e = error
module.exports.w = warn
module.exports.d = debug
module.exports.t = trace
module.exports.error = error
module.exports.warn = warn
module.exports.debug = debug
module.exports.info = info
module.exports.setGlobalName = setGlobalName
module.exports.setFileName = setFilePath
module.exports.c = chalk
module.exports.flog = flog
module.exports.evt = evt
module.exports.getFilePath = getFilePath
module.exports.logRotate = logRotate
module.exports.logRotateTask = logRotateTask