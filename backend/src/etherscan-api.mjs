import request from "./request.mjs"
import querystring from "querystring"
import opt from "../../config.mjs"
import xx from "jsm_xx";
import log from "jsm_log"
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
class EtherscanApi
{


   constructor()
   {
      this.queryDefaults = {
         timeout: opt.etherscanAPIRequestTimeout,
         proxy: null
      }
      this.accs = opt.etherscanAccs.map(v => Object.assign({}, v, {
         lastHitTS: null,
         lastQueryTS: null,
         lastReleaseTS: null,
         releaseFunc: null,
         v: null,
         __opts: (() => {
            let res = {}
            if (v.viaHost.toLowerCase() !== 'localhost') {
               res.proxy = `http://${v.viaUser && v.viaPassword ? `${v.viaUser}:${v.viaPassword}@` : ""}${v.viaHost}:${v.viaPort}`
            }
            return res
         })()
      }))
      this.accFreeCount = this.accs.length
      this.accFreeSemph = new Semaphore(this.accs.length)
      this.debug = false
   }

   /**
    * cast value to humman readable state
    *
    * @param {Number} value
    * @param {Number} decimals
    * @return {number}
    */
   static valueCast(value, decimals = null)
   {
      if (decimals) {
         return xx.toFixed(value / (`1e${decimals}`))
      }

      return xx.toFixed(value / 1e18)
   }

   setDebug(debugOn)
   {
      this.debug = debugOn
      return this
   }

   someTaskInProgress()
   {
      return this.accFreeCount < opt.etherscanAccs.length
   }

   getFreeAcc()
   {
      for (let i = 0; i < this.accs.length; i++) {
         if (this.accs[i].v === null) {
            return this.accs[i]
         }
      }

      return false

   }

   async takeAcc()
   {
      if (this.debug) log.d(`[EtherscanAPI.takeAcc]: wanna take acc, accCount=${this.accFreeCount}`)
      const [value, releaseFunc] = await this.accFreeSemph.acquire()
      let acc = this.getFreeAcc()
      if (!acc) {
         throw new Error(`[EtherscanAPI.takeAcc]: no free account`)

      }
      this.accFreeCount--
      acc.v = value
      acc.releaseFunc = releaseFunc
      const ts = xx.tsNow()

      if ((ts - acc.lastQueryTS) < opt.etherscanAPIRestDelayTS) {
         throw new Error(`[EtherscanAPI.takeAcc]: account '${acc.viaHost}' still not rested, delta=${ts - acc.lastQueryTS}`, acc)
      }
      acc.lastHitTS = ts

      if (this.debug) log.d(`[EtherscanAPI.takeAcc]: took acc(${acc.viaHost}), accCount=${this.accFreeCount} :: v = ${acc.v} :: after ${ts - acc.lastQueryTS} ms`)

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
      if (this.debug) log.d(`[EtherscanAPI.releaseAcc]: going to rest ${acc.viaHost}`)
      await xx.timeoutAsync(opt.etherscanAPIRestDelayTS + 300)
      acc.v = null
      acc.releaseFunc()
      acc.releaseFunc = null
      this.accFreeCount++
      acc.lastReleaseTS = xx.tsNow()
      if (this.debug) log.d(`[EtherscanAPI.releaseAcc]: released acc(${acc.viaHost}), accCount=${this.accFreeCount}`)
   }

   /**
    * @param {string} addr
    * @param {Account} acc
    * @return {Object} response
    * @return {EtherscanResponse} response.data             - etherscan result
    * @return {EtherscanTokenResponse} response.data.result - token Info
    * @return {Number} response.status                      - http or net result code (200  is ok)
    * @return {String} response.statusText                  - http or net result text
    * @return {Object} response.request                     - response object
    * @return {Object} ret
    * @return {QResponse} ret.response
    * @return {Account} ret.acc
    * @return {EtherscanTokenResponse} ret.data
    */
   async getTokenInfo(addr, acc)
   {
      const params = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "tokentx",
         contractaddress: addr,
         page: 1,
         offset: 1
      })
      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let response = await request.get(`https://api.etherscan.io/api?${params}`, options)

      let data = {
         name: "",
         symbol: ""
      }
      if(!response.error) response.body = JSON.parse(response.body)
      if (response.body.result && xx.isArray(response.body.result) && response.body.result.length === 1) {
         data = {
            name: response.body.result[0].tokenName,
            symbol: response.body.result[0].tokenSymbol
         }
      }

      return {
         response,
         acc,
         data
      }

   }

   /**
    * Get page list of ETH transactions for specified address
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {Account} options.acc
    * @param {String} [options.sort=asc]    - sort result
    * @param {Number} [options.page=1]        - page number, started at 1
    * @param {Number} [options.limit=10000]  - results on page
    * @return {Object} ret
    * @return {QResponse} ret.response
    * @return {object} ret.data    - decoded json etherscan response
    * @return {Account} ret.acc
    */
   async getTxListByAddr({ethaddr, page = null, limit = null, sort = "asc", acc})
   {
      if (page === null || limit === null) {
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
      let response = await request.get(`https://api.etherscan.io/api?${url}`, options)

      return {
         response,
         acc,
         data: response.error ? {} : JSON.parse(response.body)
      }
   }

   /**
    * Get page list of ERC20 token transactions for specified address
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {Account} options.acc
    * @param {String} [options.sort=asc]    - sort result
    * @param {Number} [options.page=1]        - page number, started at 1
    * @param {Number} [options.limit=10000]  - results on page
    * @param {string} [options.type=ERC20]  - token type
    * @return {Object} response
    * @return {EtherscanResponse} response.data        - etherscan result
    * @return {EtherscanTxTokenResponse[]} response.data.result - txs array
    * @return {Number} response.status      - http or net result code (200  is ok)
    * @return {String} response.statusText  - http or net result text
    * @return {Object} response.request     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    */
   async getTxTokenListByAddr({ethaddr, page = null, limit = null, sort = "asc", acc, type = "ERC20"})
   {
      if (page === null || limit === null) {
         [page, limit] = [1, 10000]
      }
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: type === "ERC721" ? "tokennfttx" : "tokentx",
         startblock: 0,
         endblock: 999999999,
         sort: sort,
         address: ethaddr,
         page: page,
         offset: limit
      })

      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let response = await request.get(`https://api.etherscan.io/api?${url}`, options)

      return {
         response,
         acc,
         data: response.error ? {} : JSON.parse(response.body)
      }
   }


   /**
    * Get block balance for specified address // NEED PRO
    * @param {Object} options
    * @param {String} options.ethaddr       - ETH address
    * @param {number} options.blockNo
    * @param {Account} options.acc
    * @return {Object} response
    * @return {EtherscanResponse} response.data        - etherscan result
    * @return {EtherscanTxTokenResponse[]} response.data.result - txs array
    * @return {Number} response.status      - http or net result code (200  is ok)
    * @return {String} response.statusText  - http or net result text
    * @return {Object} response.request     - response object
    * @return {Account} acc
    * @return {String} queryUrl
    */
   async getBlockBalance({ethaddr, blockNo, acc})
   {
      const url = querystring.encode({
         apikey: acc.apiKey,
         module: "account",
         action: "balancehistory",
         address: ethaddr,
         blockno: blockNo,
      })

      const options = Object.assign({}, this.queryDefaults, acc.__opts)
      let response = await request.get(`https://api.etherscan.io/api?${url}`, options)

      return {
         response,
         acc,
         data: response.error ? {} : JSON.parse(response.body)
      }
   }


}

export default new EtherscanApi
