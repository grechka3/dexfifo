import etherTXRows from "./etherscan-txs-json.mjs"
import ExportEtherTxs from "../backend/src/export-ether-txs.mjs"
import LowDbFileAdapter from "lowdb/adapters/FileSync.js"
import lowdb from "lowdb"

/*
 * LP unstake == deposit
 * LP state == withdrawl
 */


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
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 31,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'MOON',
               debitAmount: 8027.066421476578,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.09072675,
               memo: 'Swap 31 Ether for 8027.066421476578 MOON on Uniswap'
            },
            {
               txHash: '0x9b9bcd724873b3d20d635293451affceaa8e193ba4000765e0541d03625d2c02',
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'MOON',
               creditAmount: 4016.934277577636,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 15.440579381250341,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Swap 4016.934277577636 MOON for 15.440579381250341 Ether on Uniswap'
            },
            {
               txHash: '0x9b9bcd724873b3d20d635293451affceaa8e193ba4000765e0541d03625d2c02',
               txType: 'Deposit',
               creditAccount: '0x80c5e6908368cb9db503ba968d7ec5a565bfb389 (Zapper.Fi: Uniswap V2 Zap In)',
               creditAsset: 'UNI-V2',
               creditAmount: 235.71011773347587,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'UNI-V2',
               debitAmount: 235.71011773347587,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'UnStake 235.71011773347587 LP tokens UNI-V2'
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
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'Ether',
               creditAmount: 0.09,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'USDC',
               debitAmount: 34.282663,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00618691213623,
               memo: 'Swap 0.09 Ether for 34.282663 USDC on Uniswap'
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
               memo: 'Approved  UNI-V2 For Trade On  SushiSwap: MasterChef LP Staking Pool'
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
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00315,
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
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'PICKLE',
               creditAmount: 12.423813714816337,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 0.7320056009421759,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.00532134462621,
               memo: 'Swap 12.423813714816337 PICKLE for 0.7320056009421759 Ether on Uniswap'
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
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI',
               creditAmount: 896.9700767426217,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'Ether',
               debitAmount: 13.681319359649834,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.044238285,
               memo: 'Swap 896.9700767426217 UNI for 13.681319359649834 Ether on Uniswap'
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
               memo: 'UnStake 61.57188600911535 LP tokens UNI-V2'
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
               memo: 'Stake 235.71011773347587 LP tokens UNI-V2'
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
               memo: 'Stake 40.459092657318884 LP tokens UNI-V2'
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
               memo: 'Deposit 1067.3269209033538 yDAI+y... from Curve.fi: yCrv Gauge'
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
               txType: 'Deposit',
               creditAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               creditAsset: 'SUSHI',
               creditAmount: 101.62245624862064,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'SUSHI',
               debitAmount: 101.62245624862064,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.012513105,
               memo: 'Deposit 101.62245624862064 SUSHI from SushiSwap: MasterChef LP Staking Pool'
            },
            {
               txHash: '0xe7fae90a354d40c9d9ee7bb4f3c41881a07789ba466fcf14e24d6eb546587e2d',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 159.24788674989918,
               debitAccount: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd (SushiSwap: MasterChef LP Staking Pool)',
               debitAsset: 'UNI-V2',
               debitAmount: 159.24788674989918,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Stake 159.24788674989918 LP tokens UNI-V2'
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
               txType: 'Deposit',
               creditAccount: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d (Uniswap V2: Router 2)',
               creditAsset: 'MOON',
               creditAmount: 5211.790317803934,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'MOON',
               debitAmount: 5211.790317803934,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.024752268,
               memo: 'Deposit 5211.790317803934 MOON from Uniswap V2: Router 2'
            },
            {
               txHash: '0x2eacbc08e701dec44d81889d14e55f5c9418dd189b9ca11059222fe29741e301',
               txType: 'Withdrawl',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'UNI-V2',
               creditAmount: 235.71011773347587,
               debitAccount: '0x8927616110cf23c4e87dc98614eb9fbaae95216c (Uniswap V2: MOON 18)',
               debitAsset: 'UNI-V2',
               debitAmount: 235.71011773347587,
               txFeeAccount: '',
               txFeeAsset: '',
               txFeeAmount: 0,
               memo: 'Stake 235.71011773347587 LP tokens UNI-V2'
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
               memo: 'Deposit 658.6579418231731 SUSHI from SushiSwap: MasterChef LP Staking Pool'
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
               txType: 'Trade',
               creditAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               creditAsset: 'USDC',
               creditAmount: 100,
               debitAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               debitAsset: 'DAI',
               debitAmount: 98.48753043383277,
               txFeeAccount: '0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085',
               txFeeAsset: 'Ether',
               txFeeAmount: 0.0401024337,
               memo: 'Swap 100 USDC for 98.48753043383277 DAI'
            }
         ]
      )
   })

   test("multi none-swap actions  / token multi deposits + withdraw", () => {
      // "0x6ffe4da4cdabc6a7756ce992ebd6974defa7220428e2c97612c27ff1262b082d"
      expect(etx.getTxTransforms({
         "txHash": "0x6ffe4da4cdabc6a7756ce992ebd6974defa7220428e2c97612c27ff1262b082d",
         "blockNumber": "10466426",
         "timeStamp": 1594847490,
         "dateTimeUTC": "2020-07-16 00:11:30",
         "ownAddr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
         "internal": true,
         "contractAddressApi": "",
         "gas": 342020,
         "gasPrice": 31.5,
         "gasUsed": 215349,
         "nonce": 126,
         "isError": false,
         "txFee": 0.0067834935,
         "fromAddr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
         "toAddr": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
         "fromName": "",
         "toName": "Compound USD Coin",
         "etherValue": 0,
         "etherPriceUsd": 238.42,
         "tokenTrans": true,
         "etherUsdPrice": 238.42,
         "from": "0x9ad227d56a36b33407916f3293db2d298095dca9",
         "to": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
         "tokens": [
            {
               "from": {
                  "addr": "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
                  "name": "Compound: Comptroller"
               },
               "to": {
                  "addr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
                  "name": ""
               },
               "for": {
                  "value": 0.001345122765157046,
                  "symbol": "COMP",
                  "tokenAddr": "0xc00e94cb662c3520282e6f5717214004a7f26888",
                  "currentPriceUsd": 118.49
               }
            },
            {
               "from": {
                  "addr": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
                  "name": "Compound USD Coin"
               },
               "to": {
                  "addr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
                  "name": ""
               },
               "for": {
                  "value": 162.584412,
                  "symbol": "USDC",
                  "tokenAddr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                  "currentPriceUsd": 1
               }
            },
            {
               "from": {
                  "addr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
                  "name": ""
               },
               "to": {
                  "addr": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
                  "name": "Compound USD Coin"
               },
               "for": {
                  "value": 7713.08874806,
                  "symbol": "cUSDC",
                  "tokenAddr": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
                  "currentPriceUsd": 0.02
               }
            }
         ],
         "events": [],
         "memo": [
            "Collected 0.001345122765157046  COMP For Supplying  USDC On  Compound",
            "Withdraw 162.584412  USDC From  Compound"
         ],
      })).toMatchObject([
         {
            txHash: '0x6ffe4da4cdabc6a7756ce992ebd6974defa7220428e2c97612c27ff1262b082d',
            txType: 'Withdrawl',
            creditAccount: '0x9ad227d56a36b33407916f3293db2d298095dca9',
            creditAsset: 'cUSDC',
            creditAmount: 7713.08874806,
            debitAccount: '0x39aa39c021dfbae8fac545936693ac917d5e7563 (Compound USD Coin)',
            debitAsset: 'cUSDC',
            debitAmount: 7713.08874806,
            txFeeAccount: '0x9ad227d56a36b33407916f3293db2d298095dca9',
            txFeeAsset: 'Ether',
            txFeeAmount: 0.0067834935,
            memo: 'Withdrawal 7713.08874806 cUSDC to Compound USD Coin'
         },
         {
            txHash: '0x6ffe4da4cdabc6a7756ce992ebd6974defa7220428e2c97612c27ff1262b082d',
            txType: 'Deposit',
            creditAccount: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b (Compound: Comptroller)',
            creditAsset: 'COMP',
            creditAmount: 0.001345122765157046,
            debitAccount: '0x9ad227d56a36b33407916f3293db2d298095dca9',
            debitAsset: 'COMP',
            debitAmount: 0.001345122765157046,
            txFeeAccount: '',
            txFeeAsset: '',
            txFeeAmount: 0,
            memo: 'Deposit 0.001345122765157046 COMP from Compound: Comptroller'
         },
         {
            txHash: '0x6ffe4da4cdabc6a7756ce992ebd6974defa7220428e2c97612c27ff1262b082d',
            txType: 'Deposit',
            creditAccount: '0x39aa39c021dfbae8fac545936693ac917d5e7563 (Compound USD Coin)',
            creditAsset: 'USDC',
            creditAmount: 162.584412,
            debitAccount: '0x9ad227d56a36b33407916f3293db2d298095dca9',
            debitAsset: 'USDC',
            debitAmount: 162.584412,
            txFeeAccount: '',
            txFeeAsset: '',
            txFeeAmount: 0,
            memo: 'Deposit 162.584412 USDC from Compound USD Coin'
         }
      ])


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
               memo: ''
            }
         ]
      )
   })


})