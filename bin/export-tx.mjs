import log from "jsm_log"
import opt from "../config.mjs"
import ExportEtherTxs from "../backend/src/export-ether-txs.mjs"
import path from "path"
import URL from "url"
import cmd from "commander"
import fs from "fs"


void async function () {
   const logDir = path.resolve(URL.fileURLToPath(import.meta.url) + '../../../log')
   log.setFileName(logDir + '/export-tx.log')
   log.logRotate(opt.flogMaxLines)

   cmd
      .option(`-i, --input <file>`, 'text input file. One ETH address in line')
      .option(`-o, --output <directory>`, `directory for result files`)
      .option(`-d, --debug`, `debug mode ON. Extended console log output`)
      .parse(process.argv)

   if (cmd.output || cmd.input) {
      if (!cmd.input) {
         log.e(`Input file is not defined. See program option: -h`)
         process.exit(-1)
      }
      log(`Input file: ${cmd.input}`)
      await fs.mkdirSync(cmd.output, {recursive: true})
      if (!fs.existsSync(cmd.output)) {
         log.e(`Cannot create output directory "${cmd.output}"`)
         process.exit(-3)
      }
      log(`Output directory: ${cmd.output}`)

      const exportEtherTxs = new ExportEtherTxs(`${cmd.output}/db.json`)

      if (cmd.debug) exportEtherTxs.setDebug(true)

      const res = await exportEtherTxs.getTXsFromFile(cmd.input)
      if (res.err) {
         log.e(res.err.message)
         process.exit(-3)
      }

      log.i(`${res.txCount} txs with ${res.transfersCount} transfers for ${res.ethAddrCount} accounts`)

      await exportEtherTxs.writeTransfersCSV(`${cmd.output}/transfers.csv`)
      await exportEtherTxs.writeComputisDataFile(`${cmd.output}/computis.json`)
   }
   else {
      log.e(`Nothing to do. See program option: -h`)
   }

   process.exit(0)

}().catch(e => {
   log.t(e).flog()
   process.exit(-3)
})


