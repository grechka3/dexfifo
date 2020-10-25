import Q from "axios"
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
         responseType: "json"
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
      if (res.status === 200) {

         ret.error = false
         ret.body = res.data
      }
      else if (res.data) {
         ret.error = true
         ret.body = res.data
         ret.errorCode = res.status * 1
      }
      else {
         ret.error = true
         if (res.response) {
            // destination server error
            ret.errorCode = res.response.status
            ret.errorMessage = res.message ? res.message : ""
         }
         else {
            // net error
            ret.errorMessage = (res.code ? `[${res.code}]: ` : "") + (res.message ? res.message : "")
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
            _opts.httpsAgent = this.proxyAgents[opts.proxy]
         }
         else {
            _opts.httpsAgent = this.proxyAgents[opts.proxy] = new HttpsProxyAgent(opts.proxy)
         }
      }
      _opts.timeout = opts.timeout || 10000
      const op = Object.assign({}, this.optsDefaults, _opts)
      const res = await Q.get(url, op).catch(e => e)
      return this.makeResult(res)

   }
}

export default new Request()