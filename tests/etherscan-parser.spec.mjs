import etherParser from "../backend/src/etherscan-parser.mjs"
import etherTXRows from "./etherscan-txs-json.mjs"

describe("[[EtherscanParser class :: RETRIVE DATA FROM TX PAGE]]", () => {

   test("contract / 7 tokens / 1 swap action", async () => {
      const tx = "0xbbda9afb27b2720cfcd9e462507daae6684c18bc88bdd909ffad3aba0d0ca533"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })

   test("ether value / 1 withdrawl action / no memo", async () => {
      const tx = "0x79591247b82e1a7394413e4f8a9455bf14e392270b70f5b04810396f8bc7b78f"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })

   test("1 withdrawl / ether value / memo ", async () => {
      const tx = "0xb602bae4dd7bce0af5876c8216d8db257bf22386ec921bd07122a39b46619186"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })

   test("contract / 1 approved action", async () => {
      const tx = "0x843694f8926d387e05c744fcd0d90b6762d4f68ac6801b85660065d48dced92f"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })

   test("contract / 2 tokens / 1 swap action", async () => {
      const tx = "0xf5dd98b65e39379e06aa31cca1b5fbc8d8b8229948c789579d0cb0f0d2633282"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })

   test("contract / 8 tokens / ether value / 2 swap actions", async () => {
      const tx = "0xc813ebbe47b17a799d4892b6b14a269fb922b06d6bacd4482af8ef56b0603c72"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject(etherTXRows[tx])
   })


   test("contract / 5 tokens / ether value / token price at tx time", async () => {
      const tx = "0x1369ed0d8582dfb143b6a510b62e33531b32253169c84f4f6491730da23152e2"
      expect(await etherParser.getDataFromTxPage(tx)).toMatchObject({
            "etherValue": 0.009,
            "etherUsdPrice": 220.56,
            "txFee": 0.0061815,
            "from": "0x9ad227d56a36b33407916f3293db2d298095dca9",
            "fromName": "",
            "to": "0x3ab6564d5c214bc416ee8421e05219960504eead",
            "toName": "",
            "tokens": [
               {
                  "from": {
                     "addr": "0xc0829421c1d260bd3cb3e0f06cfe2d52db2ce315",
                     "name": "Bancor: ETH Token"
                  },
                  "to": {
                     "addr": "0x3ab6564d5c214bc416ee8421e05219960504eead",
                     "name": ""
                  },
                  "for": {
                     "value": 0.009,
                     "symbol": "ETH",
                     "tokenAddr": "0xc0829421c1d260bd3cb3e0f06cfe2d52db2ce315"
                  }
               },
               {
                  "from": {
                     "addr": "0x3ab6564d5c214bc416ee8421e05219960504eead",
                     "name": ""
                  },
                  "to": {
                     "addr": "0xd3ec78814966ca1eb4c923af4da86bf7e6c743ba",
                     "name": ""
                  },
                  "for": {
                     "value": 0.009,
                     "symbol": "ETH",
                     "tokenAddr": "0xc0829421c1d260bd3cb3e0f06cfe2d52db2ce315"
                  }
               },
               {
                  "from": {
                     "addr": "0xd3ec78814966ca1eb4c923af4da86bf7e6c743ba",
                     "name": ""
                  },
                  "to": {
                     "addr": "0x3ab6564d5c214bc416ee8421e05219960504eead",
                     "name": ""
                  },
                  "for": {
                     "value": 3.229652414324517,
                     "symbol": "BNT",
                     "tokenAddr": "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
                     "currentPriceUsd": expect.anything()
                  }
               },
               {
                  "from": {
                     "addr": "0x3ab6564d5c214bc416ee8421e05219960504eead",
                     "name": ""
                  },
                  "to": {
                     "addr": "0xac98a5effaeb7a0578e93cf207ced12866092947",
                     "name": ""
                  },
                  "for": {
                     "value": 0.006459304828649034,
                     "symbol": "BNT",
                     "tokenAddr": "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
                     "currentPriceUsd": expect.anything()
                  }
               },
               {
                  "from": {
                     "addr": "0x3ab6564d5c214bc416ee8421e05219960504eead",
                     "name": ""
                  },
                  "to": {
                     "addr": "0x9ad227d56a36b33407916f3293db2d298095dca9",
                     "name": ""
                  },
                  "for": {
                     "value": 3.223193109495868,
                     "symbol": "BNT",
                     "tokenAddr": "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c",
                     "currentPriceUsd": expect.anything()
                  }
               }
            ],
            "events": [],
            "memo": []
         }
      )
   })


})