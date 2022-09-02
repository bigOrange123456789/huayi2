import {
	Vector3,
	Matrix4,
	Color,
	Vector4,
	FileLoader,
	LoadingManager,
	Object3D,
  } from '../lib/three/build/three';
import { GLTFLoaderEx } from '../lib/three/examples/jsm/loaders/GLTFLoaderEx.js';
import { DRACOLoader } from '../lib/three/examples/jsm/loaders/DRACOLoader.js';
import {ZipLoader } from './ziploader.js';
import { SLMPicker } from './SLMPicker';
import { ProggressiveLoading } from './myThree/ProggressiveLoading.js';

var SLMConstansts = SLMConstansts || {};
SLMConstansts.SceneLayerMask = 31;
SLMConstansts.OccluderLayerMask = 30;

var SLMSceneMeta = function(slmSceneMgr, options)
{
	this.slmSceneMgr = slmSceneMgr;

	this.baseElementPickingId = slmSceneMgr.GetTotalElementCount();

	this.elementDesc = {};

	this.elementMatrix = {};

	this.elementMatrixGroup = {};

	this.srcMeshGeoInfo = options.geoInfo ? options.geoInfo: null;

	this.propertiesData = options.propInfo ? options.propInfo: null;

	this.elementInfo = options.elemInfo ? (options.elemInfo.components ? options.elemInfo.components : options.elemInfo) : null;

	this.elementKeyprefix = options.elemInfo ? (options.elemInfo.keyprefix ? options.elemInfo.keyprefix : null): null;

	this.elementProperty = options.elemInfo ? (options.elemInfo.properties ? options.elemInfo.properties : null): null;

	this.elementPropValue = options.elemInfo ? (options.elemInfo.propvalus ? options.elemInfo.propvalus : null): null;

	this.elementMaterialEx = options.elemInfo ? (options.elemInfo.mtlEx ? options.elemInfo.mtlEx : null): null;

	this.elementKeyToIdMap = {};

	this.elementPickingIds = [];

	this.sceneTag = options.sceneTag ? options.sceneTag : null;//1

	var scope = this;

	this.GetSourceKey = function(simKey)
	{
		var srcKey = simKey;
		if (this.elementKeyprefix) // Rebuild full key
		{
			var strs = simKey.split('_');

			if (strs.length == 2)
			{
				srcKey = this.elementKeyprefix[strs[0]] + '_' + strs[1];
			}
		}

		return srcKey;
	}

	this.SetElementDesc = function(elementId, desc, key = null)
	{
		this.elementDesc[elementId] = desc;

		if (key)
		{
			var srcKey = this.GetSourceKey(key);

			if (!this.elementKeyToIdMap[srcKey])
			{
				this.elementKeyToIdMap[srcKey] = [];
			}

			this.elementKeyToIdMap[srcKey].push(elementId + this.baseElementPickingId);
		}
	}

	this.SetElementMatrix = function(elementId, matrix)
	{
		this.elementMatrix[elementId] = matrix;
	}

	this.SetElementGroupMatrix = function(elementId, matrix)
	{
		this.elementMatrixGroup[elementId] = matrix;
	}

	this.AddElementWitId = function(elementId)
	{
		var elementPickingId = elementId + this.slmSceneMgr.GetTotalElementCount();

		this.elementPickingIds.push(elementPickingId);

		return elementPickingId;
	}

	this.GetElementPickingIdByKey = function(elementKey)
	{
		if (this.elementKeyToIdMap[elementKey] !== undefined)
		{
			return this.elementKeyToIdMap[elementKey];
		}

		return null;
	}

	this.GetElementKeyByPickingId = function(elementPickingId)
	{
		var elemDesc = this.elementDesc[elementPickingId - this.baseElementPickingId];

		return elemDesc.key;
	}

	this.GetElementGeometryDesc = function(elementPickingId)
	{
		var elemDesc = this.elementDesc[elementPickingId - this.baseElementPickingId];

		var geometryDesc = 
		{
			positionBuffer: elemDesc.mesh.geometry.attributes.position.data,
			indexBuffer: elemDesc.mesh.geometry.index,
			indexOffset: elemDesc.groupStart * 3,
			triangleCount: elemDesc.groupCount, 
			matrix: new Matrix4().multiplyMatrices(this.elementMatrix[elementPickingId - this.baseElementPickingId], this.elementMatrixGroup[elementPickingId - this.baseElementPickingId])
		}

		return geometryDesc;
	}

	this.GetElementBounds = function(elementPickingId)
	{
		if (this.elementInfo)
		{
			var elemItem = this.elementInfo[elementPickingId - this.baseElementPickingId];

			var bounds = {
				min: elemItem.minBoundary ? elemItem.minBoundary : {
					x: elemItem.a[0] ,
					y: elemItem.a[1] ,
					z: elemItem.a[2]
				},
				max: elemItem.maxBoundary ? elemItem.maxBoundary : {
					x: elemItem.b[0] ,
					y: elemItem.b[1] ,
					z: elemItem.b[2]
				}
			};
			
			return bounds;
		}

		return null;
	}

	this.GetMaterialEx = function(mtlKey)
	{
		if (this.elementMaterialEx)
		{
			return this.elementMaterialEx[mtlKey];
		}

		return null;
	}

	this.GetElementInfo = function(elementPickingId)
	{
		if (this.elementInfo)
		{
			var elemItem = this.elementInfo[elementPickingId - this.baseElementPickingId];

			if (this.elementProperty)
			{
				if (this.elementPropValue)
				{
					var elemProp = {};
				
					for(var sk in this.elementProperty[elemItem.k])
					{
						if (sk === 'bc' || sk === 'fn' || sk === 'fs' || sk === 't' || sk === 'n') 
						{
							elemProp[sk] = this.elementPropValue[this.elementProperty[elemItem.k][sk]];
						}
						else
						{
							elemProp[sk] = this.elementProperty[elemItem.k][sk];
						}
						
					}

					return elemProp;
				}
				else
				{
					return this.elementProperty[elemItem.k];
				}	
			}

			return elemItem;
		}
		
		return null;
	}

	this.GetElementCount = function()
	{
		return this.elementPickingIds.length;
	}

	this.GetElementDesc = function(elementPickingId)
	{
		return this.elementDesc[elementPickingId - this.baseElementPickingId];
	}

	this.GetElementDescWithInternalId = function(elementPickingId)
	{
		return this.elementDesc[elementPickingId];
	}

	this.GetElementPickingIdWithRelativeId = function(elementRelativeId)
	{
		return elementRelativeId + this.baseElementPickingId;
	}

	this.GetElementRelativeIdWithPickingId = function(elementPickingId)
	{
		return elementPickingId - this.baseElementPickingId;
	}

	this.GetElementGroupDesc = function(elementPickingId)
	{
		var accumCounter = 0;
		for (var i = 0; i < this.propertiesData.length; ++i)
		{
			if (this.propertiesData[i].g + accumCounter >= (elementPickingId - this.baseElementPickingId))
			{
				// Collect element dess
				var elemGroupDesc = [];
				var elemGroupIds = [];

				if (!this.propertiesData[i].prop["编码"])
				{
					return [];
				}
				
				var upbound = this.propertiesData[i].g + accumCounter;
				for (var ei = accumCounter; ei < upbound; ++ei)
				{
					elemGroupDesc.push(this.elementDesc[ei]);
					elemGroupIds.push(this.baseElementPickingId + ei);
				}

				var rt = {
					groupDescs: elemGroupDesc,
					groupIds: elemGroupIds
				};

				return rt;
			}

			accumCounter += this.propertiesData[i].g;
		}

		return [];
	}

	this.GetElementMatrix = function(elementPickingId)
	{
		return this.elementMatrix[elementPickingId - this.baseElementPickingId];
	}

	this.GetElementGroupMatrix = function(elementPickingId)
	{
		return this.elementMatrixGroup[elementPickingId - this.baseElementPickingId];
	}

	this.GetElementProperty = function(elementPickingId)
	{
		var accumCounter = 0;
		for (var i = 0; i < this.propertiesData.length; ++i)
		{
			if (this.propertiesData[i].g + accumCounter > (elementPickingId - this.baseElementPickingId))
			{
				return this.propertiesData[i].prop;
			}

			accumCounter += this.propertiesData[i].g;
		}

		return {};
	}

	this.GetElementGroupBoundsCenter = function(elementPickingId)
	{
		var accumCounter = 0;
		for (var i = 0; i < this.propertiesData.length; ++i)
		{
			if (this.propertiesData[i].g + accumCounter >= (elementPickingId - this.baseElementPickingId))
			{
				if (this.propertiesData[i].bounds && this.propertiesData[i].bounds.center)
				{
					return new Vector3(this.propertiesData[i].bounds.center[0], 
										this.propertiesData[i].bounds.center[1], 
										this.propertiesData[i].bounds.center[2]);
				}

				return null;
			}

			accumCounter += this.propertiesData[i].g;
		}

		return null;
	}

	this.GetElementGroupBounds = function(elementPickingId)
	{
		var accumCounter = 0;
		for (var i = 0; i < this.propertiesData.length; ++i)
		{
			if (this.propertiesData[i].g + accumCounter >= (elementPickingId - this.baseElementPickingId))
			{
				if (this.propertiesData[i].bounds && this.propertiesData[i].bounds.center)
				{
					return {center: new Vector3(this.propertiesData[i].bounds.center[0], this.propertiesData[i].bounds.center[1], this.propertiesData[i].bounds.center[2]), 
							size: new Vector3(this.propertiesData[i].bounds.size[0], this.propertiesData[i].bounds.size[1], this.propertiesData[i].bounds.size[2])
					}
				}

				return null;
			}

			accumCounter += this.propertiesData[i].g;
		}

		return null;
	}
	
	this.QueryElementFromProperty = function(property)
	{
		var accumCounter = 0;

		var elemRt = [];

		for (var i = 0; i < this.propertiesData.length; ++i)
		{
			if (this.propertiesData[i].prop['名称'] == property.name && 
				this.propertiesData[i].prop['编码'] == property.code)
			{
				elemRt.push(this.baseElementPickingId + accumCounter + 1);// + Math.floor(this.propertiesData[i].g / 2));
				//return this.baseElementPickingId + accumCounter + Math.floor(this.propertiesData[i].g / 2);
			}

			accumCounter += this.propertiesData[i].g;
		}

		if (elemRt.length > 0)
		{
			return elemRt;
		}

		return null;
	}
};

