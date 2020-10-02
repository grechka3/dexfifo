
module.exports = {
   testEnvironment: 'node',
   roots: [
      "./tests"
   ],

   testRegex: "\\.spec\\.(jsx?|js?|mjs?|tsx?|ts?)$",
   transform: {
      "^.+\\.jsx?$": "babel-jest",
      "^.+\\.mjs$": "babel-jest",
   },
   testPathIgnorePatterns: ["<rootDir>/build/", "<rootDir>/node_modules/"],
   moduleFileExtensions: ["js", "jsx", "mjs"]
}