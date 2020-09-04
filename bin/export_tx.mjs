import log from "../lib/log.cjs"
import tools from "../lib/tools.cjs"
import opt from "../config.mjs"
import exportEtherTxs from "../backend/src/ExportEtherTxs.mjs"

import path from "path"
import URL from "url"
import cmd from "commander"


;(async () =>
{
   const logDir = path.resolve(URL.fileURLToPath(import.meta.url) + '../../../log')
   log.setFileName(logDir + '/exportcsv.log')
   log.logRotate(opt.flogMaxLines)

   cmd
      .option(`-i, --input <file>`, 'text input file. One ETH address in line')
      .option(`-o, --output <file>`, `csv output file file.`, 'output.csv')
      .parse(process.argv)

   if (cmd.output || cmd.input)
   {
      if(!cmd.input)
      {
         log.e(`Input file is not defined. See program option: -h`)
         process.exit(-1)
      }
      log(`Input file: ${cmd.input}`)
      log(`Output file: ${cmd.output}`)
      const res = await exportEtherTxs.loadTXsToCSV({
         inputFile: cmd.input,
         outputFile: cmd.output
      })

      if (res.err)
      {
         log.e(res.err.message)
      }
      else
      {
         log.i(`${res.txCount} txs for ${res.ethAddrCount} accounts OK`)
         process.exit(0)
      }
   }  else {
      log.e(`Nothing to do. See program option: -h`)
   }

})().catch(e =>
{
   log.t(e).flog()
})


