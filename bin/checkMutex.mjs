import log from "../lib/log.cjs"
import tools from "../lib/tools.cjs"
import opt from "../config.mjs"
import EtherscanAPI from "../backend/src/EtherscanAPI.mjs"
import acc from "../backend/src/EtherscanAcc.mjs"

;(async () =>
{
   try
   {
      for (let i = 0; i < 10; i++)
      {

         acc.testWork()
         await tools.timeoutAsync(1000)
      }

      log(`finish loop...`)
      await tools.timeoutAsync(20000)

      process.exit(0)
   } catch (e)
   {
      log.e(e)
   }
})()
