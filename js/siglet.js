"use strict";
/*_updatePoly

_updateCircle: function (layer)
_updatePoly: function (layer, closed)


L.SVG.pointsToPath(layer._parts, closed)*/

// L.CircleMarker is a circle overlay with a permanent pixel radius.
// It doesn't change size on zoom. Node should extend circle



L.Node = L.Circle.extend({
	initialize: function (latlng, options) {
		L.setOptions(this, options);
		this._latlng = L.latLng(latlng);
		this._mRadius = this.options.radius;
	},
	
	_clickTolerance: function () {
		// used when doing hit detection for Canvas layers
		return 10 + (L.Browser.touch ? 10 : 0);
	}
	
});

L.node = function (latlng, options) {
	return new L.Node(latlng, options);
};

L.Edge = L.Polygon.extend({


});

L.edge = function (latlngs, options) {
	return new L.Edge(latlngs, options);
};

;(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  if (typeof conrad === 'undefined')
    throw 'conrad is not declared';

  // Initialize packages:
  sigma.utils.pkg('sigma.renderers');

  /**
   * This function is the constructor of the renderer for siglet.
   * Graph objects come from Sigma.js, rendering is done on a leaflet.js map
   * @param  {sigma.classes.graph}            graph    The graph to render.
   * @param  {sigma.classes.camera}           camera   The camera.
   * @param  {configurable}           settings The sigma instance settings
   *                                           function.
   * @param  {object}                 object   The options object.
   * @return {sigma.renderers.canvas}          The renderer instance.
   */
  sigma.renderers.siglet = function(graph, camera, settings, options) {
    if (typeof options !== 'object')
      throw 'sigma.renderers.siglet: Wrong arguments.';

    //if (!(options.container instanceof HTMLElement)) //containter should be a leaflet map instance
    //  throw 'Container not found.';

    var k,
        i,
        l,
        a,
        fn,
        self = this;

    sigma.classes.dispatcher.extend(this);

    // Initialize main attributes:
    Object.defineProperty(this, 'conradId', {
      value: sigma.utils.id()
    });
    this.graph = graph;
    this.camera = camera;
    this.contexts = {};
    this.domElements = {};
    this.options = options;
    this.container = this.options.container;
    this.settings = (
        typeof options.settings === 'object' &&
        options.settings
      ) ?
        settings.embedObjects(options.settings) :
        settings;

    // Node indexes:
    this.nodesOnScreen = [];
    this.edgesOnScreen = [];

    // Conrad related attributes:
    this.jobs = {};

    // Find the prefix:
    this.options.prefix = 'renderer' + this.conradId + ':';
    
	this.captors = [];

    // Deal with sigma events:
    //sigma.misc.bindEvents.call(this, this.options.prefix);
    //sigma.misc.drawHovers.call(this, this.options.prefix);
    //this.resize(false);
  };




  /**
   * This method renders the graph on the canvases.
   *
   * @param  {?object}                options Eventually an object of options.
   * @return {sigma.renderers.canvas}         Returns the instance itself.
   */
  sigma.renderers.siglet.prototype.render = function(options) {
    options = options || {};

    var a,
        i,
        k,
        l,
        o,
        id,
        end,
        job,
        start,
        edges,
        renderers,
        rendererType,
        batchSize,
        tempGCO,
        index = {},
        graph = this.graph,
        nodes = this.graph.nodes,
        prefix = this.options.prefix || '',
        drawEdges = this.settings(options, 'drawEdges'),
        drawNodes = this.settings(options, 'drawNodes'),
        drawLabels = this.settings(options, 'drawLabels'),
        drawEdgeLabels = this.settings(options, 'drawEdgeLabels'),
        embedSettings = this.settings.embedObjects(options, {
          prefix: this.options.prefix
        });
     
     

    // Call the resize function:
    //this.resize(false);

    // Check the 'hideEdgesOnMove' setting:
    if (this.settings(options, 'hideEdgesOnMove'))
      if (this.camera.isAnimated || this.camera.isMoving)
        drawEdges = false;

    // Apply the camera's view:
    this.camera.applyView(
      undefined,
      this.options.prefix,
      {
        width: this.width,
        height: this.height
      }
    );

    // Clear canvases:
    this.clear();

    // Kill running jobs:
    for (k in this.jobs)
      if (conrad.hasJob(k))
        conrad.killJob(k);

    // Find which nodes are on screen:
    /*this.edgesOnScreen = [];
    this.nodesOnScreen = this.camera.quadtree.area(
      this.camera.getRectangle(this.width, this.height)
    );*/
    this.edgesOnScreen = [];
    this.nodesOnScreen=this.graph.nodes();

    for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
      index[a[i].id] = a[i];

    // Draw edges:
    // - If settings('batchEdgesDrawing') is true, the edges are displayed per
    //   batches. If not, they are drawn in one frame.
    if (drawEdges) {
      // First, let's identify which edges to draw. To do this, we just keep
      // every edges that have at least one extremity displayed according to
      // the quadtree and the "hidden" attribute. We also do not keep hidden
      // edges.
      for (a = graph.edges(), i = 0, l = a.length; i < l; i++) {
        o = a[i];
        if (
          (index[o.source] || index[o.target]) &&
          (!o.hidden && !nodes(o.source).hidden && !nodes(o.target).hidden)
        )
          this.edgesOnScreen.push(o);
      }

      // If the "batchEdgesDrawing" settings is true, edges are batched:
      if (this.settings(options, 'batchEdgesDrawing')) {
      //if (false) {
        id = 'edges_' + this.conradId;
        batchSize = embedSettings('canvasEdgesBatchSize');

        edges = this.edgesOnScreen;
        l = edges.length;

        start = 0;
        end = Math.min(edges.length, start + batchSize);

        job = function() {
          tempGCO = this.contexts.edges.globalCompositeOperation;
          this.contexts.edges.globalCompositeOperation = 'destination-over';

          renderers = sigma.siglet.edges;
          for (i = start; i < end; i++) {
            o = edges[i];
            (renderers[
              o.type || this.settings(options, 'defaultEdgeType')
            ] || renderers.def)(
              o,
              graph.nodes(o.source),
              graph.nodes(o.target),
              map,
              embedSettings
            );
          }

          // Draw edge labels:
          /*if (drawEdgeLabels) {
            renderers = sigma.siglet.edges.labels;
            for (i = start; i < end; i++) {
              o = edges[i];
              if (!o.hidden)
                (renderers[
                  o.type || this.settings(options, 'defaultEdgeType')
                ] || renderers.def)(
                  o,
                  graph.nodes(o.source),
                  graph.nodes(o.target),
                  this.contexts.labels,
                  embedSettings
                );
            }
          }*/

          // Restore original globalCompositeOperation:
          this.contexts.edges.globalCompositeOperation = tempGCO;

          // Catch job's end:
          if (end === edges.length) {
            delete this.jobs[id];
            return false;
          }

          start = end + 1;
          end = Math.min(edges.length, start + batchSize);
          return true;
        };

        this.jobs[id] = job;
        conrad.addJob(id, job.bind(this));

      // If not, they are drawn in one frame:
      } else {
        renderers = sigma.siglet.edges;
        for (a = this.edgesOnScreen, i = 0, l = a.length; i < l; i++) {
          o = a[i];
          (renderers[
            o.type || this.settings(options, 'defaultEdgeType')
          ] || renderers.def)(
            o,
            graph.nodes(o.source),
            graph.nodes(o.target),
            map,
            embedSettings
          );
        }

        // Draw edge labels:
        // - No batching
        if (drawEdgeLabels) {
          renderers = sigma.siglet.edges.labels;
          for (a = this.edgesOnScreen, i = 0, l = a.length; i < l; i++)
            if (!a[i].hidden)
              (renderers[
                a[i].type || this.settings(options, 'defaultEdgeType')
              ] || renderers.def)(
                a[i],
                graph.nodes(a[i].source),
                graph.nodes(a[i].target),
                this.contexts.labels,
                embedSettings
              );
        }
      }
    }

    // Draw nodes:
    // - No batching
    if (drawNodes) {
      renderers = sigma.siglet.nodes;
      for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
        if (!a[i].hidden)
          (renderers[
            a[i].type || this.settings(options, 'defaultNodeType')
          ] || renderers.def)(
            a[i],
            //this.contexts.nodes,
            this.container,
            embedSettings
          );
    }
	
    // Draw labels:
    // - No batching
    /*if (drawLabels) {
      renderers = sigma.siglet.labels;
      for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
        if (!a[i].hidden)
          (renderers[
            a[i].type || this.settings(options, 'defaultNodeType')
          ] || renderers.def)(
            a[i],
            this.contexts.labels,
            embedSettings
          );
    }*/

    this.dispatchEvent('render');

    return this;
  };



  /**
   * This method clears each canvas.
   *
   * @return {sigma.renderers.canvas} Returns the instance itself.
   */
  sigma.renderers.siglet.prototype.clear = function() {
    
  };

  /**
   * This method kills contexts and other attributes.
   */
  sigma.renderers.siglet.prototype.kill = function() {
    
  };




  /**
   * The labels, nodes and edges renderers are stored in the three following
   * objects. When an element is drawn, its type will be checked and if a
   * renderer with the same name exists, it will be used. If not found, the
   * default renderer will be used instead.
   *
   * They are stored in different files, in the "./canvas" folder.
   */
  sigma.utils.pkg('sigma.siglet.nodes');
  sigma.utils.pkg('sigma.siglet.edges');
  //sigma.utils.pkg('sigma.siglet.labels');
}).call(this);

