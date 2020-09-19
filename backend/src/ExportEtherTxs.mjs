import opt from "../../config.mjs";
import log from "jsm_log"
import xx from "jsm_xx";
import csv from "csv-writer"
import fs from "fs"
import etherscanAPI from "./EtherscanAPI.mjs"
import lowdb from "lowdb"
import LowDbMemory from "lowdb/adapters/Memory.js"

/**
 * Export Ether transactions using Etherscan.io API
 */
class ExportEtherTxs
{

   constructor()
   {
      this.contrAddrs = Object.create(null)
      this.txTypesEnum = {
         buy: "Buy",
         sell: "Sell",
         deposit: "Deposit",
         withdrawal: "Withdrawal",
         trade: "Trade"
      }
      this.txsListFee = Object.create(null)
   }

   async writeComputisDataFile({memdb, outputFile})
   {
      let line = 0
      fs.writeFileSync(outputFile, "[\n")
      const lines = memdb.get("txs").sortBy("timeStamp").value()
      for (let i = 0; i < lines.length; i++)
      {
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

         if (v.value && !v.isError)
         {
            switch (v.txType)
            {
               case this.txTypesEnum.deposit:
                  row.txType = this.txTypesEnum.deposit
                  row.debitAccount = opt.computisDefauts.debitAccount
                  row.debitAsset = v.symbol
                  row.debitAmount = v.value
                  row.creditAccount = "Transfer"
                  if (this.txsListFee[v.txHash])
                  {
                     row.txFeeAccount = opt.computisDefauts.debitAccount
                     row.txFeeAmount = this.txsListFee[v.txHash]
                     row.txFeeAsset = v.symbol
                  }
                  break

               case this.txTypesEnum.withdrawal:
                  row.txType = this.txTypesEnum.withdrawal
                  row.creditAccount = opt.computisDefauts.debitAccount
                  row.creditAsset = v.symbol
                  row.creditAmount = v.value
                  row.debitAccount = "Transfer"
                  if (this.txsListFee[v.txHash])
                  {
                     row.txFeeAccount = opt.computisDefauts.debitAccount
                     row.txFeeAmount = this.txsListFee[v.txHash]
                     row.txFeeAsset = v.symbol
                  }

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
            {
               id: "owner", title: "Owner"
            },
            {
               id: "from", title: "From"
            },
            {
               id: "to", title: "To"
            },
            {
               id: "isToken", title: "isToken"
            },
            {
               id: "timeStamp", title: "TimeStamp"
            },
            {
               id: "dateTimeUTC", title: "DateTimeUTC"
            },
            {
               id: "value", title: "Value"
            },
            {
               id: "symbol", title: "Coin Symbol"
            },
            {
               id: "name", title: "Coin Name"
            },
            {
               id: "txType", title: "Tx type"
            },
            {
               id: "fee", title: "Fee, Ether"
            },
            {
               id: "gas", title: "Gas"
            },
            {
               id: "gasPrice", title: "Gas price, Gwei"
            },
            {
               id: "gasUsed", title: "Gas used"
            },
            {
               id: "isError", title: "In Error State"
            },
            {
               id: "txHash", title: "Transaction Hash"
            },
            {
               id: "nonce", title: "nonce"
            },
            {
               id: "blockNumber", title: "Block Number"
            },
            {
               id: "contractAddress", title: "Contract Address"
            }
         ],
         fieldDelimiter: ";"
      })
      const lines = memdb.get("txs").sortBy("timeStamp").value()
      for (let i = 0; i < lines.length; i++)
      {
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
    * @return {Number} result.txCount               - total transactions lines exported to file
    * @return {Object} result.memdb               - instance of lowdb
    */
   async getTXsFromFile({inputFile})
   {
      if (!fs.existsSync(inputFile))
      {
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

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++)
      {
         const addr = ethAddrList[addr_i]

         // wait semaphore unblocking
         let acc = await etherscanAPI.takeAcc()
         ;
         // Start parallel task for each ethaddr
         (async (acc) =>
         {
            // get all TXs for current ethaddr
            let qres = await etherscanAPI.getTxListByAddr({
               acc,
               ethaddr: addr,
               sort: "desc"
            })
            etherscanAPI.releaseAcc(acc)
            if (qres.response.status === 200 && xx.isArray(qres.response.data.result))
            {
               let hasTokens = false
               let dumpedTxs = 0
               let txs = []
               for (let txline = 0; txline < qres.response.data.result.length; txline++)
               {
                  const v = qres.response.data.result[txline]

                  let coinInfo = {symbol: "ETH", name: "Ethereum", memo: ""}
                  if (v.value * 1 || v.isError * 1)
                  {
                     let checkAddr = ""
                     let contrAddrInList = true
                     if (v.to && v.to !== addr)
                     {
                        checkAddr = v.to
                     }
                     else if (v.from && v.from !== addr)
                     {
                        checkAddr = v.from
                     }
                     if (checkAddr)
                     {
                        // this addr is  contract addr
                        if (!this.contrAddrs[checkAddr])
                        {
                           contrAddrInList = false
                           acc = await etherscanAPI.takeAcc()
                           const res = await etherscanAPI.getTokenInfo({addr: checkAddr, acc})
                           this.contrAddrs[checkAddr] = res.response.data.result
                           etherscanAPI.releaseAcc(acc)
                        }
                        if (this.contrAddrs[checkAddr])
                        {
                           let info = this.contrAddrs[checkAddr]
                           if (info.symbol)
                           {
                              coinInfo.memo = `${info.symbol} (${info.name})`
                              if (!contrAddrInList)
                              {
                                 log(`Memo=${coinInfo.memo}) for addr=${checkAddr}`)
                              }
                           }
                        }
                     }
                     let fee = xx.toFixed(v.gasUsed * v.gasPrice / 1e18)
                     this.txsListFee[v.hash] = fee

                     memdb.get("txs").push({
                        owner: addr,
                        from: v.from,
                        to: v.to,
                        blockNumber: v.blockNumber,
                        timeStamp: v.timeStamp,
                        dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                        value: etherscanAPI.valueCast({value: v.value}),
                        symbol: coinInfo.symbol,
                        name: coinInfo.name,
                        memo: coinInfo.memo,
                        txHash: v.hash,
                        contractAddress: v.contractAddress,
                        gas: v.gas,
                        gasPrice: xx.toFixed(v.gasPrice / 1e9),
                        gasUsed: v.gasUsed,
                        fee,
                        nonce: v.nonce,
                        isToken: "no",
                        isError: v.isError * 1 ? "yes" : "",
                        txType: this.getTxType({
                           symbol: coinInfo.symbol,
                           isToken: false,
                           from: v.from,
                           to: v.to,
                           owner: addr,
                           isError: v.isError,
                           value: v.value,
                        })
                     }).write()
                     dumpedTxs++
                     totalTxs++
                     txs.push(v.hash)
                  }
                  if (!(v.value * 1) && !(v.isError * 1))
                  {
                     hasTokens = true
                  }
               }
               if (qres.response.data.result.length >= 9998)
               {
                  log.w(`The ETH address "${addr}" has more than 10000 txs`).flog()
               }
               log(`${addr} done via ${qres.acc.viaHost}: total txs=${qres.response.data.result.length}, dumped txs=${dumpedTxs}`)

               if (hasTokens)
               {
                  acc = await etherscanAPI.takeAcc()
                  // get only token TXs for current ethaddr
                  qres = await etherscanAPI.getTxTokenListByAddr({
                     acc,
                     ethaddr: addr,
                     sort: "desc"
                  })
                  etherscanAPI.releaseAcc(acc)
                  if (qres.response.status === 200 && xx.isArray(qres.response.data.result))
                  {
                     let dumpedTxs = 0
                     for (let txline = 0; txline < qres.response.data.result.length; txline++)
                     {
                        const v = qres.response.data.result[txline]


                        if (!txs.includes(v.hash)) // dont overwrite on previous step added transaction // check this out https://etherscan.io/tx/0x00e825ecf6e0d9f91256893f7d41eba877252b0d014d0aaa242148067ac62a8a
                        {
                           let fee = xx.toFixed(v.gasUsed * v.gasPrice / 1e18)
                           this.txsListFee[v.hash] = fee

                           memdb.get("txs").push({
                              owner: addr,
                              from: v.from,
                              to: v.to,
                              blockNumber: v.blockNumber,
                              timeStamp: v.timeStamp,
                              dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                              value: etherscanAPI.valueCast({value: v.value, decimals: v.tokenDecimal}),
                              symbol: v.tokenSymbol,
                              name: v.tokenName,
                              memo: "",
                              txHash: v.hash,
                              contractAddress: v.contractAddress,
                              gas: v.gas,
                              gasPrice: xx.toFixed(v.gasPrice / 1e9),
                              gasUsed: v.gasUsed,
                              nonce: v.nonce,
                              fee: fee,
                              isToken: "yes",
                              isError: v.isError * 1 ? "yes" : "",
                              txType: this.getTxType({
                                 symbol: v.tokenSymbol,
                                 isToken: true,
                                 from: v.from,
                                 to: v.to,
                                 owner: addr,
                                 isError: v.isError,
                                 value: v.value,
                              })
                           }).write()
                           dumpedTxs++
                           totalTxs++
                        }
                     }
                     if (qres.response.data.result.length >= 9998)
                     {
                        log.w(`The ETH address "${addr}" has more than 10000 token txs`).flog()
                     }
                     log(`${addr} done via ${qres.acc.viaHost}: total token txs=${qres.response.data.result.length}, dumped token txs=${dumpedTxs}`)
                  }
               }
            }
            else
            {
               log.e(`[EtherscanAPI.loadTXsToCSV]: API ERROR for ETH address "${addr}" (line ${addr_i + 1}) ::  code=${qres.response.status}, message=${qres.response.statusText}, APIstatus=${qres.response.data ? qres.response.data.status : "---"}, APImessage=${qres.response.data ? qres.response.data.message : "---"} via ${qres.acc.viaHost}`).flog()
               process.exit(-2)
            }

         })(acc).catch(e =>
         {
            log.t(e).flog()
            process.exit(-1)
         })
      }

      // Wait while all account queries will be done
      for (; etherscanAPI.getFreeAccCount() < opt.etherscanAccs.length;)
      {
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
    * @param {boolean} isToken
    * @param {string} from
    * @param {string} to
    * @param {string} owner
    * @param {boolean} isError
    * @param {number} value
    * @return {string}
    */
   getTxType({symbol, isToken, from, to, owner, isError, value})
   {
      if (1 * isError || !(1 * value))
      {
         return "unknown"
      }
      if (isToken)
      {
         if (opt.DepositOrWithdrawlSymbols.map(v => v.test(symbol)).includes(true))
         {
            return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit
         }

         return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit

      }
      else
      {
         return from === owner ? this.txTypesEnum.withdrawal : this.txTypesEnum.deposit
      }

      return "unknown"
   }

}

export default new ExportEtherTxs()