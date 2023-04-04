let svgHist = null;
let xScale = null;
let yScale = null;
let xAxis = null;
let yAxis = null;
let monthRects = null;
let chartHeight = null;
let chartWidth = null;

const radiusScale = d3.scaleLinear()
  .domain([3, 8, 15])
  .range([1, 2, 10])
  .clamp(true);


// Define initial variables and constants
let map = null;
var zoomLevel = 8;
const innsbruck = new L.LatLng(47.259659, 11.400375);
const dangerLevels = [];
let fatalAvalancheGroup = null;
let injuredAvalancheGroup = null;
let otherAvalancheGroup = null;
let checkedLevels = [];
const calendar = [
  { month: 'July', days: 31, start: 1 },
  { month: 'August', days: 31, start: 32 },
  { month: 'September', days: 30, start: 63 },
  { month: 'October', days: 31, start: 93 },
  { month: 'November', days: 30, start: 124 },
  { month: 'December', days: 31, start: 154 },
  { month: 'January', days: 31, start: 185 },
  { month: 'February', days: 28, start: 216 },
  { month: 'March', days: 31, start: 244 },
  { month: 'April', days: 30, start: 275 },
  { month: 'May', days: 31, start: 305 },
  { month: 'June', days: 30, start: 336 }
]

// Create the map and load the data
function showMap() {
  initMap();
  loadCSVData();
  initHistogram();

  const checkboxes = document.querySelectorAll('input[name="danger-levels"]');

  // add checked checkboxes to checkedLevels array
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      checkedLevels.push(checkbox.value);
    }
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function () {
      checkedLevels = Array.from(checkboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
      console.log(checkedLevels);
      updateMarkers();
      updateHistogram();
    });
  });

}

// Initialize the map
function initMap() {
  var tileLayer = createTileLayer();
  var mapOptions = {
    center: innsbruck,
    zoom: zoomLevel,
    layers: [tileLayer],
    dragging: true,   // disable map dragging
    touchZoom: true,  // disable touch zoom
    zoomControl: true, // disable zoom buttons
    scrollWheelZoom: true,
    doubleClickZoom: false,
    minZoom: 3,
    maxZoom: 15
  };
  map = new L.Map('leaflet-map', mapOptions);

  // Add SVG layer to map for d3 markers
  map._initPathRoot();
  map.svg = d3.select('#leaflet-map').select('svg');

  // Listen to the zoomend event on the map
  map.on('zoomend', function () {
    updateZoom();
  });
}

function createTileLayer() {
  var tileSourceURL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
  var tileSourceOptions = {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  };
  return new L.TileLayer(tileSourceURL, tileSourceOptions);
}

// Load the CSV data and call the add markers function
function loadCSVData() {
  d3.csv("avalanche_data.csv").then(function (data) {
    addMarker(data);
  })
}

