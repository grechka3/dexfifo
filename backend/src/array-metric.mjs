import xx from "jsm_xx"
import {interval as loopAsync} from "jsm_loopasync"


/**
 * Store metrics
 */

class ArrayMetric
{

   /**
    *
    * @param {number} duration         Lifetime (in millis) of array element
    * @param {number} updateInterval   Update array duration in millis
    */
   constructor({duration, updateInterval = 1000})
   {
      // array of pairs [timestamp,value]
      this.vals = []

      this.duration = duration
      this._loopUpdate = loopAsync(async () => {
         this._update()
      }, updateInterval)
   }

   push(v)
   {
      this.vals.push([xx.tsNow(), v])
      return this
   }

   count()
   {
      //this._update()
      return this.vals.length
   }

   getVals()
   {
      this._update()
      return this.vals.map(v => v[1])
   }

   stop()
   {
      this._loopUpdate.pause()
   }

   truncate()
   {
      this.vals = []
   }

   _update()
   {
      this._loopUpdate.pause()
      this.vals.forEach((v, k) => {
         if (xx.tsNow() - v[0] >= this.duration) {
            this.vals.splice(k, 1)
         }
      })
      this._loopUpdate.resume()
   }
}

export default ArrayMetric
