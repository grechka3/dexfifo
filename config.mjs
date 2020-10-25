export default {

   etherscanAccs: [
      {
         //gento20
         apiKey: "GJJNVCXF67VEBTJXTR4GKX5V375HZMWRPY",
         viaHost: 'localhost',
      },
      {
         // rockmail  - al
         apiKey: "HJSP1KAUAWYC5QZBQS6B53WXKTVRSDQ56V",
         viaHost: '95.216.110.55',
         viaPort: '3128',
         viaUser: 'dexlifo',
         viaPassword: '111',
      },
      {
         // stok007 - dl
         apiKey: "KTFPXCJB2SXXWA7TVEACW4YUXUCKTRG76H",
         viaHost: '95.216.110.51',
         viaPort: '3128',
         viaUser: 'dexlifo',
         viaPassword: '111',
      }
   ],

   pg: {
      host: "176.9.46.195",
      port: 30184,
      user: "adminuser",
      password: "adminpassword",
      database: "dextax",
   },

   // Here must be 3000 ms according to API documentation. But works with small value too.
   etherscanAPIRestDelayTS: 300,

   etherscanAPIRequestTimeout: 20000,

   etherscanParserRestDelayTS: 100,

   etherscanParseRequestTimeout: 20000,

   // max lines on log file
   flogMaxLines: 30000,


}