function initHistogram() {
  histogramDiv = d3.select('#histogram');
  const width = histogramDiv.node().getBoundingClientRect().width;
  const height = histogramDiv.node().getBoundingClientRect().height;
  margin = { top: 20, right: 0, bottom: 10, left: 0 };
  chartWidth = width - margin.left - margin.right;
  chartHeight = height - margin.top - margin.bottom;

  // Create the SVG element with margins
  svgHist = histogramDiv.append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Create x and y scales
  xScale = d3.scaleLinear()
    .domain([1, 365])
    .range([0, chartWidth]);
  yScale = d3.scaleLinear()
    .domain([0, 80])
    .range([chartHeight, 0]);

  // Create x and y axes
  xAxis = d3.axisBottom(xScale);

  yAxis = d3.axisLeft(yScale).tickValues(d3.range(0, 70, 20));

  // Add the x axis to the bottom of the chart
  svgHist.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(xAxis)
    .style('display', 'none');

  // Add the y axis to the left of the chart
  svgHist.append('g')
    .call(yAxis)
    .style('display', 'none');


  monthRects = svgHist.selectAll('.month-rect')
    .data(calendar)
    .enter()
    .append('rect')
    .attr('x', d => xScale(d.start))
    .attr('y', 0)
    .attr('width', d => xScale(d.start + d.days) - xScale(d.start))
    .attr('height', chartHeight)
    .attr('fill', (d, i) => i % 2 === 0 ? 'gray' : 'lightgray')
    .style('opacity', 0.1);

  monthText = svgHist.selectAll('.month-text')
    .data(calendar)
    .enter()
    .append('text')
    .attr('class', 'month-label')  // add a class to the text elements
    .attr('x', d => xScale(d.start) + (xScale(d.start + d.days) - xScale(d.start)) / 2)
    .attr('y', 15)
    .text(d => {
      if (chartWidth < 900) {
        // Use the first three letters of the month name
        return d.month.substring(0, 3);
      } else {
        return d.month;
      }
    })
    .style('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('fill', 'black');

  // Create a new selection for the lines
  const gridlines = svgHist.selectAll('.gridline')
    .data(d3.range(0, 71, 20)) // bind data to the selection

  // Append a line to each data point
  gridlines.enter()
    .append('line')
    .attr('class', 'gridline')
    .attr('x1', 0)
    .attr('x2', chartWidth)
    .attr('y1', d => yScale(d))
    .attr('y2', d => yScale(d))
    .style('stroke', 'white')
    .style('stroke-width', '2px')
    .style('opacity', 0.8);

  updateHistogram();
}


async function updateHistogram() {
  const data = await d3.csv("avalanche_data.csv");
  data.sort((a, b) => a.day_of_year - b.day_of_year); // sort by day_of_year
  var rollupData = d3.rollup(
    data.filter(d => checkedLevels.includes(d.danger_rating_level)),
    // Second argument is an array of reducer functions
    // In this case, we want to count the number of avalanches where involved_dead > 0
    // and involved_injured > 0 for each day_of_year
    // So, we will use filter() and length properties to get the counts
    d => [
      d.length,
      d.filter(d => d.involved_dead > 0).length,
      d.filter(d => d.involved_dead == 0 && d.involved_injured > 0).length,
      d.filter(d => d.involved_dead == 0 && d.involved_injured == 0).length,
    ],
    d => d.day_of_year
  );

  var daywiseData = Array.from(rollupData, d => ({
    day_of_year: d[0],
    count_all_avalanches: d[1][0],
    count_deadly_avalanches: d[1][1],
    count_harmful_avalanches: d[1][2],
    count_other_avalanches: d[1][3]
  }));

  daywiseData.sort((a, b) => a.day_of_year - b.day_of_year); // sort by day_of_year
  console.log(data.filter(d => checkedLevels.includes(d.danger_rating_level)))
  console.log(daywiseData)



  function createBars(selection, data, color, yAccessor, className) {
    //selection.selectAll(`.${className}`).remove();
    selection.selectAll(`.${className}`)
      .data(data, d => d.day_of_year)
      .join(
        enter => enter.append("rect")
          .attr("class", className)
          .attr("x", d => xScale(d.day_of_year))
          .attr("y", chartHeight) // set the initial y value to the bottom of the chart
          .attr("width", xScale(2) - xScale(1))
          .attr("fill", color)
          .attr("data-day-of-year", d => d.day_of_year) // add a day_of_year attribute
          .style('z-index', 20)
          .transition("bar") // name transition to make sure it doesn't get interrupted by mouseOver events
          .duration(1500)
          .attr("y", d => yScale(yAccessor(d))) // set the final y value to the top of the bar
          .attr("height", d => chartHeight - yScale(yAccessor(d))), // calculate the height of the bar based on the y value
        update => update
          .transition("bar")
          .duration(1000)
          .attr("y", d => yScale(yAccessor(d)))
          .attr("height", d => chartHeight - yScale(yAccessor(d))),
        exit => exit
          .transition("bar")
          .duration(1000)
          .attr("y", chartHeight)
          .attr("height", 0)
          .remove()
      );
  }

  createBars(svgHist, daywiseData, "gray", d => d.count_all_avalanches, "allAvalanches");
  createBars(svgHist, daywiseData, "red", d => d.count_deadly_avalanches + d.count_harmful_avalanches, "deadlyAvalanches");
  createBars(svgHist, daywiseData, "orange", d => d.count_harmful_avalanches, "harmfulAvalanches");
  svgHist.selectAll(['.allAvalanches', '.deadlyAvalanches', '.harmfulAvalanches'])
    .on("mouseover", function (d) {
      // get the day of the year of the selected bar
      const selectedDay = d.target.__data__.day_of_year;
      console.log(selectedDay)
      // select all circles where the circle-day-of-year does not match the selected day
      d3.selectAll("circle")
        .filter(function () {
          return d3.select(this).attr("circle-day-of-year") != selectedDay;
        })
        // reduce their opacity to 0.2
        .attr("opacity", 0.2);

      d3.selectAll("circle")
        .filter(function () {
          return d3.select(this).attr("circle-day-of-year") === selectedDay;
        })
        // reduce their opacity to 0.2
        .attr("opacity", 0.9)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    })
    .on("mouseout", function (d) {
      // reset the opacity of all circles
      d3.selectAll("circle")
        .attr("opacity", 0.5)
        .attr("stroke-width", 0);
    });

}





// helper functions to dynamically set the styling of each avalanche based on the Group
function setMarkerAttributes(group, fill, opacity, radiusFn) {
  group.selectAll('circle')
    .attr('fill', fill)
    .attr('opacity', opacity)
    .transition() // Add a transition to fade out the markers
    .duration(2000)
    .attr('r', radiusFn);
}

function fatalRadius(d) {
  const zoomRadius = radiusScale(map.getZoom());
  const radiusFactor = 0.4; // Change this value to set the percentage increase
  return zoomRadius + (d.involved_dead * radiusFactor* zoomRadius);
}
function injuredRadius(d) { 
  const zoomRadius = radiusScale(map.getZoom());
  const radiusFactor = 0.4; // Change this value to set the percentage increase
  return zoomRadius + (d.involved_injured * radiusFactor* zoomRadius);
}
function otherRadius(d) { return radiusScale(map.getZoom()) };


// Add the markers to the map
function addMarker(data) {

  // Add the markers to the correct g groups
  fatalAvalancheGroup = map.svg.append('g').attr('class', 'fatal-avalanche-group');
  injuredAvalancheGroup = map.svg.append('g').attr('class', 'injured-avalanche-group');
  otherAvalancheGroup = map.svg.append('g').attr('class', 'other-avalanche-group');

  // Add the markers to the correct g groups without stlyling
  map.svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', function (d) { return map.latLngToLayerPoint([d.location_latitude, d.location_longitude]).x; })
    .attr('cy', function (d) { return map.latLngToLayerPoint([d.location_latitude, d.location_longitude]).y; })
    .attr("circle-day-of-year", d => d.day_of_year)
    .attr("location_longitude", d => d.location_longitude)
    .attr("location_latitude", d => d.location_latitude)
    .each(function (d) {
      if (d.involved_dead > 0) {
        fatalAvalancheGroup.node().appendChild(this);
      } else if (d.involved_injured > 0) {
        injuredAvalancheGroup.node().appendChild(this);
      } else {
        otherAvalancheGroup.node().appendChild(this);
      }
    })
    .on('mouseenter', function (d) {

        // Add a stroke to the circle
        d3.select(this)
          .style('stroke', 'black')
          .style('stroke-width', 2)
          .style('opacity', 1);

      // Get the day of the year and chart height
      const selectedDay = d.target.__data__.day_of_year;
      // Calculate the x and y coordinates of the rectangle
      const x = xScale(selectedDay);
      // Get the width and height of the matching .allAvalanches rectangle
      const matchingRect = d3.selectAll('.allAvalanches')
        .filter(function () {
          return d3.select(this).attr('data-day-of-year') == selectedDay;
        })
        .node();
      const rectWidth = matchingRect.width.baseVal.value;
      const rectHeight = matchingRect.height.baseVal.value;
      const y = chartHeight - rectHeight;

      // Create a rectangle in #histogram
      svgHist.append('rect')
        .attr('class', 'tooltip')
        .attr('x', x)
        .attr('y', y)
        .attr('width', xScale(2) - xScale(1))
        .attr('height', rectHeight - 1, 5)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.4);


      // Reduce the opacity of other markers
      d3.select('#histogram').selectAll(['.allAvalanches', '.deadlyAvalanches', 'harmfulAvalanches'])
        .filter(function () {
          return d3.select(this).attr('data-day-of-year') != selectedDay;
        })
        .transition()
        .duration(500)
        .attr('opacity', 0.3);
    })
    .on('mouseleave', function (d) {
      d3.select(this)
      .style('stroke', 'none')
      .style('opacity', 0.5);

      // Remove the rectangle from #histogram
      d3.select('#histogram').select('.tooltip').remove();

      // Restore the opacity of other markers
      d3.select('#histogram').selectAll(['.allAvalanches', '.deadlyAvalanches', 'harmfulAvalanches'])
        .transition()
        .duration(200)
        .attr('opacity', 1);

    });

  // set marker attributes for each Group
  setMarkerAttributes(fatalAvalancheGroup, 'red', 0.5, 0);
  setMarkerAttributes(injuredAvalancheGroup, 'orange', 0.5, 0);
  setMarkerAttributes(otherAvalancheGroup, 'gray', 0.5, 0);
  updateMarkers();
}


