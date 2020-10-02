import log from "jsm_log"
import xx from "jsm_xx";
import csv from "csv-writer"
import fs from "fs"
import opt from "../../config.mjs";
import etherscanAPI from "./EtherscanAPI.mjs"
import etherscanParser from "./EtherscanParser.mjs"
import lowdb from "lowdb"
import LowDbMemory from "lowdb/adapters/Memory.js"

/**
 * Export Ether transactions using Etherscan.io API
 */
class ExportEtherTxs
{

   constructor()
   {
      this.txTypesEnum = {
         buy: "Buy",
         sell: "Sell",
         deposit: "Deposit",
         withdrawal: "Withdrawal",
         trade: "Trade"
      }
   }

   setDebug(debugOn)
   {
      etherscanParser.setDebug(debugOn)
      etherscanAPI.setDebug(debugOn)
   }

   async writeComputisDataFile({memdb, outputFile})
   {
      let line = 0
      fs.writeFileSync(outputFile, "[\n")
      const lines = memdb.get("txs").sortBy("timeStamp").value()
      for (let i = 0; i < lines.length; i++) {
         const v = lines[i]
         let row = {
            "datetime": xx.moment(v.timeStamp, "X").utcOffset(opt.utcOffsetMinutes).format("YYYY-MM-DDTHH:mm:ss") + 'Z',
            "clientId": opt.computisDefauts.clientId,
            "txHash": v.txHash,
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
         }

         if (v.value && !v.isError) {
            switch (v.txType) {
               case this.txTypesEnum.deposit:
                  row.txType = this.txTypesEnum.deposit
                  row.debitAccount = opt.computisDefauts.debitAccount
                  row.debitAsset = v.symbol
                  row.debitAmount = v.value
                  row.creditAccount = "Transfer"
                  break

               case this.txTypesEnum.withdrawal:
                  row.txType = this.txTypesEnum.withdrawal
                  row.creditAccount = opt.computisDefauts.debitAccount
                  row.creditAsset = v.symbol
                  row.creditAmount = v.value
                  row.debitAccount = "Transfer"

                  break
            }
            fs.writeFileSync(outputFile, (line++ ? ",\n" : "") + xx.prettyJSON(row), {flag: "a"})
         }
      }
      fs.writeFileSync(outputFile, "\n]", {flag: "a"})

      return {
         err: null
      }
   }

   /**
    * Dump lowdb data to CSV file
    * @param {Object} options
    * @param {Object} options.memdb     - instance of lowdb
    * @param {String} options.outputFile     - output transactions in CSV format
    * @return {Error|null} err
    */
   async writeCSV({memdb, outputFile})
   {
      const csvWriter = csv.createObjectCsvWriter({
         path: outputFile,
         header: [
            {id: "txHash", title: "Transaction Hash"},
            {id: "ownerAddr", title: "Owner"},
            {id: "fromAddr", title: "From addr"},
            {id: "fromName", title: "From name"},
            {id: "toAddr", title: "To"},
            {id: "toName", title: "To name"},
            {id: "timeStamp", title: "TimeStamp"},
            {id: "dateTimeUTC", title: "DateTimeUTC"},
            {id: "isError", title: "In Error State"},
            {id: "tokenTrans", title: "tokenTrans"},

            {id: "tokenSymbol", title: "Token Symbol"},
            {id: "tokenValue", title: "Token Value"},
            {id: "tokenFromName", title: "Token From Name"},
            {id: "tokenToName", title: "Token To Name"},

            {id: "etherValue", title: "Value, Ether"},
            {id: "txFee", title: "TX Fee, Ether"},
            {id: "gas", title: "Gas"},
            {id: "gasPrice", title: "Gas price, Gwei"},
            {id: "gasUsed", title: "Gas used"},
            {id: "nonce", title: "nonce"},
            {id: "blockNumber", title: "Block Number"},
            {id: "ethPrice", title: "ETH price, USD"},

            {id: "tokenAddr", title: "Token Contract Address"},
            {id: "tokenFromAddr", title: "Token From Address"},
            {id: "tokenToAddr", title: "Token To Address"},
         ],
         fieldDelimiter: ";"
      })
      const lines = memdb.get("txs").sortBy("timeStamp").value()
      for (let i = 0; i < lines.length; i++) {
         await csvWriter.writeRecords([lines[i]])
      }

      return {
         err: null
      }
   }

