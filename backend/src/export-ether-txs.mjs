import log from "jsm_log"
import xx from "jsm_xx"
import csv from "csv-writer"
import fs from "fs"
import opt from "../../config.mjs";
import etherscanAPI from "./etherscan-api.mjs"
import etherscanParser from "./etherscan-parser.mjs"
import lowdb from "lowdb"
import LowDbMemory from "lowdb/adapters/Memory.js"
import LowDbFileAdapter from "lowdb/adapters/FileSync.js"
import path from "path"

/**
 * Export Ether transactions using Etherscan.io API
 */


/**
 *
 * @typedef TxTranserTypes {{trade: string, fee: string, deposit: string, withdrawl: string}}
 */
const txTranserTypes = {
   FEE: "Fee",
   TRADE: "Trade",
   DEPOSIT: "Deposit",
   WITHDRAWAL: "Withdrawl"
}


/**
 * @typedef AssetTransformEntry {
 *    @property {string} txHash
 *    @property {TxTranserTypes} txType
 *    @property {string} debitAsset
 *    @property {number} debitAmmount
 *    @property {string} creditAsset
 *    @property {number} creditAmount
 *    @property {number} txFeeAmount
 *    @property {string} memo
 *    @property {string} txFeeAccount
 *    @property {string} debitAccount
 *    @property {string} creditAccount
 * }
 *
 */

class ExportEtherTxs
{

   constructor(dbFile)
   {
      this.memdb = lowdb(new LowDbFileAdapter(dbFile))
      this.defaults = {
         clientId: "",
      }
   }

   setDebug(debugOn)
   {
      etherscanParser.setDebug(debugOn)
      etherscanAPI.setDebug(debugOn)
   }

   dumpMemDB(outputFile)
   {
      const fparts = path.parse(outputFile)
      if (this.memdb.get("txs").size().value()) fs.writeFileSync(`${fparts.dir}/${fparts.name}.txs${fparts.ext}`, xx.prettyJSON(this.memdb.get("txs").sortBy("timeStamp").value()))
      if (this.memdb.get("trans").size().value()) fs.writeFileSync(`${fparts.dir}/${fparts.name}.trans${fparts.ext}`, xx.prettyJSON(this.memdb.get("trans").value()))
   }

   async writeComputisDataFile(outputFile)
   {
      let json = []
      const txs = this.memdb.get("txs").sortBy("timeStamp").value()
      txs.forEach(txd => {
         txd.transfers.forEach(tr => {
            json.push(Object.assign({}, {
               datetime: xx.moment(txd.timeStamp, "X").utcOffset(opt.utcOffsetMinutes).format("YYYY-MM-DDTHH:mm:ss") + 'Z',
               clientId: this.defaults.clientId,
               "debitAccount": "",
               "debitAsset": "",
               "debitAmount": "",
               "creditAccount": "",
               "creditAsset": "",
               "creditAmount": "",
               "txFeeAccount": "",
               "txFeeAsset": "",
               "txFeeAmount": "",
               "payee": "",
               "memo": "",
               "filledPrice": "",
               "txType": "",
               "histFMV": "",
               "basis": ""
            }, tr))
         })
      })
      fs.writeFileSync(outputFile, xx.prettyJSON(json))

      return {
         err: null,
         linesCount: this.memdb.get("trans").size().value() * 1
      }
   }

