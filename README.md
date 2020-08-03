Phase 1

#### ****Installation****
```
npm install
```

#### ****Run****
```
node bin/export_tx.mjs -i sampleData/ethaddrs.txt -o sampleData/export.csv
```

or

```
npm run export_test
```

A sample input data eth address file located in sampleData directory.

The exported file placed here [sampleData/export.csv](https://git.qq2.ru/webdevelop.pro/dexfifo/src/branch/master/sampleData/export.csv)

JSDoc can by opened with _**./jsdoc/index.html**_  file.

![](https://qq2.ru/shots/Video_2020-08-03_061704.gif)

#### ****Known problems****

The etherscan.io API have some limitations: maximum returned transaction items is equal to 10000.  