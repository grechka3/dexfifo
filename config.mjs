export default {

   etherscanAccs: [
      {
         //gento20
         apiKey: "GJJNVCXF67VEBTJXTR4GKX5V375HZMWRPY",
         viaHost: 'localhost',
      },
      {
         // rockmail
         apiKey: "HJSP1KAUAWYC5QZBQS6B53WXKTVRSDQ56V",
         viaHost: '95.216.110.55',
         viaPort: '3128',
         viaUser: 'dexlifo',
         viaPassword: '111',
      }
   ],

   // Here must be 3000 ms according to API documentation. But works with small value too.
   etherscanRestDelayTS: 300,

   etherscanRequestTimeout: 20000,
   flogMaxLines: 30000,


   DepositOrWithdrawlSymbols: [
      /UNI-V2/
   ],

   computisDefauts: {
      creditAccount: "Kraken",
      debitAccount: "Kraken",
      txFeeAccount : "Kraken",
      clientId: 11111,
   },

   // UTC+-[this value] in minutes.  Set it for your geo location. For ex.: New York = -320, Moscow = 180
   utcOffsetMinutes: 180,

}