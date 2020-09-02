Phase 1

#### ****Installation****
```
npm install
```

#### ****Run****
```
npx babel-node bin/export_tx.mjs -i sampleData/ethaddrs.txt -o sampleData/export.csv
```

#### ****Program options**** ####
```
npx babel-node bin/export_tx.mjs -h
```

A sample input data eth address file located in sampleData directory.

The exported file placed here [sampleData/export.csv](https://github.com/grechka3/dexfifo/blob/master/sampleData/export.csv)

![](https://qq2.ru/shots/Video_2020-08-03_061704.gif)


Generate jsdoc documentation:

````npx jsdoc -c jsdoc.json```` 

#### ****Known problems****

The etherscan.io API have some limitations: maximum returned transaction items is equal to 10000.  