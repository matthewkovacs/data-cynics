function drawMap(){
  var width = 510,
      height = 600,
      active = d3.select(null);

  var zoom = d3.zoom()
      // .translate([0,0])
      // .scale(1)
      .scaleExtent([1,20])
      .on("zoom", zoomed);

  var svg = d3.select("#map")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("float", "left")
      .on("click", stopped, true);

  svg.append("rect")
      .attr("class", "background")
      .attr("width", width)
      .attr("height", height)
      .on("click", reset);

  var mainGroup = svg.append("g");
  mainGroup.style("stroke", "white")
           .style("stroke-width", "2px")
           .style("stroke-opacity", 0.0);

 var legend = d3.select("#legend")
             .append("svg")
             .attr("width", "475")
             .attr("height", "100");

  // Enable free pan and zoom
  svg.call(zoom);

  var scaling_factor = 90000,
      projection = d3.geoAlbersUsa()
          .translate([scaling_factor / (- 8.95) , scaling_factor / 15.8])
          .scale(scaling_factor);

  // Define the path generator
  var path = d3.geoPath()
            .projection(projection);

  this.initialMap = function (cbcArray, map, year) {

    var communities = topojson.feature(map, map.objects.community).features,
        // Bind the upper level keys corresponding to the years in the data.
        indexYear = d3.map(cbcArray, function(d){ return d.key; }),
        // Bind values of key specified by the year input to this initialGraph function.
        yearCrimes = indexYear.get(year).values;

    // Transform yearCrimes to be read by color inside the accessor function
    var choroCrimes = {};
    yearCrimes.forEach(function(d){ choroCrimes[d.community] = +d.crimeCount; });


    //// Setup color scale legend ////
    // Get crime min and max counts for the selected year
    var colorMin = d3.min(yearCrimes, function(d){ return d.crimeCount; }),
        colorMax = d3.max(yearCrimes, function(d){ return d.crimeCount; });

    // Figure out how to appropriately scale the range of crime count within rangRound amount of px
    var cScale = d3.scaleLinear()
                  .domain([colorMin, colorMax])
                  .rangeRound([0, 360]);

    // Quantize continuous range of crime count values into n-1 bins using n colors
    var colorBins = d3.ticks(colorMin, colorMax, 5);
    var color = d3.scaleThreshold()
                  .domain(colorBins)
                  //.range(d3.schemeOrRd[colorBins.length]);
                  .range(["#eaeaea", "#ffd4aa", "#ffa54c", "#c63b3b", "#720f00"])

    var cScaleLegend = legend.append("g")
                        .attr("id", "legend")
                        .attr("transform", "translate(0,40)");

    cScaleLegend.selectAll("rect")
          .data(color.range().map(function(d) {
              d = color.invertExtent(d);
              if (d[0] == null) d[0] = cScale.domain()[0];
              if (d[1] == null) d[1] = cScale.domain()[1];
              return d;
            }))
          .enter().append("rect")
            .attr("height", 8)
            .attr("x", function(d) { return cScale(d[0]); })
            .attr("width", function(d) { return cScale(d[1]) - cScale(d[0]); })
            .attr("fill", function(d) { return color(d[0]); });

    cScaleLegend.append("text")
                  .attr("class", "caption")
                  .attr("x", cScale.range()[0])
                  .attr("y", -6)
                  .attr("fill", "#000")
                  .attr("text-anchor", "start")
                  .attr("font-weight", "bold")
                  .text("Crime Count");

    cScaleLegend.call(d3.axisBottom(cScale)
                  .tickSize(13)
                  .tickFormat(function(d) { return (d / 1000) + "k"; })
                  .tickValues(color.domain()))
                .select(".domain")
                  .remove();

    // community colors based on choroCrimes data
    mainGroup.append("g")
        .attr("class", "communities")
      .selectAll("path")
      .data(communities)
      .enter().append("path")
        .on("click", clicked)
        .attr("fill", function(d) { return color( choroCrimes[d.properties.community] ); })
        .attr("d", path);


    // community contour highlight
    mainGroup.selectAll("path")
          .on("mouseover", function () {
              d3.select(this).style("stroke-opacity", 1.0);
          })

    mainGroup.selectAll("path")
          .on("mouseout", function () {
              d3.select(this).style("stroke-opacity", 0);
          })

    //community label white outline
    mainGroup.selectAll(".label-bg")
        .data(communities)
        .enter()
        .append("text")
        .attr("class", "label-bg")
        .attr("stroke-opacity", "0.9")
        .text(function(d) { return d.properties.community; })
        .attr("x", function(d) { return path.centroid(d)[0]; })
        .attr("y", function(d) { return path.centroid(d)[1]; });

    //community label text
    mainGroup.selectAll(".community-label")
        .data(communities)
        .enter()
        .append("text")
        .text(function(d) { return d.properties.community })
        .attr("class", "community-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; });

  } // close initialMap

  function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);
  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.7 / Math.max(dx / width, dy / height))),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(1100)
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) );
  }

  function reset() {
    active.classed("active", false);
    active = d3.select(null);
    svg.transition()
        .duration(1100)
        .call( zoom.transform, d3.zoomIdentity );
  }

  function zoomed() {
    mainGroup.style("stroke-width", 1.5 / d3.event.transform.k + "px");
    mainGroup.attr("transform", d3.event.transform);
  }

  // If the drag behavior prevents the default click,
  // also stop propagation so we don’t click-to-zoom.
  function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
  }

  this.updateMap = function(cbcArray, map, year) {
    var communities = topojson.feature(map, map.objects.community).features,
    // Bind the upper level keys corresponding to the years in the data.
        indexYear = d3.map(cbcArray, function(d){ return d.key; }),
    // Bind values of key specified by the year input to this initialGraph function.
        yearCrimes = indexYear.get(year).values,
    // Transform yearCrimes to be read by color inside the accessor function
        choroCrimes = {};

    yearCrimes.forEach(function(d){ choroCrimes[d.community] = +d.crimeCount; });

    //// Setup color scale legend ////
    // Get crime min and max counts for the selected year
    var colorMin = d3.min(yearCrimes, function(d){ return d.crimeCount; }),
        colorMax = d3.max(yearCrimes, function(d){ return d.crimeCount; });

    // Figure out how to appropriately scale the range of crime count within rangRound amount of px
    var cScale = d3.scaleLinear()
                  .domain([colorMin, colorMax])
                  .rangeRound([0, 360]);

    // Quantize continuous range of crime count values into n-1 bins using n colors
    var colorBins = d3.ticks(colorMin, colorMax, 5);
    // "#c63b3b"
    colorBins.length > 3 ? colorRange = ["#eaeaea", "#ffd4aa", "#ffa54c", "#c63b3b", "#720f00"] :
    colorRange = ["#eaeaea", "#ffd4aa", "#ffa54c", "#c63b3b"];

    // unused functionality to remove last element of map legend
    // Remove the last element after it is no long required
    // d3.selection.prototype.last = function() {
    //   return d3.select(
    //       this.nodes()[this.size() - 1]
    //   );
    // };  // close d3.selection.prototype
    //
    // if (colorBins.length < 4) {
    //   console.log(colorBins.length);
    //   legend.selectAll('rect')
    //               .last()
    //               .remove();
    //       }

    var color = d3.scaleThreshold()
                  .domain(colorBins)
                  .range(colorRange);

    // update map community colors
    mainGroup.select(".communities")
        .selectAll("path")
          .data(communities)
          .transition()
          .duration(999)
          .attr("d", path)
          .attr("fill", function(d) { return color( choroCrimes[d.properties.community] ); });

    // // update the legend colors
    // if (colorBins.length > 3){
    //   legend.selectAll("rect")
    //       .data(color.range().map(function(d) {
    //           d = color.invertExtent(d);
    //           if (d[0] == null) d[0] = cScale.domain()[0];
    //           if (d[1] == null) d[1] = cScale.domain()[1];
    //           return d;
    //         }))
    //       .transition()
    //       .duration(1099)
    //       .attr("x", function(d) { return cScale(d[0]); })
    //       .attr("width", function(d) { return cScale(d[1]) - cScale(d[0]); })
    //       .attr("fill", function(d) { return color(d[0]); })
    //
    //
    //   // update the legend scale
    //   legend.select("#legend")
    //       .transition()
    //       .duration(1099)
    //       .call(d3.axisBottom(cScale)
    //                 .tickSize(13)
    //                 .tickFormat(function(d) { return (d / 1000) + "k"; })
    //                 .tickValues(color.domain()))
    //       .select(".domain")
    //         .remove();
    // } // close if statement
  } //  close updateMap
} // close drawMap