function resetRadius(group, radiusFn, withTransition = true) {
  const selection = group.selectAll('circle')
    .filter(d => checkedLevels.includes(d.danger_rating_level));

  if (withTransition) {
    selection.transition()
      .duration(500)
      .attr('r', radiusFn);
  } else {
    selection.attr('r', radiusFn);
  }
}
function updateMarkers() {
  // Update the markers that should be hidden
  map.svg.selectAll('circle')
    .filter(d => !checkedLevels.includes(d.danger_rating_level))
    .transition() // Add a transition to fade out the markers
    .duration(500)
    .attr('r', 0);

  // Update the markers that should be shown
  resetRadius(fatalAvalancheGroup, fatalRadius);
  resetRadius(injuredAvalancheGroup, injuredRadius);
  resetRadius(otherAvalancheGroup, otherRadius);
}



function updateZoom() {
  const circles = map.svg.selectAll('circle').nodes();

  // Update the positions of all the existing circles
  map.svg.selectAll('circle')
    .attr("cx", function (d, i) {
      const lng = d.location_longitude;
      const lat = d.location_latitude;
      return map.latLngToLayerPoint([lat, lng]).x;
    })
    .attr("cy", function (d, i) {
      const lng = d.location_longitude;
      const lat = d.location_latitude;
      return map.latLngToLayerPoint([lat, lng]).y;
    });
      // Update the markers that should be shown
  resetRadius(fatalAvalancheGroup, fatalRadius, false);
  resetRadius(injuredAvalancheGroup, injuredRadius, false);
  resetRadius(otherAvalancheGroup, otherRadius, false);
}