   /**
    * @param {String} outputFile     - output transactions in CSV format
    * @return {Error|null} err
    */
   async writeTransfersCSV(outputFile)
   {
      const csvWriter = csv.createObjectCsvWriter({
         path: outputFile,
         header: [
            {id: "txHash", title: "txHash"},
            {id: "txType", title: "txType"},
            {id: "debitAsset", title: "debitAsset"},
            {id: "debitAmount", title: "debitAmount"},
            {id: "creditAsset", title: "creditAsset"},
            {id: "creditAmount", title: "creditAmount"},
            {id: "txFeeAmount", title: "txFeeAmount"},
            {id: "memo", title: "Memo"},
            {id: "debitAccount", title: "debitAccount"},
            {id: "creditAccount", title: "creditAccount"},
            {id: "txFeeAccount", title: "txFeeAccount"},
            {id: "timestamp", title: "timestamp"},
            {id: "dateTime", title: "dateTime"},
         ],
         fieldDelimiter: ";"
      })
      let lines = []
      const txs = this.memdb.get("txs").sortBy("timeStamp").value()
      txs.forEach(async (txd) => {
         txd.transfers.forEach(async (tr) => {
            Object.assign(tr, {
               dateTimeUTC: xx.moment(txd.timeStamp, "X").utcOffset(opt.utcOffsetMinutes).format("YYYY-MM-DDTHH:mm:ss") + 'Z',
               timestamp: txd.timeStamp
            })
            lines.push(tr)

         })
      })
      await csvWriter.writeRecords(lines)

      return {
         err: null,
         linesCount: this.memdb.get("trans").size().value() * 1
      }
   }

   /**
    * Read eth addresses from input file and export transactions to CSV file
    * Works with etherscan API in parallels. Number of parralels requests is equal to number of ehterscan.io accounts.
    *
    * @param {String} inputFile
    * @return {Object} result
    * @return {Error|null} result.err
    * @return {Number} [result.ethAddrCount]          - total addresses proceeded
    * @return {Number} [result.txCount]               - total transactions for all eth addrs
    * @return {Number} [result.transfersCount]        - total transfers for all eth addrs
    */
   async getTXsFromFile(inputFile)
   {
      let res
      res = this.loadConfFromFile(inputFile)
      if (res.err) return {err: res.err}
      const addrs = res.addrs
      res = await this.retriveTxs(addrs)

      return {
         err: res.err,
         ethAddrCount: addrs.length,
         txCount: res.txCount,
         transfersCount: res.transfersCount
      }
   }

   /**
    *
    * @param {string} inputFile
    * @return {{err: Error, addrs: []}}
    */
   loadConfFromFile(inputFile)
   {
      if (!fs.existsSync(inputFile)) {
         return {
            err: new Error(`Source file "${inputFile}" not found`)
         }
      }

      let conf = fs.readFileSync(inputFile)
         .toString()
         .replace(/[\r]/g, "")
         .split(/[\n]/)
         .map(v => v.trim())

      let addrs = []
      conf.forEach(v => {
         let res
         res = v.match(/etheraddr[\s]*=[\s]*(0x[0-9a-z]+)/i)
         if (res !== null) addrs.push(res[1])
         res = v.match(/clientid[\s]*=[\s]*([0-9]+)/i)
         if (res !== null) this.defaults.clientId = res[1]
      })
      if (!addrs.length) return {err: new Error(`Ether addresses not found in "${inputFile}"`)}
      if (!this.defaults.clientId) log.w(`clientId not found in "${inputFile}"`)

      return {
         res: null,
         addrs
      }
   }


