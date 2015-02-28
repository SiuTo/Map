$(document).ready(function()
{
	t0=getTime();
	var inputFile="map.osm";
	var color=new Array(
		"#000000", "#FFFFFF", "#F1EEE8",
		"#89A4CA", "#94D394", "#DC9E9E", "#F8D5A9", "#F8F8BA", //highway
		"#B5D0D0", "#D970F0", "#FF0000", "#239C45" //lake, railway, station, tree
	);

	var xmlDoc=loadXMLdoc();
	var canv=$("#canvasOfMap");
	var context=canv.get(0).getContext("2d");

	var bounds=xmlDoc.getElementsByTagName("bounds")[0].attributes;
	var minlat=parseFloat(bounds.getNamedItem("minlat").nodeValue);
	var minlon=parseFloat(bounds.getNamedItem("minlon").nodeValue);
	var maxlat=parseFloat(bounds.getNamedItem("maxlat").nodeValue);
	var maxlon=parseFloat(bounds.getNamedItem("maxlon").nodeValue);
	
	$("#minlon").text(minlon);
	$("#minlat").text(minlat);
	$("#maxlon").text(maxlon);
	$("#maxlat").text(maxlat);

	var width=canv.attr("width");
	var height=Math.floor((maxlat-minlat)/(maxlon-minlon)*width);
	canv.attr("height", height);

	getArr();
	var x1=minlon, y1=minlat, x2=maxlon, y2=maxlat;
	var top=0;
	var stack=new Array(new Scope(x1, y1, x2, y2, 1.0));
	drawMap();

	function Scope(x1, y1, x2, y2, r)
	{
		this.x1=x1;
		this.y1=y1;
		this.x2=x2;
		this.y2=y2;
		this.ratio=r;
	}

	function Node(x, y)
	{
		this.x=x;
		this.y=y;
	}

	function windowToGeo(x, y)
	{
		var rect=canv.get(0).getBoundingClientRect();
		return {
			x: (x-rect.left)/width*(x2-x1)+x1,
			y: y2-(y-rect.top)/height*(y2-y1)
		};
	}

	canv.mousemove(function(e){
		var loc=windowToGeo(e.clientX, e.clientY);
		$("#coordinate").text("Coordinate: ("+Math.round(loc.x*10000)/10000+", "+Math.round(loc.y*10000)/10000+")");
	});

	canv.mouseout(function(){
		$("#coordinate").text("Coordinate: Unknown");
	});

	canv.mousedown(function(e){
		lastmouse=new Object();
		lastmouse.x=e.clientX;
		lastmouse.y=e.clientY;
	});

	canv.mouseup(function(e){
		if (Math.abs(e.clientX-lastmouse.x)<5) return;
		var last=windowToGeo(lastmouse.x, lastmouse.y);
		var cur=windowToGeo(e.clientX, e.clientY);
		x1-=cur.x-last.x;
		y1-=cur.y-last.y;
		x2-=cur.x-last.x;
		y2-=cur.y-last.y;
		var r=stack[top].ratio;
		stack[++top]=new Scope(x1, y1, x2, y2, r);
		drawMap();
	});

	canv.dblclick(function(e){
		var loc=windowToGeo(e.clientX, e.clientY);
		var r=stack[top].ratio*0.2;
		x1=Math.max(loc.x-(maxlon-minlon)*r, 0.0);
		y1=Math.max(loc.y-(maxlat-minlat)*r, 0.0);
		x2=Math.min(loc.x+(maxlon-minlon)*r, maxlon);
		y2=Math.min(loc.y+(maxlat-minlat)*r, maxlat);
		stack[++top]=new Scope(x1, y1, x2, y2, r);
		drawMap();
	});

	$("#back").click(function(){
		if (top==0) return;
		--top;
		x1=stack[top].x1; y1=stack[top].y1; x2=stack[top].x2; y2=stack[top].y2;
		drawMap();
	});

	$("#reset").click(function(){
		if (top==0) return;
		top=0;
		x1=minlon, y1=minlat, x2=maxlon, y2=maxlat;
		drawMap();
	});

	function loadXMLdoc()
	{
		var xmlhttp;
		if (window.XMLHttpRequest)
			xmlhttp=new XMLHttpRequest()
		else xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
		xmlhttp.open("GET", inputFile, false);
		xmlhttp.send();
		return xmlhttp.responseXML;
	}

	function drawNode(x, y, c)
	{
		context.fillStyle=color[c];
		context.beginPath();
		context.arc(x, y, 3, 0, Math.PI*2, true);
		context.fill();
	}

	function getTime()
	{
		var today=new Date();
		var h=today.getHours();
		var min=today.getMinutes();
		var sec=today.getSeconds();
		return h*3600+min*60+sec;
	}

	function getArr()
	{
		var t1=getTime();
		arrNode=new Array();
		nodeToDraw=new Array();
		var listNode=xmlDoc.getElementsByTagName("node");
		for (var i=0; i<listNode.length; ++i)
		{
			var attr=listNode[i].attributes;
			var id=attr.getNamedItem("id").nodeValue;
			var node=new Object();
			node.x=attr.getNamedItem("lon").nodeValue;
			node.y=attr.getNamedItem("lat").nodeValue;
			node.color=0;
			
			var list=listNode[i].childNodes;
			for (var j=0; j<list.length; ++j)
				if (list[j].nodeName=="tag")
				{
					var key=list[j].attributes.getNamedItem("k").nodeValue;
					var value=list[j].attributes.getNamedItem("v").nodeValue;
					if (key=="natural" && (value=="wood" || value=="tree")) node.color=11;
					else if (key=="railway" && value=="station") node.color=10;
				}
			arrNode[id]=node;
			if (node.color!=0) nodeToDraw.push(node);
		}
		var t2=getTime();

		arrWay=new Array();
		var listWay=xmlDoc.getElementsByTagName("way");
		for (var i=0; i<listWay.length; ++i)
		{
			var way=new Object();
			way.width=1;
			way.color=0;
			way.minlon=maxlon;
			way.minlat=maxlat;
			way.maxlon=minlon;
			way.maxlat=minlat;
			way.nd=new Array();
			var list=listWay[i].childNodes;
			for (var j=0; j<list.length; ++j)
				if (list[j].nodeName=="tag")
				{
					var key=list[j].attributes.getNamedItem("k").nodeValue;
					var value=list[j].attributes.getNamedItem("v").nodeValue;
					if (key=="waterway")
					{
						way.color=8;
						if (value=="riverbank" || value=="river") way.width=5;
						else way.width=3;
					}
					else if (key=="natural" && (value=="water" || value=="wetland" || value=="glacier"))
					{
						way.color=8; way.width=3;
					}
					else if (key=="highway")
					{
						switch (value)
						{
							case "motorway":
								way.color=3; way.width=6; break;
							case "trunk":
								way.color=4; way.width=6; break;
							case "primary":
								way.color=5; way.width=5; break;
							case "secondary":
								way.color=6; way.width=5; break;
							case "tertiary":
								way.color=7; way.width=4; break;
							case "motorway_link":
								way.color=3; way.width=3; break;
							case "trunk_link":
								way.color=4; way.width=3; break;
							case "primary_link":
								way.color=5; way.width=3; break;
							case "secondary_link":
								way.color=6; way.width=3; break;
							case "tertiary_link":
								way.color=7; way.width=3; break;
							default:
								way.color=1; way.width=3;
						}
					}
					else if (key=="railway")
					{
						way.color=9; way.width=2;
					}
				}
				else if (list[j].nodeName=="nd")
				{
					var nodeId=list[j].attributes.getNamedItem("ref").nodeValue;
					var node=arrNode[nodeId];
					way.nd.push(new Node(node.x, node.y));
					way.minlon=Math.min(way.minlon, node.x);
					way.minlat=Math.min(way.minlat, node.y);
					way.maxlon=Math.max(way.maxlon, node.x);
					way.maxlat=Math.max(way.maxlat, node.y);
				}
			var len=way.nd.length;
			way.close=way.nd[0].x==way.nd[len-1].x && way.nd[0].y==way.nd[len-1].y;
			arrWay.push(way);
		}
		var t3=getTime();
		//alert((t1-t0)+", "+(t2-t1)+", "+(t3-t2));
	}

	function drawMap()
	{
		context.fillStyle=color[2];
		context.fillRect(0, 0, width, height);
		var delta=x2-x1;
		if (delta<0.2)
			for (var i=0; i<nodeToDraw.length; ++i)
			{
				var node=nodeToDraw[i];
				var x=(node.x-x1)/(x2-x1)*width;
				var y=(1.0-(node.y-y1)/(y2-y1))*height;
				drawNode(x, y, node.color);
			}

		for (var i=0; i<arrWay.length; ++i)
		{
			var way=arrWay[i];
			if ((way.width<=3 && delta>0.2) || (way.width<=4 && delta>0.4)) continue;
			if (way.minlon>x2 || way.minlat>y2 || way.maxlon<x1 || way.maxlat<y1) continue;
			context.lineWidth=way.width;
			context.strokeStyle=color[way.color];
			context.beginPath();
			for (var j=0; j<way.nd.length; ++j)
			{
				var x=(way.nd[j].x-x1)/(x2-x1)*width;
				var y=(1.0-(way.nd[j].y-y1)/(y2-y1))*height;
				if (j==0) context.moveTo(x, y);
				else context.lineTo(x, y);
			}
			if (way.color==8 && way.close)
			{
				context.fillStyle=color[way.color];
				context.fill();
			}
			else context.stroke();
		}
	}
});

