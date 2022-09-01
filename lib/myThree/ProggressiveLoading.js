import {
	Vector3,
	Matrix4,
	Color,
	Vector4,
	FileLoader,
	LoadingManager,
	Object3D,
	MeshEx,
	InstancedMeshEx,
  } from '../three/build/three';
import { GLTFLoaderEx } from '../three/examples/jsm/loaders/GLTFLoaderEx.js';
import {ZipLoader } from '../ziploader.js';
import { DynamicLoading } from './DynamicLoading.js';
// import { Network } from './myThree/Network';
var ProggressiveLoading=function(sceneMgr,SLMSceneMeta,SLMConstansts){
	var scope = this;
	this.sceneMgr = sceneMgr;
	function processMesh(
			node,  		//mesh
			groupStruct,//将mesh分成多段，每一段是一组
			instanceMatrixMap,
			rootGroupNode_matrix,//mesh父节点的矩阵
			slmSceneMeta//处理器？
		){
			
			//console.log("rootGroupNode_matrix",rootGroupNode_matrix.elements)
			var groups = [];
			var instanceCountList = [];
			
			var clonedMaterial = node.material.clone()
			if(clonedMaterial.color.r===0&&clonedMaterial.color.g===0&&clonedMaterial.color.b===0){
				clonedMaterial.color.r=0.5
				clonedMaterial.color.g=0.5
			}
			clonedMaterial.transparent=false  //不是透明材质  //node.material的材质是透明材质
			
			var materialList = [clonedMaterial];

			var sceneCofigMeta = {
				id:  null,
				wireframe:  false,
				lighting:  false,
			};
			if (scope.sceneMgr.EnablePicking)
			{
				scope.sceneMgr.scenePicker.SetupInstancedShaderWithVertexColor(clonedMaterial, sceneCofigMeta);
			}
			for (var i = 0; i < groupStruct.length ; ++i)//当前实例组中对象的个数
			{//groupStruct数组的每一个元素由‘i、n、c、s’四个部分构成 //{i: 3278（id无意义）, n: '313350', c: 12, s: 0}
				var groupName = groupStruct[i].n;  //实例化组的name
				// console.log("instanceMatrixMap[groupName]",instanceMatrixMap[groupName])
				if(!instanceMatrixMap[groupName]){
					instanceMatrixMap[groupName]={
						id:[],it:[]
					}
				}else{
					instanceMatrixMap[groupName]={
						id:instanceMatrixMap[groupName][0],
						it:instanceMatrixMap[groupName][1]
					}
				}
				// console.log("instanceMatrixMap[groupName]",instanceMatrixMap[groupName])
				instanceMatrixMap[groupName].it.push([1,0,0,0, 0,1,0,0, 0,0,1,0]);//加上本身
				instanceMatrixMap[groupName].id.push(parseInt(groupName));
				instanceCountList.push(instanceMatrixMap[groupName].id.length);

				var group = {//每一个实例组的参数
					name: groupStruct[i].n,//name 名字，groupName,
					start: groupStruct[i].s,  // 开始的位置
					count: groupStruct[i].c,  // 数量
					instanceCount: instanceMatrixMap[groupName].id.length, //示例组中对象的个数
					
					bounds: null,
					oc:false//不知道作用 //oc: groupInfo.ocGroup&&groupInfo.ocGroup[groupName] ? true : false,
				};
				groups.push(group);
			}
		var instancedMesh = new InstancedMeshEx(
			node.geometry, 
			materialList, 
			1, 
			instanceCountList, 
			false//关闭光线？，sceneCofigMeta.lighting
		);
		instancedMesh.geometry.clearGroups();

		for (var groupIndex = 0; groupIndex < groups.length ; ++groupIndex)//每个实例组对应一个对象 //遍历这个mesh对应的实例组
		{
			var group = groups[groupIndex];
			var instanceMatrixList = instanceMatrixMap[group.name].it; //实例组中每个对象的矩阵
			var instancedElemIds = instanceMatrixMap[group.name].id;
			instancedMesh.geometry.addGroupInstanced(group.start * 3, group.count * 3, 0, groupIndex, false);
			for (var i = 0; i < group.instanceCount; i++)
			{
					var mat = instanceMatrixList[i];
					var instanceMatrix = new Matrix4();
					instanceMatrix.set(
								mat[0], mat[1], mat[2], mat[3],
								mat[4], mat[5], mat[6], mat[7], 
								mat[8], mat[9], mat[10], mat[11],
								0, 0, 0, 1);
					instancedMesh.setInstanceMatrixAt(
						groupIndex, 
						i, 
						instanceMatrix.multiply(rootGroupNode_matrix)
					);
					var elementId = instancedElemIds[i];// Instanced element
					instancedMesh.setInstanceColorAt(
						groupIndex, 
						i, 
						scope.sceneMgr.EncodeElementPickingId(//encodedColor
							slmSceneMeta.AddElementWitId(elementId),//elementPickingId, 
							false
						)
					);					
					slmSceneMeta.SetElementDesc(elementId, {mesh: instancedMesh, gId: groupIndex, iId: i, sId: group.name, groupStart: group.start, groupCount: group.count, key: ( null)}, ( null));
					slmSceneMeta.SetElementMatrix(elementId, instanceMatrix.clone());
					slmSceneMeta.SetElementGroupMatrix(elementId, rootGroupNode_matrix.clone());
					//console.log('================= instance node');
			}
			
		}

		if (groups.length > 0)
		{
			instancedMesh.layers.set(SLMConstansts.SceneLayerMask);
		}
		return instancedMesh
	}
	function start(){
		var instanceRoot = new Object3D(); //InstancedMeshEx的父节点 ，和rootGroupNode平级
		instanceRoot.rotation.set(-Math.PI/2,0,0)
		window.scene.add(instanceRoot);
		var slmSceneMeta = new SLMSceneMeta(scope.sceneMgr, {geoInfo: null, propInfo: null, elemInfo: null, sceneTag: scope.sceneTag, groupInfo: null});
		window.c.position.set(
			2358.14990234375,9.199999809265137,-1706.5799560546875
		)
		window.meshes={}//用于遮挡剔除
		window.loadedLZC={}
		loading(
			Array.from(Array(16800)).map((e, i) => i)
		)
		console.log("双线程")
		function loading(meshIndex) {//普通加载
			if(!window.loadedLZC)window.loadedLZC={}
			if(window.loadedLZC[meshIndex]) return;
			else window.loadedLZC[meshIndex]=1;
			loadSubZip3(addModel2,meshIndex)//双线程
			// loadSubZip2(addModel2,meshIndex)//单线程
		}

		function addModel2(m1,meshIndex,matrixConfig,structdesc0){
			if(window.loadSubZip_test){
				if(window.loadSubZip_test.addModel2_first_time===-1){//第一次使用addmodels
					window.loadSubZip_test.addModel2_first_time=
						performance.now()-window.loadSubZip_test.time0
					
				}
				window.loadSubZip_test.addModel2_last_time=
					performance.now()-window.loadSubZip_test.time0
				window.loadSubZip_test.addModel_count++
			}
			var m2=processMesh(
				m1, //mesh
				structdesc0,//实例化的矩阵？
				matrixConfig,
				m1.parent.matrix,//rootGroupNode.matrix,//mesh父节点的矩阵
				slmSceneMeta //处理器？
			)	

			instanceRoot.add(m2);
			window.meshes[meshIndex]=m2;
			m1.visible=false
			console.log(Object.keys(window.meshes).length)
			// console.log("addModel",meshIndex)
			if(window.dynamicLoading)
				window.dynamicLoading.prePoint2=Math.random()//接下来进行遮挡剔除
			// loading(meshIndex+1)
		}
		
		
		loadZipJson("assets/models/all1.zip",(data1)=>{
			console.log("data1",data1)
			loadZipJson("assets/models/all2.zip",(data2)=>{
				console.log("data2",data2)
				loadZipJson("assets/models/all3.zip",(data3)=>{
					console.log("data3",data3)
					loadZipJson("assets/models/all4.zip",(data4)=>{
						console.log("data4",data4)
						loadZipJson("assets/models/all5.zip",(data5)=>{
							console.log("data5",data5)
							loadZipJson("assets/models/all6.zip",(data6)=>{
								console.log("data6",data6)
								loadZipJson("assets/models/groups_arr.zip",(groups_arr)=>{
									console.log("groups_arr",groups_arr)
									window.dynamicLoading=new DynamicLoading({
										"loading":()=>{},//loading,//
										"visualList":[data1,data2,data3,data4,data5,data6],
										"groups_arr":groups_arr
									})
									// loading(0)
								})
							})
						})
					})
				})
			})
		})
	}
	start()
}
export { ProggressiveLoading}
function loadJson(url,cb){
	var request = new XMLHttpRequest();
	request.open("get", url);//请求方法,路径
	request.send(null);//不发送数据到服务器
	request.onload = function () {//XHR对象获取后
		if (request.status === 200) {//获取成功的状态码
			var data=JSON.parse(request.responseText)
			cb(data)
		}
	}
}
var loadingManager = new LoadingManager();
function loadZipJson(url,cb){
	new ZipLoader()
		.load( 
				url ,  
				xhr =>{},//updateProgressBar(( xhr.loaded / xhr.total * 100 ).toFixed(1), 'loading...');
				()=>{
					console.log("加载失败:"+url)
					setTimeout(()=>{//重新请求
						loadZipJson(url,cb)
					},1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
				}
			)
		.then( 
				function( zip ){
							loadingManager.setURLModifier( zip.urlResolver );
							parseJson(
								zip.find( /\.(json)$/i )[0],
								cb
							)
					}
			)
	function parseJson(url_json,cb_json){
		var loader = new FileLoader(loadingManager);
		loader.load(
			url_json , 
			data=> cb_json(JSON.parse(data))
		)
	}
	
							
}
function loadSubGLB (back,meshIndex,matrixConfig,structdesc0)
{
	// var projectName=window.param.projectName;
	var url="assets/models/huayi/"+meshIndex+".glb"
	var loader=new LoadingManager()
	new Promise(function( resolve, reject) {
		var myGLTFLoaderEx=new GLTFLoaderEx(loader)
		myGLTFLoaderEx.load(url, (gltf)=>{
			resolve(gltf)
		},()=>{},()=>{
			console.log("加载失败："+meshIndex)
			setTimeout(()=>{
				loadSubGLB(back,meshIndex,matrixConfig,structdesc0)
			},1000*(0.5*Math.random()+1))
		})
	} ).then( function ( gltf ) {
		var m1 = gltf.scene.children[0].children[0]
		//var arr=gltf.scene.children[0].children
		back(m1,meshIndex,matrixConfig,structdesc0)
	} )
}
function loadSubZip (back,meshIndex,matrixConfig,structdesc0)
{//assets\models\SAM_Review_1\output1.zip
	var url="assets/models/huayi/"+meshIndex+".zip"
	var loader=new LoadingManager()
	new Promise( function( resolve, reject ) {
		//加载资源压缩包
		new ZipLoader().load( url,()=>{
		},()=>{
			console.log("加载失败："+meshIndex)
			setTimeout(()=>{//重新请求
				loadSubZip (back,meshIndex,matrixConfig,structdesc0)
			},1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
		}).then( ( zip )=>{//解析压缩包
			loader.setURLModifier( zip.urlResolver );//装载资源
			resolve({//查看文件是否存在？以及路径
				fileUrl: zip.find( /\.(gltf|glb)$/i )
			});
		});
	} ).then( function ( configJson ) {
		var myGLTFLoaderEx=new GLTFLoaderEx(loader)
		myGLTFLoaderEx.load(configJson.fileUrl[0], (gltf) => {
			var m1 = gltf.scene.children[0].children[0]
			back(m1,meshIndex,matrixConfig,structdesc0)
		});

	} );
}

function loadSubZip2 (back,meshIndex){//不要删除这个函数，这个函数可以用于 单线程和多线程的对比测试
	var url="assets/models/huayi/"+meshIndex+".zip"
	var zipLoader=new ZipLoader()
	zipLoader.crossOrigin=true
	zipLoader.load( 
				url ,  
				xhr =>{},//updateProgressBar(( xhr.loaded / xhr.total * 100 ).toFixed(1), 'loading...');
				()=>{
					console.log("加载失败:"+url)
					setTimeout(()=>{//重新请求
						loadSubZip2 (back,meshIndex)
					},1000*(0.5*Math.random()+1))//1~1.5秒后重新加载
				}
			)
		.then( 
				zip=>{	
					var loadingManager = new LoadingManager();
					loadingManager.setURLModifier( zip.urlResolver );
					var loader = new FileLoader(loadingManager);
					loader.load(
						zip.find( /\.(json)$/i )[0] , 
						data0=>{
							var data=JSON.parse(data0)
							var matrixConfig=data.matrixConfig
							var structdesc0=data.structdesc0
							// console.log(data)

							var loader=new LoadingManager()
							loader.setURLModifier( zip.urlResolver );//装载资源
							var myGLTFLoaderEx=new GLTFLoaderEx(loader)
							myGLTFLoaderEx.load(zip.find( /\.(glb)$/i )[0], (gltf) => {
								var m1 = gltf.scene.children[0].children[0]
								// console.log(m1)
								back(m1,meshIndex,matrixConfig,structdesc0)
							});

						}
					)

				}
		)					
}
function loadSubZip3_old (back,meshIndex){
	if(!window.loadSubZip3_worker){
		window.loadSubZip3_worker=new Worker("../myWorker/loadSubZip.js")
		window.loadSubZip3_worker.onmessage=ev=>{
			var matrixConfig=ev.data.matrixConfig
			var structdesc0=ev.data.structdesc0
			var meshIndex=ev.data.meshIndex
			const manager = new LoadingManager();
			var loader=new GLTFLoaderEx(manager)
			loader.parse( 
				ev.data.myArray, 
				"./",
				gltf=>{
					var m1 = gltf.scene.children[0].children[0]
					// console.log("!!!!!!!!!!!!m1",m1)
					// console.log("(m1,meshIndex,matrixConfig,structdesc0):",m1,meshIndex,matrixConfig,structdesc0)
					back(m1,meshIndex,matrixConfig,structdesc0)
			})
		}
	}
	window.loadSubZip3_worker.postMessage({
		type:"",
		meshIndex:meshIndex,
		url:"assets/models/huayi/"+meshIndex+".zip"
	})
}
function loadSubZip3 (back,list){
	if(!window.loadSubZip3_worker){//第一次要进行初始化
		window.loadSubZip3_worker=new Worker("../myWorker/loadSubZip.js")
		window.loadSubZip3_worker.onmessage=ev=>{
			var matrixConfig=ev.data.matrixConfig
			var structdesc0=ev.data.structdesc0
			var meshIndex=ev.data.meshIndex
			const manager = new LoadingManager();
			var loader=new GLTFLoaderEx(manager)
			loader.parse( 
				ev.data.myArray, 
				"./",
				gltf=>{
					var m1 = gltf.scene.children[0].children[0]
					back(m1,meshIndex,matrixConfig,structdesc0)
			})
		}
	}
	window.loadSubZip3_worker.postMessage({//开始请求
		type:"list",
		list:list,
		urlPrefix:"assets/models/huayi/"
	})
}
// loadSubZip3 (()=>{},10)