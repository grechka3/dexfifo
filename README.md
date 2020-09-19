Phase 1

#### ****Installation****
```
npm install
```


#### ****How to run****

Export to CSV format 
```
npx babel-node bin/export_tx.mjs -i sampleData/ethaddrs.txt -o sampleData/export.csv
```

Export to Computis JSON format 
```
npx babel-node bin/export_tx.mjs -i sampleData/ethaddrs.txt -o sampleData/export.json
```


#### ****Program options**** ####
```
npx babel-node bin/export_tx.mjs -h
```

A sample input data eth address file located in sampleData directory.

The exported CSV file placed here [sampleData/export.csv](https://github.com/grechka3/dexfifo/blob/master/sampleData/export.csv) \
Computis JSON file here [sampleData/export.json](ttps://github.com/grechka3/dexfifo/blob/master/sampleData/export.json)



Generate jsdoc documentation:

````npx jsdoc -c jsdoc.json```` 

#### ****Known problems****

The etherscan.io API have some limitations: maximum returned transaction items is equal to 10000.  