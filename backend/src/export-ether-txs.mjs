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
 * The structure is Compatible with Computis json
 *
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

   export
   default
   ExportEtherTxs

   constructor(dbFile = null)
   {
      this.memdb = dbFile ? lowdb(new LowDbFileAdapter(dbFile)) : null
      this.defaults = {
         clientId: "",
      }
      // array of string a db[].tokens.for.symbol
      this.LPDistrSymbols = []
      this.balances = {}
      this.decimalSeparator = "."
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

   async writeBalances(outputFileBase)
   {
      const trs = this.memdb.get("trans").sortBy("timeStamp").value()
      if (!trs) return {err: new Error(`transfers datalog not exists`)}
      const csvWriter = csv.createObjectCsvWriter({
         fieldDelimiter: ";",
         path: outputFileBase + '.csv',
         header: [
            {id: "addr", title: "Ether address"},
            {id: "asset", title: "Asset"},
            {id: "debit", title: "Debit"},
            {id: "credit", title: "Credit"},
            {id: "balance", title: "Balance"},
         ]
      })
      let lines = []
      trs.forEach(tr => {
         const deltaDebit = {
            id: `${tr.debitAccount}_${tr.debitAsset}`,
            addr: tr.debitAccount,
            asset: tr.debitAsset,
            v: tr.debitAmount
         }
         const deltaCredit = {
            id: `${tr.creditAccount}_${tr.creditAsset}`,
            addr: tr.creditAccount,
            asset: tr.creditAsset,
            v: tr.creditAmount
         }
         if (deltaDebit.v) {
            if (!this.balances[deltaDebit.id]) {
               this.balances[deltaDebit.id] = {debit: deltaDebit.v, credit: 0, asset: deltaDebit.asset, addr:deltaDebit.addr}
            }
            else {
               this.balances[deltaDebit.id].debit += parseFloat(deltaDebit.v)
            }
         }

         if (deltaCredit.v) {
            if (!this.balances[deltaCredit.id]) {
               this.balances[deltaCredit.id] = {debit: 0, credit: deltaCredit.v, asset:deltaCredit.asset,addr:deltaCredit.addr}
            }
            else {
               this.balances[deltaCredit.id].credit += parseFloat(deltaCredit.v)
            }
         }
      })
      Object.keys(this.balances).forEach(id => {
         lines.push({
            addr:this.balances[id].addr,
            asset:this.balances[id].asset,
            debit: this.balances[id].debit.toString().replace('.', this.decimalSeparator),
            credit: this.balances[id].credit.toString().replace('.', this.decimalSeparator),
            balance: (parseFloat(this.balances[id].debit) - parseFloat(this.balances[id].credit)).toString().replace('.', this.decimalSeparator)
         })
      })

      await csvWriter.writeRecords(lines)
      //fs.writeFileSync(outputFileBase + '.json', xx.prettyJSON(this.balances))

      return {
         err: null,
      }
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
            {id: "etherscanUrl", title: "EtherscanUrl"},
            {id: "txType", title: "txType"},
            {id: "debitAsset", title: "debitAsset"},
            {id: "debitAmount", title: "debitAmount"},
            {id: "creditAsset", title: "creditAsset"},
            {id: "creditAmount", title: "creditAmount"},
            {id: "txFeeAccount", title: "txFeeAccount"},
            {id: "txFeeAsset", title: "txFeeAsset"},
            {id: "txFeeAmount", title: "txFeeAmount"},
            {id: "memo", title: "Memo"},
            // {id: "approxUsdAmount1", title: "FirstAsset Approx.USD Amount"},
            // {id: "approxUsdAmount2", title: "SecondAsset Approx.USD Amount"},
            // {id: "tokenPriceUSD", title: "Memo"},
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
               dateTime: xx.moment(txd.timeStamp, "X").utcOffset(opt.utcOffsetMinutes).format("YYYY-MM-DD\THH:mm:ss") + 'Z',
               timestamp: txd.timeStamp,
               etherscanUrl: `https://etherscan.io/tx/${tr.txHash}`,
               debitAmount: tr.debitAmount.toString().replace('.', this.decimalSeparator),
               creditAmount: tr.creditAmount.toString().replace('.', this.decimalSeparator),
               txFeeAmount: tr.txFeeAmount.toString().replace('.', this.decimalSeparator),
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
         res = v.match(/decimalseparator[\s]*=[\s]*([\.\,]{1})/i)
         if (res !== null) this.decimalSeparator = res[1]
         res = v.match(/lpdistrsymbol[\s]*=[\s]*(.+)/i)
         if (res !== null) this.LPDistrSymbols.push(res[1].trim())
      })
      if (!addrs.length) return {err: new Error(`Ether addresses not found in "${inputFile}"`)}
      if (!this.defaults.clientId) log.w(`clientId not found in "${inputFile}"`)

      return {
         res: null,
         addrs,
         LPDistrSymbols: this.LPDistrSymbols
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

                  }.call(this, acc).catch(e => {
                     log.t(`tx=${v.hash}`, e).flog()
                     process.exit(-1)
                  })


               }
               if (qres.data.result.length >= 9998) {
                  log.w(`The ETH address "${ownAddress}" has more than 10000 txs`).flog()
               }
               log(`${ownAddress} done. txs=${qres.data.result.length}`)

            }
            else {
               log.e(`[ExportEtherTxs.loadTXsToCSV]: API ERROR for ETH address "${ownAddress}" (line ${addr_i + 1}) ::  code=${qres.response.errorCode}, message=${qres.response.errorMessage}, APIstatus=${qres.data.status ? qres.data.status : "---"}, APImessage=${qres.data.message ? qres.data.message : "---"}, APIResult=${qres.data.result ? qres.data.result : "---"} via ${qres.acc.viaHost}`).flog();
               process.exit(-2)
            }

         }.call(this, acc).catch(e => {
            log.t(`tx=${v.hash}`, e).flog()
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
    * return array index if from[own] higher then to[own]
    *
    * @param txrow
    * @return {(number|false)[]}
    */
   getPosSwapTokens(txrow)
   {

      for (let k = 0; k < txrow.tokens.length - 1; k++) {
         if (txrow.tokens[k].from.addr === txrow.ownAddr && !this.LPDistrSymbols.includes(txrow.tokens[k].for.symbol)) {
            for (let j = k + 1; j < txrow.tokens.length; j++) {
               if (txrow.tokens[j].to.addr === txrow.ownAddr && txrow.tokens[k].to.addr === txrow.tokens[j].from.addr && !this.LPDistrSymbols.includes(txrow.tokens[j].for.symbol)) return [k, j]
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
      let res = []
      for (let k in txrow.tokens) {
         if (txrow.tokens[k].from.addr === txrow.ownAddr && !this.LPDistrSymbols.includes(txrow.tokens[k].for.symbol)) res.push(k)
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
      let res = []
      for (let k in txrow.tokens) {
         if (txrow.tokens[k].to.addr === txrow.ownAddr && !this.LPDistrSymbols.includes(txrow.tokens[k].for.symbol)) res.push(k)
      }
      return res
   }


   /**
    *
    * @param {TxTranserTypes} txrow
    * @return {array}
    */
   getPosOwnFromLP(txrow)
   {
      let res = []
      for (let k in txrow.tokens) {
         if (txrow.tokens[k].from.addr === txrow.ownAddr && this.LPDistrSymbols.includes(txrow.tokens[k].for.symbol)) res.push(k)
      }
      return res
   }

   /**
    *
    * @param {TxTranserTypes} txrow
    * @return {array}
    */
   getPosOwnToLP(txrow)
   {
      let res = []
      for (let k in txrow.tokens) {
         if (txrow.tokens[k].to.addr === txrow.ownAddr && this.LPDistrSymbols.includes(txrow.tokens[k].for.symbol)) res.push(k)
      }
      return res
   }

   /**
    *
    * @param {EtherTxRow} txrow  for one txHash
    * @return {Array<AssetTransformEntry>}
    */
   getTxTransforms(txrow)
   {
      if (!xx.isDefined(txrow.ownAddr)) throw new Error(`[ExportEtherTxs.getTxTransforms]: property "ownAddr" not defined `)
      let entry = {
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
      let feePushed = false

      // fail tx || no tokens && zero ether value && have fee
      if (txrow.isError || !txrow.etherValue && !txrow.tokens.length && txrow.txFee) {
         res.push(Object.assign(entry, {
            txType: txTranserTypes.FEE,
            creditAsset: "Ether",
            creditAccount: txrow.ownAddr,
            creditAmount: 0,
            debitAccount: "",
            debitAsset: "",
            debitAmount: 0,
            memo: txrow.isError ? "Loss on fail transaction" : (txrow.memo.length ? txrow.memo.join(", ") : "")
         }))
      }

      // without tokens
      else if (!txrow.tokenTrans && txrow.etherValue) {
         // deposit/withdrawal
         if (txrow.etherValue) {
            if (txrow.ownAddr === txrow.fromAddr) {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.WITHDRAWAL,
                  creditAccount: txrow.ownAddr,
                  creditAsset: "Ether",
                  creditAmount: txrow.etherValue,
                  debitAccount: txrow.toAddr + (txrow.toName ? ` (${txrow.toName})` : ""),
                  debitAsset: "Ether",
                  debitAmount: txrow.etherValue,
                  memo: txrow.memo.length ? txrow.memo.join(", ") : ""
               }))
            }
            else {
               res.push(Object.assign(entry, {
                  txType: txTranserTypes.DEPOSIT,
                  creditAccount: txrow.fromAddr + (txrow.fromName ? ` (${txrow.fromName})` : ""),
                  creditAsset: "Ether",
                  creditAmount: txrow.etherValue,
                  debitAccount: txrow.ownAddr,
                  debitAsset: "Ether",
                  debitAmount: txrow.etherValue,
                  memo: txrow.memo.length ? txrow.memo.join(", ") : ""
               }))
            }
         }
      }

      // With token transfers
      else {

         // have events block
         if (txrow.events.length) {
            txrow.events.forEach((v, k) => {
               if (v.type === "swap") {
                  res.push(Object.assign({}, entry, {
                     txType: txTranserTypes.TRADE,
                     creditAccount: txrow.ownAddr,
                     creditAsset: v.fromName,
                     creditAmount: v.fromValue,
                     debitAccount: txrow.ownAddr,
                     debitAsset: v.toName,
                     debitAmount: v.toValue,
                     memo: `Swap ${v.fromValue} ${v.fromName} for ${v.toValue} ${v.toName} on ${v.on}`
                  }))
               }
               else {
                  log.e(`[ExportEtherTxs.getTxTransforms]: EE[1] unknown Event.Type "${v.type}"  for tx="${txrow.txHash}"`).flog()
               }
            })
         }

         // haven't events block => look at tokens block
         else {

            const [posFrom, posTo] = this.getPosSwapTokens(txrow)


            if (posFrom !== false && posTo !== false) {

               // trade token=>token
               //ex. https://etherscan.io/tx/0x7fc71b0a603d51cbc6cb457dd1e343a6a408d201c1380267d21302c6c14eff32
               if (posFrom < posTo) {
                  if (txrow.tokens[posFrom].for.value && txrow.tokens[posTo].for.value) {
                     res.push(Object.assign({}, entry, {
                        txType: txTranserTypes.TRADE,
                        creditAccount: txrow.ownAddr,
                        creditAsset: txrow.tokens[posFrom].for.symbol,
                        creditAmount: txrow.tokens[posFrom].for.value,
                        debitAccount: txrow.ownAddr,
                        debitAsset: txrow.tokens[posTo].for.symbol,
                        debitAmount: txrow.tokens[posTo].for.value,
                        memo: `Swap ${txrow.tokens[posFrom].for.value} ${txrow.tokens[posFrom].for.symbol} for ${txrow.tokens[posTo].for.value} ${txrow.tokens[posTo].for.symbol}`
                     }))
                  }
                  else {
                     log.e(`[ExportEtherTxs.getTxTransforms]: EE[2] zero sum operation :: tx="${txrow.txHash}"`).flog()
                  }
               }
            }

            else {

               const [posFrom, posTo] = [this.getPosOwnFromTokens(txrow), this.getPosOwnToTokens(txrow)]

               posFrom.forEach(k => {
                  if (txrow.tokens[k].for.value) {
                     res.push(Object.assign({}, entry, {
                        txType: txTranserTypes.WITHDRAWAL,
                        creditAccount: txrow.ownAddr,
                        creditAsset: txrow.tokens[k].for.symbol,
                        creditAmount: txrow.tokens[k].for.value,
                        debitAccount: `${txrow.tokens[k].to.addr} ${txrow.tokens[k].to.name ? `(${txrow.tokens[k].to.name})` : ""}`.trim(),
                        debitAsset: txrow.tokens[k].for.symbol,
                        debitAmount: txrow.tokens[k].for.value,
                        memo: `Withdrawal ${txrow.tokens[k].for.value} ${txrow.tokens[k].for.symbol} ${txrow.tokens[k].to.name ? `to ${txrow.tokens[k].to.name}` : ""}`.trim()
                     }))
                  }
                  else {
                     log.e(`[ExportEtherTxs.getTxTransforms]: EE[3] zero sum operation :: tx="${txrow.txHash}"`).flog()
                  }
               })

               posTo.forEach(k => {
                  if (txrow.tokens[k].for.value) {
                     res.push(Object.assign({}, entry, {
                        txType: txTranserTypes.DEPOSIT,
                        creditAccount: `${txrow.tokens[k].from.addr} ${txrow.tokens[k].from.name ? `(${txrow.tokens[k].from.name})` : ""}`.trim(),
                        creditAsset: txrow.tokens[k].for.symbol,
                        creditAmount: txrow.tokens[k].for.value,
                        debitAccount: txrow.ownAddr,
                        debitAsset: txrow.tokens[k].for.symbol,
                        debitAmount: txrow.tokens[k].for.value,
                        memo: `Deposit ${txrow.tokens[k].for.value} ${txrow.tokens[k].for.symbol} ${txrow.tokens[k].from.name ? `from ${txrow.tokens[k].from.name}` : ""}`.trim()
                     }))
                  }
                  else {
                     log.e(`[ExportEtherTxs.getTxTransforms]: EE[4] zero sum operation :: tx="${txrow.txHash}"`).flog()
                  }
               })

            }

         }

         // check for LP token transfers / value can be equal to zero
         const lpPosFrom = this.getPosOwnFromLP(txrow)
         const lpPosTo = this.getPosOwnToLP(txrow)

         // stake == withdrawal
         lpPosFrom.forEach(k => {
            if (txrow.tokens[k].for.value) {
               res.push(Object.assign({}, entry, {
                  txType: txTranserTypes.WITHDRAWAL,
                  creditAccount: txrow.ownAddr,
                  creditAsset: txrow.tokens[k].for.symbol,
                  creditAmount: txrow.tokens[k].for.value,
                  debitAccount: `${txrow.tokens[k].to.addr} ${txrow.tokens[k].to.name ? `(${txrow.tokens[k].to.name})` : ""}`.trim(),
                  debitAsset: txrow.tokens[k].for.symbol,
                  debitAmount: txrow.tokens[k].for.value,
                  memo: `Stake ${txrow.tokens[k].for.value} LP tokens ${txrow.tokens[k].for.symbol}`
               }))
            }
         })

         // unstake == deposit
         lpPosTo.forEach(k => {
            if (txrow.tokens[k].for.value) {
               res.push(Object.assign({}, entry, {
                  txType: txTranserTypes.DEPOSIT,
                  creditAccount: `${txrow.tokens[k].from.addr} ${txrow.tokens[k].from.name ? `(${txrow.tokens[k].from.name})` : ""}`.trim(),
                  creditAsset: txrow.tokens[k].for.symbol,
                  creditAmount: txrow.tokens[k].for.value,
                  debitAccount: txrow.ownAddr,
                  debitAsset: txrow.tokens[k].for.symbol,
                  debitAmount: txrow.tokens[k].for.value,
                  memo: `UnStake ${txrow.tokens[k].for.value} LP tokens ${txrow.tokens[k].for.symbol}`
               }))
            }
         })

         // zero sum && and no other transfers
         if ((lpPosFrom !== false || lpPosTo !== false) && !res.length) {
            res.push(Object.assign(entry, {
               txType: txTranserTypes.FEE,
               creditAsset: "Ether",
               creditAccount: txrow.ownAddr,
               creditAmount: 0,
               debitAccount: "",
               debitAsset: "",
               debitAmount: 0,
               txFeeAccount: txrow.ownAddr,
               txFeeAsset: "Ether",
               txFeeAmount: txrow.txFee,
               memo: ""
            }))
            feePushed = true
         }

      }

      if (res.length && !feePushed) {
         res[0].txFeeAccount = txrow.ownAddr
         res[0].txFeeAsset = "Ether"
         res[0].txFeeAmount = txrow.txFee
      }
      else {
         log.e(`[ExportEtherTxs.getTxTransforms]: EE[5] no entries for tx="${txrow.txHash}"`).flog()
      }

      return res
   }


}

export default ExportEtherTxs