   /**
    *
    * @param {[]} ethAddrList
    * @return {Object} result
    * @return {Error|null} result.err
    * @return {Number} result.txCount               - total transactions for all eth addrs
    */
   async retriveTxs(ethAddrList = [])
   {

      this.memdb.set("txs", []).write()
      this.memdb.set("trans", []).write()
      const memdb_txs = this.memdb.get("txs")
      const memdb_trans = this.memdb.get("trans")


      log(`Start data collection in ${opt.etherscanAccs.length} threads...`)

      let totalTxs = 0, totalTransfers = 0

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++) {
         const ownAddress = ethAddrList[addr_i]

         // wait semaphore unblocking
         let acc = await etherscanAPI.takeAcc()
         // Start parallel task for each ethaddr
         void async function (acc) {
            // get all TXs for current ethaddr
            let qres = await etherscanAPI.getTxListByAddr({
               acc,
               ethaddr: ownAddress,
               sort: "desc"
            })
            etherscanAPI.releaseAcc(acc)
            if (!qres.response.error && xx.isArray(qres.data.result)) {
               for (let txline = 0; txline < qres.data.result.length; txline++) {
                  const v = qres.data.result[txline]

                  // wait semaphore unblocking
                  let acc = await etherscanParser.takeAcc()
                  // Start parallel task for each tx
                  void async function (acc) {

                     const txd = await etherscanParser.getDataFromTxPage(v.hash, {proxy: acc.v.proxy})
                     etherscanParser.releaseAcc(acc)

                     let txv = {
                        txHash: v.hash,
                        blockNumber: v.blockNumber,
                        timeStamp: v.timeStamp * 1,
                        dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                        ownAddr: ownAddress,
                        internal: true,
                        contractAddressApi: v.contractAddress,
                        gas: v.gas * 1,
                        gasPrice: xx.toFixed(v.gasPrice / 1e9),
                        gasUsed: v.gasUsed * 1,
                        nonce: v.nonce * 1,
                        isError: !!(v.isError * 1),
                        txFee: txd.txFee,
                        fromAddr: txd.from,
                        toAddr: txd.to,
                        fromName: txd.fromName,
                        toName: txd.toName,
                        etherValue: txd.etherValue,
                        etherPriceUsd: txd.etherUsdPrice,
                        tokenTrans: false,
                     }
                     if (txv.txFee !== txd.txFee) {
                        log.w(`[getTXsFromFile]: api_tx_fee != html_tx_fee :: tx=${v.hash}`)
                     }

                     Object.assign(txv, txd)
                     if (txd.tokens.length) txv.tokenTrans = true
                     const transfs = this.getTxTransforms(txv)
                     txv.transfers = transfs
                     memdb_trans.push(...transfs).write()
                     memdb_txs.push(txv).write()
                     totalTxs++
                     totalTransfers += transfs.length

                  }.call(this, acc)


               }
               if (qres.data.result.length >= 9998) {
                  log.w(`The ETH address "${ownAddress}" has more than 10000 txs`).flog()
               }
               log(`${ownAddress} done via ${qres.acc.viaHost}: total txs=${qres.data.result.length}`)

            }
            else {
               log.e(`[EtherscanAPI.loadTXsToCSV]: API ERROR for ETH address "${ownAddress}" (line ${addr_i + 1}) ::  code=${qres.response.errorCode}, message=${qres.response.errorMessage}, APIstatus=${qres.data.status ? qres.data.status : "---"}, APImessage=${qres.data.message ? qres.data.message : "---"}, APIResult=${qres.data.result ? qres.data.result : "---"} via ${qres.acc.viaHost}`).flog();
               process.exit(-2)
            }

         }.call(this, acc).catch(e => {
            log.t(e).flog()
            process.exit(-1)
         })
      }

      // Wait while all account queries will be done
      for (; etherscanAPI.someTaskInProgress() || etherscanParser.someTaskInProgress();) {
         await xx.timeoutAsync(50)
      }

      log(`Data collection done`)

