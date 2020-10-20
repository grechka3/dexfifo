import etherTXRows from "./etherscan-txs-json.mjs"
import ExportEtherTxs from "../backend/src/export-ether-txs.mjs"
import LowDbFileAdapter from "lowdb/adapters/FileSync.js"
import lowdb from "lowdb"
import log from "jsm_log";

log.setFileName("../log/tests.log")


describe("[[ TRANSFER ASSETS ]]", () => {

   const etx = new ExportEtherTxs("./tests/etherscan-test-db01.json")
   etx.loadConfFromFile("./tests/etherscan-test-conf01.txt")
   etx.memdb.read()

   const getETX = (tx) => etx.memdb.get("txs").filter({txHash: tx}).value()[0]

   test("db loaded", () => {
      expect(etx.memdb.get("txs").size().value()).toBeGreaterThan(1)
   })

   test("swap actions 2 / 2 trade + LP unstake", () => {
      const tx = "0x9b9bcd724873b3d20d635293451affceaa8e193ba4000765e0541d03625d2c02"
      expect(getETX(tx)).toHaveProperty("txHash")
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x9b9bcd724873b3d20d635293451affceaa8e193ba4000765e0541d03625d2c02',
               txType: 'Deposit',
               creditAccount: '0x80c5e6908368cb9db503ba968d7ec5a565bfb389 (Zapper.Fi: Uniswap V2 Zap In)',
               creditAsset: 'UNI-V2',
               creditAmount: 235.71011773347587,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'UNI-V2',
               debitAmount: 235.71011773347587,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.09072675,
               memo: 'Deposit 235.71011773347587 UNI-V2 From Zapper.Fi: Uniswap V2 Zap In'
            },
            {
               txHash: '0x9b9bcd724873b3d20d635293451affceaa8e193ba4000765e0541d03625d2c02',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 31,
               debitAccount: '0x80c5e6908368cb9db503ba968d7ec5a565bfb389 (Zapper.Fi: Uniswap V2 Zap In)',
               debitAsset: 'Ether',
               debitAmount: 31,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Withdrawal 31 Ether To Zapper.Fi: Uniswap V2 Zap In'
            }
         ]
      )
   })


   test("swap actions 1 / token trade eth=>token", () => {
      const tx = "0x563b6cd5d3f0a337db2a980eb8879b0b41bcd847f95af6d5672b064f72fce210"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x563b6cd5d3f0a337db2a980eb8879b0b41bcd847f95af6d5672b064f72fce210',
               txType: 'Deposit',
               creditAccount: '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc (Uniswap V2: USDC 3)',
               creditAsset: 'USDC',
               creditAmount: 34.282663,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'USDC',
               debitAmount: 34.282663,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00618691213623,
               memo: 'Deposit 34.282663 USDC From Uniswap V2: USDC 3'
            },
            {
               txHash: '0x563b6cd5d3f0a337db2a980eb8879b0b41bcd847f95af6d5672b064f72fce210',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 0.09,
               debitAccount: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d (Uniswap V2: Router 2)',
               debitAsset: 'Ether',
               debitAmount: 0.09,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Withdrawal 0.09 Ether To Uniswap V2: Router 2'
            }
         ]
      )
   })

   test("fail = fee", () => {
      const tx = "0x314abcebdef0f181be361f6dfeacd9b164da76cdd993561cdfd084239ab85d20"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x314abcebdef0f181be361f6dfeacd9b164da76cdd993561cdfd084239ab85d20',
               txType: 'Fee',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 0,
               debitAccount: '',
               debitAsset: '',
               debitAmount: 0,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00144025,
               memo: 'Loss on fail transaction'
            }
         ]
      )
   })

   test("no tokens / zero ether value = fee", () => {
      const tx = "0x0cdef5fe098e78c7f3e9269a018a266730fe3165dfc640e047473f3e6298eb86"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x0cdef5fe098e78c7f3e9269a018a266730fe3165dfc640e047473f3e6298eb86',
               txType: 'Fee',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 0,
               debitAccount: '',
               debitAsset: '',
               debitAmount: 0,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00230898136822,
               memo: [
                  'Approved  UNI-V2 For Trade On  SushiSwap: MasterChef LP Staking Pool'
               ]
            }
         ]
      )
   })

   test("no tokens / deposit", () => {
      const tx = "0x1315726b765987e7f52f375ffd19d65f6fd8f9b2b16caad1642807d9127d05d1"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x1315726b765987e7f52f375ffd19d65f6fd8f9b2b16caad1642807d9127d05d1',
               txType: 'Deposit',
               creditAccount: '0x564286362092d8e7936f0549571a803b203aaced (Binance 3)',
               creditAsset: 'Ether',
               creditAmount: 0.9999218,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 0.9999218,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Withdraw 0.9999218 Ether From  Binance'
            }
         ]
      )
   })


   test("swap actions 1 / token trade token=>eth", () => {
      const tx = "0xb205a560ed9c4f722e10d4af92eba831530b9749de20602463c7052acccac7f5"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0xb205a560ed9c4f722e10d4af92eba831530b9749de20602463c7052acccac7f5',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'PICKLE',
               creditAmount: 12.423813714816337,
               debitAccount: '0xdc98556ce24f007a5ef6dc1ce96322d65832a819 (Uniswap V2: PICKLE 2)',
               debitAsset: 'PICKLE',
               debitAmount: 12.423813714816337,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00532134462621,
               memo: 'Withdrawal 12.423813714816337 PICKLE To Uniswap V2: PICKLE 2'
            },
            {
               txHash: '0xb205a560ed9c4f722e10d4af92eba831530b9749de20602463c7052acccac7f5',
               txType: 'Deposit',
               creditAccount: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d (Uniswap V2: Router 2)',
               creditAsset: 'Ether',
               creditAmount: 0.7320056009421759,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 0.7320056009421759,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit  0 Ether From Uniswap V2: Router 2'
            }
         ]
      )
   })

   test("swap actions 1 / 1 token trade  + LP unstake", () => {
      const tx = "0x72d2bd7ba36b9538d2f8dd2bddc2ce46b754f25cb2cc00891c57f9d36c4cc8e7"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x72d2bd7ba36b9538d2f8dd2bddc2ce46b754f25cb2cc00891c57f9d36c4cc8e7',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI',
               creditAmount: 1791.4218,
               debitAccount: '0x80c5e6908368cb9db503ba968d7ec5a565bfb389 (Zapper.Fi: Uniswap V2 Zap In)',
               debitAsset: 'UNI',
               debitAmount: 1791.4218,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.044238285,
               memo: 'Withdrawal 1791.4218 UNI To Zapper.Fi: Uniswap V2 Zap In'
            },
            {
               txHash: '0x72d2bd7ba36b9538d2f8dd2bddc2ce46b754f25cb2cc00891c57f9d36c4cc8e7',
               txType: 'Deposit',
               creditAccount: '0x80c5e6908368cb9db503ba968d7ec5a565bfb389 (Zapper.Fi: Uniswap V2 Zap In)',
               creditAsset: 'UNI-V2',
               creditAmount: 61.57188600911535,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'UNI-V2',
               debitAmount: 61.57188600911535,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit 61.57188600911535 UNI-V2 From Zapper.Fi: Uniswap V2 Zap In'
            }
         ]
      )
   })


   test("no swap actions / LP stake", () => {
      const tx = "0xcbdb03dc04fdd2c26fbab794bbd909ffc4788c3df6d03bb95d7aa50caf2e63ff"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0xcbdb03dc04fdd2c26fbab794bbd909ffc4788c3df6d03bb95d7aa50caf2e63ff',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 235.71011773347587,
               debitAccount: '0xb60c12d2a4069d339f49943fc45df6785b436096',
               debitAsset: 'UNI-V2',
               debitAmount: 235.71011773347587,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.037101792,
               memo: 'Withdrawal 235.71011773347587 UNI-V2 To 0xb60c12d2a4069d339f49943fc45df6785b436096'
            }
         ]
      )
   })


   test("no swap actions / LP stake only ", () => {
      const tx = "0x00a5f0caa1832bebf90d96e87314fd9381fef6748da605f1a430086949b8622d"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x00a5f0caa1832bebf90d96e87314fd9381fef6748da605f1a430086949b8622d',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 40.459092657318884,
               debitAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               debitAsset: 'UNI-V2',
               debitAmount: 40.459092657318884,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00671178204473,
               memo: 'Withdrawal 40.459092657318884 UNI-V2 To SushiSwap: MasterChef LP Staking Pool'
            }
         ]
      )
   })

   test("no swap actions / token deposit", () => {
      const tx = "0x8a40f24b42d9df82988f488224661e5b0d863ab979fabbbf1e476cb41d4fb130"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x8a40f24b42d9df82988f488224661e5b0d863ab979fabbbf1e476cb41d4fb130',
               txType: 'Deposit',
               creditAccount: '0xfa712ee4788c042e2b7bb55e6cb8ec569c4530c1 (Curve.fi: yCrv Gauge)',
               creditAsset: 'yDAI+y...',
               creditAmount: 1067.3269209033538,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'yDAI+y...',
               debitAmount: 1067.3269209033538,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.074719831186,
               memo: 'Deposit 1067.3269209033538 yDAI+y... From Curve.fi: yCrv Gauge'
            }
         ]
      )
   })

   test("no swap actions / token deposit + LP stake (1)", () => {
      const tx = "0xe7fae90a354d40c9d9ee7bb4f3c41881a07789ba466fcf14e24d6eb546587e2d"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0xe7fae90a354d40c9d9ee7bb4f3c41881a07789ba466fcf14e24d6eb546587e2d',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 159.24788674989918,
               debitAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               debitAsset: 'UNI-V2',
               debitAmount: 159.24788674989918,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.012513105,
               memo: 'Withdrawal 159.24788674989918 UNI-V2 To SushiSwap: MasterChef LP Staking Pool'
            },
            {
               txHash: '0xe7fae90a354d40c9d9ee7bb4f3c41881a07789ba466fcf14e24d6eb546587e2d',
               txType: 'Deposit',
               creditAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               creditAsset: 'SUSHI',
               creditAmount: 101.62245624862064,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'SUSHI',
               debitAmount: 101.62245624862064,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit 101.62245624862064 SUSHI From SushiSwap: MasterChef LP Staking Pool'
            }
         ]
      )
   })

   test("no swap actions / token deposit + LP stake (2)", () => {
      const tx = "0x2eacbc08e701dec44d81889d14e55f5c9418dd189b9ca11059222fe29741e301"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x2eacbc08e701dec44d81889d14e55f5c9418dd189b9ca11059222fe29741e301',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 235.71011773347587,
               debitAccount: '0x8927616110cf23c4e87dc98614eb9fbaae95216c (Uniswap V2: MOON 18)',
               debitAsset: 'UNI-V2',
               debitAmount: 235.71011773347587,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.024752268,
               memo: 'Withdrawal 235.71011773347587 UNI-V2 To Uniswap V2: MOON 18'
            },
            {
               txHash: '0x2eacbc08e701dec44d81889d14e55f5c9418dd189b9ca11059222fe29741e301',
               txType: 'Deposit',
               creditAccount: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d (Uniswap V2: Router 2)',
               creditAsset: 'MOON',
               creditAmount: 5211.790317803934,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'MOON',
               debitAmount: 5211.790317803934,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit 5211.790317803934 MOON From Uniswap V2: Router 2'
            },
            {
               txHash: '0x2eacbc08e701dec44d81889d14e55f5c9418dd189b9ca11059222fe29741e301',
               txType: 'Deposit',
               creditAccount: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d (Uniswap V2: Router 2)',
               creditAsset: 'Ether',
               creditAmount: 11.91803129057644,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 11.91803129057644,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit  0 Ether From Uniswap V2: Router 2'
            }
         ]
      )
   })


   test("no swap actions / token deposit + LP zero(skipped) transfer", () => {
      const tx = "0x3e6e27e99d0697aa1815e07150699789ce25f8ec51c6ff05882df5a7536e97c8"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x3e6e27e99d0697aa1815e07150699789ce25f8ec51c6ff05882df5a7536e97c8',
               txType: 'Deposit',
               creditAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               creditAsset: 'SUSHI',
               creditAmount: 658.6579418231731,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'SUSHI',
               debitAmount: 658.6579418231731,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00552616,
               memo: 'Deposit 658.6579418231731 SUSHI From SushiSwap: MasterChef LP Staking Pool'
            }
         ]
      )
   })

   test("multi none-swap actions  / token trade USDC -> DAI", () => {
      const tx = "0x7fc71b0a603d51cbc6cb457dd1e343a6a408d201c1380267d21302c6c14eff32"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x7fc71b0a603d51cbc6cb457dd1e343a6a408d201c1380267d21302c6c14eff32',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'USDC',
               creditAmount: 100,
               debitAccount: '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56 (Curve.fi: Compound Swap)',
               debitAsset: 'USDC',
               debitAmount: 100,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.0401024337,
               memo: 'Withdrawal 100 USDC To Curve.fi: Compound Swap'
            },
            {
               txHash: '0x7fc71b0a603d51cbc6cb457dd1e343a6a408d201c1380267d21302c6c14eff32',
               txType: 'Deposit',
               creditAccount: '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56 (Curve.fi: Compound Swap)',
               creditAsset: 'DAI',
               creditAmount: 98.48753043383277,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'DAI',
               debitAmount: 98.48753043383277,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Deposit 98.48753043383277 DAI From Curve.fi: Compound Swap'
            }
         ]
      )
   })


   test("no swap actions / no events / no tokens /  LP token zero sum => fee", () => {
      const tx = "0x3384084648e2a4372a27c9a8587ecb347fcd7fc8e1118180821e36701b69a29a"
      expect(etx.getTxTransforms(getETX(tx))).toMatchObject(
         [
            {
               txHash: '0x3384084648e2a4372a27c9a8587ecb347fcd7fc8e1118180821e36701b69a29a',
               txType: 'Fee',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 0,
               debitAccount: '',
               debitAsset: '',
               debitAmount: 0,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.014409326,
               memo: []
            }
         ]
      )
   })


