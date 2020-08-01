import opt from "../../config.mjs"
import log from "../../lib/log.cjs"
import tools from "../../lib/tools.cjs"
import {Semaphore} from "async-mutex"

class EtherscanAcc
{
   constructor()
   {
      this.accs = opt.etherscanAccs.map(v => Object.assign({}, v, {
         lastHitTS: null,
         lastQueryTS: null,
         lastReleaseTS: null,
         releaseFunc: null,
         v: null
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
      try
      {
         log(`wanna take acc, accCount=${this.accFreeCount}`)
         const [value, releaseFunc] = await this.accFreeSemph.acquire()
         let acc = this.getFreeAcc()
         if (!acc)
         {
            throw new Error(`[EtherscanAcc.takeAcc]: no free account`)

         }
         this.accFreeCount--
         acc.v = value
         acc.releaseFunc = releaseFunc
         const ts = tools.tsNow()
         log(`took acc(${acc.viaHost}), accCount=${this.accFreeCount} after ${ts - acc.lastQueryTS} ms`)

         if ((ts - acc.lastQueryTS) < opt.etherscanRestDelayTS)
         {
            throw new Error(`[EtherscanAcc.takeAcc]: account still not rested`, acc)
         }
         acc.lastHitTS = ts

         return acc

      } catch (e)
      {
         throw e
      }
   }

   async releaseAcc(acc)
   {
      try
      {
         acc.lastQueryTS = tools.tsNow()
         await tools.timeoutAsync(opt.etherscanRestDelayTS)
         acc.releaseFunc()
         ;[acc.v, acc.releaseFunc] = [null, null]

         this.accFreeCount++
         acc.lastReleaseTS = tools.tsNow()
         log(`released acc(${acc.viaHost}), accCount=${this.accFreeCount}`)

      } catch (e)
      {
         throw e
      }
   }


   async testWork()
   {
      try
      {
         const acc = await this.takeAcc()
         const runtt = tools.random(300, 2000)
         log(`running ${runtt} ms...`)
         await tools.timeoutAsync(runtt)
         log('run out')
         this.releaseAcc(acc)

         return 'ok'
      } catch (e)
      {
         throw e
      }
   }


}

export default new EtherscanAcc()