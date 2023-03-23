

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
  d3.csv("avalanche_data.csv").then(function (data) {
    addMarker(data);
  })
}


function addMarker(data) {
  console.log(data);
  // Get the danger rating levels in the data
  var dangerLevels = ['low', 'moderate', 'considerable', 'high', 'very high', 'not assigned'];

  // Add checkboxes for each danger rating level
  d3.select('body')
    .selectAll('.checkbox')
    .data(dangerLevels)
    .enter()
    .append('label')
    .text(d => d)
    .append('input')
    .attr('type', 'checkbox')
    .attr('value', d => d) // set the value attribute to the danger rating level
    .property('checked', true)
    .on('change', updateMarkers);

  // Add the markers to the correct g groups
  var fatalAvalancheGroup = d3.select('svg').append('g').attr('class', 'fatal-avalanche-group');
  var injuredAvalancheGroup = d3.select('svg').append('g').attr('class', 'injured-avalanche-group');
  var otherAvalancheGroup = d3.select('svg').append('g').attr('class', 'other-avalanche-group');

  var markers = map.svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', function (d) { return map.latLngToLayerPoint([d.location_latitude, d.location_longitude]).x; })
    .attr('cy', function (d) { return map.latLngToLayerPoint([d.location_latitude, d.location_longitude]).y; })
    .each(function(d) {
        if (d.involved_dead > 0) {
            fatalAvalancheGroup.node().appendChild(this);
        } else if (d.involved_injured > 0) {
            injuredAvalancheGroup.node().appendChild(this);
        } else {
            otherAvalancheGroup.node().appendChild(this);
        }
    });

    fatalAvalancheGroup.selectAll('circle')
    .attr('r', function (d) { return 1 + d.involved_dead * 1.2;})
    .attr('fill', 'red')
    .attr('opacity', 0.5);

    injuredAvalancheGroup.selectAll('circle')
    .attr('r', function (d) {  return 1 + d.involved_injured * 1.2;})
    .attr('fill', 'orange')
    .attr('opacity', 0.5);

    otherAvalancheGroup.selectAll('circle')
    .attr('r', 1.5)
    .attr('fill', 'gray')
    .attr('opacity', 0.6);


function updateMarkers() {
  console.log('Updating markers...');

  // Get the danger rating levels that are checked
  var checkedLevels = d3.selectAll('input[type=checkbox]:checked').nodes().map(d => d.value);
  console.log(checkedLevels);


  // Update the markers that should be hidden
  map.svg.selectAll('circle')
    .filter(d => !checkedLevels.includes(d.danger_rating_text))
    .transition() // Add a transition to fade out the markers
    .duration(500)
    .attr('r', 0);

  // Update the markers that should be shown
  fatalAvalancheGroup.selectAll('circle')
    .filter(d => checkedLevels.includes(d.danger_rating_text))
    .transition()
    .duration(500)
    .attr('r', function (d) { return 1 + d.involved_dead * 1.2;})
    .attr('fill', 'red')
    .attr('opacity', 0.5);

    injuredAvalancheGroup.selectAll('circle')
    .filter(d => checkedLevels.includes(d.danger_rating_text))
    .transition()
    .duration(500)
    .attr('r', function (d) {  return 1 + d.involved_injured * 1.2;})
    .attr('fill', 'orange')
    .attr('opacity', 0.5);

    otherAvalancheGroup.selectAll('circle')
    .filter(d => checkedLevels.includes(d.danger_rating_text))
    .transition()
    .duration(500)
    .attr('r', 1.5)
    .attr('fill', 'gray')
    .attr('opacity', 0.6);
}
}