/*
   test("combine token transfers", () => {
      const tx = "0x155ee71bd98ea6b1a39ea9b019045da5bb5c26fcfc02de4d42f8d4457c2935d8"
      expect(etx.getTxTransforms({
         "txHash": "0x155ee71bd98ea6b1a39ea9b019045da5bb5c26fcfc02de4d42f8d4457c2935d8",
         "blockNumber": "11082028",
         "timeStamp": 1603052160,
         "dateTimeUTC": "2020-10-18 23:16:00",
         "contractAddressApi": "",
         "gas": 530055,
         "gasPrice": 18,
         "gasUsed": 314267,
         "nonce": 7,
         "isError": false,
         "txFee": 0.005656806,
         "fromAddr": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
         "toAddr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
         "fromName": "",
         "toName": "",
         "etherValue": 0,
         "etherUsdPrice": 378.44,
         "from": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
         "to": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
         "internalTxs": [
            {
               "etherValue": 0.06443033453578413,
               "fromAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
               "fromName": "Wrapped Ether",
               "toAddr": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
               "toName": "Uniswap V2: Router 2"
            },
            {
               "etherValue": 0.06443033453578413,
               "fromAddr": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
               "fromName": "Uniswap V2: Router 2",
               "toAddr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
               "toName": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58"
            },
            {
               "etherValue": 0.06464739360725512,
               "fromAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
               "fromName": "Wrapped Ether",
               "toAddr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
               "toName": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58"
            },
            {
               "etherValue": 0.12907772814303925,
               "fromAddr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
               "fromName": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
               "toAddr": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
               "toName": "0xd351920d2feeb121269c02e0581296419ad8a3c4"
            }
         ],
         "tokens": [
            {
               "from": {
                  "addr": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
                  "name": ""
               },
               "to": {
                  "addr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
                  "name": ""
               },
               "for": {
                  "value": 35.839620469190486,
                  "symbol": "UNI-V2",
                  "tokenAddr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "currentPriceUsd": 0
               }
            },
            {
               "from": {
                  "addr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
                  "name": ""
               },
               "to": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "for": {
                  "value": 35.839620469190486,
                  "symbol": "UNI-V2",
                  "tokenAddr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "currentPriceUsd": 0
               }
            },
            {
               "from": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "to": {
                  "addr": "0x0000000000000000000000000000000000000000",
                  "name": ""
               },
               "for": {
                  "value": 35.839620469190486,
                  "symbol": "UNI-V2",
                  "tokenAddr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "currentPriceUsd": 0
               }
            },
            {
               "from": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "to": {
                  "addr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
                  "name": ""
               },
               "for": {
                  "value": 20794.37895158437,
                  "symbol": "eRSDL",
                  "tokenAddr": "0x5218e472cfcfe0b64a064f055b43b4cdc9efd3a6",
                  "currentPriceUsd": 0
               }
            },
            {
               "from": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "to": {
                  "addr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
                  "name": ""
               },
               "for": {
                  "value": 0.06464739360725512,
                  "symbol": "WETH",
                  "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                  "currentPriceUsd": 375.14
               }
            },
            {
               "from": {
                  "addr": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
                  "name": ""
               },
               "to": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "for": {
                  "value": 20794.37895158437,
                  "symbol": "eRSDL",
                  "tokenAddr": "0x5218e472cfcfe0b64a064f055b43b4cdc9efd3a6",
                  "currentPriceUsd": 0
               }
            },
            {
               "from": {
                  "addr": "0x7ba9b94127d434182287de708643932ec036d365",
                  "name": "Uniswap V2: eRSDL 2"
               },
               "to": {
                  "addr": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
                  "name": "Uniswap V2: Router 2"
               },
               "for": {
                  "value": 0.06443033453578413,
                  "symbol": "WETH",
                  "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                  "currentPriceUsd": 375.14
               }
            }
         ],
         "events": [
            {
               "type": "swap",
               "fromValue": 20794.37895158437,
               "fromName": "eRSDL",
               "toValue": 0.06443033453578413,
               "toName": "Ether",
               "on": "Uniswap"
            }
         ],
         "memo": []}, ["0xd351920d2feeb121269c02e0581296419ad8a3c4"])).toMatchObject(
         [
            {
               "txHash": "0x155ee71bd98ea6b1a39ea9b019045da5bb5c26fcfc02de4d42f8d4457c2935d8",
               "txType": "Withdrawl",
               "creditAccount": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
               "creditAsset": "UNI-V2",
               "creditAmount": 35.839620469190486,
               "debitAccount": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58",
               "debitAsset": "UNI-V2",
               "debitAmount": 35.839620469190486,
               "txFeeAccount": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
               "txFeeAsset": "Ether",
               "txFeeAmount": 0.005656806,
               "memo": "Withdrawal 35.839620469190486 UNI-V2 To 0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58"
            },
            {
               "txHash": "0x155ee71bd98ea6b1a39ea9b019045da5bb5c26fcfc02de4d42f8d4457c2935d8",
               "txType": "Deposit",
               "creditAccount": "0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58 (0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58)",
               "creditAsset": "Ether",
               "creditAmount": 0.12907772814303925,
               "debitAccount": "0xd351920d2feeb121269c02e0581296419ad8a3c4",
               "debitAsset": "Ether",
               "debitAmount": 0.12907772814303925,
               "txFeeAccount": "",
               "txFeeAsset": "",
               "txFeeAmount": 0,
               "memo": "Deposit  0 Ether From 0x79b6c6f8634ea477ed725ec23b7b6fcb41f00e58"
            }
         ]
      )
   })
*/


})