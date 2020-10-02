import log from "jsm_log"
import opt from "../config.mjs"
import exportEtherTxs from "../backend/src/ExportEtherTxs.mjs"

import path from "path"
import URL from "url"
import cmd from "commander"


   ;

(async () =>
{
   const logDir = path.resolve(URL.fileURLToPath(import.meta.url) + '../../../log')
   log.setFileName(logDir + '/export_tx.log')
   log.logRotate(opt.flogMaxLines)

   cmd
      .option(`-i, --input <file>`, 'text input file. One ETH address in line')
      .option(`-o, --output <file>`, `csv/json output file. Json will be in Computis API format`, 'output.csv')
      .option(`-d, --debug`, `debug mode ON`)
      .parse(process.argv)

   if(cmd.debug) exportEtherTxs.setDebug(true)
   if (cmd.output || cmd.input)
   {
      if (!cmd.input)
      {
         log.e(`Input file is not defined. See program option: -h`)
         process.exit(-1)
      }
      log(`Input file: ${cmd.input}`)
      let outputType = null
      if (/\.csv$/.test(cmd.output))
      {
         outputType = "csv"
      }
      else if (/\.json$/.test(cmd.output))
      {
         outputType = "computis"
      }
      if (!outputType)
      {
         log.e(`Output file format not recognized. It must be .csv or .json`)
         process.exit(-2)
      }
      log(`Output file: ${cmd.output}`)
      const res = await exportEtherTxs.getTXsFromFile({
         inputFile: cmd.input,
      })
      log.i(`${res.txCount} txs for ${res.ethAddrCount} accounts`)

      if (res.err)
      {
         log.e(res.err.message)
         process.exit(-3)
      }
      else
      {
         if (outputType === "csv")
         {
            await exportEtherTxs.writeCSV({
               outputFile: cmd.output,
               memdb: res.memdb
            })
            log(`File "${cmd.output}" saved`)
         }
         else if(outputType === "computis")
         {
            await exportEtherTxs.writeComputisDataFile({
               outputFile: cmd.output,
               memdb: res.memdb
            })
            log(`File "${cmd.output}" saved for Computis format`)
         }
      }
   }
   else
   {
      log.e(`Nothing to do. See program option: -h`)
   }

   process.exit(0)

})().catch(e =>
{
   log.t(e).flog()
})


