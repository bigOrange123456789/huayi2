import {
	Vector3,
	Box3,
  } from '../lib/three/build/three';

var BVHTree = BVHTree || {};
BVHTree.EPSILON = 1e-6;

BVHTree.BVH = function(aabbs, maxItemsPerNode, maxLeafNodeSize)
{
    if (aabbs)
    {
        /*
        AABB description
        {
            data: 0 // Point to Group node index
            min: [x, y, z]
            max: [x, y, z]
        }
        */

        var bboxArray = new Float32Array(aabbs.length * 7);

        for (var i = 0; i < aabbs.length; i++) 
        {
            BVHTree.BVH.setBox(bboxArray, i, aabbs[i].data, aabbs[i].min[0], aabbs[i].min[1], aabbs[i].min[2], aabbs[i].max[0], aabbs[i].max[1], aabbs[i].max[2]);
        }

        this._maxItemsPerNode = maxItemsPerNode || 10;
        this._bboxArray = bboxArray;

        this._maxLeafNodeSize = maxLeafNodeSize;

        this._bboxHelper = new Float32Array(this._bboxArray.length);
        this._bboxHelper.set(this._bboxArray);

        var aabbCount = aabbs.length;
        var extents = this.calcExtents(0, aabbCount, BVHTree.EPSILON);
        this._rootNode = new BVHTree.BVHNode(extents[0], extents[1], 0, aabbCount, 0);

        this._nodesToSplit = [this._rootNode];

        while (this._nodesToSplit.length > 0) 
        {
            var node = this._nodesToSplit.pop();
            this.splitNode(node);
        }
    }
};

BVHTree.BVH.prototype.serializeToJson = function()
{
    var data = 
    {
        maxItemNums: this._maxItemsPerNode,
        bboxArray: this._bboxArray,
        leafNodeSize: this._maxLeafNodeSize,
        rootNode: this._rootNode.serializeToJson()
    };

    return data;
}

BVHTree.BVH.prototype.deserializeFromJson = function(data)
{
    this._maxItemsPerNode = data.maxItemNums;
    this._bboxArray = data.bboxArray;
    this._maxLeafNodeSize = data.leafNodeSize;
    this._rootNode = new BVHTree.BVHNode().deserializeFromJson(data.rootNode);
    
    this._nodesToSplit = [];

    return this;
}

BVHTree.BVH.prototype.getLeadNodeData = function()
{
    var datasInNodes = [];

    var nodesToVisit = [];
    nodesToVisit.push(this._rootNode);

    while (nodesToVisit.length > 0) 
    {
        var bvhNode = nodesToVisit.pop();

        var aabbsInNode = bvhNode._endIndex - bvhNode._startIndex;

        if (aabbsInNode !== 0)
        {
            var newNode = [];

            for (var i = bvhNode._startIndex; i < bvhNode._endIndex; i++)
            {
                newNode.push(this._bboxArray[i * 7]);
            }

            datasInNodes.push(
                {
                    datas: newNode,
                    bounds: 
                    {
                        min: bvhNode._extentsMin,
                        max: bvhNode._extentsMax,
                    }
                });
        }

        if (bvhNode._node0 !== null) 
        {
            nodesToVisit.push(bvhNode._node0);
        }

        if (bvhNode._node1 !== null)
        {
            nodesToVisit.push(bvhNode._node1);
        }
    }

    return datasInNodes;
}

BVHTree.BVH.intersectNodeBox = function(frustum, node)
{
    return frustum.intersectsBox(new Box3(new Vector3(node._extentsMin.x, node._extentsMin.y, node._extentsMin.z), new Vector3(node._extentsMax.x, node._extentsMax.y, node._extentsMax.z)));
};

