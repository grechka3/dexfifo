Phase 1

#### ****Installation****
```
npm install
```


#### ****How to run****

Export transaction to files 
```
npx babel-node bin/export-tx.mjs -i data/conf.txt -o data/exported
```

In data/exported directory will be tree files:\
*computis.json* -  json file in Computis format\
*transfers.csv* - Excel file with same data as *computis.json*\
*db.json*  - all collected data from Etherscan API 

#### ****Tests****
```
npx jest
```

#### ****Program options**** ####
```
npx babel-node bin/export-tx.mjs -h
```

A sample data file is located in ./data/ directory.

Config input file:\
[data/input.conf](https://github.com/grechka3/dexfifo/blob/master/data/input.conf)

Computed data in CSV format:\
[data/exported/transfers.csv](https://github.com/grechka3/dexfifo/blob/master/data/exported/transfers.csv)

Computed data in Computis json format:\
[data/export/computis.json](https://github.com/grechka3/dexfifo/blob/master/data/exported/computis.json)



#####Generate jsdoc documentation:

````npx jsdoc -c jsdoc.json```` 

#### ****Known problems****

The etherscan.io API have some limitations: maximum returned transaction items is equal to 10000.  