var SLMLoader = function(options)
{
	var scope = this;

	this.options = options;

	this.MaxColorIdStep = (options && options.MaxColorIdStep !== undefined) ? options.MaxColorIdStep : 40;

	this.EnablePicking = (options && options.EnablePicking !== undefined) ? options.EnablePicking : false;

	this.EnableCulling = (options && options.EnableCulling !== undefined) ? options.EnableCulling : false;

	this.sceneMetas = [];

	this.totalElementCount = 0;
	
	this.pickingIdToSceneMeta = {};

	this.scenePicker = new SLMPicker(
	{
		EnablePicking: this.EnablePicking,
		renderer: (options && options.renderer != undefined) ? options.renderer : null,
		scene: (options && options.scene != undefined) ? options.scene : null,
		el:  (options && options.el != undefined) ? options.el : null,
	});
	// console.log({
	// 	EnablePicking: this.EnablePicking,
	// 	renderer: (options && options.renderer != undefined) ? options.renderer : null,
	// 	scene: (options && options.scene != undefined) ? options.scene : null,
	// 	el:  (options && options.el != undefined) ? options.el : null,
	// })

	this.sceneCullers = [];

	this.sceneTasks= [];

	this.managedGroups = [];

	this.ocGroups = [];

	this.render = function(camera, sceneModelToWorldMatrix)
	{
		for (var i = 0; i < this.sceneCullers.length; ++i)
		{
			//this.sceneCullers[i].render(camera, sceneModelToWorldMatrix);
		}
	}

	this.getAllSceneGroups = function()
	{
		return this.managedGroups;
	}

	this.getSceneGroup = function(groupIndex)
	{
		return this.managedGroups[groupIndex];
	}

	this.GetTotalElementCount = function()
	{
		return this.totalElementCount;
	}

	this.AddScene = function(slmSceneMeta, cullerOptions)
	{
		this.sceneMetas.push(slmSceneMeta);

		this.totalElementCount += slmSceneMeta.GetElementCount();

		for (var i = 0; i < slmSceneMeta.elementPickingIds.length; ++i)
		{
			this.pickingIdToSceneMeta[slmSceneMeta.elementPickingIds[i]] = this.sceneMetas[this.sceneMetas.length - 1];
		}

		if (cullerOptions)
		{
			var sceneCuller = new SLMCuller({
				EnableCulling: this.EnableCulling,
				renderer: (scope.options && scope.options.renderer != undefined) ? scope.options.renderer : null,
				el:  (scope.options && scope.options.el != undefined) ? scope.options.el : null,
				sceneOccluder: (scope.options &&scope. options.sceneOccluder != undefined) ? scope.options.sceneOccluder : null,
			});

			sceneCuller.setup(cullerOptions);

			this.sceneCullers.push(sceneCuller);

			this.managedGroups = cullerOptions.managedGroups;

			this.ocGroups = cullerOptions.ocGroups;
		}
	}

	this.GetMetaFromPickingId = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId];
	}

	this.GetElementDesc = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementDesc(elementPickingId);
	}

	this.GetElementDescWithInternalId = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementDescWithInternalId(elementPickingId);
	}

	this.GetElementMatrix = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementMatrix(elementPickingId);
	}

	this.GetElementGroupMatrix = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementGroupMatrix(elementPickingId);
	}

	this.GetElementBoundsCenter = function(elementPickingId)
	{
		var elemDesc = this.GetElementDesc(elementPickingId);
		var elementSrcId = elemDesc.sId;

		var meta = this.GetMetaFromPickingId(elementPickingId);
    	var center = new Vector3(meta.srcMeshGeoInfo[elementSrcId].c[0], meta.srcMeshGeoInfo[elementSrcId].c[1], meta.srcMeshGeoInfo[elementSrcId].c[2]);

    	center.applyMatrix4(this.GetElementMatrix(elementPickingId));

    	return center;
	}

	this.GetElementBounds = function(elementPickingId)
	{
		var sceneMeta = this.GetMetaFromPickingId(elementPickingId);

		return sceneMeta.GetElementBounds(elementPickingId);
	}

	this.GetElementInfo = function(elementPickingId)
	{
		var sceneMeta = this.GetMetaFromPickingId(elementPickingId);

		return sceneMeta.GetElementInfo(elementPickingId);
	}

	this.GetElementGroupBoundsCenter = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementGroupBoundsCenter(elementPickingId);
	}

	this.GetElementGroupBounds = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementGroupBounds(elementPickingId);
	}
	
	this.GetElementProperty = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementProperty(elementPickingId);
	}

	this.GetAllProperties = function()
	{
		var propList = [];

		for (var i = 0 ; i < this.sceneMetas.length; ++i)
		{
			propList.push(this.sceneMetas[i].propertiesData);
		}

		return propList;
	}

	this.GetElementPickingIdByKey = function(elementKey)
	{
		for (var i = 0 ; i < this.sceneMetas.length; ++i)
		{
			var elementPickingIds = this.sceneMetas[i].GetElementPickingIdByKey(elementKey)
			if (elementPickingIds !== undefined)
			{
				return elementPickingIds;
			}
		}

		return null;
	}

	this.GetElementKeyByPickingId = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementKeyByPickingId(elementPickingId);
	}

	this.GetElementGeometryDesc = function(elementPickingId)
	{
		return this.pickingIdToSceneMeta[elementPickingId].GetElementGeometryDesc(elementPickingId);
	}

	this.QueryElementFromProperty = function(property)
	{
		if (!property.name)
		{
			return null;
		}

		for (var i = 0 ; i < this.sceneMetas.length; ++i)
		{
			var elementPickingId = this.sceneMetas[i].QueryElementFromProperty(property)
			if (elementPickingId !== undefined)
			{
				return elementPickingId;
			}
		}

		return null;
	}

	this.SetElementGroupState = function(elementPickingId, isPicked)
	{
		if (!this.pickingIdToSceneMeta[elementPickingId])
		{
			return;
		}

		var elemGroup = this.pickingIdToSceneMeta[elementPickingId].GetElementGroupDesc(elementPickingId);

		var elemGroupDesc = elemGroup.groupDescs;
		var elemGroupId = elemGroup.groupIds;

		for (var i = 0; i < elemGroupDesc.length; ++i)
		{
			var color4 = new Vector4();
			elemGroupDesc[i].mesh.getInstanceColorAt(elemGroupDesc[i].gId, elemGroupDesc[i].iId, color4);

			elemGroupDesc[i].mesh.setInstanceColorAt(elemGroupDesc[i].gId, elemGroupDesc[i].iId, this.EncodeElementPickingId(elemGroupId[i], isPicked, color4.w < 0.0 ? false : true));
		}
	}

	this.SetElementState = function(elementPickingId, isPicked)
	{
		if (!this.pickingIdToSceneMeta[elementPickingId])
		{
			return;
		}

		var elemDesc = this.pickingIdToSceneMeta[elementPickingId].GetElementDesc(elementPickingId);

		var color4 = new Vector4();
		elemDesc.mesh.getInstanceColorAt(elemDesc.gId, elemDesc.iId, color4);

		elemDesc.mesh.setInstanceColorAt(elemDesc.gId, elemDesc.iId, this.EncodeElementPickingId(elementPickingId, isPicked, color4.w < 0.0 ? false : true));
	}

	this.GetElementSceneTag = function(elementPickingId)
	{
		if (!scope.pickingIdToSceneMeta[elementPickingId])
		{
			return;
		}

		return scope.pickingIdToSceneMeta[elementPickingId].sceneTag;
	}

	this.GetElementPickingId = function(elemId, sceneTag)
	{
		if (sceneTag)
		{
			for (var i = 0; i < scope.sceneMetas.length; ++i)
			{
				if (scope.sceneMetas[i].sceneTag === sceneTag)
				{
					return scope.sceneMetas[i].GetElementPickingIdWithRelativeId(elemId);
				}
			}
		}

		return null;
	}

	this.GetElementRelativeId = function(elementPickingId)
	{
		var relativeId = 
		{
			tag: this.pickingIdToSceneMeta[elementPickingId].sceneTag, 
			id: this.pickingIdToSceneMeta[elementPickingId].GetElementRelativeIdWithPickingId(elementPickingId)
		};

		return relativeId;
	}

	this.ShowElement = function(elementPickingId, isVisible, sceneTag)
	{
		if (Array.isArray(elementPickingId))
		{
			if (sceneTag)
			{
				for (var i = 0; i < scope.sceneMetas.length; ++i)
				{
					if (scope.sceneMetas[i].sceneTag === sceneTag)
					{
						for (var eindex = 0; eindex < elementPickingId.length; ++eindex)
						{
							var elemDesc = scope.sceneMetas[i].GetElementDescWithInternalId(elementPickingId[eindex]);
	
							elemDesc.mesh.setInstanceColorAt(elemDesc.gId, elemDesc.iId, scope.EncodeElementPickingId(elementPickingId[eindex], false, isVisible));
						}

						return;
					}
				}
			}
			else
			{
				for (var eindex = 0; eindex < elementPickingId.length; ++eindex)
				{
					if (!scope.pickingIdToSceneMeta[elementPickingId[eindex]])
					{
						return;
					}
	
					var elemDesc = scope.pickingIdToSceneMeta[elementPickingId[eindex]].GetElementDesc(elementPickingId[eindex]);
			
					elemDesc.mesh.setInstanceColorAt(elemDesc.gId, elemDesc.iId, scope.EncodeElementPickingId(elementPickingId[eindex], false, isVisible));
				}
			}
		}
		else
		{
			if (sceneTag)
			{
				for (var i = 0; i < scope.sceneMetas.length; ++i)
				{
					if (scope.sceneMetas[i].sceneTag === sceneTag)
					{
						var elemDesc = scope.sceneMetas[i].GetElementDescWithInternalId(elementPickingId);
	
						elemDesc.mesh.setInstanceColorAt(elemDesc.gId, elemDesc.iId, scope.EncodeElementPickingId(elementPickingId, false, isVisible));

						return;
					}
				}
			}
			else
			{
				if (!scope.pickingIdToSceneMeta[elementPickingId])
				{
					return;
				}

				var elemDesc = scope.pickingIdToSceneMeta[elementPickingId].GetElementDesc(elementPickingId);
		
				elemDesc.mesh.setInstanceColorAt(elemDesc.gId, elemDesc.iId, scope.EncodeElementPickingId(elementPickingId, false, isVisible));
			}
		}
	}

	this.SetGlobalEdgeColor = function(color)
	{
		scope.scenePicker.SetGlobalEdgeColor(color);
	}

	this.SetGlobalEdgeThickness = function(thickness)
	{
		scope.scenePicker.SetGlobalEdgeThickness(thickness);
	}

	// Geometry interaction
	this.RotateAroundPoint = function(elementPickingId, pointWoldPosition, axis, radian)
	{
		var mat0 = new Matrix4();
		mat0.multiply(this.GetElementMatrix(elementPickingId)).multiply(this.GetElementGroupMatrix(elementPickingId));

		var xAxis = axis.normalize();

		var trans0 = new Matrix4().makeTranslation(pointWoldPosition.x, pointWoldPosition.y, pointWoldPosition.z);
		var rot = new Matrix4().makeRotationAxis(xAxis, radian);
		var trans1 = new Matrix4().makeTranslation(-pointWoldPosition.x, -pointWoldPosition.y, -pointWoldPosition.z)

		var mat1 = new Matrix4();
		mat1.multiply(trans0).multiply(rot).multiply(trans1);

		var finalMat = new Matrix4();
		finalMat.multiply(mat1).multiply(mat0);

		var elemDesc = this.GetElementDesc(elementPickingId);
		elemDesc.mesh.setInstanceMatrixAt(elemDesc.gId, elemDesc.iId, finalMat);

		elemDesc.mesh.instanceMatrices[elemDesc.gId].needsUpdate = true;
	}

	this.RotateElement = function(elementPickingId, axis, radian)
	{
		var mat0 = new Matrix4();
		mat0.multiply(this.GetElementMatrix(elementPickingId)).multiply(this.GetElementGroupMatrix(elementPickingId));

		var center = this.GetElementBoundsCenter(elementPickingId);

		var xAxis = axis.normalize();

		var trans0 = new Matrix4().makeTranslation(center.x, center.y, center.z);
		var rot = new Matrix4().makeRotationAxis(xAxis, radian);
		var trans1 = new Matrix4().makeTranslation(-center.x, -center.y, -center.z)

		var mat1 = new Matrix4();
		mat1.multiply(trans0).multiply(rot).multiply(trans1);

		var finalMat = new Matrix4();
		finalMat.multiply(mat1).multiply(mat0);

		var elemDesc = this.GetElementDesc(elementPickingId);
		elemDesc.mesh.setInstanceMatrixAt(elemDesc.gId, elemDesc.iId, finalMat);

		elemDesc.mesh.instanceMatrices[elemDesc.gId].needsUpdate = true;
	}

	this.TranslateElement = function(elementPickingId, translation)
	{
		var mat0 = new Matrix4();
		mat0.multiply(this.GetElementMatrix(elementPickingId)).multiply(this.GetElementGroupMatrix(elementPickingId));

		var trans0 = new Matrix4().makeTranslation(translation.x, translation.y, translation.z);

		var mat1 = new Matrix4();
		mat1.multiply(trans0)

		var finalMat = new Matrix4();
		finalMat.multiply(mat1).multiply(mat0);

		var elemDesc = this.GetElementDesc(elementPickingId);
		elemDesc.mesh.setInstanceMatrixAt(elemDesc.gId, elemDesc.iId, finalMat);

		elemDesc.mesh.instanceMatrices[elemDesc.gId].needsUpdate = true;
	}

	this.SetComponentMatrix = function(elementPickingId, matrix)
	{
		var mat0 = new Matrix4();
		mat0.multiply(this.GetElementMatrix(elementPickingId)).multiply(this.GetElementGroupMatrix(elementPickingId));

		var center = this.GetElementBoundsCenter(elementPickingId);

		var trans0 = new Matrix4().makeTranslation(center.x, center.y, center.z);
		var rot = matrix;
		var trans1 = new Matrix4().makeTranslation(-center.x, -center.y, -center.z)

		var mat1 = new Matrix4();
		mat1.multiply(trans0).multiply(rot).multiply(trans1);

		var finalMat = new Matrix4();
		finalMat.multiply(mat1).multiply(mat0);

		var elemDesc = this.GetElementDesc(elementPickingId);
		elemDesc.mesh.setInstanceMatrixAt(elemDesc.gId, elemDesc.iId, finalMat);

		elemDesc.mesh.instanceMatrices[elemDesc.gId].needsUpdate = true;
	}
	
	this.EncodeElementPickingId = function(elementPickingId, isPicked, isVisible = true)
	{
	  return this.EncodeElementPickingIdEx(elementPickingId, isVisible, false, isPicked ? new Color(255, 0, 0) : new Color(0, 0, 0) );
	}

	this.EncodeElementPickingIdEx = function(elementPickingId, isVisible = true, isTransparent = false, color = new Color(0, 0, 0))
	{
	  var idColor = new Color(elementPickingId * this.MaxColorIdStep);

	  var colorValue =  Math.floor(color.r * 0.5) + Math.floor(color.g * 0.5) * 128.0  + Math.floor(color.b * 0.5) * 16384.0;

	  return new Vector4(idColor.r, idColor.g , idColor.b, isVisible ? ((isTransparent ? -1.0 : 1.0) * (1.0 + 4.0 * colorValue)): 0.0);
	}

	this.DecodeElementPickingId = function(pickedId)
	{
		var elementPickingId = pickedId / this.MaxColorIdStep;

		return elementPickingId;
	}

	this.PickElementByMouse = function(mouseX, mouseY/* 0 <= mouseX <=1, 0 <= mouseY <= 1*/, activeCamera, callback)
	{
		//var pickedId = this.scenePicker.GetPickedIdByMouse(mouseX, mouseY/* 0 <= mouseX <=1, 0 <= mouseY <= 1*/, activeCamera, callback);
		//if (pickedId < 0xffffff)
		{
			//return this.DecodeElementPickingId(pickedId);
		}
		return null;
	}

	this.PickElementByMouseEx = function(mouseX, mouseY/* 0 <= mouseX <=1, 0 <= mouseY <= 1*/, activeCamera, callback)
	{
		//var rt = this.scenePicker.GetPickedIdByMouseEx(mouseX, mouseY/* 0 <= mouseX <=1, 0 <= mouseY <= 1*/, activeCamera, callback);
		/*if (rt.pickedId < 0xffffff)
		{
			var elemEx = 
			{
				pickingId: this.DecodeElementPickingId(rt.pickedId),
				normal: rt.normal,
				position: rt.position,
			}

			return elemEx;
		}*/
		return null;
	}

	this.PushSceneTask = function(params)
	{
		this.sceneTasks.push(params);
	}

	this.BuildScene = function(singleSceneCallbackSync, allScenesCallbackSync)
	{
		for (var i = 0 ; i < this.sceneTasks.length; ++i)
		{
			var sceneBuilder = new SLMSceneBuilder(this);
			//this.sceneTasks[i].gltfScene.parent.position.set(0, 0.0, 0.0)
			sceneBuilder.BuildScene(this.sceneTasks[i], singleSceneCallbackSync);
		}
	}

	this.LoadScene = function(multiScenes, singleSceneCallbackAsync, allScenesCallbackAsync, singleSceneCallbackSync, allScenesCallbackSync)
	{
		this.multiScenes = multiScenes;
		this.multiSceneCounter = 0;

		function eachSceneCallback(slmScene, sceneTag)
		{
			if (singleSceneCallbackAsync)
			{
				singleSceneCallbackAsync(slmScene, sceneTag);
			}

			scope.multiSceneCounter++;
			
			if (scope.multiSceneCounter >= scope.multiScenes.length)
			{
				if (allScenesCallbackAsync)
				{
					allScenesCallbackAsync();
				}

				scope.BuildScene(singleSceneCallbackSync, allScenesCallbackSync);
			}
		}

		for (var i = 0 ; i < multiScenes.length; ++i)
		{
			var slmSceneLoader = new SLMSceneParser(this);
			window.addMoment("this.LoadScene 准备加载"+multiScenes[i].url)
			slmSceneLoader.load(multiScenes[i].url, eachSceneCallback, multiScenes[i].tag);
		}
		new ProggressiveLoading(this,SLMSceneMeta,SLMConstansts)
	}
	
}