BVHTree.BVH.prototype.intersectFrustum = function(frustum)
{
    var nodesToIntersect = [this._rootNode];
    var datasInIntersectingNodes = [];
    var i;

    while (nodesToIntersect.length > 0) 
    {
        var node = nodesToIntersect.pop();

        if (BVHTree.BVH.intersectNodeBox(frustum, node))
        {
            if (node._node0)
            {
                nodesToIntersect.push(node._node0);
            }

            if (node._node1)
            {
                nodesToIntersect.push(node._node1);
            }

            for (i = node._startIndex; i < node._endIndex; i++)
            {
                datasInIntersectingNodes.push(this._bboxArray[i*7]);
            }
        }
    }

    return datasInIntersectingNodes;
};

BVHTree.BVH.prototype.getCulledByFrustum = function(frustum)
{
    var nodesToIntersect = [this._rootNode];
    var datasInIntersectingNodes = [];
    var i;

    while (nodesToIntersect.length > 0) 
    {
        var node = nodesToIntersect.pop();

        if (BVHTree.BVH.intersectNodeBox(frustum, node) == false)
        {
            for (i = node._startIndex; i < node._endIndex; i++)
            {
                datasInIntersectingNodes.push(this._bboxArray[i*7]);
            }
        }
        else
        {
            if (node._node0)
            {
                nodesToIntersect.push(node._node0);
            }

            if (node._node1)
            {
                nodesToIntersect.push(node._node1);
            }
        }
    }

    return datasInIntersectingNodes;
};

BVHTree.BVH.prototype.calcExtents = function(startIndex, endIndex, expandBy) 
{
    expandBy = expandBy || 0.0;

    if (startIndex >= endIndex)
    {
        return [{'x': 0, 'y': 0, 'z': 0}, {'x': 0, 'y': 0, 'z': 0}];
    }

    var minX = Number.MAX_VALUE;
    var minY = Number.MAX_VALUE;
    var minZ = Number.MAX_VALUE;
    var maxX = -Number.MAX_VALUE;
    var maxY = -Number.MAX_VALUE;
    var maxZ = -Number.MAX_VALUE;

    for (var i = startIndex; i < endIndex; i++)
    {
        minX = Math.min(this._bboxArray[i*7+1], minX);
        minY = Math.min(this._bboxArray[i*7+2], minY);
        minZ = Math.min(this._bboxArray[i*7+3], minZ);
        maxX = Math.max(this._bboxArray[i*7+4], maxX);
        maxY = Math.max(this._bboxArray[i*7+5], maxY);
        maxZ = Math.max(this._bboxArray[i*7+6], maxZ);
    }

    return [
        {'x': minX - expandBy, 'y': minY - expandBy, 'z': minZ - expandBy},
        {'x': maxX + expandBy, 'y': maxY + expandBy, 'z': maxZ + expandBy}
    ];
};

