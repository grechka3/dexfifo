import Q from "axios"
import querystring from "querystring"
import etherscanAcc from "../../backend/src/EtherscanAccount.mjs"
import csv from "csv-writer"
import fs from "fs"
import log from "../../lib/log.cjs"
import opt from "../../config.mjs"
import xx from "../../lib/tools.cjs"


/**
 * @typedef {Account} Account
 * @property {String} apiKey    - Etherscan API KEY
 * @property {String} viaHost   - Proxy addr
 * @property {String} viaPort   - Proxy port
 * @property {String} [viaUser]
 * @property {String} [viaPassword]
 */

/**
 * @typedef {Object} AxiosResponse
 * @property {Number} status
 * @property {String} statusText
 * @property {Object} headers
 * @property {Object} request
 * @property {String} data
 */


/**
 * @typedef {Object}  EtherscanResponse
 * @property {String} status
 * @property {String} message
 * @property {EtherscanTxResponse[]|EtherscanTokenResponse|null} result
 */

/**
 * @typedef {Object} EtherscanTxResponse
 * @property {Number} blockNumber
 * @property {Number} timeStamp
 * @property {String} hash
 * @property {Number} nonce
 * @property {String} blockHash
 * @property {Number} transactionIndex
 * @property {String} from
 * @property {String} to
 * @property {Number} value
 * @property {Number} gas
 * @property {Number} gasPrice
 * @property {Number} isError
 * @property {Number} txreceipt_status
 * @property {String} input
 * @property {String} contractAddress
 * @property {Number} cumulativeGasUsed
 * @property {Number} gasUsed
 * @property {Number} confirmations
 */

/**
 * @typedef {Object} EtherscanTxTokenResponse
 * @property {Number} blockNumber
 * @property {Number} timeStamp
 * @property {String} hash
 * @property {Number} nonce
 * @property {String} blockHash
 * @property {String} from
 * @property {String} contractAddress
 * @property {String} to
 * @property {Number} value
 * @property {String} tokenName
 * @property {String} tokenSymbol
 * @property {Number} tokenDecimal
 * @property {Number} transactionIndex
 * @property {Number} gas
 * @property {Number} gasPrice
 * @property {Number} gasUsed
 * @property {Number} cumulativeGasUsed
 * @property {String} input  - deprecated
 * @property {Number} confirmations
 */

/**
 * @typedef {Object} EtherscanTokenResponse
 * @property {String} tokenName
 * @property {String} tokenSymbol
 */


/**
 * Etherscan multi account parser library
 */
class EtherscanAPI
{


   constructor()
   {
      this.queryDefaults = {
         timeout: opt.etherscanRequestTimeout,
         proxy: null,
      }
      this.contrAddrs = Object.create(null)
   }


