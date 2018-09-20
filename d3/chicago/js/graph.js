function drawGraph(){
  var margin = {top: 20, right: 20, bottom: 30, left: 50},
      //width = +svg.attr("width") - margin.left - margin.right,
      //height = +svg.attr("height") - margin.top - margin.bottom,
      width = 660 - margin.left - margin.right,
      height = 480 - margin.top - margin.bottom,
      svg = d3.select("#linegraph")
                  .append("svg")
                      .attr("width", width + margin.left + margin.right)
                      .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleTime()
      .rangeRound([0, width]),

      y = d3.scaleLinear()
      .rangeRound([height, 0]),

      line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.value); });

  this.initialGraph = function(inputData, year) {
      // Bind the upper level keys corresponding to the years in the data.
      var indexYear = d3.map(inputData, function(d){ return d.key; });
      // Bind values of key specified by the year input to this initialGraph function.
      var graphData = indexYear.get(year).values;

      // Set the bounds for both axes.
      x.domain(d3.extent(graphData, function(d){ return d.date; }));
      y.domain(d3.extent(graphData, function(d){ return d.value; }));

      //modify the x-axis
      var xAxis = d3.axisBottom(x)
                    .tickSizeOuter(0)
                    .tickFormat(d3.timeFormat("%b"));

      //Draw the x-axis
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

      // Draw the y-axis
      var yaxis = svg.append("g")
          .attr("class", "y axis")
          .call(d3.axisLeft(y).tickSizeOuter(0))
        .append("text")
          .attr("fill", "#000")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", "0.6em")
          .attr("text-anchor", "end")
          .text("Number of Crimes");

      // Draw the line
      svg.append("path")
          .datum(graphData)
          .attr("class", "line")
          .attr("d", line);
    } // close initialGraph

    // Function to update the graph depending on year selected.
    this.updateGraph = function(inputData, year) {
      var indexYear = d3.map(inputData, function(d){ return d.key; });
      var graphData = indexYear.get(year).values;
      //y.domain(d3.extent(graphData, function(d){ return d.value; }));

      // Update the y-axis.
      y.domain(d3.extent(graphData, function(d){ return d.value; }));
      svg.select(".y")
          .transition()
          .duration(1099)
          .call(d3.axisLeft(y).tickSizeOuter(0));

      // Update the x-axis.
      x.domain(d3.extent(graphData, function(d){ return d.date; }));
      //modify the x-axis
      var xAxis = d3.axisBottom(x)
                    .tickSizeOuter(0)
                    .tickFormat(d3.timeFormat("%b"));

      svg.select(".x")
          .transition()
          .duration(1099)
          .call(xAxis);

      // Update the line.
      svg.select(".line")
          .datum(graphData)
          .transition()
          .duration(1099)
          .attr("d", line);
    } // close updateGraph
} // close drawGraph
