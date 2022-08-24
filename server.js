const commonPackCache={}
const fs=require("fs")
const server=require('http').createServer(function (request, response) {
    var filePath;
    response.setHeader("Access-Control-Allow-Origin", "*");
    request.on('data', function (data) {//接受请求
        filePath=String.fromCharCode.apply(null,data)
        // console.log("filePath1:",filePath)
    });
    request.on('end', function () {//返回数据
      //var path=request.url
      //if(path[0]==="/")path=path.slice(1,path.length)
      //path="dist/"+(path.split("dist/")[1])
      var path=filePath
      var buffer=commonPackCache[path]
      if(buffer){//有缓存
        console.log(path)
        response.write(buffer);
        response.end();
      }else{//无缓存
        try{
          console.log("无缓存:"+path)
          fs.readFile(path, function (err, buffer) {//读取文件//将模型数据读取到buffer中，buffer应该是字符串类型的数据
            commonPackCache[path]=buffer  
            response.write(buffer);
            response.end();
          });
        }catch{console.log("eror!",path)}
      }
      
    });
}).listen(8081, '0.0.0.0', function () {
    console.log("listening to client:8081");
});


server.on('close',()=>{
  console.log('服务关闭')
})
server.on('error',()=>{
  console.log('服务发送错误')
})
server.on('connection',()=>{
  console.log('服务连接')
})
server.on('timeout',()=>{
  console.log("监听超时")
})
//https://blog.csdn.net/NI_computer/article/details/109362820  