import log from "jsm_log"
import xx from "jsm_xx"
import opt from "../../config.mjs"
import {Semaphore} from "async-mutex";
import querystring from "querystring"
import request from "./Request.mjs"
import cheerio from "cheerio"

/**
 * Etherscan.io HTML praser
 */


/**
 * @typedef QResponse
 * @property
 */
class EtherscanParser
{
   constructor()
   {
      this.queryDefaults = {
         timeout: opt.etherscanParseRequestTimeout,
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
    *
    * @param {string} txhash
    * @param {RequestOpts} [requestOpts]
    * @return {Object} ret
    * @return {number} ret.etherValue
    * @return {number} ret.etherUsdPrice
    * @return {number} ret.txFee
    * @return {string} ret.from
    * @return {string} ret.fromName
    * @return {string} ret.to
    * @return {string} ret.toName
    * @return {object[]} ret.tokens
    * @return {object} ret.tokens.from
    * @return {string} ret.tokens.from.addr
    * @return {string} ret.tokens.from.name
    * @return {object} ret.tokens.to
    * @return {string} ret.to.from.addr
    * @return {string} ret.to.from.name
    * @return {object} ret.tokens.for
    * @return {number} ret.tokens.for.value
    * @return {string} ret.tokens.for.symbol
    * @return {string} ret.tokens.for.tokenAddr
    */
   async getDataFromTxPage(txhash, requestOpts = {})
   {
      if(this.debug) log.d(`[EtherscanParser.getDataFromTxPage]: start tx="${txhash}" via '${requestOpts.proxy ? requestOpts.proxy : "localhost"}'`)
      const url = `https://etherscan.io/tx/${txhash}`
      const options = Object.assign({}, this.queryDefaults, requestOpts)
      let res = await request.get(url, options)
      if (res.error) return res
      res._result = null
      const $ = cheerio.load(res.body)
      res = {}
      let $tmp
      res.etherValue = $(`#ContentPlaceHolder1_spanValue > span `).text().match(/([0-9\.\,]+)/)
      res.etherValue = null === res.etherValue ? -1 : res.etherValue[1] * 1
      res.etherUsdPrice = $(`#ContentPlaceHolder1_spanClosingPrice`).html().match(/([0-9\.]+)/)
      res.etherUsdPrice = null === res.etherUsdPrice ? -1 : res.etherUsdPrice[1] * 1
      res.txFee = $(`#ContentPlaceHolder1_spanTxFee > span`).text().match(/([0-9\.]+)/)
      res.txFee = null === res.txFee ? -1 : res.txFee[1] * 1

      const $addressCopy = $(`#addressCopy`)
      res.from = $addressCopy.text()
      const $addressCopyParent = $addressCopy.closest("div")
      $addressCopyParent.find('span, a').remove()
      res.fromName = $addressCopyParent.html().trim().replace(/[\(\)]/g, "")

      const $contractCopy = $(`#contractCopy`)
      res.to = $contractCopy.text()
      res.toName = $contractCopy.siblings("span.mr-1").text().replace(/[\(\)]/g, "")


      $tmp = $(`.row i[data-content*="token transferred"]`)
      if ($tmp.length) {
         res.tokens = []
         $tmp = $tmp.closest(`div.row`).find(`#wrapperContent li`)

         $tmp.each((k, li) => {
            const $cols = $(li).find('.media-body > *')

            let token = {from: {}, to: {}, for: {}}
            let $el
            $el = $($cols[1]).find(`a`)
            token.from.addr = "0x" + $el.attr("href").replace(/(.*)0x/, "")
            token.from.name = $el.text().replace(token.from.addr, "").replace("()", "").trim()

            $el = $($cols[3]).find(`a`)
            token.to.addr = "0x" + $el.attr("href").replace(/(.*)0x/, "")
            token.to.name = $el.text().replace(token.to.addr, "").replace("()", "").trim()

            token.for = {value: null, symbol: null, tokenAddr: null,}
            let vv = $($cols[5]).find(`span`).html()
            if (vv) token.for.value = vv.match(/([^\s]+)/)[1].replace(",", "") * 1

            if (token.for.value === null) {
               // last two token lines case: https://etherscan.io/tx/0xbbda9afb27b2720cfcd9e462507daae6684c18bc88bdd909ffad3aba0d0ca533
               token.for.value = $($cols[5]).text().match(/([^\s]+)/)[1].replace(",", "") * 1
            }
            $tmp = $($cols[5]).next().next()
            token.for.tokenAddr = "0x" + $tmp.attr("href").replace(/(.*)0x/, "")
            if (!token.for.symbol) token.for.symbol = $tmp.text().trim()
            // "Dai Stableco... (DAI)"  => DAI
            vv = token.for.symbol.match(/\(([^\)]+)\)/)
            if(vv) token.for.symbol = vv[1]


            res.tokens.push(token)
         })
      }

      if(this.debug) log.d(`[EtherParser.getDataFromTxPage]: finish tx=${txhash.substr(0,10)} via '${requestOpts.proxy || "localhost"}'`)

      return res
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
      if (this.debug) log.d(`[EtherscanParser.takeAcc]: wanna take acc, accCount=${this.accFreeCount}`)
      const [value, releaseFunc] = await this.accFreeSemph.acquire()
      let acc = this.getFreeAcc()
      if (!acc) throw new Error(`[EtherscanParser.takeAcc]: no free account`)
      this.accFreeCount--
      acc.v = value
      acc.releaseFunc = releaseFunc
      const ts = xx.tsNow()

      if ((ts - acc.lastQueryTS) < opt.EtherscanParserRestDelayTS) {
         throw new Error(`[EtherscanParser.takeAcc]: account '${acc.viaHost}' still not rested, delta=${ts - acc.lastQueryTS}`, acc)
      }

      acc.lastHitTS = ts

      if (this.debug) log.d(`[EtherscanParser.takeAcc]: took acc(${acc.viaHost}), accCount=${this.accFreeCount} :: v = ${acc.v} :: after ${ts - acc.lastQueryTS} ms`)

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
      if (this.debug) log.d(`[EtherscanParser.releaseAcc]: going to rest ${acc.viaHost}`)
      await xx.timeoutAsync(opt.EtherscanParserRestDelayTS + 300)
      acc.v = null
      acc.releaseFunc()
      acc.releaseFunc = null
      this.accFreeCount++
      acc.lastReleaseTS = xx.tsNow()
      if (this.debug) log.d(`[EtherscanParser.releaseAcc]: released acc(${acc.viaHost}), accCount=${this.accFreeCount}`)
   }

}

export default new EtherscanParser