import opt from "../../config.mjs";
import log from "../../lib/log.cjs"
import xx from "../../lib/tools.cjs";
import csv from "csv-writer"
import fs from "fs"
import etherscanAPI from "./EtherscanAPI.mjs"


class ExportEtherTxs {

   constructor()
   {
   }

   /**
    * Read eth addresses from input file and export transactions to CSV file
    * Works with etherscan API in parallels. Number of parralels requests is equal to number of ehterscan.io accounts.
    *
    * @param {Object} options
    * @param {String} options.inputFile      - "\n" divided list of eth addresses
    * @param {String} options.outputFile     - output transactions in CSV format
    * @return {Error|null} err
    * @return {Number} ethAddrCount          - total addresses proceeded
    * @return {Number} txCount               - total transactions lines exported to file
    */
   async loadTXsToCSV({inputFile, outputFile})
   {
      if (!fs.existsSync(inputFile))
      {
         return {
            err: new Error(`Source file "${inputFile}" not found`)
         }
      }

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
               id: "blockNumber", title: "Block Number"
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
               id: "txHash", title: "Transaction Hash"
            },
            {
               id: "nonce", title: "nonce"
            },
            {
               id: "contractAddress", title: "Contract Address"
            }
         ],
         fieldDelimiter: ";"
      })


      let ethAddrList = fs.readFileSync(inputFile)
         .toString()
         .replace(/[\r]/g, "")
         .split(/[\n]/)
         .map(v => `${v.trim()}`)
         .filter(v => v.match(/^0x[0-9a-z]+/i))

      log(`Start data collection in ${opt.etherscanAccs.length} threads...`)

      let totalTxs = 0
      let txsList = []

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
               let bufLines = []
               let hasTokens = false
               let dumpedTxs = 0
               let txs = []
               for (let txline = 0; txline < qres.response.data.result.length; txline++)
               {
                  const v = qres.response.data.result[txline]
                  if (1 * v.isError)
                  {
                     log.w(`TxHash = ${v.hash} in error state, skipped it`)
                     continue
                  }
                  let coinInfo = {symbol: "ETH", name: "Ethereum", memo: ""}
                  if (v.value * 1)
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
                        if (!etherscanAPI.contrAddrs[checkAddr])
                        {
                           contrAddrInList = false
                           acc = await etherscanAPI.takeAcc()
                           await etherscanAPI.getTokenInfo({addr: checkAddr, acc})
                           etherscanAPI.releaseAcc(acc)

                        }
                        if (etherscanAPI.contrAddrs[checkAddr])
                        {
                           let info = etherscanAPI.contrAddrs[checkAddr]
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
                     let fee = 0
                     if(!txsList.includes(v.hash))
                     {
                        txsList.push((v.hash))
                        fee = xx.toFixed(v.gasUsed * v.gasPrice / 1e18)
                     }
                     bufLines.push({
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
                     })
                     dumpedTxs++
                     totalTxs++
                     txs.push(v.hash)
                  }
                  else
                  {
                     hasTokens = true
                  }
               }
               if (bufLines.length)
               {
                  await csvWriter.writeRecords(bufLines)
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
                     let bufLines = []
                     for (let txline = 0; txline < qres.response.data.result.length; txline++)
                     {
                        const v = qres.response.data.result[txline]


                        if (!txs.includes(v.hash)) // dont overwrite on previous step added transaction // check this out https://etherscan.io/tx/0x00e825ecf6e0d9f91256893f7d41eba877252b0d014d0aaa242148067ac62a8a
                        {
                           let fee = 0
                           if(!txsList.includes(v.hash))
                           {
                              txsList.push((v.hash))
                              fee = xx.toFixed(v.gasUsed * v.gasPrice / 1e18)
                           }
                           bufLines.push({
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
                           })
                           dumpedTxs++
                           totalTxs++
                        }
                     }
                     if (bufLines.length)
                     {
                        await csvWriter.writeRecords(bufLines)
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
         txCount: totalTxs
      }
   }

}

export default new ExportEtherTxs()