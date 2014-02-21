
var URL = 'http://viz2.cartodb.com/api/v2/sql';
var COUNT = 20000; // max number of particles per layer. 
                   // chrome works like a charm even with 100k, with firefox dies
                   // android and iphone/ipad works **pretty well** with 20000
var SPEED = 7.0; // flights speed [1, 30]
var ANIMATION_SPEED = 30000; // number of milliseconds the particles are emited
                            // The animation ends when all the particles finish

var PARTICLE_OFFSET = 10;  // the distance between particles when they go in parallel
var TIME_JITTER = 0; //[0, 0.5] increase this to avoid all particles are launched at the same time 

//** see BigPointLayer options, search for RAMBO word

var BigPointLayer = L.CanvasLayer.extend({

  initialize: function(options) {
    L.CanvasLayer.prototype.initialize.call(this, { tileLoader: true });
    this.provider = new ParticleProvider({
      url: URL, 
      sql: options.sql
    });

    this.options.color = options.color;
    this.options.lineWidth= options.lineWidth;
    this.options.clearOpacity = options.clearOpacity;

    this.running = false;
    this.t0 = 0;
    this.time = 0;
    this.init();
  },

  init: function() {

    this.particles = {
      x: new Float32Array(COUNT),
      y: new Float32Array(COUNT),
      ox: new Float32Array(COUNT),
      oy: new Float32Array(COUNT),
      dx: new Float32Array(COUNT),
      dy: new Float32Array(COUNT),
      nx: new Float32Array(COUNT),
      ny: new Float32Array(COUNT),
      t: new Float32Array(COUNT),
      live: new Int8Array(COUNT),
      color: new Int8Array(COUNT),
      count: 0
    };
    var canvas = this.getCanvas();
    var w = canvas.width;
    var h = canvas.height;
    var x = this.particles.x;
    var y = this.particles.y;
    var dx = this.particles.dx;
    var dy = this.particles.dy;
    var live = this.particles.live;
    for(var i = 0; i < COUNT; ++i) {
      live[i] = -1;
    }

  },

  onAdd: function(map) {
    var self = this;
    this.on('tileAdded', function(t) {
      console.log(t);
      self.provider.getTileData(t, t.zoom, function(data) {
        data && self.emitParticles(data, t);
        self._tileLoaded(t, data);
      });
    });
    map.on('zoomend', function() {
      self.particles.count = 0;
    });
    L.CanvasLayer.prototype.onAdd.call(this, map);
  },

  start: function() {
    this.running = true;
    this.t0 = Date.now();
  },

  emitParticles: function(part, coord) {
    var tilePos = this.getTilePos(coord);
    if (coord.x == 1 && coord.y == 1) {
      console.log(tilePos.x, tilePos.y);
    }
    var point = this._map.latLngToContainerPoint(new L.LatLng(0, 0));
    var canvas = this.getCanvas();
    var w = canvas.width;
    var h = canvas.height;
    var cx = (point.x - w/2)|0;
    var cy = (point.y - h/2)|0;
    var _part = this.particles;

    for (var ii = 0; ii < 2; ++ii) 
    for (var i = 0; i < part.length; ++i) {
      var p = part[i];
      var c = _part.count++;
      _part.ox[c] = _part.x[c] = tilePos.x + p.x0__uint8 - cx;
      _part.oy[c] = _part.y[c] = tilePos.y + (256 -  p.y0__uint8) - cy;
      _part.dx[c] = tilePos.x + p.x1__uint8 - cx;
      _part.dy[c] = tilePos.y + (256 -  p.y1__uint8) - cy;
      var dx = _part.dx[c] - _part.x[c];
      var dy = _part.dy[c] - _part.y[c];
      var m = Math.sqrt(dx*dx + dy*dy);
      var mult = Math.max(1, m*0.1 - 1);
      _part.nx[c] = -mult*dy/m;
      _part.ny[c] = mult*dx/m;
      if( dx < 0) {
        _part.nx[c] = -_part.nx[c];
        _part.ny[c] = -_part.ny[c]; 
      }
      _part.nx[c] += PARTICLE_OFFSET*Math.random()
      _part.ny[c] += PARTICLE_OFFSET*Math.random()
      _part.t[c] = p.t__float + TIME_JITTER*Math.random();
      _part.color[c] = p.c__uint8;
      //_part.dx[c] = 0;//(p.x1__uint8 - p.x0__uint8)>>4;
      //_part.dy[c] = 0;//(p.y1__uint8 - p.y0__uint8)>>4;
    }

  },

  renderPart: function(ctx) {
    var canvas = this.getCanvas();
    var w = canvas.width;
    var h = canvas.height;
    var image = this.image;
    if(!image) {
      //image = this.image = ctx.getImageData(0,0, w, h);
    }
    //image = this.image = ctx.getImageData(0,0, w, h);
    //var pixels = image.data;
    var x = this.particles.x;
    var y = this.particles.y;
    var dx = this.particles.dx;
    var dy = this.particles.dy;
    var ox = this.particles.ox;
    var oy = this.particles.oy;
    var nx = this.particles.nx;
    var ny = this.particles.ny;
    var t = this.particles.t;
    var live = this.particles.live;
    var c = this.particles.color;
    var point = this._map.latLngToContainerPoint(new L.LatLng(0, 0));
    var cx = (point.x - w/2)|0;
    var cy = (point.y - h/2)|0;
    var index;
    var time = this.time;
    var xx,yy, tt;
    var SPEED_INV = 1.0/SPEED;
    var color ;
    var ttt;

    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter';
    var cos = Math.cos;

    ctx.strokeStyle = this.options.color;
    //ctx.fillStyle= "rgba(255, 255, 255, 1)";
    ctx.lineWidth = this.options.lineWidth;
    for(var i = 0, s = this.particles.count; i < s; ++i) {
      if(live[i] === 0) {
        tt = time - t[i];
        ttt = SPEED * tt;
        xx = x[i] + ttt*(dx[i] - x[i]);
        yy = y[i] + ttt*(dy[i] - y[i]);
        var tttt = (2*ttt - 1);
        tttt = tttt*tttt - 1;
        xx += nx[i] * tttt;// + 0.03*cos(tttt*30 + i))
        yy += ny[i] * tttt;// + 0.03*cos(tttt*30 + i))

        ctx.moveTo(cx + ox[i], cy + oy[i]);
        ctx.lineTo(cx + xx, cy + yy);
        //ctx.fillRect(cx + ox[i], cy + oy[i], 2, 2);
        ox[i] = xx;
        oy[i] = yy;

        /** render 2 */
        /** render 1
        index = (cx + (xx|0) + (cy + (yy|0))*w)<<2;
        color = colors[c[i]];
        pixels[index] = 255;//color[0];
        pixels[index + 1] = 255;//color[1];
        pixels[index + 2] = 255;//color[2];
        pixels[index + 3] = 255;
        */
        if(tt > SPEED_INV) {
          t[i] = 10000;
          live[i] = 1;
        }
      } else {
        live[i] = t[i] < time ? 0: -1;
      }
    }
    ctx.stroke();
   // ctx.putImageData(image, 0, 0);
  },

  render: function() {
    if(this.running) {
      var t = Date.now();
      this.time += (t - this.t0)/ANIMATION_SPEED;
      this.t0 = t;
    }
    var canvas = this.getCanvas();
    //canvas.width = canvas.width;
    var ctx = canvas.getContext('2d');

    // clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, " + this.options.clearOpacity + ")";
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.renderPart(ctx);

    // get center from the map (projected)

    /*
    // render
    this.renderCircle(ctx, point, (1.0 + Math.sin(Date.now()*0.001))*300);
    */

    this.redraw();

  }
});