   /**
    * @return {Object} response
    * @return {EtherscanResponse} response.data             - etherscan result
    * @return {EtherscanTokenResponse} response.data.result - token Info
    * @return {Number} response.status                      - http or net result code (200  is ok)
    * @return {String} response.statusText                  - http or net result text
    * @return {Object} response.request                     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    * @return {EtherscanTokenResponse}
    */
   async getContractInfo({addr, acc})
   {
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "tokentx",
         contractaddress: addr,
         page: 1,
         offset: 1,
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      if (res.data && xx.isArray(res.data.result) && res.data.result.length === 1)
      {
         this.contrAddrs[addr] = res.data.result = {
            name: res.data.result[0].tokenName,
            symbol: res.data.result[0].tokenSymbol,
         }
      }
      else
      {
         if(!res.data) res.data = {}
         this.contrAddrs[addr] = res.data.result = {
            name: "",
            symbol: "",
         }
      }
      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc,
      }))
   }


   /**
    * Get page list of ETH transactions for specified address
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {Account} options.acc
    * @param {String} [options.sort=asc]    - sort result
    * @param {Number} [options.page=1]        - page number, started at 1
    * @param {Number} [options.limit=10000]  - results on page
    * @return {Object} response
    * @return {EtherscanResponse} response.data        - etherscan result
    * @return {EtherscanTxResponse[]} response.data.result - txs array
    * @return {Number} response.status      - http or net result code (200  is ok)
    * @return {String} response.statusText  - http or net result text
    * @return {Object} response.request     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    */
   async getTxListByAddr({ethaddr, page = null, limit = null, sort = 'asc', acc})
   {
      if (page === null || limit === null)
      {
         [page, limit] = [1, 10000]
      }
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "txlist",
         startblock: 0,
         endblock: 999999999,
         sort: sort,
         address: ethaddr,
         page: page,
         offset: limit,
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc,
      }))
   }

   /**
    * Get page list of token transactions for specified address
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {Account} options.acc
    * @param {String} [options.sort=asc]    - sort result
    * @param {Number} [options.page=1]        - page number, started at 1
    * @param {Number} [options.limit=10000]  - results on page
    * @return {Object} response
    * @return {EtherscanResponse} response.data        - etherscan result
    * @return {EtherscanTxTokenResponse[]} response.data.result - txs array
    * @return {Number} response.status      - http or net result code (200  is ok)
    * @return {String} response.statusText  - http or net result text
    * @return {Object} response.request     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    */
   async getTxTokenListByAddr({ethaddr, page = null, limit = null, sort = 'asc', acc})
   {
      if (page === null || limit === null)
      {
         [page, limit] = [1, 10000]
      }
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "tokentx",
         startblock: 0,
         endblock: 999999999,
         sort: sort,
         address: ethaddr,
         page: page,
         offset: limit,
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc,
      }))
   }

   /**
    * Reduce {AxiosResponse} and {AsiosError} response to one structure
    *
    * @param {Object} options
    * @param {AxiosResponse} options.response
    * @param {Account} options.acc
    * @return {Object} response
    * @return {EtherscanResponse} response.data
    * @return {Number} response.status       - http or net result code (200  is ok)
    * @return {String} response.statusText   - http or net result text
    * @return {Object} response.request      - response object
    * @return {Account} acc
    */
   qresult({response, acc})
   {
      if (response.code)
      {
         // net error
         response = {
            status: response.code,
            statusText: response.message,
            request: response.request,
            data: {result: null}
         }

      }
      else if (response.status !== 200)
      {
         // web error
         response = {
            status: response.response.status,
            statusText: response.response.statusText,
            request: response.request,
            data: {result: response.response.data}
         }
      }

      return {
         response,
         acc
      }
   }

   /**
    * @externs
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
            err: new Error(`Source file "${inputFile}" not found`),
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
               id: "memo", title: "Memo"
            },
            {
               id: "txHash", title: "Transaction Hash"
            },
            {
               id: "contractAddress", title: "Contract Address"
            },
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

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++)
      {
         const addr = ethAddrList[addr_i]

         // wait semaphore unblocking
         let acc = await etherscanAcc.takeAcc()
         ;
         // Start parallel task for each ethaddr
         (async (acc) =>
         {
            // get all TXs for current ethaddr
            let qres = await this.getTxListByAddr({
               acc,
               ethaddr: addr,
               sort: 'desc',
            })
            etherscanAcc.releaseAcc(acc)
            if (qres.response.status === 200 && xx.isArray(qres.response.data.result))
            {
               let bufLines = []
               let hasTokens = false
               let dumpedTxs = 0
               let txs = []
               for (let txline = 0; txline < qres.response.data.result.length; txline++)
               {
                  const v = qres.response.data.result[txline]
                  let coinInfo = {symbol: "ETH", name: "Ethereum", memo: ""}
                  if (v.value*1)
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
                           acc = await etherscanAcc.takeAcc()
                           await this.getContractInfo({addr: checkAddr, acc})
                           etherscanAcc.releaseAcc(acc)

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
                     bufLines.push({
                        owner: addr,
                        from: v.from,
                        to: v.to,
                        blockNumber: v.blockNumber,
                        timeStamp: v.timeStamp,
                        dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                        value: v.value,
                        symbol: coinInfo.symbol,
                        name: coinInfo.name,
                        memo: coinInfo.memo,
                        txHash: v.hash,
                        contractAddress: v.contractAddress,
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
                  acc = await etherscanAcc.takeAcc()
                  // get only token TXs for current ethaddr
                  qres = await this.getTxTokenListByAddr({
                     acc,
                     ethaddr: addr,
                     sort: 'desc',
                  })
                  etherscanAcc.releaseAcc(acc)
                  if (qres.response.status === 200 && xx.isArray(qres.response.data.result))
                  {
                     let dumpedTxs = 0
                     let bufLines = []
                     for (let txline = 0; txline < qres.response.data.result.length; txline++)
                     {
                        const v = qres.response.data.result[txline]


                        if(!txs.includes(v.hash)) // dont overwrite on previous step added transaction // check this out https://etherscan.io/tx/0x00e825ecf6e0d9f91256893f7d41eba877252b0d014d0aaa242148067ac62a8a
                        {
                           bufLines.push({
                              owner: addr,
                              from: v.from,
                              to: v.to,
                              blockNumber: v.blockNumber,
                              timeStamp: v.timeStamp,
                              dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                              value: v.value,
                              symbol: v.tokenSymbol,
                              name: v.tokenName,
                              memo: "",
                              txHash: v.hash,
                              contractAddress: v.contractAddress,
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
               log.e(`[EtherscanAPI.loadTXsToCSV]: API ERROR for ETH address "${addr}" (line ${addr_i + 1}) ::  code=${qres.response.status}, message=${qres.response.statusText}, APIstatus=${qres.response.data ? qres.response.data.status : '---'}, APImessage=${qres.response.data ? qres.response.data.message : '---'} via ${qres.acc.viaHost}`).flog()
               process.exit(-2)
            }

         })(acc).catch(e =>
         {
            log.t(e).flog()
            process.exit(-1)
         })
      }

      // Wait while all account queries will be done
      for (; etherscanAcc.getFreeAccCount() < opt.etherscanAccs.length;)
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

export default EtherscanAPI