BVHTree.BVH.prototype.splitNode = function(node)
{
    if (node.elementCount() === 0)
    {
        return;
    }

    var extentsLength = [
        node._extentsMax.x - node._extentsMin.x,
        node._extentsMax.y - node._extentsMin.y,
        node._extentsMax.z - node._extentsMin.z
    ];

    if (this._maxLeafNodeSize)
    {
        if (extentsLength[0] < this._maxLeafNodeSize && 
            extentsLength[1] < this._maxLeafNodeSize && 
            extentsLength[2] < this._maxLeafNodeSize)
            {
                return;
            }
    }
    else
    {
        if (node.elementCount() <= this._maxItemsPerNode)
        {
            return;
        }
    }

    var startIndex = node._startIndex;
    var endIndex = node._endIndex;

    var leftNode = [ [],[],[] ];
    var rightNode = [ [],[],[] ];
    var extentCenters = [node.centerX(), node.centerY(), node.centerZ()];

    var objectCenter = [];
    objectCenter.length = 3;

    for (var i = startIndex; i < endIndex; i++)
    {
        objectCenter[0] = (this._bboxArray[i * 7 + 1] + this._bboxArray[i * 7 + 4]) * 0.5;
        objectCenter[1] = (this._bboxArray[i * 7 + 2] + this._bboxArray[i * 7 + 5]) * 0.5;
        objectCenter[2] = (this._bboxArray[i * 7 + 3] + this._bboxArray[i * 7 + 6]) * 0.5;

        for (var j = 0; j < 3; j++)
        {
            if (objectCenter[j] < extentCenters[j])
            {
                leftNode[j].push(i);
            }
            else
            {
                rightNode[j].push(i);
            }
        }
    }

    // Check if we couldn't split the node by any of the axes (x, y or z)
    var splitFailed = [];
    splitFailed.length = 3;

    splitFailed[0] = (leftNode[0].length === 0) || (rightNode[0].length === 0);
    splitFailed[1] = (leftNode[1].length === 0) || (rightNode[1].length === 0);
    splitFailed[2] = (leftNode[2].length === 0) || (rightNode[2].length === 0);

    if (splitFailed[0] && splitFailed[1] && splitFailed[2])
    {
        return;
    }

    // Choose the longest split axis. if we can't split by it, choose next best one.
    var splitOrder = [0, 1, 2];

    splitOrder.sort(function(axis0, axis1)
    {
        return (extentsLength[axis1] - extentsLength[axis0])
    });

    var leftElements;
    var rightElements;

    for (j = 0; j < 3; j++)
    {
        var candidateIndex = splitOrder[j];

        if (!splitFailed[candidateIndex])
        {
            leftElements = leftNode[candidateIndex];
            rightElements = rightNode[candidateIndex];

            break;
        }
    }

    // Sort the elements in range (startIndex, endIndex) according to which node they should be at
    var node0Start = startIndex;
    var node0End = node0Start + leftElements.length;
    var node1Start = node0End;
    var node1End = endIndex;
    var currElement;

    var helperPos = node._startIndex;
    var concatenatedElements = leftElements.concat(rightElements);

    for (i = 0; i < concatenatedElements.length; i++)
    {
        currElement = concatenatedElements[i];
        BVHTree.BVH.copyBox(this._bboxArray, currElement, this._bboxHelper, helperPos);
        helperPos++;
    }

    var subArr = this._bboxHelper.subarray(node._startIndex * 7, node._endIndex * 7);
    this._bboxArray.set(subArr, node._startIndex * 7);

    // Create 2 new nodes for the node we just split, and add links to them from the parent node
    var node0Extents = this.calcExtents(node0Start, node0End, BVHTree.EPSILON);
    var node1Extents = this.calcExtents(node1Start, node1End, BVHTree.EPSILON);

    var node0 = new BVHTree.BVHNode(node0Extents[0], node0Extents[1], node0Start, node0End, node._level + 1);
    var node1 = new BVHTree.BVHNode(node1Extents[0], node1Extents[1], node1Start, node1End, node._level + 1);

    node._node0 = node0;
    node._node1 = node1;
    node.clearShapes();

    this._nodesToSplit.push(node0);
    this._nodesToSplit.push(node1);
};

BVHTree.BVH._calcTValues = function(minVal, maxVal, rayOriginCoord, invdir)
{
    var res = {min: 0, max: 0};

    if ( invdir >= 0 )
    {
        res.min = ( minVal - rayOriginCoord ) * invdir;
        res.max = ( maxVal - rayOriginCoord ) * invdir;

    }
    else
    {
        res.min = ( maxVal - rayOriginCoord ) * invdir;
        res.max = ( minVal - rayOriginCoord ) * invdir;
    }

    return res;
};

BVHTree.BVH.setBox = function(bboxArray, pos, dataId, minX, minY, minZ, maxX, maxY, maxZ)
{
    bboxArray[pos*7] = dataId;
    bboxArray[pos*7+1] = minX;
    bboxArray[pos*7+2] = minY;
    bboxArray[pos*7+3] = minZ;
    bboxArray[pos*7+4] = maxX;
    bboxArray[pos*7+5] = maxY;
    bboxArray[pos*7+6] = maxZ;
};