function format(str, attrs) {
  for(var i = 1; i < arguments.length; ++i) {
    var attrs = arguments[i];
    for(var attr in attrs) {
      str = str.replace(RegExp('\\{' + attr + '\\}', 'g'), attrs[attr]);
    }
  }
  return str;
}

function ParticleProvider(options) {
  this.options = options;
  if(!this.options.url) {
    throw new Error("url need to be specified");
  }
}

ParticleProvider.prototype = {


  sql: function(q, callback) {
    var options = this.options;
    var url = this.options.url;
    torque.net.get( url + "?q=" + encodeURIComponent(q), function (data) {
        if(options.parseJSON) {
          data = JSON.parse(data && data.responseText);
        }
        callback && callback(data);
    });
  },

  proccessTile: function(rows, coord, zoom) {
    return rows;
  },

  getSQL: function() {
    return this.options.sql;
  },

  getTileData: function(coord, zoom, callback) {
    // add indexes to:
    // - date

    var sql = "" +
      "WITH " +
      "par AS (" +
      "  SELECT CDB_XYZ_Resolution({zoom})*{resolution} as res" +
      ",  256/{resolution} as tile_size" +
      ", CDB_XYZ_Extent({x}, {y}, {zoom}) as ext "  +
      ")," +
      "bounds AS ( "+
      "  select max(b.timestamp), min(b.timestamp) " +
      "  FROM ({_sql}) b " +
      "), " +
      "cte AS ( "+
      "  SELECT ST_SnapToGrid(ST_PointN(ST_GeometryN(i.the_geom_webmercator, 1), 1), p.res) p0" +
      "  ,      ST_SnapToGrid(ST_PointN(ST_GeometryN(i.the_geom_webmercator, 1), 2), p.res) p1" +
      "  ,      timestamp " +
      "  ,      uid::integer%20 as color" + 
      "  FROM ({_sql}) i, par p " +
      "  WHERE i.the_geom_webmercator && p.ext " +
      ") " +
      "" +
      "SELECT (st_x(p0)-st_xmin(p.ext))/p.res x0__uint8, " +
      "       (st_y(p0)-st_ymin(p.ext))/p.res y0__uint8, " +
      "       (st_x(p1)-st_xmin(p.ext))/p.res x1__uint8, " +
      "       (st_y(p1)-st_ymin(p.ext))/p.res y1__uint8,  " +
      "       ((timestamp - bounds.min)/(bounds.max - bounds.min)) t__float, " +
      "       color c__uint8 "+
      " FROM cte, bounds, par p where (st_y(p0)-st_ymin(p.ext))/p.res < tile_size and (st_x(p0)-st_xmin(p.ext))/p.res < tile_size";

    var query = format(sql, this.options, {
      resolution: 1,
      zoom: zoom,
      x: coord.x,
      y: coord.y,
      _sql: this.getSQL()
    });

    var self = this;
    this.sql(query, function (data) {
      if (data) {
        var rows = JSON.parse(data.responseText).rows;
        callback(self.proccessTile(rows, coord, zoom));
      } else {
        callback(null);
      }
    });
  }
};

