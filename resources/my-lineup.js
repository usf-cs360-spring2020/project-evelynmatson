// Global variables because why not
let scales = {};
let config = {
    'svg' : {},
    'margin' : {},
    'plot' : {},
    'legend' : {}
};
let svg;
let axes;
let plot;
let grid;

/**
 * This function will draw the second visualization.
 */
let visualizationTwo = function() {

    // Specs of the svg
    config.svg.height = 450;
    config.svg.width = 900;   // Golden Ratio!

    // svg margins
    config.margin.top = 80;
    config.margin.right = 20;
    config.margin.bottom = 110;
    config.margin.left = 70;

    // Legend specs
    config.legend.squareSize = 15;
    config.legend.betweenSquares = 5;
    config.legend.firstSquareX = 5;
    config.legend.width = config.svg.width;
    config.legend.height = config.margin.bottom;
    config.legend.column_width = 225;
    // config.legend.leftBorder = 5;

    // Plot specs
    // (Move the plot right and down by the margin amounts)
    config.plot.x = config.margin.left;
    config.plot.y = config.margin.top;
    // (Calculate the width and height of the plot area)
    config.plot.width = config.svg.width - config.margin.left - config.margin.right;
    config.plot.height = config.svg.height - config.margin.top - config.margin.bottom;

    config.plot.paddingBetweenRegions = .05;
    config.plot.paddingBetweenMonths = .05;

    // Set up the SVG
    svg = d3.select("#two");
    svg.attr("width", config.svg.width);
    svg.attr("height", config.svg.height);

    // Set up svg plot area
    plot = svg.append('g');
    plot.attr('id', 'plot1');
    plot.attr('transform', translate(config.plot.x, config.plot.y));

    // Set up a group for the legend
    let legendGroup = svg.append("g")
        .attr("id", "legend")
        .attr('transform', translate(config.margin.left - 10, config.svg.height - config.margin.bottom + 50))
        .attr('width', config.legend.width)
        .attr('height', config.legend.height)
        .attr('fill', 'black');

    // Set up a group for gridlines in the svg
    grid = plot.append("g")
        // .attr('transform', translate(config.plot.x, config.plot.y + config.plot.height))
        // .attr('transform', translate(config.plot.x, config.plot.y))
        .attr("class", "gridlines");

    // Set up a group inside the g for bars
    let rect = plot.append('g')
        .attr('id', 'bars')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', config.plot.width)
        .attr('height', config.plot.height);

    // Make some scales!
    // Month scale (y)
    scales.month = d3.scaleBand()
        .rangeRound([0, config.plot.height])
        .paddingInner(config.plot.paddingBetweenMonths);

    scales.passengers = d3.scaleLinear();
        // Will give a range later, when we know more about the data

    scales.regions = d3.scaleBand()
        .rangeRound([0, config.plot.width])
        .paddingInner(config.plot.paddingBetweenRegions);

    scales.color = d3.scaleOrdinal(d3.schemeCategory10);

    // Title!
    svg.append('text')
        .text('2018 Outgoing International Passenger Counts by Region')
        .attr('class', 'overall-title')
        .attr('fill', 'black')
        .attr('x', config.margin.left + midpoint(scales.regions.range()))
        .attr('y', config.margin.top)
        .attr('dy', -40)
        .attr('text-anchor', 'middle');

    // Setup axes
    axes = {};

    // Load the data
    let csv = d3.csv("data/2 2018 enplaned per region per month.csv", convertRow).then(drawOne);
    // After this promise is loaded, send it in to drawOne().
};

/**
 * Draw the actual visualization number one
 * @param data the data loaded from csv to use in the visualization
 */
