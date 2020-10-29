import log from "jsm_log"
import ExportEtherTxs from "../backend/src/export-ether-txs.mjs"


void async function () {

   let res, exporttx


   // для адреса Влада
   if (0) {
      exporttx = new ExportEtherTxs("../data/vlad/db.json")
      res = await exporttx.memdb.read()
      exporttx.loadConfFromFile("../data/vlad.conf")
      res = await exporttx.pgWriteComputedTxs(/*userId*/)
      if (res.err) {
         throw res.err
      }
   }

   // для клиента
   if (1) {
      exporttx = new ExportEtherTxs("../data/exported/db.json")
      res = await exporttx.memdb.read()
      exporttx.loadConfFromFile("../data/input.conf")
      res = await exporttx.pgWriteComputedTxs(4)
      if (res.err) {
         throw res.err
      }
   }

   process.exit(0)

}().catch(e => {
   log.t(e)
   process.exit(-111)
})