var SLMSceneBuilder = function(sceneMgr, options)
{
	var scope = this;

	this.sceneMgr = sceneMgr;

	function InstanceNode(gltfScene, iMatrix, structDesc)//找出
	{
		window.addMoment("instanceNode start")
		//x1:2358.14990234375,y1:1706.5799560546875,z1:9.199999809265137
		//(x2,y2,z2)=(x1,z1,-y1)
		
		
		// structDesc=structDesc[0]
		
		console.log("gltfScene:",gltfScene)		//Group //scene:[group:<MeshEx, MeshEx>]
		console.log("iMatrix:",iMatrix,Object.keys(iMatrix).length) //由it和id构成，it和id都是数组 并且数组的维度相同 //it存储了每个实例组中所有对象的矩阵，id存储了所有对象的编号
		console.log("structDesc:",structDesc)	//二维数组,每一行是一个实例组(MeshEx),每个元素是一个对象 //数组每个元素是 i:, n:, c: , s:  //{"i":262,"n":"18708","c":12,"s":12}
		var count=0
		for(var i=0;i<structDesc.length;i++){
			count=count+structDesc[i].length
		}
		console.log("iMatrix.length",count)

		var slmSceneMeta = new SLMSceneMeta(scope.sceneMgr, {geoInfo: null, propInfo: null, elemInfo: null, sceneTag: scope.sceneTag, groupInfo: null});

		var instanceRoot = new Object3D(); //InstancedMeshEx的父节点 ，和rootGroupNode平级
		instanceRoot.rotation.set(-Math.PI/2,0,0)
		gltfScene.add(instanceRoot);
		// var dataParse=new DataParse({
		// 	parent:instanceRoot,
		// 	sceneMgr:scope.sceneMgr,
		// 	SLMConstansts:SLMConstansts
		// })
		var rootGroupNode = gltfScene.children[0]; // MeshEx的父节点
		var meshNodeList = rootGroupNode.children; // MeshEx数组:<MeshEx, MeshEx>
		console.log("meshNodeList.length",meshNodeList.length)
		for (var meshIndex = 0; meshIndex < meshNodeList.length ; ++meshIndex)//meshNodeList.length == structDesc.length
		{
			// if(window.loadedLZC[meshIndex]) return;
			// else window.loadedLZC[meshIndex]=1;
			// addModel2(meshNodeList[meshIndex],meshIndex,
			// 	iMatrix,
			// 	structDesc[meshIndex]
			// 	)
			meshNodeList[meshIndex].visible=false
		}
		
		scope.sceneMgr.AddScene(slmSceneMeta, null);
		
		if (scope.finishCallback)
			scope.finishCallback(gltfScene, scope.sceneTag, scope.bvhScene);
		
		// SetupMaterials();
		
		
	}

	// function SetupMaterials()
	// {
	// 	scope.sceneMgr.scenePicker.SetupMaterials();
	// }

	this.BuildScene= function(task, finishCallback)
	{
		window.scene.add(task.gltfScene)
		window.addMoment("BuildScene 将模型添加到场景中")
		//task.gltfScene.parent.position.set(0, 0.0, 0.0)
		// this.finishCallback = finishCallback;
		// this.sceneTag = task.sceneTag;sceneMgr

		// if (task.iMatrix && task.structDesc)
		// {
		// 	InstanceNode(task.gltfScene, task.iMatrix, task.structDesc, task.geoInfo, task.propInfo, task.elemInfo, task.groupDesc);
		// }
		// else
		// {
		// 	if (scope.finishCallback)
		// 	{
		// 		scope.finishCallback(task.gltfScene, scope.sceneTag, scope.bvhScene);
		// 	}
		// }
	}
}

