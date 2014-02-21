
var COUNT = 10000;
var d3_category20 = [
  0x1f77b4, 0xaec7e8,
  0xff7f0e, 0xffbb78,
  0x2ca02c, 0x98df8a,
  0xd62728, 0xff9896,
  0x9467bd, 0xc5b0d5,
  0x8c564b, 0xc49c94,
  0xe377c2, 0xf7b6d2,
  0x7f7f7f, 0xc7c7c7,
  0xbcbd22, 0xdbdb8d,
  0x17becf, 0x9edae5
];


var d3_category20b = [
  0x393b79, 0x5254a3, 0x6b6ecf, 0x9c9ede,
  0x637939, 0x8ca252, 0xb5cf6b, 0xcedb9c,
  0x8c6d31, 0xbd9e39, 0xe7ba52, 0xe7cb94,
  0x843c39, 0xad494a, 0xd6616b, 0xe7969c,
  0x7b4173, 0xa55194, 0xce6dbd, 0xde9ed6
]

var colors = d3_category20b.map(function(c) {
  return [c >> 16, c >> 8 & 0xff, c & 0x0f];
});

/*
var d3_category20c = [
  0x3182bd, 0x6baed6, 0x9ecae1, 0xc6dbef,
  0xe6550d, 0xfd8d3c, 0xfdae6b, 0xfdd0a2,
  0x31a354, 0x74c476, 0xa1d99b, 0xc7e9c0,
  0x756bb1, 0x9e9ac8, 0xbcbddc, 0xdadaeb,
  0x636363, 0x969696, 0xbdbdbd, 0xd9d9d9
]
*/

var BigPointLayer = L.CanvasLayer.extend({

  initialize: function() {
    L.CanvasLayer.prototype.initialize.call(this, { tileLoader: true });
    this.provider = new ParticleProvider({
      url: 'http://dev.localhost.lan:8080/api/v2/sql',
      sql: 'select * from ib where date > \'2013-01-01\' limit 100000 '
    });
    this.running = false;
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
    this.on('tilesLoaded', function() {
      self.running = true;
    });
    this.on('tileAdded', function(t) {
      console.log(t);
      self.provider.getTileData(t, t.zoom, function(data) {
        data && self.emitParticles(data, t);
        self._tileLoaded(t, data);
      });
    });
    L.CanvasLayer.prototype.onAdd.call(this, map);
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
      _part.nx[c] = -_part.nx[c]
      _part.ny[c] = -_part.ny[c]; 
      }
      _part.nx[c] += 4*Math.random()
      _part.ny[c] += 4*Math.random()
      _part.t[c] = p.t__float;
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
    image = this.image = ctx.getImageData(0,0, w, h);
    var pixels = image.data;
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
    var SPEED = 2.0;
    var SPEED_INV = 1.0/SPEED;
    var color ;
    var ttt;

    
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    //ctx.fillStyle= "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 0.2;
    for(var i = 0, s = this.particles.count; i < s; ++i) {
      if(live[i] === 0) {
        tt = time - t[i];
        ttt = SPEED * tt;
        xx = x[i] + ttt*(dx[i] - x[i]);
        yy = y[i] + ttt*(dy[i] - y[i]);
        var tttt = (2*ttt - 1);
        tttt = tttt*tttt - 1;
        xx += nx[i] * tttt;
        yy += ny[i] * tttt;

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
    if(this.running) this.time += 0.005;
    var canvas = this.getCanvas();
    //canvas.width = canvas.width;
    var ctx = canvas.getContext('2d');

    // clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
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
      "  SELECT ST_SnapToGrid(ST_PointN(i.the_geom_webmercator, 1), p.res) p0" +
      "  ,      ST_SnapToGrid(ST_PointN(i.the_geom_webmercator, 2), p.res) p1" +
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

function app() {
    var map = L.map('map').setView([43.0, -4.0], 4);

    L.tileLayer('http://dev.localhost.lan:8181/tiles/tm_world_borders_simpl_0_19/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery <a href="http://stamen.com">Stamen</a>'
    }).addTo(map);




    var layer = new BigPointLayer();
    layer.addTo(map);
}
