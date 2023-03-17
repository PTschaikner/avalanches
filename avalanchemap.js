

var map = null;
var zoomLevel = 9;

var innsbruck = new L.LatLng(47.259659, 11.400375);

function showMap() {
  initMap();
  loadCSVData();
}

function initMap() {
  var tileLayer = createTileLayer();
  var mapOptions = {
    center: innsbruck,
    zoom: zoomLevel,
    layers: [tileLayer],
    dragging: false,   // disable map dragging
    touchZoom: false,  // disable touch zoom
    zoomControl: false, // disable zoom buttons
    scrollWheelZoom: false,
    doubleClickZoom: false
  };
  map = new L.Map('leaflet-map', mapOptions);
  
  // Add SVG layer to map for d3 markers
  map._initPathRoot();
  map.svg = d3.select('#leaflet-map').select('svg');
}

   function createTileLayer() {
    var tileSourceURL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    var tileSourceOptions = {
     attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    };
    return new L.TileLayer(tileSourceURL, tileSourceOptions);
  }

function loadCSVData() {
  d3.csv("avalanche_data.csv", function(data) {
    data.forEach(function (avalanche) {
      addMarker(avalanche); // Add a delay based on the order of the avalanche in the CSV file
    });
  });
}

  function addMarker(avalanche) {
  var delay = i * 20
  var strokeWidth = 0.5;
  var colors = ['gray', 'red', 'orange'];
  var radii = [2];
  var opacity = [0.4];
  
  // Check if there were any deaths
  if (avalanche.involved_dead > 0) {
    radii[0] = 2;
    opacity[0] = 0.6;
    colors[0] = 'red';
  } else {
    radii[0] = 1.5;
    opacity[0] = 0.8;
    if(avalanche.involved_injured > 0) {
      colors[0] = 'orange';
    }
  }
  
  // Add concentric circles for each death
  for (var i = 0; i < avalanche.involved_dead; i++) {
    radii.push(2 + (i+1)*2);
    opacity.push(0.8);
  }
  
  var markerGroup = map.svg.append('g');
  var color, radius, marker;
  for (var i = 0; i < radii.length; i++) {
    color = colors[Math.min(i, colors.length-2)];
    radius = radii[i];
    marker = markerGroup.append('circle')
      .attr('cx', map.latLngToLayerPoint([avalanche.location_latitude, avalanche.location_longitude]).x)
      .attr('cy', map.latLngToLayerPoint([avalanche.location_latitude, avalanche.location_longitude]).y)
      .attr('r', radius)
      .style('fill', i === 0 ? color : 'none')
      .style('stroke', color)
      .style('stroke-width', strokeWidth)
      .style('opacity', 0);
      
    // Delay the transition of each circle by the specified amount
    marker.transition()
      .delay(delay + (i * 100))
      .duration(500)
      .attr('r', radius)
      .style('fill-opacity', opacity[i])
      .style('opacity', opacity[i]);
  }
}
  
  