function after(n, f) {
  var c = 0;
  return function() { ++c === n && f(); }
}

function app() {
    //var map = L.map('map').setView([43.0, -4.0], 7);
    var map = L.map('map').setView([23.0, -14.0], 4);

    // base layer
    L.tileLayer('http://{s}.api.cartocdn.com/base-dark/{z}/{x}/{y}.png', {
      submains: '0123',
      maxZoom: 18,
      attribution: 'cartodb'
    }).addTo(map);

    // animated layers
    // RAMBO
    var layer1 = new BigPointLayer({
      sql: "select * from ib_1 where cat = 'BUSINESS' and date > '2013-01-01' and date < '2013-03-01'",
      color: "rgba(255, 55, 55, 1.0)", // line color
      lineWidth: 0.15,   // line width
      clearOpacity: 0.8  // trails lenght. 0 means no trails, 1.0 means persistent
    });
    var layer2 = new BigPointLayer({
      sql: "select * from ib_1 where cat = 'TURISTA' and date > '2013-01-01' and date < '2013-03-01'",
      color: "rgba(255, 255, 255, 0.8)",
      lineWidth: 1,
      clearOpacity: 0.8
    });

    var start = after(2, function() {
      layer1.start();
      layer2.start();
    });

  
    /*
     * if you use a cartodb layer use in this way
     */
    /*
     cartodb.createLayer(map, 'http://viz2.cartodb.com/api/v2/viz/c640d03a-9af0-11e3-b698-0edd25b1ac90/viz.json').addTo(map).on('done', function() {
        layer1.addTo(map);
        layer2.addTo(map);
        layer1.on('tilesLoaded', start);
        layer2.on('tilesLoaded', start);
     });
    */
    layer1.addTo(map);
    layer2.addTo(map);
    layer1.on('tilesLoaded', start);
    layer2.on('tilesLoaded', start);
}
