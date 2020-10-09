import etherParser from "../backend/src/etherscan-parser.mjs"
import opt from "../config.mjs"

describe("[[EtherscanParser class :: RETRIVE DATA FROM TX PAGE]]", () => {
   const addrs = [
      "0xbbda9afb27b2720cfcd9e462507daae6684c18bc88bdd909ffad3aba0d0ca533", // contract / 7 tokens / 1 swap action
      "0xb602bae4dd7bce0af5876c8216d8db257bf22386ec921bd07122a39b46619186", // ether value / 1 withdrawl action
      "0x79591247b82e1a7394413e4f8a9455bf14e392270b70f5b04810396f8bc7b78f", // withdrawl / ether value
      "0x843694f8926d387e05c744fcd0d90b6762d4f68ac6801b85660065d48dced92f", // contract / 1 approved action
      "0xf5dd98b65e39379e06aa31cca1b5fbc8d8b8229948c789579d0cb0f0d2633282", // contract / 2 tokens / 1 swap action
      "0xc813ebbe47b17a799d4892b6b14a269fb922b06d6bacd4482af8ef56b0603c72", // contract / 8 tokens / ether value / 2 swap actions

   ]

   let addr_i = 0

   test("contract / 7 tokens / 1 swap action", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(
         {
            "etherValue": 0,
            "etherUsdPrice": 320.19,
            "txFee": 0.040276736,
            "from": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
            "fromName": "",
            "to": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
            "toName": "Zapper.Fi: Uniswap V2 Zap In",
            "tokens": [
               {
                  "from": {
                     "addr": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
                     "name": ""
                  },
                  "to": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "for": {
                     "value": 1212.4762,
                     "symbol": "DAI",
                     "tokenAddr": "0x6b175474e89094c44da98b954eedeac495271d0f",
                  }
               },
               {
                  "from": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "to": {
                     "addr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
                     "name": "Uniswap V2: DAI 2"
                  },
                  "for": {
                     "value": 607.147607100575,
                     "symbol": "DAI",
                     "tokenAddr": "0x6b175474e89094c44da98b954eedeac495271d0f",
                  }
               },
               {
                  "from": {
                     "addr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
                     "name": "Uniswap V2: DAI 2"
                  },
                  "to": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "for": {
                     "value": 1.7896439957837535,
                     "symbol": "WETH",
                     "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                  }
               },
               {
                  "from": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "to": {
                     "addr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
                     "name": "Uniswap V2: DAI 2"
                  },
                  "for": {
                     "value": 605.3285928994251,
                     "symbol": "DAI",
                     "tokenAddr": "0x6b175474e89094c44da98b954eedeac495271d0f",
                  }
               },
               {
                  "from": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "to": {
                     "addr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11",
                     "name": "Uniswap V2: DAI 2"
                  },
                  "for": {
                     "value": 1.7896439957837535,
                     "symbol": "WETH",
                     "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                  }
               },
               {
                  "from": {
                     "addr": "0x0000000000000000000000000000000000000000",
                     "name": ""
                  },
                  "to": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "for": {
                     "value": 27.98825289807409,
                     "symbol": "UNI-V2",
                     "tokenAddr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11"
                  }
               },
               {
                  "from": {
                     "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                     "name": "Zapper.Fi: Uniswap V2 Zap In"
                  },
                  "to": {
                     "addr": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
                     "name": ""
                  },
                  "for": {
                     "value": 27.98825289807409,
                     "symbol": "UNI-V2",
                     "tokenAddr": "0xa478c2975ab1ea89e8196811f51a7b7ade33eb11"
                  }
               }
            ],
            "events": [
               {
                  "type": "swap",
                  "fromValue": 607.147607100574975826,
                  "fromName": "DAI",
                  "toValue": 1.789643995783753644,
                  "toName": "Ether",
                  "on": " Uniswap"
               }
            ]
         }
      )
   })

   test("ether value / 1 withdrawl action", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
            "etherValue": 1.41505316,
            "etherUsdPrice": 320.19,
            "txFee": 0.002562,
            "from": "0xd551234ae421e3bcba99a0da6d736074f22192ff",
            "fromName": "Binance 2",
            "to": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
            "toName": "",
            "memo": [
               "Withdraw 1.41505316 Ether From  Binance"
            ]
         }
      )
   })

   test("withdrawl / ether value ", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
            "etherValue": 1.65,
            "etherUsdPrice": 387.19,
            "txFee": 0.003612,
            "from": "0x0076f45582fc3533c82a8ab08c8f719bb70abfd8",
            "fromName": "",
            "to": "0x5a40b55ed46cf7d1b5214cc3ca7a602fed581fdc",
            "toName": ""
         }
      )
   })

   test("contract / 1 approved action", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
            "etherValue": 0,
            "etherUsdPrice": 357.67,
            "txFee": 0.001953864,
            "from": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
            "fromName": "",
            "to": "0x429881672b9ae42b8eba0e26cd9c73711b891ca5",
            "toName": "PICKLE.Finance: PICKLE Token",
            "memo": [
               "Approved  PICKLE For Trade On  Uniswap V2: Router 2"
            ]
         }
      )
   })

   test("contract / 2 tokens / 1 swap action", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
            "etherValue": 0,
            "etherUsdPrice": 320.19,
            "txFee": 0.0121076736,
            "from": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
            "fromName": "",
            "to": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
            "toName": "Uniswap V2: Router 2",
            "tokens": [
               {
                  "from": {
                     "addr": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
                     "name": ""
                  },
                  "to": {
                     "addr": "0x8927616110cf23c4e87dc98614eb9fbaae95216c",
                     "name": "Uniswap V2: MOON 18"
                  },
                  "for": {
                     "value": 5875.073861643943,
                     "symbol": "MOON",
                     "tokenAddr": "0x68a3637ba6e75c0f66b61a42639c4e9fcd3d4824"
                  }
               },
               {
                  "from": {
                     "addr": "0x8927616110cf23c4e87dc98614eb9fbaae95216c",
                     "name": "Uniswap V2: MOON 18"
                  },
                  "to": {
                     "addr": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
                     "name": "Uniswap V2: Router 2"
                  },
                  "for": {
                     "value": 13.35344518550059,
                     "symbol": "WETH",
                     "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
                  }
               }
            ],
            "events": [
               {
                  "type": "swap",
                  "fromValue": 5875.073861643943308165,
                  "fromName": "MOON",
                  "toValue": 13.353445185500589982,
                  "toName": "Ether",
                  "on": " Uniswap"
               }
            ]
         }
      )
   })

   test("contract / 8 tokens / ether value / 2 swap actions", async () => {
      const tx = addrs[addr_i++]
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
         "etherValue": 29,
         "etherUsdPrice": 320.19,
         "txFee": 0.050385744,
         "from": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
         "fromName": "",
         "to": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
         "toName": "Zapper.Fi: Uniswap V2 Zap In",
         "tokens": [
            {
               "from": {
                  "addr": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
                  "name": "Uniswap V2: Router 2"
               },
               "to": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "for": {
                  "value": 29,
                  "symbol": "WETH",
                  "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
               }
            },
            {
               "from": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "to": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "for": {
                  "value": 275.1341093736212,
                  "symbol": "PICKLE",
                  "tokenAddr": "0x429881672b9ae42b8eba0e26cd9c73711b891ca5"
               }
            },
            {
               "from": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "to": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "for": {
                  "value": 137.7485785389374,
                  "symbol": "PICKLE",
                  "tokenAddr": "0x429881672b9ae42b8eba0e26cd9c73711b891ca5"
               }
            },
            {
               "from": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "to": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "for": {
                  "value": 14.43745978348922,
                  "symbol": "WETH",
                  "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
               }
            },
            {
               "from": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "to": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "for": {
                  "value": 137.38553083468378,
                  "symbol": "PICKLE",
                  "tokenAddr": "0x429881672b9ae42b8eba0e26cd9c73711b891ca5"
               }
            },
            {
               "from": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "to": {
                  "addr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819",
                  "name": "Uniswap V2: PICKLE 2"
               },
               "for": {
                  "value": 14.437455929457807,
                  "symbol": "WETH",
                  "tokenAddr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
               }
            },
            {
               "from": {
                  "addr": "0x0000000000000000000000000000000000000000",
                  "name": ""
               },
               "to": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "for": {
                  "value": 42.17637755167188,
                  "symbol": "UNI-V2",
                  "tokenAddr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819"
               }
            },
            {
               "from": {
                  "addr": "0x80c5e6908368cb9db503ba968d7ec5a565bfb389",
                  "name": "Zapper.Fi: Uniswap V2 Zap In"
               },
               "to": {
                  "addr": "0x915f68fdfe1970fc94daa5d1c0dcc89ab6f9f085",
                  "name": ""
               },
               "for": {
                  "value": 42.17637755167188,
                  "symbol": "UNI-V2",
                  "tokenAddr": "0xdc98556ce24f007a5ef6dc1ce96322d65832a819"
               }
            }
         ],
         "events": [
            {
               "type": "swap",
               "fromValue": 29,
               "fromName": "Ether",
               "toValue": 275.134109373621178742,
               "toName": "PICKLE",
               "on": " Uniswap"
            },
            {
               "type": "swap",
               "fromValue": 137.748578538937413252,
               "fromName": "PICKLE",
               "toValue": 14.4374597834892208,
               "toName": "Ether",
               "on": " Uniswap"
            }
         ]
      })
   })


})