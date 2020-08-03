import opt from "~root/config.mjs"
import xx from "~lib/tools.cjs"
import log from "~lib/log.cjs"
import {Semaphore} from "async-mutex"
import HttpsProxyAgent from "https-proxy-agent"

/**
 * Etherscan.io multi account connector. Singleton
 */
class EtherscanAccount
{
   constructor()
   {
      this.accs = opt.etherscanAccs.map(v => Object.assign({}, v, {
         lastHitTS: null,
         lastQueryTS: null,
         lastReleaseTS: null,
         releaseFunc: null,
         v: null,
         __opts: (() =>
         {
            let res = {}
            if (v.viaHost.toLowerCase() !== 'localhost')
            {
               res.httpsAgent = new HttpsProxyAgent(`http://${v.viaUser && v.viaPassword ? `${v.viaUser}:${v.viaPassword}@` : ""}${v.viaHost}:${v.viaPort}`)
            }
            return res
         })()
      }))
      this.accFreeCount = this.accs.length
      this.accFreeSemph = new Semaphore(this.accs.length)
   }


   getFreeAcc()
   {
      for (let i = 0; i < this.accs.length; i++)
      {
         if (this.accs[i].v === null)
         {
            return this.accs[i]
         }
      }

      return false

   }

   async takeAcc()
   {
      //log(`wanna take acc, accCount=${this.accFreeCount}`)
      const [value, releaseFunc] = await this.accFreeSemph.acquire()
      let acc = this.getFreeAcc()
      if (!acc)
      {
         throw new Error(`[EtherscanAcc.takeAcc]: no free account`)

      }
      this.accFreeCount--
      acc.v = value
      acc.releaseFunc = releaseFunc
      const ts = xx.tsNow()

      if ((ts - acc.lastQueryTS) < opt.etherscanRestDelayTS)
      {
         throw new Error(`[EtherscanAcc.takeAcc]: account '${acc.viaHost}' still not rested, delta=${ts - acc.lastQueryTS}`, acc)
      }
      acc.lastHitTS = ts

      //log(`took acc(${acc.viaHost}), accCount=${this.accFreeCount} :: v = ${acc.v} :: after ${ts - acc.lastQueryTS} ms`)

      return acc

   }

   /**
    *
    * @param {Account} acc
    * @returns {Promise<void>}
    */
   async releaseAcc(acc)
   {
      acc.lastQueryTS = xx.tsNow()
      //log(`going to rest ${acc.viaHost}`).flog()
      await xx.timeoutAsync(opt.etherscanRestDelayTS + 300)
      acc.v = null
      acc.releaseFunc()
      acc.releaseFunc = null
      this.accFreeCount++
      acc.lastReleaseTS = xx.tsNow()
      //log(`released acc(${acc.viaHost}), accCount=${this.accFreeCount}`)
   }

   getFreeAccCount()
   {
      return this.accFreeCount
   }


}

export default new EtherscanAccount()