BVHTree.BVH.copyBox = function(sourceArray, sourcePos, destArray, destPos)
{
    destArray[destPos*7] = sourceArray[sourcePos*7];
    destArray[destPos*7+1] = sourceArray[sourcePos*7+1];
    destArray[destPos*7+2] = sourceArray[sourcePos*7+2];
    destArray[destPos*7+3] = sourceArray[sourcePos*7+3];
    destArray[destPos*7+4] = sourceArray[sourcePos*7+4];
    destArray[destPos*7+5] = sourceArray[sourcePos*7+5];
    destArray[destPos*7+6] = sourceArray[sourcePos*7+6];
};

BVHTree.BVH.getBox = function(bboxArray, pos, outputBox)
{
    outputBox.dataId = bboxArray[pos*7];
    outputBox.minX = bboxArray[pos*7+1];
    outputBox.minY = bboxArray[pos*7+2];
    outputBox.minZ = bboxArray[pos*7+3];
    outputBox.maxX = bboxArray[pos*7+4];
    outputBox.maxY = bboxArray[pos*7+5];
    outputBox.maxZ = bboxArray[pos*7+6];
};

BVHTree.BVHNode = function(extentsMin, extentsMax, startIndex, endIndex, level)
{
    this._extentsMin = extentsMin;
    this._extentsMax = extentsMax;
    this._startIndex = startIndex;
    this._endIndex = endIndex;
    this._level = level;
    this._node0 = null;
    this._node1 = null;
};

BVHTree.BVHNode.prototype.serializeToJson = function()
{
    var data =
    {
        min: this._extentsMin,
        max: this._extentsMax,
        start: this._startIndex,
        end: this._endIndex,
        level: this._level,
        node0: (this._node0 ? this._node0.serializeToJson(): null),
        node1: (this._node1 ? this._node1.serializeToJson(): null),
    }

    return data;
}

BVHTree.BVHNode.prototype.deserializeFromJson = function(data)
{
    this._extentsMin = data.min;
    this._extentsMax = data.max;
    this._startIndex = data.start;
    this._endIndex = data.end;
    this._level = data.level;
    this._node0 = data.node0 ? new BVHTree.BVHNode().deserializeFromJson(data.node0) : null;
    this._node1 = data.node1 ? new BVHTree.BVHNode().deserializeFromJson(data.node1) : null;

    return this;
}

BVHTree.BVHNode.prototype.elementCount = function()
{
    return this._endIndex - this._startIndex;
};

BVHTree.BVHNode.prototype.centerX = function()
{
    return (this._extentsMin.x + this._extentsMax.x) * 0.5;
};

BVHTree.BVHNode.prototype.centerY = function()
{
    return (this._extentsMin.y + this._extentsMax.y) * 0.5;
};

BVHTree.BVHNode.prototype.centerZ = function()
{
    return (this._extentsMin.z + this._extentsMax.z) * 0.5;
};

BVHTree.BVHNode.prototype.clearShapes = function()
{
    this._startIndex = -1;
    this._endIndex = -1;
};

BVHTree.BVHNode.calcBoundingSphereRadius = function(extentsMin, extentsMax)
{
    var centerX = (extentsMin.x + extentsMax.x) * 0.5;
    var centerY = (extentsMin.y + extentsMax.y) * 0.5;
    var centerZ = (extentsMin.z + extentsMax.z) * 0.5;

    var extentsMinDistSqr =
        (centerX - extentsMin.x) * (centerX - extentsMin.x) +
        (centerY - extentsMin.y) * (centerY - extentsMin.y) +
        (centerZ - extentsMin.z) * (centerZ - extentsMin.z);

    var extentsMaxDistSqr =
        (centerX - extentsMax.x) * (centerX - extentsMax.x) +
        (centerY - extentsMax.y) * (centerY - extentsMax.y) +
        (centerZ - extentsMax.z) * (centerZ - extentsMax.z);

    return Math.sqrt(Math.max(extentsMinDistSqr, extentsMaxDistSqr));
};

export { BVHTree }