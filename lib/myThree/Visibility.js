//config.loading；加载数据包
//window.param.projectName: 用于获取config.json的地址
//window.c : 判断视点的位置和相机是否移动
import {
    Frustum,//用于视锥剔除
    Matrix4,//用于视锥剔除
} from '../three/build/three.js';
export {Visibility}
class Visibility{
    //最好再加入遮挡剔除
    constructor(config) {
        this.loading=config.loading
        var scope=this
        scope.border=false//判断视点是否在场景边缘的标记
        
        this.visualList=config.visualList
        this.groups_arr=config.groups_arr

        scope.areaInf=[
            {
                "max": [3080.75, 79.75, -1251.25], 
                "min": [1643.25, -32.75, -2638.75], 
                "step": [115, 9, 111],
                "path":"./assets/models/huayirvm0616-0.log/6.ls_d.json",
                "preload":false
            }
        ]
        //data
        scope.prePoint=window.c.position.x+","+window.c.position.y+","+window.c.position.z
        scope.prePoint2="";//window.c.position.x+","+window.c.position.y+","+window.c.position.z
        scope.initLists()
        scope.start()//加载和预加载
        scope.start2()//遮挡剔除和视锥剔除
        
    }
    initLists(){
        var scope=this
        this.lists={}
        for(var iii=0;iii<scope.areaInf.length;iii++){
            var path0=scope.areaInf[iii].path
            scope.lists[path0]=this.data_test//scope.lists[path]=data
            scope.prePoint=""//如果视点不改变不会加载资源，所以这里让视点判断为改变
        }
        
    }
    start(){//用于加载和预加载
        var scope=this
		var first=true
		setInterval(()=>{
					var point0=window.c.position.x+","+window.c.position.y+","+window.c.position.z
                    //console.log(scope.prePoint===point0,scope.prePoint,point0)
					if(scope.prePoint===point0){//如果视点没有移动
						if(first){//如果是第一次
                            for(var iii=0;iii<scope.areaInf.length;iii++){
                                var areaInf0=scope.areaInf[iii]
                                scope.updateSource(
                                    areaInf0.min,
                                    areaInf0.step,
                                    areaInf0.max,
                                    areaInf0.path,
                                    areaInf0.preload)
                            }
							first=false
						}
					}else {//如果视点发生了移动
						scope.prePoint=point0
						first=true
					}
		},200)
		console.log("开始动态加载资源")
    }
    start2(){//用于渲染的遮挡剔除
        var scope=this
        // var prePoint2=""
        var prePoint2_rot=""
		function setInterval0(){
            requestAnimationFrame(setInterval0)
            var point0=window.c.position.x+","+window.c.position.y+","+window.c.position.z
            var point0_rot=window.c.rotation.x+","+window.c.rotation.y+","+window.c.rotation.z
            if(Object.keys(scope.lists).length<1)//还没有加载完可见性列表
                return
            if(scope.prePoint2!==point0){//如果视点位置变化就进行遮挡剔除判断//if(true){//始终进行遮挡剔除判断 //
                if(window.meshes)
                    for(var i in window.meshes){
                        if(i>=1000){
                            window.meshes[i].visible=false
                            window.meshes[i].Obscured=true//被遮挡，不可见
                        }
                        
                    }
                for(var iii=0;iii<scope.areaInf.length;iii++){
                    var areaInf0=scope.areaInf[iii]
                        scope.updateSource2(//判断Obscured
                            areaInf0.min,
                            areaInf0.step,
                            areaInf0.max,
                            areaInf0.path,
                            areaInf0.preload)
                        }
                // scope.displayShell()//判断遮挡剔除是否排除外壳
            }
            if(scope.prePoint2!==point0||prePoint2_rot!=point0_rot){//如果视点位置或方向变化就进行视锥剔除判断
                // scope.cullingFrustum()
            }
            scope.prePoint2=point0 
            prePoint2_rot=point0_rot
		}setInterval0()
		console.log("开始进行遮挡剔除")  
    }
    updateSource(min,step,max,path,preload) {//用于加载和预加载
        var lists=this.getList(min,step,max,path)
        var scope=this
        if(true){//!preload){//加载
            for(var j=0;j<lists.length;j++){
                var list=lists[j]
                scope.loading(list)
            }
        }else{//预加载
        }
        
    }
    displayShell(){
        if(!window.meshes)return
        var x=window.c.position.x
        var y=window.c.position.y
        var z=window.c.position.z
        var needDisplayShell=false
        for(var j in this.areaInf){
            var inf=this.areaInf[j]
            var max=inf.max
            var min=inf.min
            if(x>max[0]||y>max[1]||z>max[2]
                ||x<min[0]||y<min[1]||z<min[2]){
                    needDisplayShell=true//需要显示外壳
                }
        }
        if(needDisplayShell)//需要显示外壳
            for(var i in window.meshes){
                var mesh=window.meshes[i]
                if(mesh.isShell)//mesh.visible=true
                    mesh.Obscured=false//此时认为外壳没有被遮挡
                    mesh.visible=true
            }
    }
    updateSource2(min,step,max,path,preload) {//用于渲染
        if(preload||!window.meshes)return
        var lists=this.getList(min,step,max,path)   
        for(var i in lists)
            if(lists[i].length>0)
                for(var j=0;j<lists[i].length&&j<4000;j++)//for(var j in lists[i])
                    if(window.meshes[""+lists[i][j]]){
                        window.meshes[""+lists[i][j]].visible=true
                        window.meshes[""+lists[i][j]].Obscured=false//没有被遮挡（可见）
                    }               
    }
    getDirect(){
        var d=window.c.getWorldDirection()
        var d0={x: 0, y: 0, z: -1}  //  //[0,0,0]
        var d1={x: 0, y: 1, z: 0}   //上//[Math.PI/2,0,0]
        var d2={x: 0, y: 0, z: 1}   //  //[Math.PI,0,0]
        var d3={x: 0, y: -1, z: 0}  //下//[Math.PI*1.5,0,0]
        var d4={x: -1, y: 0, z: 0}  //  //[0,Math.PI/2,0]
        var d5={x: 1, y: 0, z: 0}   //  //[0,-Math.PI/2,0]
        var getMul=(a,b)=>{return a.x*b.x+a.y*b.y+a.z*b.z}
        var angle=[
            getMul(d,d0),getMul(d,d1),getMul(d,d2),getMul(d,d3),getMul(d,d4),getMul(d,d5)
        ]
        var min=0,max=0
        for (var i=1;i<6;i++){
            if(angle[i]>angle[max])max=i
            if(angle[i]<angle[min])min=i
        }

        return selectSort(angle)//{max:max,min:min}
        function selectSort(array) {//>,>,> 降序排序
            var array2=[0,1,2,3,4,5]
            const len = 6//array.length
            let temp
            let minIndex
            for (let i = 0; i < len - 1; i++){ //逐个选出最大
              minIndex = i//
              for (let j = i + 1; j < len; j++) {
                if (array[j] >= array[minIndex]) {
                  minIndex = j//指向最大的元素
                }
              }// for (let j = i + 1; j < len; j++)
              temp = array[i]
              array[i] = array[minIndex]
              array[minIndex] = temp

              temp=array2[i]
              array2[i] = array2[minIndex]
              array2[minIndex] = temp
            }//for (let i = 0; i < len - 1; i++) 
            return array2
        }//function selectSort(array)
    }    
    getList(min,step,max) {//用于渲染
        var scope=this
        var x=window.c.position.x
        var y=window.c.position.y
        var z=window.c.position.z
        if(x>max[0])x=max[0]
        if(y>max[1])y=max[1]
        if(z>max[2])z=max[2]
        if(x<min[0])x=min[0]
        if(y<min[1])y=min[1]
        if(z<min[2])z=min[2]
        var dl=[]
        for(var i=0;i<3;i++)
            dl.push(
                (max[i]-min[i])/step[i]
            )
        
        var xi=Math.round((x-min[0])/dl[0])
        var yi=Math.round((y-min[1])/dl[1])
        var zi=Math.round((z-min[2])/dl[2])
        
        var list_all=[]
        var direct=this.getDirect()
        function add(direct_i,maxNumber){
            var list=scope.visualList[direct_i][xi][yi][zi]
            for(var j=0;j<list.length&&j<maxNumber;j++){
                var group_id=list[j]
                var group=scope.groups_arr[group_id]
                for(var k=0;k<group.length;k++){
                    list_all.push(group[k]) 
                }
            }
        }
        
        if(scope.border){//在场景边缘
        }else{//普通情况
            add(direct[0],15000)
            add(direct[1],8000)
            add(direct[2],4000)
            add(direct[3],3000)
            add(direct[4],2000)
        }
        // console.log("list_all.length",list_all.length)
        return [list_all]
    }
    loadJson(path,cb) {
        var request = new XMLHttpRequest();
        request.open("get", path);//请求方法,路径
        request.send(null);//不发送数据到服务器
        request.onload = function () {//XHR对象获取后
            if (request.status === 200) {//获取成功的状态码
                var str=request.responseText
                cb(JSON.parse(str),path)
            }
        }
    }
    cullingFrustum(){//视锥剔除
        if(!window.meshes)return
        if(!this.cullingFrustumNotFirstFlag){
            this.cullingFrustumNotFirstFlag=true
            return//跳过第一次的视锥剔除
        }//第一次的视锥剔除会出错，出错的原因现在还不清楚//出错原因可能是一帧无法完成全部包围球遮挡判断的计算 //出错的原因可能是初始数据包的解析问题
        
        var frustum = getFrustum(window.c)
        for(let i in window.meshes){//for(let i=0; i<window.meshes.length; i++){
            var m=window.meshes[i]
            if(!m.Obscured)
                m.visible=intersectSpheres(m.bounding_sph, frustum)
        }
        function getFrustum(camera){
            var frustum = new Frustum();
            frustum.setFromProjectionMatrix( new Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
            return frustum;
        }
        function intersectSpheres(spheres, frustum){
            if(spheres)
            for(let i=0; i<spheres.length; i++)
                if(intersectSphere(spheres[i].center, spheres[i].radius, frustum))
                    return true
            return false
            function intersectSphere(center, radius, frustum) {
                const planes = frustum.planes;
                const negRadius = - radius;
                for(let i=0; i<planes.length; i++){
                    const distance = planes[ i ].distanceToPoint( center );//平面到点的距离，
                    if ( distance < negRadius ) //内正外负
                        return false;//不相交
                }
                return true;//相交
            }
        }
    }
    cullingFrustum1(mesh_id){//用于预加载的视锥剔除判断
        if(!window.meshes)return
        if(!this.bounding_sph)return
        var frustum = getFrustum(window.c)
        var bounding=this.bounding_sph[mesh_id]
        //console.log(frustum)
        //console.log(bounding)
        for(var i=0;i<bounding.c.length;i++){
            if(intersectSphere(bounding.c[i], bounding.r, frustum))
                return true//相交
        }
        return false//不相交

        function getFrustum(camera){
            var frustum = new Frustum();
            frustum.setFromProjectionMatrix( new Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
            return frustum;
        }
        function intersectSphere(center, radius, frustum) {
            const planes = frustum.planes;
            const negRadius = - radius;
            for(let i=0; i<planes.length; i++){
                const distance = planes[ i ].distanceToPoint( center );//平面到点的距离，
                if ( distance < negRadius ) //内正外负
                    return false;//不相交
            }
            return true;//相交
        }
    }
    cullingFrustum1_2(mesh_id){//用于预加载的视锥剔除判断
        if(!window.meshes)return
        if(!this.bounding_sph)return
        var frustum = getFrustum(window.c)
        var bounding=this.bounding_sph[mesh_id]
        //console.log(frustum)
        //console.log(bounding)
        for(var i=0;i<bounding.c.length;i++){
            if(intersectSphere(bounding.c[i], bounding.r, frustum))
                return true//相交
        }
        return false//不相交

        function getFrustum(camera){
            var frustum = new Frustum();
            frustum.setFromProjectionMatrix( new Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
            return frustum;
        }
        function intersectSphere(center, radius, frustum) {//上下左右前(远)后(近)
            getSpace(frustum,1,1)
            function getSpace(frustum,a1,a2){
                return [
                    [1,1,1,1],
                    [1,1,1,1],
                    [1,1,1,1],
                    [1,1,1,1],
                    [1,1,1,1],
                    1
                ]
            }

            var position=window.c.position
            if(center.x*position.x+center.y*position.y+center.z*position.z>Math.pow(frustum[4].constant-frustum[5].constant,2))
                return false
            const planes = frustum.planes;
            if ( planes[5].distanceToPoint( center ) < - radius ) //内正外负
                    return false;//不相交
            
            return true;//相交
        }
    }
}
