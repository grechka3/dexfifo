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
}