;(function() {
  'use strict';

  sigma.utils.pkg('sigma.siglet.nodes');

  /**
   * The default node renderer. It renders the node as a simple disc.
   *
   * @param  {object}                   node     The node object.
   * @param  {LeafletMap}               map      The leaflet map object
   * @param  {configurable}             settings The settings function.
   */
  sigma.siglet.nodes.def = function(node, map, settings) {
    var prefix = settings('prefix') || '';
    //console.log(map);
    //console.log(node);
    
    var x=parseFloat(node["layouts"]["geo"]["x"]);
    var y=parseFloat(node["layouts"]["geo"]["y"]);
    var r=node[prefix + 'size']*100;
    
    var fill = node.color || settings('defaultNodeColor');
    
    if (!node["_leaflet"]) {
       node["_leaflet"] = L.node( [-y,x], {"radius":r, fill: true, fillColor: fill, fillOpacity: 1, stroke: false}).addTo(map);
	}

  };
})();

;(function() {
  'use strict';

  sigma.utils.pkg('sigma.siglet.edges');

  /**
   * The default edge renderer. It renders the edge as a simple line.
   *
   * @param  {object}                   edge         The edge object.
   * @param  {object}                   source node  The edge source node.
   * @param  {object}                   target node  The edge target node.
   * @param  {CanvasRenderingContext2D} context      The canvas context.
   * @param  {configurable}             settings     The settings function.
   */
  sigma.siglet.edges.def = function(edge, source, target, map, settings) {
    // The goal is to draw a triangle where the target node is a point of
    // the triangle, and the two other points are the intersection of the
    // source circle and the circle (target, distance(source, target)).
    var color = edge.active ?
          edge.active_color || settings('defaultEdgeActiveColor') :
          edge.color,
        prefix = settings('prefix') || '',
        size = 1, //edge[prefix + 'size'] || 1,
        edgeColor = settings('edgeColor'),
        defaultNodeColor = settings('defaultNodeColor'),
        defaultEdgeColor = settings('defaultEdgeColor'),
        /*sX = source[prefix + 'x'],
        sY = source[prefix + 'y'],
        tX = target[prefix + 'x'],
        tY = target[prefix + 'y'],*/
        sX=parseFloat(source["layouts"]["geo"]["x"]),
        sY=-parseFloat(source["layouts"]["geo"]["y"]),
        tX=parseFloat(target["layouts"]["geo"]["x"]),
        tY=-parseFloat(target["layouts"]["geo"]["y"]),
        dist = sigma.utils.getDistance(sX, sY, tX, tY);

    if (!color)
      switch (edgeColor) {
        case 'source':
          color = source.color || defaultNodeColor;
          break;
        case 'target':
          color = target.color || defaultNodeColor;
          break;
        default:
          color = defaultEdgeColor;
          break;
      }

    // Intersection points:
    /*var c = sigma.utils.getCircleIntersection(sX, sY, size, tX, tY, dist);
    if (c==false || isNaN(c.xi_prime) || isNaN(c.yi_prime)) {
	    console.log(sX + ", " + sY + ", " + size + ", " + tX + ", " + tY + ", " + dist);
    	console.log(c);
    	return;
    }*/

    //context.save();

	var fill = color;
    if (edge.active) {
      fill = settings('edgeActiveColor') === 'edge' ?
        (color || defaultEdgeColor) :
        settings('defaultEdgeActiveColor');
    }
    
    //L.edge([[tY,tX],[c.yi,c.xi],[c.yi_prime,c.xi_prime]],{opacity:0.65,stroke:false,fill:true,fillColor:color}).addTo(map);
    
    L.polyline([[sY,sX],[tY,tX]],{opacity:0.65,stroke:true,fill:false,strokeColor:color,interactive:false}).addTo(map);
    
    /*
    // Turn transparency on:
    context.globalAlpha = 0.65;

    // Draw the triangle:
    context.beginPath();
    context.moveTo(tX, tY);
    context.lineTo(c.xi, c.yi);
    context.lineTo(c.xi_prime, c.yi_prime);
    context.closePath();
    context.fill();

    context.restore();*/
  };
})();