      return {
         err: null,
         txCount: totalTxs,
         transfersCount: totalTransfers,
      }
   }

   /**
    *
    * @param {EtherTxRow} txrow  for one txHash
    * @return {Array<AssetTransformEntry>}
    */
   getTxTransforms(txrow)
   {
      let entry = {
         txHash: txrow.txHash,
         txType: -1,
         debitAsset: -1,
         debitAmount: -1,
         creditAsset: -1,
         creditAmount: -1,
         txFeeAmount: txrow.txFee,
         memo: -1,
         debitAccount: "",
         creditAccount: "",
         txFeeAccount: ""
      }
      let res = []

      // fail tx
      if (txrow.isError) {
         // have fee
         if (txrow.txFee) {
            res.push(Object.assign(entry, {
               txType: txTranserTypes.FEE,
               debitAsset: "",
               creditAsset: "ETH",
               debitAmount: 0,
               creditAmount: 0,
               memo: "Loss on fail transaction"
            }))
         }
      }
      // without tokens
      else if (!txrow.tokenTrans) {
         // zero value => "approved for trade, etc" && have fee
         if (!txrow.etherValue && txrow.txFee) {
            res.push(Object.assign(entry, {
               txType: txTranserTypes.FEE,
               debitAsset: "",
               creditAsset: "ETH",
               debitAmount: "",
               creditAmount: "",
               memo: txrow.memo.length ? txrow.memo.join(", ") : ""
            }))
         }
         // deposit/withdrawal
         else if (txrow.etherValue) {
            entry.memo = txrow.memo.length ? txrow.memo.join(", ") : ""
            if (txrow.ownAddr === txrow.fromAddr) {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.WITHDRAWAL,
                  debitAsset: "",
                  creditAsset: "ETH",
                  debitAmount: "",
                  creditAmount: txrow.etherValue,
                  memo: txrow.memo.length ? txrow.memo.join(", ") : ""
               }))
            }
            else {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.DEPOSIT,
                  debitAsset: "ETH",
                  creditAsset: "",
                  debitAmount: txrow.etherValue,
                  creditAmount: "",
                  memo: txrow.memo.length ? txrow.memo.join(", ") : ""
               }))
            }
         }
      }
      // With token transfers
      else {
         // have events block
         if (txrow.events.length) {
            txrow.events.forEach(v => {
               if (v.type === "swap") {
                  res.push(Object.assign(entry, {
                     txType: txTranserTypes.TRADE,
                     debitAsset: v.fromName === "Ether" ? "ETH" : v.fromName,
                     creditAsset: v.toName === "Ether" ? "ETH" : v.toName,
                     debitAmount: v.fromValue,
                     creditAmount: v.toValue,
                     memo: `Swap ${v.fromValue} ${v.fromName} for ${v.toValue} ${v.toName} on ${v.on}`
                  }))
               }
               else {
                  log.e(`[ExportEtherTxs.getTxTransforms]: unknown Event.Type "${v.type}"  for tx="${txrow.txHash}"`)
               }
            })
         }
         // haven't events block => look at tokens block
         else {
            let op = false
            txrow.tokens.forEach(v => {
               //own address in from.addr  => withdrawl
               if (v.from.addr === txrow.ownAddr) {
                  //none-zero value
                  if (v.for.value) {
                     op = true
                     res.push(Object.assign(entry, {
                        txType: txTranserTypes.WITHDRAWAL,
                        debitAsset: "",
                        creditAsset: v.for.symbol,
                        debitAmount: "",
                        creditAmount: v.for.value,
                        memo: `Withdrawal ${v.for.value} ${v.for.symbol}`
                     }))
                  }
               }
               //own address in to.addr  => deposit
               else if (v.to.addr === txrow.ownAddr) {
                  //none-zero value
                  if (v.for.value) {
                     op = true
                     res.push(Object.assign(entry, {
                        txType: txTranserTypes.DEPOSIT,
                        debitAsset: v.for.symbol,
                        creditAsset: "",
                        debitAmount: v.for.value,
                        creditAmount: "",
                        memo: `Deposit ${v.for.value} ${v.for.symbol}`
                     }))
                  }
               }
            })

            //no transfers with none-zero value => check zero transfer
            if (!op) {
               txrow.tokens.forEach(v => {
                  if (op) return
                  if (v.from.addr === txrow.ownAddr) {
                     op = true
                     res.push(Object.assign(entry, {
                        txType: txTranserTypes.FEE,
                        debitAsset: "",
                        creditAsset: "ETH",
                        debitAmount: 0,
                        creditAmount: 0,
                        memo: ""
                     }))
                  }
                  else if (v.to.addr === txrow.ownAddr) {
                     op = true
                     res.push(Object.assign(entry, {
                        txType: txTranserTypes.FEE,
                        debitAsset: "",
                        creditAsset: "ETH",
                        debitAmount: 0,
                        creditAmount: 0,
                        memo: ""
                     }))
                  }
               })
            }
         }
      }

      if (!res.length) {
         log.e(`[ExportEtherTxs.getTxTransforms]: no entries for tx="${txrow.txHash}"`)
      }

      return res
   }


}

export default ExportEtherTxs