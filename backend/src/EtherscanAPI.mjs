import Q from "axios"
import querystring from "querystring"
import opt from "../../config.mjs"
import xx from "jsm_xx";
import HttpsProxyAgent from "https-proxy-agent";
import {Semaphore} from "async-mutex";


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
         proxy: null
      }
      this.accs = opt.etherscanAccs.map(v => Object.assign({}, v, {
         lastHitTS: null,
         lastQueryTS: null,
         lastReleaseTS: null,
         releaseFunc: null,
         v: null,
         __opts: (() =>
         {
            let res = {}
            if (v.viaHost.toLowerCase() !== 'localhost')
            {
               res.httpsAgent = new HttpsProxyAgent(`http://${v.viaUser && v.viaPassword ? `${v.viaUser}:${v.viaPassword}@` : ""}${v.viaHost}:${v.viaPort}`)
            }
            return res
         })()
      }))
      this.accFreeCount = this.accs.length
      this.accFreeSemph = new Semaphore(this.accs.length)

   }

   getFreeAcc()
   {
      for (let i = 0; i < this.accs.length; i++)
      {
         if (this.accs[i].v === null)
         {
            return this.accs[i]
         }
      }

      return false

   }

   async takeAcc()
   {
      //log(`wanna take acc, accCount=${this.accFreeCount}`)
      const [value, releaseFunc] = await this.accFreeSemph.acquire()
      let acc = this.getFreeAcc()
      if (!acc)
      {
         throw new Error(`[EtherscanAPI.takeAcc]: no free account`)

      }
      this.accFreeCount--
      acc.v = value
      acc.releaseFunc = releaseFunc
      const ts = xx.tsNow()

      if ((ts - acc.lastQueryTS) < opt.etherscanRestDelayTS)
      {
         throw new Error(`[EtherscanAPI.takeAcc]: account '${acc.viaHost}' still not rested, delta=${ts - acc.lastQueryTS}`, acc)
      }
      acc.lastHitTS = ts

      //log(`took acc(${acc.viaHost}), accCount=${this.accFreeCount} :: v = ${acc.v} :: after ${ts - acc.lastQueryTS} ms`)

      return acc

   }

   /**
    *
    * @param {Account} acc
    * @returns {Promise<void>}
    */
   async releaseAcc(acc)
   {
      acc.lastQueryTS = xx.tsNow()
      //log(`going to rest ${acc.viaHost}`).flog()
      await xx.timeoutAsync(opt.etherscanRestDelayTS + 300)
      acc.v = null
      acc.releaseFunc()
      acc.releaseFunc = null
      this.accFreeCount++
      acc.lastReleaseTS = xx.tsNow()
      //log(`released acc(${acc.viaHost}), accCount=${this.accFreeCount}`)
   }

   getFreeAccCount()
   {
      return this.accFreeCount
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
   async getTokenInfo({addr, acc})
   {
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "tokentx",
         contractaddress: addr,
         page: 1,
         offset: 1
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      if (res.data && xx.isArray(res.data.result) && res.data.result.length === 1)
      {
         res.data.result = {
            name: res.data.result[0].tokenName,
            symbol: res.data.result[0].tokenSymbol
         }
      }
      else
      {
         if (!res.data)
         {
            res.data = {}
         }
         res.data.result = {
            name: "",
            symbol: ""
         }
      }
      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc
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
   async getTxListByAddr({ethaddr, page = null, limit = null, sort = "asc", acc})
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
         offset: limit
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc
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
   async getTxTokenListByAddr({ethaddr, page = null, limit = null, sort = "asc", acc})
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
         offset: limit
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let res = await Q.get(`https://api.etherscan.io/api?${url}`, options).catch(e => e)

      return Object.assign({queryUrl: url}, this.qresult({
         response: res,
         acc
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
    * cast value to humman readable state
    *
    * @param {Number} value
    * @param {Number} decimals
    * @return {number}
    */
   valueCast({value, decimals = null})
   {
      if (decimals)
      {
         return xx.toFixed(value / (`1e${decimals}`))
      }

      return xx.toFixed(value / 1e18)
   }


}

export default new EtherscanAPI
