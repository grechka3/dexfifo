import Q from "got"
import HttpsProxyAgent from "https-proxy-agent";


/**
 * Make http query via got and proxy
 */

/**
 * proxy peer conf here _response.socket._peername
 *
 * @typedef QResponse
 * @property {boolean} error
 * @property {number} errorCode
 * @property {string} errorMessage
 * @property {number} totalTime
 * @property {string} body
 * @property {Object} _response
 */

/**
 * @typedef RequestOpts
 * @property {string} proxy
 * @property {number} [timeout=10000]
 */

class Request
{
   constructor()
   {
      this.optsDefaults = {
         dnsLookupIpVersion: "ipv4"
      }
      this.proxyAgents = {}
   }

   /**
    *
    * @param {Object} res
    * @return {QResponse}
    */
   makeResult(res)
   {
      let ret = {
         error: null,
         errorCode: 0,
         errorMessage: "",
         totalTime: 0,
         body: "",
         _response: res
      }
      if (res.statusMessage === 'OK') {
         ret.error = false
         ret.body = res.body
         ret.totalTime = res.timings.end - res.timings.start
      }
      else if (res.body) {
         ret.error = true
         ret.body = res.body
         ret.errorCode = res.statusCode * 1
         ret.totalTime = res.timings.end - res.timings.start
      }
      else {
         ret.error = true
         if (res.response) {
            // destination server error
            ret.errorCode = res.message.split(/([0-9]{3})/)[1] * 1
            ret.errorMessage = res.message ? res.message : ""
            ret.totalTime = res.timings.end - res.timings.start
         }
         else {
            // net error
            ret.errorMessage = (res.code ? `[${res.code}]: `:"") + (res.message ? res.message : "")
         }
      }

      return ret
   }


   /**
    *
    * @param {string} url
    * @param {RequestOpts} [opts]
    * @return {QResponse}
    */
   async get(url, opts = {})
   {
      let _opts = {}
      if (opts.proxy) {
         if (this.proxyAgents[opts.proxy]) {
            _opts.agent = {
               https: this.proxyAgents[opts.proxy]
            }
         }
         else {
            _opts.agent = {
               https: this.proxyAgents[opts.proxy] = new HttpsProxyAgent(opts.proxy)
            }
         }
      }
      _opts.timeout = opts.timeout || 10000
      const op = Object.assign({}, this.optsDefaults, _opts)
      console.log(`making GOT request :: `, op, `...`)
      const res = await Q.get(url, op).catch(e => e)
      console.log(`GOT done`)
      return this.makeResult(res)

   }
}

export default new Request()