let drawOne = function(data) {

    data = data
        .filter(d => d['geo'] !== 'US'); // Filter out US data because it's too large

    // Work on scales
    let dates = data
        .filter(row => (row['geo'] === data[0]['geo']))     // Take only the first geo region's months
        .map(row => row['month'])
        .sort(function(a,b) {return a - b;});
    scales.month.domain(dates);

    let regions = data
        .sort(function(a, b) {
            return maxOfRegion(b, data) - maxOfRegion(a, data);
        })
        .map(row => row['geo'])
        .unique();
    scales.regions.domain(regions);
    scales.color.domain(regions);

    let maxPassengers = Math.max(... data.map(row => row['passengers']));
    scales.passengers.domain([0,maxPassengers])
        .rangeRound([0, scales.regions.bandwidth()])
        .nice();


    // Finally, set up axes
    let monthsAxis = d3.axisLeft(scales.month)
        // .tickPadding(0)
        .tickFormat(monthsFormatter);
    axes.months = monthsAxis;
    let monthsAxisGroup = plot.append("g")
        .attr("id", "months-axis")
        .attr("class", "axis hidden-ticks");
    monthsAxisGroup.call(monthsAxis);

    let regionsAxis = d3.axisTop(scales.regions);
    axes.regions = regionsAxis;
    let regionsAxisGroup = plot.append("g")
        .attr("id", "regions-axis")
        .attr("class", "axis hidden-ticks");
    regionsAxisGroup.call(regionsAxis);

    let passengerAxesGroup = plot.append("g")
        .attr("id", "passenger-axes");
    let passengersAxis = d3.axisBottom(scales.passengers)
        // .tickPadding(0)
        .tickValues([0,100000,200000])
        .tickFormat(passengerTicksFormatter);
        // .ticks(3);
    axes.passengers = passengersAxis;
    for( let [index, region] of regions.entries() ) {
        let passengersAxisGroup = passengerAxesGroup.append("g")
            .attr("class", "axis hidden-ticks")
            .attr("id", "axis" + index.toString())
            .attr("transform", translate(scales.regions(region) ,config.plot.height));
        passengersAxisGroup.call(passengersAxis);

        let title = passengerAxesGroup.append('text')
            .text('Passengers')
            .style('fill', 'black')
            .style('font-size', '0.7rem')
            .attr('text-anchor', 'middle')
            .attr("transform", translate(scales.regions(region) ,config.plot.height))
            .attr('x', midpoint(scales.passengers.range()))
            .attr('y', 30);
    }

    // Draw gridlines
    var ygridlines = d3.axisBottom(scales.passengers)
        .tickFormat("")
        .tickSize(-config.plot.height)
        .ticks(3);
    for (let [index, region] of regions.entries() ) {
        let passengersAxisGroup = grid.append("g")
            .attr("class", "gridline")
            .attr("id", "grid-" + index.toString())
            .attr("style", "color: #BBB")
            .attr("transform", translate(scales.regions(region) ,config.plot.height))
            .call(ygridlines);
    }

    // Make a legend
    // https://www.d3-graph-gallery.com/graph/custom_legend.html
    let legendGroup = d3.select("#legend");
    let legendKeys = ["Asia", 'Canada', 'Australia / Oceania', 'Central America', 'Europe', 'Mexico',  'Middle East'];
    let index = 0;
    for (let region of legendKeys) {

        // Draw a little square
        legendGroup.append("rect")
        .attr('class', 'legend-square')
        .attr('x', config.legend.betweenSquares + (index % 4) * config.legend.column_width)
        .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)))
        .attr('width', config.legend.squareSize)
        .attr('height', config.legend.squareSize)
        .style('fill', scales.color(region))
            .style('stroke', 'white');

        // Draw a little label
        legendGroup.append("text")
            .attr('x',  config.legend.betweenSquares*2 + config.legend.squareSize + config.legend.betweenSquares + (index % 4) * config.legend.column_width)
            .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)) + config.legend.squareSize / 2)
            .style('fill', 'black')
            .text(region)
            .attr('text-anchor', 'left')
            .style('alignment-baseline', 'middle')
            .attr('font-size', '1em');

        index++;
        }

    // Draw actual bars
    let rect = d3.select("#bars");
    console.assert(rect.size() === 1); // Make sure we just have one thing

    let things = rect.selectAll(".bars")
        .data(data, function(d) {return d["month"]});

    // Draw new bars for entering data
    things.enter()
        .append("rect")
        .attr("class","bars")
        .attr("width", d => scales.passengers(d["passengers"]))
        .attr("x", d => scales.regions(d["geo"]))
        .attr("y", d => scales.month(d["month"]))
        .attr("height", scales.month.bandwidth())
        .style("fill", d => scales.color(d['geo']))
        .style('stroke', 'white');

    // Setup slider
    // https://www.w3schools.com/howto/howto_js_rangeslider.asp
    let slider = document.getElementById("myRange");
    console.log('this is my slider', slider);
    slider.oninput = function() {
        console.log('slider is now', this.value);
    }

};

/**
 * Sophie's helpful helper method to make translating easier. Thank you, Sophie!
  */
function translate(x, y) {
    return 'translate(' + x + ',' + y + ')';
}

/**
 * Convert a data entry to a nice month name
 */
function monthsFormatter(d) {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];  // From https://stackoverflow.com/questions/1643320/get-month-name-from-date
    return monthNames[d.getMonth()];
}

/**
 * Helps format the ticks for the passenger count axes.
 */
function passengerTicksFormatter(d) {
    if(d === 0 ) {return "0"}
    // if(d % 50000 !== 0) {return ""}
    return (d/1000).toString() + "k"
}

/**
 * Helpful unique-ing function
 * @returns {*[]} an array with only the unique elements of the array it was called on
 * @source https://coderwall.com/p/nilaba/simple-pure-javascript-array-unique-method-with-5-lines-of-code
 */
Array.prototype.unique = function() {
    return this.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
};

/**
 * This function converts a date in YYYYMM form to a Date object
 * @param monthstring the date string in YYYYMM format
 * @returns {Date} Date object that represents the correct month
 */
function convertActivityPeriod(monthstring) {
    let parseDate = d3.timeParse('%Y%m');
    return parseDate(monthstring);
    // console.log(date);
}

/**
 * This function converts date values during csv import
 * @param row the row object to convert
 * @returns the converted row
 */
let convertRow = function(row) {
    let out = {};

    out["month"] = convertActivityPeriod(row["Activity Period"]);
    out["geo"] = row["GEO Region"];
    out["passengers"] = parseInt(row["Passenger Count"]);

    // Wrangle the data to normalize to a 30-day month
    let dayCounts = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let normalizedDayCount = 30;

    let normScalingFactor = normalizedDayCount /  dayCounts[out['month'].getMonth()];
    // console.log(out['month'], dayCounts[out['month'].getMonth()]);
    out['passengers'] = out['passengers'] * normScalingFactor;

    return out;
};


/**
 * Finds the largest passenger count for any month for region in data entry a
 */
function maxOfRegion(a, data) {
    return Math.max(...data
        .filter(d => (d['geo'] === a['geo']))
        .map(d => d['passengers']));
}

visualizationTwo();

/**
 * calculates the midpoint of a range given as a 2 element array
 * @source Sophie! Thank you.
 */
function midpoint(range) {
    return range[0] + (range[1] - range[0]) / 2.0;
}