var SLMSceneParser = function(sceneMgr)
{
	var scope = this;

	this.sceneMgr = sceneMgr;

	this.finishCallback = null;

	var loadingManager = new LoadingManager();
	// Intercept and override relative URLs.
	loadingManager.setURLModifier((url, path) => 
	{
	  return (path || '') + url;
	});

	loadingManager.onProgress = function ( url, itemsLoaded, itemsTotal )
	{
	  //console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
	};

	function loadJsonList(targetScene, urls, mananger, callback)
	{
		var dataList = [];
		var counter = 0;
		var urlList = urls;

		function addLoad(data)
		{
			dataList.push(data);
			
			counter++;

			if (counter < urlList.length)
			{
				loadUrl(urlList[counter], loadingManager);
			}
			else
			{
				if (callback)
				{
					callback(targetScene, dataList);
				}
			}
		}

		function loadUrl(url, manager)
		{
			if (url)
			{
				var loader = new FileLoader(manager);
				loader.load(url , function(data) 
				{
					addLoad(JSON.parse(data));
				}, null, function()
				{
					addLoad(null);
				});
			}
			else
			{
				addLoad(null);
			}
		}

		loadUrl(urlList[counter], loadingManager);
	}

    function loadScene(configJson)
	{
		const loader = new GLTFLoaderEx(loadingManager);
		loader.setCrossOrigin('anonymous');

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'lib/draco/' );

		const blobURLs = [];

		window.addMoment("准备GLB解压:"+configJson.fileUrl)
		loader.load(configJson.fileUrl, (gltf) => {
			window.addMoment("完成GLB解压:"+configJson.fileUrl)
			const scene = gltf.scene || gltf.scenes[0];
			blobURLs.forEach(URL.revokeObjectURL);

			if (configJson.matrixDesc && configJson.structDesc)
			{
				var _configList = [configJson.matrixDesc, configJson.structDesc, configJson.geoInfo, configJson.propInfo, configJson.elemInfo, configJson.groupDesc];

				console.log(_configList);
				window.addMoment("准备json解压")
				loadJsonList(scene, _configList, loadingManager, function(targetScene, dataList)
				{
					window.addMoment("完成json解压")
					scope.sceneMgr.PushSceneTask(
						{
							gltfScene: targetScene,
							iMatrix: dataList[0],
							structDesc: dataList[1], 
							geoInfo: dataList[2],
							propInfo: dataList[3],
							elemInfo: dataList[4],
							groupDesc: dataList[5],
							sceneTag: scope.sceneTag
						}
					);

					if (scope.finishCallback)
					{
						scope.finishCallback(scene, scope.sceneTag);
					}
				});
			}
			else
			{
				scope.sceneMgr.PushSceneTask(
					{
						gltfScene: scene,
						iMatrix: null,
						structDesc: null,
						geoInfo: null,
						propInfo: null,
						sceneTag: scope.sceneTag
					}
				);

				if (scope.finishCallback)
				{
					scope.finishCallback(scene, scope.sceneTag);
				}
			}
		}, 
		function ( xhr ) 
		{
			//updateProgressBar(( xhr.loaded / xhr.total * 100 ).toFixed(1), configJson.isFromZip ? 'parsing...':'loading...');
		}, null);
	}

	this.load = function(url, finishCallback, sceneTag, isSync) 
	{
		console.log("this.load",url)//url.match( /\.zip$/ ) 
		window.addMoment("this.load start")
		this.finishCallback = finishCallback;
		this.sceneTag = sceneTag;
		
		return new Promise( function( resolve, reject ) {
						window.addMoment("ZipLoader.load start")
						new ZipLoader().load( url , function ( xhr ) 
						{
							//updateProgressBar(( xhr.loaded / xhr.total * 100 ).toFixed(1), 'loading...');
						}).then( function( zip )
						{
							window.addMoment("ZipLoader.load finish")
							loadingManager.setURLModifier( zip.urlResolver );
							var geoInfos = zip.find('geoinfo.json');
							var propInfos = zip.find('properties.json');
							var elemInfos = zip.find('components.json');
							var groupDescs = zip.find('groupdesc.json');
							window.addMoment("ZipLoader.load return")
							resolve({
								fileUrl: zip.find( /\.(gltf|glb)$/i )[0], 
								matrixDesc: zip.find('smatrix.json')[0], 
								structDesc: zip.find('structdesc.json')[0],
								geoInfo: geoInfos.length > 0 ? geoInfos[0]:null,
								propInfo: propInfos.length > 0 ? propInfos[0]:null,
								elemInfo: elemInfos.length > 0 ? elemInfos[0]:null,
								groupDesc: groupDescs.length > 0 ? groupDescs[0]:null
							});
						} );
				}).then( function ( configJson ) 
				{
					window.addMoment("loadScene start")
					loadScene({
						fileUrl: configJson.fileUrl,
						matrixDesc: configJson.matrixDesc, 
						structDesc: configJson.structDesc, 
						geoInfo: configJson.geoInfo,
						propInfo: configJson.propInfo,
						elemInfo: configJson.elemInfo,
						groupDesc: configJson.groupDesc,
						isFromZip: true});
				} );
	}
}

export { SLMLoader , SLMConstansts,SLMSceneMeta}
// if(!window.loadSubZip3_worker0)window.loadSubZip3_worker0=new Worker("..lib/myWorker/loadSubZip.js")