   /**
    * Read eth addresses from input file and export transactions to CSV file
    * Works with etherscan API in parallels. Number of parralels requests is equal to number of ehterscan.io accounts.
    *
    * @param {Object} options
    * @param {String} options.inputFile      - "\n" divided list of eth addresses
    * @return {Object} result
    * @return {Error|null} result.err
    * @return {Number} result.ethAddrCount          - total addresses proceeded
    * @return {Number} result.txCount               - total transactions for all eth addrs
    * @return {Object} result.memdb               - instance of lowdb
    */
   async getTXsFromFile({inputFile})
   {
      if (!fs.existsSync(inputFile)) {
         return {
            err: new Error(`Source file "${inputFile}" not found`)
         }
      }

      const memdb = lowdb(new LowDbMemory())
      memdb.defaults({txs: []}).write()

      let ethAddrList = fs.readFileSync(inputFile)
         .toString()
         .replace(/[\r]/g, "")
         .split(/[\n]/)
         .map(v => v.trim().toLowerCase())
         .filter(v => v.match(/^0x[0-9a-z]+/i))

      log(`Start data collection in ${opt.etherscanAccs.length} threads...`)

      let totalTxs = 0

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++) {
         const ownerAddress = ethAddrList[addr_i]

         // wait semaphore unblocking
         let acc = await etherscanAPI.takeAcc()
         // Start parallel task for each ethaddr
         void async function (acc) {
            // get all TXs for current ethaddr
            let qres = await etherscanAPI.getTxListByAddr({
               acc,
               ethaddr: ownerAddress,
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
                        timeStamp: v.timeStamp,
                        dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                        ownerAddr: ownerAddress,
                        contractAddressApi: v.contractAddress,
                        gas: v.gas * 1,
                        gasPrice: xx.toFixed(v.gasPrice / 1e9),
                        gasUsed: v.gasUsed * 1,
                        nonce: v.nonce,
                        isError: v.isError * 1 ? "yes" : "",
                        txFee: txd.txFee,
                        fromAddr: txd.from,
                        toAddr: txd.to,
                        fromName: txd.fromName,
                        toName: txd.toName,
                        etherValue: txd.etherValue,
                        ethPrice: txd.etherUsdPrice,
                        tokenFromAddr: "",
                        tokenToAddr: "",
                        tokenFromName: "",
                        tokenToName: "",
                        tokenSymbol: "",
                        tokenAddr: "",
                        tokenValue: "",
                        tokenTrans: "no",
                     }
                     if (txv.txFee !== txd.txFee) {
                        log.w(`[getTXsFromFile]: api_tx_fee != html_tx_fee :: tx=${v.hash}`)
                     }

                     if (txd.tokens) {
                        txd.tokens.forEach(v => {
                           const row = Object.assign({}, txv, {
                              tokenSymbol: v.for.symbol,
                              tokenAddr: v.for.tokenAddr,
                              tokenValue: v.for.value,
                              tokenFromAddr: v.from.addr,
                              tokenToAddr: v.to.addr,
                              tokenFromName: v.from.name,
                              tokenToName: v.to.name,
                              tokenTrans: "yes"
                           })
                           memdb.get("txs").push(row).write()
                        })
                     }
                     else {
                        memdb.get("txs").push(txv).write()
                     }


                     totalTxs++

                  }(acc)


               }
               if (qres.data.result.length >= 9998) {
                  log.w(`The ETH address "${ownerAddress}" has more than 10000 txs`).flog()
               }
               log(`${ownerAddress} done via ${qres.acc.viaHost}: total txs=${qres.data.result.length}`)

            }
            else {
               log.e(`[EtherscanAPI.loadTXsToCSV]: API ERROR for ETH address "${ownerAddress}" (line ${addr_i + 1}) ::  code=${qres.response.errorCode}, message=${qres.response.errorMessage}, APIstatus=${qres.data.status ? qres.data.status : "---"}, APImessage=${qres.data.message ? qres.data.message : "---"}, APIResult=${qres.data.result ? qres.data.result : "---"} via ${qres.acc.viaHost}`).flog();
               process.exit(-2)
            }

         }(acc).catch(e => {
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
         ethAddrCount: ethAddrList.length,
         txCount: totalTxs,
         memdb
      }
   }

   /**
    *
    * @param {string} symbol
    * @param {boolean} tokenTrans
    * @param {string} from
    * @param {string} to
    * @param {string} owner
    * @param {boolean} isError
    * @param {number} value
    * @return {string}
    */
   getTxType({symbol, tokenTrans, from, to, owner, isError, value})
   {
      if (1 * isError || !(1 * value)) {
         return "unknown"
      }
      if (tokenTrans) {
         if (opt.DepositOrWithdrawlSymbols.map(v => v.test(symbol)).includes(true)) {
            return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit
         }

         return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit

      }
      else {
         return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit
      }

      return "unknown"
   }

}

export default new ExportEtherTxs()