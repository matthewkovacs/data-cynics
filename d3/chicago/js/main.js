// Load the data in series then execute main function
d3.queue()
    .defer(d3.csv, "../data/crimeByDate.csv")
    .defer(d3.csv, "../data/crimeByCommunity.csv")
    .defer(d3.json, "../data/chitown.topojson")
    .await(main);

function main(error, cbdArray, cbcArray, mapArray){
  if (error) throw error;

  let {crimeByDate, crimeByCommunity, map} = prepare_data(cbdArray, cbcArray, mapArray);

  // Create dropwdown menu for year
  var yearMenu = d3.select('#yearDropdown');
  yearMenu
          .append("select")
          .selectAll("option")
             .data(crimeByDate)
             .enter()
             .append("option")
             .attr("value", function(d) { return d.key; })
             .text(function(d) { return d.key; });

  // Define class objects which can recieve user interactions
 var graph = new drawGraph();
 var Map = new drawMap();

 graph.initialGraph(crimeByDate, "2012");
 Map.initialMap(crimeByCommunity, map, "2012");

 // Update the visualizations when the dropwdown value changes.
 yearMenu.on('change', function(d){
   // Grab the selected year choice.
   var yearSelected = d3.select(this)
                    .select("select")
                    .property("value")

   // Call the functions to update visual elements.
   graph.updateGraph(crimeByDate, yearSelected);
   Map.updateMap(crimeByCommunity, map, yearSelected);
 }) //close yearMenu.on
} // close main

// This function will transform the input arrays and return the
// nested arrays that are the inputs to draw graph and map functions
function prepare_data(cbdArray, cbcArray, mapArray){
  // Define datetime parsing functions
  var parseDate = d3.timeParse("%Y-%m-%d"),
      parseYear = d3.timeParse("%Y"),
      dateParse = d3.timeFormat("%Y-%m-%d"),
      yearParse = d3.timeFormat("%Y");

  // Prepate the crimeByDate array
  cbdArray.forEach(function(d) {
    d.date = parseDate(d.Date);
    d.crimeCount = +d["Crimes"];
    })

  function sortByDateAscending(a, b) { return a.date - b.date; }
  var data = cbdArray.sort(sortByDateAscending);

  crimeByDate = d3.nest()
            .key(function(d) { return yearParse(d.date); })
            .key(function(d) { return dateParse(d.date); })
            .rollup(function(v) { return d3.sum(v, function(d) { return d.crimeCount; }) })
            .entries(cbdArray);
          // arr.push() 'all' <option> here

  // The d3.nest() function turns the date into a string for the keys of the nested array
  // This will return the keys to timedate format
  crimeByDate.forEach(function(yearObject) {
    yearObject.values.forEach(function(dateObject, crimeCount) {
      dateObject.date = parseDate(dateObject.key); }) })

  cbcArray.forEach(function(d) {
    d.community = d["Community Area"];
    d.crimeCount = +d["Crimes"];
    })

  crimeByCommunity = d3.nest()
            .key(function(d) { return d.year; })
            .entries(cbcArray);

  // return the transformed arrays
  return {
    crimeByDate: crimeByDate,
    crimeByCommunity: crimeByCommunity,
    map: mapArray
  } // close return
} // close prepare_data
