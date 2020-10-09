import request from "../backend/src/request.mjs"



describe("[[ Request class ]]", ()=>
{
   test("http://qq2.ru/json.php?code=200&pause=0", async()=>
   {
      let res = await request.get("http://qq2.ru/json.php?code=200&pause=0")
      //let rjson = JSON.parse(res.body)
      expect(res.error).toBeFalsy()
      //expect(rjson.http_host).toEqual("qq2.ru")
      res._result = null
      //console.log(res)

   })
   test("http://qq2.ru/json.php?code=220&pause=0", async()=>
   {
      let res = await request.get("http://qq2.ru/json.php?code=220&pause=0")
      expect(res.error).toBeTruthy()
      expect(res.errorCode).toEqual(220)
      res._result = null
      //console.log(res)
   })
   test("http://qq2.ru/json.php?code=404&pause=0", async()=>
   {
      let res = await request.get("http://qq2.ru/json.php?code=404&pause=0")
      expect(res.error).toBeTruthy()
      expect(res.errorCode).toEqual(404)
      expect(res.errorMessage).toEqual("Response code 404 (Not Found)")
      res._result = null
      //console.log(res)
   })
   test("http://111qq2.ru/json.php?code=200&pause=0", async()=>
   {
      let res = await request.get("http://111qq2.ru/json.php?code=200&pause=0")
      expect(res.error).toBeTruthy()
      //console.log(res)
   })
   test("http://qq2.ru/json.php?code=200&pause=3000", async()=>
   {
      jest.setTimeout(30000)
      let res = await request.get("http://qq2.ru/json.php?code=200&pause=3000", {timeout:1000})
      expect(res.error).toBeTruthy()
      expect(res.errorCode).toBeFalsy()
      expect(res.errorMessage).toContain("ETIMEDOUT")
      //console.log(res)

   })
   test("http://qq2.ru/json.php?code=200&pause=0 via proxy", async()=>
   {
      let res = await request.get("http://qq2.ru/json.php?code=200&pause=0", {proxy:"http://dexlifo:111@al.aq0.ru:3128"})
      let rjson = JSON.parse(res.body)
      expect(res.error).toBeFalsy()
      expect(rjson.remote_addr).toEqual("95.216.110.55")
   })
})

