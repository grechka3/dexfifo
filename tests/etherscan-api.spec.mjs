import opt from "../config.mjs";
import etherApi from "../backend/src/etherscan-api.mjs";


describe("[[ EtherscanAPI.getTxListByAddr ]]", () => {
   test("0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085 :: sort: \"asc\", page: 1, limit: 1", async () => {
      let res = await etherApi.getTxListByAddr({ethaddr: "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085", acc: opt.etherscanAccs[0], sort: "asc", page: 1, limit: 1})
      expect(res.error).toBeFalsy()
      expect(res.data.status).toEqual("1")
      expect(res.data.message).toEqual("OK")
      expect(res.data.result).toMatchObject([
         {
            blockNumber: '10743551',
            timeStamp: '1598544111',
            hash: '0x1315726b765987e7f52f375ffd19d65f6fd8f9b2b16caad1642807d9127d05d1',
            nonce: '2645618',
            blockHash: '0x19bb503d0f315e9f6db56fb9b27985d52ec9bf98a926e058bc53f2a9368fcb08',
            transactionIndex: '74',
            from: '0x564286362092d8e7936f0549571a803b203aaced',
            to: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
            value: '999921800000000000',
            gas: '21000',
            gasPrice: '150000000000',
            isError: '0',
            txreceipt_status: '1',
            input: '0x',
            contractAddress: '',
            cumulativeGasUsed: '2259554',
            gasUsed: '21000',
            //confirmations: '232747'
         }
      ])

   })

   test("NOTOK", async () => {
      let res = await etherApi.getTxListByAddr({ethaddr: "00000", acc: opt.etherscanAccs[0]})
      expect(res.response.error).toBeFalsy()
      expect(res.data.status).toEqual("0")
      expect(res.data.message).toEqual("NOTOK")
      expect(res.data.result).toEqual("Error! Invalid address format")
   })
})

describe("[[ EtherscanAPI.getTokenInfo ]]", () => {
   test("", async () => {
      let res = await etherApi.getTokenInfo("0x68a3637ba6e75c0f66b61a42639c4e9fcd3d4824", opt.etherscanAccs[0])
      expect(res.error).toBeFalsy()
      expect(res.data).toStrictEqual({name: 'MoonToken', symbol: 'MOON'})
   })
})

describe("[[ EtherscanAPI.getTxTokenListByAddr ]]", () => {
   test("0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085 :: sort: \"asc\", page: 1, limit: 1", async () => {
      let res = await etherApi.getTxTokenListByAddr({ethaddr: "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085", acc: opt.etherscanAccs[0], sort: "asc", page: 1, limit: 1})
      expect(res.error).toBeFalsy()
      expect(res.data.status).toEqual("1")
      expect(res.data.message).toEqual("OK")
      expect(res.data.result).toMatchObject([
         {
            blockNumber: '10744722',
            timeStamp: '1598559487',
            hash: '0x563b6cd5d3f0a337db2a980eb8879b0b41bcd847f95af6d5672b064f72fce210',
            nonce: '0',
            blockHash: '0x102aa7fb473894dd6399898e140d93f58b7ae36bc02f2aff74fde3d85682dc0a',
            from: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc',
            contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            to: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
            value: '34282663',
            tokenName: 'USD Coin',
            tokenSymbol: 'USDC',
            tokenDecimal: '6',
            transactionIndex: '86',
            gas: '161515',
            gasPrice: '51000001123',
            gasUsed: '121312',
            cumulativeGasUsed: '6079423',
            input: 'deprecated',
            //confirmations: '231692'
         }
      ])

   })
})