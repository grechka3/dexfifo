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
import PG from "pg"

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
 * The structure is Compatible with Computis json
 *
 * @typedef AssetTransformEntry {
 *    @property {number} timeStamp
 *    @property {string} txHash
 *    @property {TxTranserTypes} txType
 *    @property {string} debitAsset
 *    @property {number} debitAmount
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


   constructor(dbFile = null)
   {
      this.memdb = dbFile ? lowdb(new LowDbFileAdapter(dbFile)) : null
      this.computisDefaults = {
         clientId: "",
      }
      this.balances = {}
   }

   setDebug(debugOn)
   {
      etherscanParser.setDebug(debugOn)
      etherscanAPI.setDebug(debugOn)
   }

   /**
    * @return {{err:Error}}
    */
   async pgWriteComputedTxs(userId)
   {
      if(!userId) throw new Error(`pgWriteComputedTxs(): user id not defined`)
      let lastSQL
      try {
         const pg = new PG.Client(opt.pg)
         await pg.connect()

         await pg.query(`delete from public.report_report WHERE user_id=${userId}`)
/*
         await pg.query(`CREATE TABLE public.report_report (
             id SERIAL PRIMARY KEY,
             tx_hash character varying(255) NOT NULL,
             tx_type character varying(15) NOT NULL,
             debit_asset character varying(255) NOT NULL,
             debit_amount numeric(32,18) NOT NULL,
             credit_asset character varying(255) NOT NULL,
             credit_amount numeric(32,18) NOT NULL,
             tx_fee numeric(32,18) NOT NULL,
             memo character varying(255) NOT NULL,
             debit_account character varying(255) NOT NULL,
             credit_account character varying(255) NOT NULL,
             tx_fee_account character varying(255) NOT NULL,
             "timestamp" integer NOT NULL,
             date_time timestamp with time zone NOT NULL,
             created_time timestamp with time zone NOT NULL,
             updated_time timestamp with time zone NOT NULL,
             user_id integer NOT NULL
         )`)

*/
         const txs = this.memdb.get("txs").sortBy("timeStamp").value()
         const utcOffsetMinutes = this.memdb.get("utcOffsetMinutes").value()
         for (let tx_i = 0; tx_i < txs.length; tx_i++) {
            const txd = txs[tx_i]
            const txTimeStampWZone = xx.moment(txd.timeStamp, "X").utcOffset(utcOffsetMinutes).format("YYYY-MM-DD hh:mm:ssZZ")
            const nowTimeWZone = xx.moment().utcOffset(utcOffsetMinutes).format("YYYY-MM-DD hh:mm:ssZZ")
            for (let tr_i = 0; tr_i < txd.transfers.length; tr_i++) {
               const trd = txd.transfers[tr_i]
               const el = {
                  tx_hash: txd.txHash,
                  tx_type: trd.txType,
                  debit_asset: trd.debitAsset,
                  debit_amount: trd.debitAmount,
                  credit_asset: trd.creditAsset,
                  credit_amount: trd.creditAmount,
                  tx_fee: trd.txFeeAmount,
                  memo: trd.memo,
                  debit_account: trd.debitAccount,
                  credit_account: trd.creditAccount,
                  tx_fee_account: trd.txFeeAccount,
                  timestamp: trd.timeStamp,
                  date_time: txTimeStampWZone,
                  created_time: nowTimeWZone,
                  updated_time: nowTimeWZone,
                  user_id: userId
               }
               const flds = Object.keys(el).map(k=> `${k}`).join(", ")
               const vals = Object.keys(el).map(k=> `'${el[k]}'`).join(", ")
               lastSQL = `INSERT INTO public.report_report (${flds}) VALUES(${vals})`
               await pg.query(lastSQL)
            }
         }

         pg.end()

      }
      catch (e) {
         return {err: new Error(`[ExportEtherTxs.pgWriteComputedTxs]: ${e.message} ||| last SQL query: ${lastSQL}`)}
      }
      return {
         err: null,
      }

   }


   /**
    * @param {String} outputFileBase
    * @return {{err:Error, linesCount:number}}
    */
   async writeBalances(outputFileBase)
   {
      let lines = []
      const csvWriter = csv.createObjectCsvWriter({
         fieldDelimiter: ";",
         path: outputFileBase + '.csv',
         header: [
            {id: "addr", title: "Ether account"},
            {id: "asset", title: "Asset"},
            {id: "debit", title: "Debit"},
            {id: "credit", title: "Credit"},
            {id: "balance", title: "Balance"},
         ]
      })
      this.balances = {}
      const trs = this.memdb.get("transfers").sortBy("timeStamp").value()
      const inputAddrs = this.memdb.get("inputAddresses").value()
      trs.forEach(tr => {
         const debit_v = parseFloat(tr.debitAmount)
         const credit_v = parseFloat(tr.creditAmount)
         const fee = parseFloat(tr.txFeeAmount)

         let debit_bk = `${tr.debitAccount}_${tr.debitAsset}`
         if (!xx.isDefined(this.balances[debit_bk])) {
            this.balances[debit_bk] = {
               addr: tr.debitAccount,
               asset: tr.debitAsset,
               debit: 0,
               credit: 0,
            }
         }
         this.balances[debit_bk].debit += debit_v

         let credit_bk = `${tr.creditAccount}_${tr.debitAsset}`
         if (!xx.isDefined(this.balances[credit_bk])) {
            this.balances[credit_bk] = {
               addr: tr.creditAccount,
               asset: tr.creditAsset,
               debit: 0,
               credit: 0,
            }
         }
         this.balances[credit_bk].credit += credit_v


         if (fee) {
            const bk_ether = `${tr.txFeeAccount}_Ether`
            if (!xx.isDefined(this.balances[bk_ether])) {
               this.balances[bk_ether] = {
                  addr: tr.txFeeAccount,
                  asset: "Ether",
                  debit: 0,
                  credit: 0,
               }
            }
            this.balances[bk_ether].credit += fee
         }
      })

      const decimalSeparator = this.memdb.get("decimalSeparator").value()

      Object.keys(this.balances).forEach(k => {
         this.balances[k].balance = this.balances[k].debit - this.balances[k].credit
         if (this.balances[k].balance !== 0 && inputAddrs.includes(this.balances[k].addr)) {
            lines.push(Object.assign({}, this.balances[k], {
               credit: this.balances[k].credit.toString().replace('.', decimalSeparator),
               debit: this.balances[k].debit.toString().replace('.', decimalSeparator),
               balance: this.balances[k].balance.toString().replace('.', decimalSeparator),
            }))
         }
      })
      await csvWriter.writeRecords(lines)
      fs.writeFileSync(outputFileBase + '.json', xx.prettyJSON(this.balances))

      return {
         err: null,
      }
   }

   /**
    * @param {String} outputFile
    * @return {Error|null} err
    */
   async writeComputisDataFile(outputFile)
   {
      let json = []
      const txs = this.memdb.get("txs").sortBy("timeStamp").value()
      const utcOffsetMinutes = this.memdb.get("utcOffsetMinutes").value()
      const computisClientId = this.memdb.get("computisClientId").value()
      txs.forEach(txd => {
         txd.transfers.forEach(tr => {
            const el = Object.assign({}, {
               datetime: xx.moment(txd.timeStamp, "X").utcOffset(utcOffsetMinutes).format("YYYY-MM-DDTHH:mm:ss") + 'Z',
               clientId: computisClientId,
               "creditAccount": "",
               "creditAsset": "",
               "creditAmount": "",
               "debitAccount": "",
               "debitAsset": "",
               "debitAmount": "",
               "txFeeAccount": "",
               "txFeeAsset": "",
               "txFeeAmount": "",
               "payee": "",
               "memo": "",
               "filledPrice": "",
               "txType": "",
               "histFMV": "",
               "basis": ""
            }, tr)
            delete el.timeStamp
            json.push(el)
         })
      })
      fs.writeFileSync(outputFile, xx.prettyJSON(json))

      return {
         err: null,
         linesCount: this.memdb.get("transfers").size().value() * 1
      }
   }

   /**
    * @param {String} outputFile     - output transactions in CSV format
    * @return {{err:Error}}
    */
   async writeTransfersCSV(outputFile)
   {
      const csvWriter = csv.createObjectCsvWriter({
         path: outputFile,
         header: [
            {id: "txHash", title: "txHash"},
            {id: "etherscanUrl", title: "EtherscanUrl"},
            {id: "txType", title: "txType"},
            {id: "creditAmount", title: "creditAmount"},
            {id: "creditAsset", title: "creditAsset"},
            {id: "debitAmount", title: "debitAmount"},
            {id: "debitAsset", title: "debitAsset"},
            {id: "memo", title: "Memo"},
            {id: "creditAccount", title: "creditAccount"},
            {id: "debitAccount", title: "debitAccount"},
            {id: "txFeeAsset", title: "txFeeAsset"},
            {id: "txFeeAmount", title: "txFeeAmount"},
            {id: "txFeeAccount", title: "txFeeAccount"},
            {id: "dateTime", title: "dateTime"},
            {id: "timestamp", title: "timestamp"},
         ],
         fieldDelimiter: ";"
      })
      let lines = []
      const txs = this.memdb.get("txs").sortBy("timeStamp").value()
      const decimalSeparator = this.memdb.get("decimalSeparator").value()
      const utcOffsetMinutes = this.memdb.get("utcOffsetMinutes").value()
      txs.forEach(async (txd) => {
         txd.transfers.forEach(async (tr) => {
            const rr = Object.assign({}, tr, {
               dateTime: xx.moment(txd.timeStamp, "X").utcOffset(utcOffsetMinutes).format("YYYY-MM-DD\THH:mm:ss") + 'Z',
               timestamp: txd.timeStamp,
               etherscanUrl: `https://etherscan.io/tx/${tr.txHash}`,
               debitAmount: tr.debitAmount.toString().replace('.', decimalSeparator),
               creditAmount: tr.creditAmount.toString().replace('.', decimalSeparator),
               txFeeAmount: tr.txFeeAmount.toString().replace('.', decimalSeparator),
            })
            lines.push(rr)

         })
      })
      await csvWriter.writeRecords(lines)

      return {
         err: null,
         linesCount: this.memdb.get("transfers").size().value() * 1
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
    * @return {{err: Error, addr:[], decimalSeparator: number, computisClientId: string}}
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

      let utcOffsetMinutes = 0
      let decimalSeparator = "."
      let computisClientId = ""
      let addrs = []
      conf.forEach(v => {
         let res
         res = v.match(/^etheraddr[\s]*=[\s]*(0x[0-9a-z]+)/i)
         if (res !== null) addrs.push(res[1].toLowerCase())
         res = v.match(/^clientid[\s]*=[\s]*([0-9]+)/i)
         if (res !== null) computisClientId = res[1]
         res = v.match(/^decimalseparator[\s]*=[\s]*([\.\,]{1})/i)
         if (res !== null) decimalSeparator = res[1]
         res = v.match(/^utcoffsetminutes[\s]*=[\s]*([0-9]+)/i)
         if (res !== null) utcOffsetMinutes = res[1] * 1
      })
      if (!addrs.length) return {err: new Error(`Ether addresses not found in "${inputFile}"`)}
      if (!computisClientId) log.w(`clientId not found in "${inputFile}"`)

      this.memdb.set("inputAddresses", addrs).write()
      this.memdb.set("utcOffsetMinutes", utcOffsetMinutes).write()
      this.memdb.set("decimalSeparator", decimalSeparator).write()
      this.memdb.set("computisClientId", computisClientId).write()

      return {
         res: null,
         addrs,
         utcOffsetMinutes,
         decimalSeparator,
         computisClientId
      }
   }


   /**
    *
    * @param {[]} ethAddrList
    * @return {Object} result
    * @return {Error|null} result.err
    * @return {Number} result.txCount
    * @return {Number} result.tokenTxCount
    * @return {Number} result.transfersCount
    */
   async retriveTxs(ethAddrList = [])
   {
      if (ethAddrList.length) {
         this.memdb.set("inputAddresses", ethAddrList).write()
      }
      else {
         ethAddrList = this.memdb.get("inputAddresses").value()
      }
      this.memdb.set("txsraw", []).write()
      this.memdb.set("txs", []).write()
      this.memdb.set("transfers", []).write()
      const txsraw = this.memdb.get("txsraw")
      const memdb_txs = this.memdb.get("txs")
      const memdb_trans = this.memdb.get("transfers")


      log(`Start data collection in ${opt.etherscanAccs.length} threads...`)

      let totalTxs = 0, totalTransfers = 0, tokenTxCount = 0, txHashes = []

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++) {
         const inputAddress = ethAddrList[addr_i]
         // wait semaphore unblocking
         let acc = await etherscanAPI.takeAcc()

         // Start parallel task for each ethaddr
         void async function (acc, inputAddr) {

            // get all TXs for current ethaddr
            let qres = await etherscanAPI.getTxListByAddr({
               acc,
               ethaddr: inputAddr,
               sort: "desc"
            })

            if (!qres.response.error && xx.isArray(qres.data.result)) {
               for (let k = 0; k < qres.data.result.length; k++) {
                  const v = qres.data.result[k]
                  if (!txHashes.includes(v.hash)) {
                     txsraw.push(v).write()
                     txHashes.push(v.hash)
                     totalTxs++
                  }
               }
               if (qres.data.result.length >= 9998) {
                  log.w(`[ExportEtherTxs.retriveTxs]: getTxListByAddr: The ETH address "${inputAddr}" has more than 10000 txs`).flog()
               }
            }
            else {
               log.e(`[ExportEtherTxs.retriveTxs]: getTxListByAddr: API ERROR for ETH address "${inputAddr}" ::  code=${qres.response.errorCode}, message=${qres.response.errorMessage}, APIstatus=${qres.data.status ? qres.data.status : "---"}, APImessage=${qres.data.message ? qres.data.message : "---"}, APIResult=${qres.data.result ? qres.data.result : "---"} via ${qres.acc.viaHost}`).flog()
               process.exit(-2)
            }

            // get all tokens TXs for current ethaddr
            qres = await etherscanAPI.getTxTokenListByAddr({
               acc,
               ethaddr: inputAddr,
               sort: "desc"
            })

            if (!qres.response.error && xx.isArray(qres.data.result)) {
               for (let k = 0; k < qres.data.result.length; k++) {
                  const v = qres.data.result[k]

                  if (!txHashes.includes(v.hash)) {
                     txsraw.push(v).write()
                     tokenTxCount++
                     totalTxs++
                     txHashes.push(v.hash)
                     //log.d(`[ExportEtherTxs.retriveTxs]: ttx="${v.hash}"`).flog()
                  }
               }
               if (qres.data.result.length >= 9998) {
                  log.w(`[ExportEtherTxs.retriveTxs]: getTxTokenListByAddr: The ETH address "${inputAddr}" has more than 10000 txs`).flog()
               }
            }
            else {
               log.e(`[ExportEtherTxs.retriveTxs]: getTxTokenListByAddr: API ERROR for ETH address "${inputAddr}" ::  code=${qres.response.errorCode}, message=${qres.response.errorMessage}, APIstatus=${qres.data.status ? qres.data.status : "---"}, APImessage=${qres.data.message ? qres.data.message : "---"}, APIResult=${qres.data.result ? qres.data.result : "---"} via ${qres.acc.viaHost}`).flog()
               process.exit(-3)
            }

            etherscanAPI.releaseAcc(acc)


         }.call(this, acc, inputAddress).catch(e => {
            log.t(`EEE[inputAddress="${inputAddress}"]`, e).flog()
            process.exit(-1)
         })


      }

      // Wait while all account queries will be done
      for (; etherscanAPI.someTaskInProgress();) {
         await xx.timeoutAsync(50)
      }

      // parse html Tx data
      const txs = txsraw.sortBy("timeStamp").value()
      for (let txi = 0; txi < txs.length; txi++) {
         const txraw = txs[txi]


         // wait semaphore unblocking
         let acc = await etherscanParser.takeAcc()

         // Start parallel task for each tx
         void async function (acc, txraw) {
            const txd = await etherscanParser.getDataFromTxPage(txraw.hash, acc.__opts)
            etherscanParser.releaseAcc(acc)

            let txv = {
               txHash: txraw.hash,
               blockNumber: txraw.blockNumber,
               timeStamp: txraw.timeStamp * 1,
               dateTimeUTC: xx.tss2dt(txraw.timeStamp * 1),
               contractAddressApi: txraw.contractAddress,
               gas: txraw.gas * 1,
               gasPrice: xx.toFixed(txraw.gasPrice / 1e9),
               gasUsed: txraw.gasUsed * 1,
               nonce: txraw.nonce * 1,
               isError: txraw.isError ? !!(txraw.isError * 1) : false,
               txFee: txd.txFee,
               fromAddr: txd.from,
               toAddr: txd.to,
               fromName: txd.fromName,
               toName: txd.toName,
               etherValue: txd.etherValue,
               etherUsdPrice: txd.etherUsdPrice,
            }

            Object.assign(txv, txd)
            const transfs = this.getTxTransforms(txv)
            txv.transfers = transfs
            memdb_trans.push(...transfs).write()
            memdb_txs.push(txv).write()

            totalTransfers += transfs.length

         }.call(this, acc, txraw).catch(e => {
            log.t(`tx="${txraw.hash}"`, e).flog()
            process.exit(-1)
         })


      }


      // Wait while all account queries will be done
      for (; etherscanParser.someTaskInProgress();) {
         await xx.timeoutAsync(50)
      }

      log(`Data collection done`)

      return {
         err: null,
         txCount: totalTxs,
         tokenTxCount: tokenTxCount,
         transfersCount: totalTransfers,
      }
   }


   /**
    * return array index if from[own] higher then to[own]
    *
    * @param txrow
    * @return {(number|false)[]}
    */
   getPosSwapTokens(txrow)
   {
      const inputAddrs = this.memdb.get("inputAddresses").value()
      for (let k = 0; k < txrow.tokens.length - 1; k++) {
         if (inputAddrs.includes(txrow.tokens[k].from.addr)) {
            for (let j = k + 1; j < txrow.tokens.length; j++) {
               if (inputAddrs.includes(txrow.tokens[j].to.addr) && txrow.tokens[k].to.addr === txrow.tokens[j].from.addr) return [k, j]
               //
               // Checking to.addr !== from.addr but seems like swap this https://etherscan.io/tx/0x3edf8395c89c3903bd625865462e1dc0d20b6170556d105b116e7506157a7372
               // to.addr === from.addr  here https://etherscan.io/tx/0x7fc71b0a603d51cbc6cb457dd1e343a6a408d201c1380267d21302c6c14eff32
            }
         }
      }

      return [false, false]
   }

   /**
    * Get index list where ownAddr == fromAddr
    *
    * @param {TxTranserTypes} txrow
    * @return {array}
    */
   getPosOwnFromTokens(txrow)
   {
      const inputAddrs = this.memdb.get("inputAddresses").value()
      let res = []
      for (let k in txrow.tokens) {
         if (inputAddrs.includes(txrow.tokens[k].from.addr)) res.push(k)
      }
      return res
   }

   /**
    * Get index list where ownAddr == toAddr
    *
    * @param {TxTranserTypes} txrow
    * @return {array}
    */
   getPosOwnToTokens(txrow)
   {
      const inputAddrs = this.memdb.get("inputAddresses").value()
      let res = []
      for (let k in txrow.tokens) {
         if (inputAddrs.includes(txrow.tokens[k].to.addr)) res.push(k)
      }
      return res
   }


   /**
    *
    * @param {TxTranserTypes} txrow
    * @return {[]}
    */
   getPosOwnFromInternalTxs(txrow)
   {
      const inputAddrs = this.memdb.get("inputAddresses").value()
      let res = []
      for (let k in txrow.internalTxs) {
         if (inputAddrs.includes(txrow.internalTxs[k].toAddr)) res.push(k)
      }
      return res

   }

   /**
    *
    * @param {EtherTxRow} txrow  for one txHash
    * @param {[]} inputAddrs
    * @return {Array<AssetTransformEntry>}
    */
   getTxTransforms(txrow, inputAddrs = [])
   {
      if (!inputAddrs.length) inputAddrs = this.memdb.get("inputAddresses").value()
      if (!inputAddrs) throw new Error(`[ExportEtherTxs.getTxTransforms]: input addresses not defined`)
      let entry = {
         timeStamp: txrow.timeStamp,
         txHash: txrow.txHash,
         txType: "",
         creditAccount: "",
         creditAsset: "",
         creditAmount: "",
         debitAccount: "",
         debitAsset: "",
         debitAmount: "",
         txFeeAccount: "",
         txFeeAsset: "",
         txFeeAmount: 0,
         memo: "",
      }
      let res = []

      const fromAddrIsOwn = inputAddrs.includes(txrow.fromAddr)
      const toAddrIsOwn = inputAddrs.includes(txrow.toAddr)

      // fail tx || no tokens && zero ether value && have fee
      if (txrow.isError) {
         if (txrow.txFee && fromAddrIsOwn) {
            res.push(Object.assign(entry, {
               txType: txTranserTypes.FEE,
               creditAsset: "Ether",
               creditAccount: txrow.fromAddr,
               creditAmount: 0,
               debitAccount: "",
               debitAsset: "",
               debitAmount: 0,
               memo: txrow.isError ? "Loss on fail transaction" : (txrow.memo.length ? txrow.memo.join(", ") : "")
            }))
         }
         else {
            log.e(`[ExportEtherTxs.getTxTransforms]: EE[8] fail TX misses :: tx="${txrow.txHash}"`).flog()
         }
      }

      // without tokens
      else if (!txrow.tokens.length) {
         // deposit/withdrawal
         if (txrow.etherValue) {
            if (fromAddrIsOwn) {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.WITHDRAWAL,
                  creditAccount: txrow.fromAddr,
                  creditAsset: "Ether",
                  creditAmount: txrow.etherValue,
                  debitAccount: txrow.toAddr + (txrow.toName ? ` (${txrow.toName})` : ""),
                  debitAsset: "Ether",
                  debitAmount: txrow.etherValue,
                  memo: txrow.memo.length ? txrow.memo.join(", ") : `Withdrawal ${txrow.etherValue} Ether To ${txrow.toName ? txrow.toName : txrow.toAddr}`
               }))
            }
            else {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.DEPOSIT,
                  creditAccount: txrow.fromAddr + (txrow.fromName ? ` (${txrow.fromName})` : ""),
                  creditAsset: "Ether",
                  creditAmount: txrow.etherValue,
                  debitAccount: txrow.toAddr,
                  debitAsset: "Ether",
                  debitAmount: txrow.etherValue,
                  memo: txrow.memo.length ? txrow.memo.join(", ") : `Deposit ${txrow.etherValue} Ether From ${txrow.fromName ? txrow.fromName : txrow.fromAddr}`
               }))
            }
         }
      }

      // With token transfers
      else {

         // Swap operation
         //const [posFrom, posTo] = this.getPosSwapTokens(txrow)
         if (false && posFrom !== false && posTo !== false) {

            /*
                        // trade token=>token
                        if (posFrom < posTo) {
                           if (txrow.tokens[posFrom].for.value && txrow.tokens[posTo].for.value) {
                              res.push(Object.assign({}, entry, {
                                 txType: txTranserTypes.TRADE,
                                 creditAccount: txrow.tokens[posFrom].from.addr,
                                 creditAsset: txrow.tokens[posFrom].for.symbol,
                                 creditAmount: txrow.tokens[posFrom].for.value,
                                 debitAccount: txrow.tokens[posFrom].to.addr,
                                 debitAsset: txrow.tokens[posTo].for.symbol,
                                 debitAmount: txrow.tokens[posTo].for.value,
                                 memo: `Swap ${txrow.tokens[posFrom].for.value} ${txrow.tokens[posFrom].for.symbol} for ${txrow.tokens[posTo].for.value} ${txrow.tokens[posTo].for.symbol}`
                              }))
                           }
                           else {
                              log.e(`[ExportEtherTxs.getTxTransforms]: EE[2] zero sum operation :: tx="${txrow.txHash}"`).flog()
                           }
                        }
            */
         }

         else {

            const [posFrom, posTo] = [this.getPosOwnFromTokens(txrow), this.getPosOwnToTokens(txrow)]

            posFrom.forEach(k => {
               if (txrow.tokens[k].for.value) {
                  res.push(Object.assign({}, entry, {
                     txType: txTranserTypes.WITHDRAWAL,
                     creditAccount: txrow.tokens[k].from.addr,
                     creditAsset: txrow.tokens[k].for.symbol,
                     creditAmount: txrow.tokens[k].for.value,
                     debitAccount: `${txrow.tokens[k].to.addr} ${txrow.tokens[k].to.name ? `(${txrow.tokens[k].to.name})` : ""}`.trim(),
                     debitAsset: txrow.tokens[k].for.symbol,
                     debitAmount: txrow.tokens[k].for.value,
                     memo: `Withdrawal ${txrow.tokens[k].for.value} ${txrow.tokens[k].for.symbol} To ${txrow.tokens[k].to.name ? txrow.tokens[k].to.name : txrow.tokens[k].to.addr}`.trim()
                  }))
               }
            })

            posTo.forEach(k => {
               if (txrow.tokens[k].for.value) {
                  res.push(Object.assign({}, entry, {
                     txType: txTranserTypes.DEPOSIT,
                     creditAccount: `${txrow.tokens[k].from.addr} ${txrow.tokens[k].from.name ? `(${txrow.tokens[k].from.name})` : ""}`.trim(),
                     creditAsset: txrow.tokens[k].for.symbol,
                     creditAmount: txrow.tokens[k].for.value,
                     debitAccount: txrow.tokens[k].to.addr,
                     debitAsset: txrow.tokens[k].for.symbol,
                     debitAmount: txrow.tokens[k].for.value,
                     memo: `Deposit ${txrow.tokens[k].for.value} ${txrow.tokens[k].for.symbol} From ${txrow.tokens[k].from.name ? txrow.tokens[k].from.name : txrow.tokens[k].from.addr}`.trim()
                  }))
               }
            })

         }

         // send Ether to other
         if (txrow.etherValue) {
            res.push(Object.assign({}, entry, {
               txType: txTranserTypes.WITHDRAWAL,
               creditAccount: txrow.fromAddr,
               creditAsset: "Ether",
               creditAmount: txrow.etherValue,
               debitAccount: `${txrow.toAddr} ${txrow.toName ? `(${txrow.toName})` : ""}`.trim(),
               debitAsset: "Ether",
               debitAmount: txrow.etherValue,
               memo: `Withdrawal ${txrow.etherValue} Ether To ${txrow.toName ? txrow.toName : txrow.toAddr}`
            }))
         }
         // could be Ether receiving
         else {
            const ownFrom = this.getPosOwnFromInternalTxs(txrow)
            if (ownFrom.length) {
               ownFrom.forEach(k => {
                  const trx = txrow.internalTxs[k]
                  res.push(Object.assign({}, entry, {
                     txType: txTranserTypes.DEPOSIT,
                     creditAccount: `${trx.fromAddr} ${trx.fromName ? `(${trx.fromName})` : ""}`,
                     creditAsset: "Ether",
                     creditAmount: trx.etherValue,
                     debitAccount: trx.toAddr,
                     debitAsset: "Ether",
                     debitAmount: trx.etherValue,
                     memo: `Deposit  ${txrow.etherValue} Ether From ${trx.fromName ? trx.fromName : trx.fromAddr}`
                  }))
               })
            }
         }

         if (!res.length) {
            log.w(`[ExportEtherTxs.getTxTransforms]: No transforms for token list :: tx="${txrow.txHash}"`).flog()
         }
      }

      // zero sum && and no other transfers
      if (!res.length && txrow.txFee && fromAddrIsOwn) {
         res.push(Object.assign(entry, {
            txType: txTranserTypes.FEE,
            creditAsset: "Ether",
            creditAccount: txrow.fromAddr,
            creditAmount: 0,
            debitAccount: "",
            debitAsset: "",
            debitAmount: 0,
            txFeeAccount: txrow.fromAddr,
            txFeeAsset: "Ether",
            txFeeAmount: txrow.txFee,
            memo: txrow.memo ? txrow.memo : "?11"
         }))
      }

      else if (txrow.txFee && res.length && fromAddrIsOwn) {
         res[0].txFeeAccount = txrow.fromAddr
         res[0].txFeeAsset = "Ether"
         res[0].txFeeAmount = txrow.txFee
      }

      if (!res.length) {
         log.e(`[ExportEtherTxs.getTxTransforms]: EE[5] no entries for tx="${txrow.txHash}"`).flog()
      }

      return res
   }


}

export default ExportEtherTxs