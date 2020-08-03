import Q from "axios"
import querystring from "querystring"
import etherscanAcc from "~src/EtherscanAccount.mjs"
import csv from "csv-writer"
import fs from "fs"
import log from "~lib/log.cjs"
import {Semaphore} from "async-mutex"
import opt from "~root/config.mjs"
import xx from "~lib/tools.cjs"


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
 * @property {EtherscanTXResponse[]|null} result
 */

/**
 * @typedef {Object} EtherscanTXResponse
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
 * Etherscan multi account parser library
 */
class EtherscanAPI
{


   constructor()
   {
      this.queryDefaults = {
         timeout: 2000,
         proxy: null,
      }
      this.accBusyCount = opt.etherscanAccs.length
   }


   /**
    * Get page list of ETH transactions for specified account
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {String} [options.sort=asc]           - sort result
    * @param {Number} [options.page]        - page number, started at 1
    * @param {Number} [options.limit=2000]  - results on page
    * @return {Object} response
    * @return {Object} response.data        - etherscan result
    * @return {Number} response.status      - http or net result code (200  is ok)
    * @return {String} response.statusText  - http or net result text
    * @return {Object} response.request     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    */
   async getTXListByAddr({ethaddr, page = null, limit = null, sort = 'asc'})
   {
      if (page === null || limit === null)
      {
         [page, limit] = [1, 10000]
      }
      let acc = await etherscanAcc.takeAcc()
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
      this.accBusyCount--
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)
      this.accBusyCount++
      etherscanAcc.releaseAcc(acc)

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
               id: "from", title: "from"
            },
            {
               id: "to", title: "to"
            },
            {
               id: "blockNumber", title: "blockNumber"
            },
            {
               id: "timeStamp", title: "timeStamp"
            },
            {
               id: "dateTimeUTC", title: "dateTimeUTC"
            },
            {
               id: "value", title: "value"
            },
            {
               id: "txHash", title: "TransactionHash"
            },
            {
               id: "contractAddress", title: "contractAddress"
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
      const semph = new Semaphore(opt.etherscanAccs.length)
      let totalTxs = 0

      for (let addr_i = 0; addr_i < ethAddrList.length; addr_i++)
      {
         const addr = ethAddrList[addr_i]
         const [semphValue, releaseFunc] = await semph.acquire()
         ;
         (async (releaseFunc) =>
         {
            //log(`${addr} start`)
            const qres = await this.getTXListByAddr({
               ethaddr: addr,
               sort: 'desc',
            })
            releaseFunc()
            if (qres.response.status === 200 && qres.response.data.status === "1")
            {
               let bufLines = []
               for (let txline = 0; txline < qres.response.data.result.length; txline++)
               {
                  const v = qres.response.data.result[txline]
                  bufLines.push({
                     from: v.from,
                     to: v.to,
                     blockNumber: v.blockNumber,
                     timeStamp: v.timeStamp,
                     dateTimeUTC: xx.tss2dt(v.timeStamp * 1),
                     value: v.value,
                     txHash: v.hash,
                     contractAddress: v.contractAddress,
                  })
                  totalTxs++
               }
               await csvWriter.writeRecords(bufLines)
               if (qres.response.data.result.length >= 9998)
               {
                  log.w(`The ETH address "${addr}" has more than 10000 txs`).flog()
               }
               log(`${addr} done via ${qres.acc.viaHost}: txs=${qres.response.data.result.length}`)
            }
            else
            {
               log.e(`[EtherscanAPI.loadTXsToCSV]: API ERROR for ETH address "${addr}" (line ${addr_i + 1}) ::  code=${qres.response.status}, message=${qres.response.statusText}, APIstatus=${qres.response.data ? qres.response.data.status : '---'}, APImessage=${qres.response.data ? qres.response.data.message : '---'} via ${qres.acc.viaHost}`).flog()
               process.exit(-2)
            }

         })(releaseFunc).catch(e =>
         {
            log.t(e).flog()
            process.exit(-1)
         })
      }


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