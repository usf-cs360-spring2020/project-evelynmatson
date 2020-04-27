// https://bl.ocks.org/d3noob/10632804
// https://www.w3schools.com/howto/howto_js_rangeslider.asp
// https://www.freecodecamp.org/news/how-to-work-with-d3-jss-general-update-pattern-8adce8d55418/
// https://devdocs.io/html/element/input/range
// https://datahub.io/core/geo-countries#readme
// https://bl.ocks.org/sjengle/2f6d4832397e3cdd78d735774cb5a4f2
// http://techslides.com/demos/d3/d3-continents-projections.html
// https://bl.ocks.org/syntagmatic/ba569633d51ebec6ec6e
// https://observablehq.com/@d3/world-map-svg
// https://lineup.js.org

// Global variables because why not
let config = {
    'lineup_svg' : {
        height : 1800,
        width : 800
    },
    'map_svg' : {
    },
    'margin' : {
        top : 80,
        right : 20,
        bottom : 110,
        left : 150
    },
    'plot' : {},
    'legend' : {
        squareSize : 15,
        betweenSquares : 5,
        firstSquareX : 5,
        column_width : 225,
    }
};
let scales = {};

let map_svg;
let lineup_svg;

let axes = {};
let plot;
let grid;
let data;
let longData = [];
let explainors;
let weights = {};

/**
 * This function will draw all of the visualization.
 */
let letsGetItStarted = function() {

    config.legend.width = config.lineup_svg.width;
    config.legend.height = config.margin.bottom;


    // Plot specs
    // (Move the plot right and down by the margin amounts)
    config.plot.x = config.margin.left;
    config.plot.y = config.margin.top;

    config.map_svg.width = config.lineup_svg.width;

    // (Calculate the width and height of the plot area)
    config.plot.width = config.lineup_svg.width - config.margin.left - config.margin.right;
    config.plot.height = config.lineup_svg.height - config.margin.top - config.margin.bottom;

    config.plot.paddingBetweenRegions = .05;
    config.plot.paddingBetweenMonths = .05;

    // Set up the SVGs
    lineup_svg = d3.select("#lineupVisualization")
        .attr("width", config.lineup_svg.width)
        .attr("height", config.lineup_svg.height);

    map_svg = d3.select('#mapVisualization')
        .attr('width', config.map_svg.width)
        // .attr('height', config.map_svg.height);


    // Set up svg plot area
    plot = lineup_svg.append('g')
        .attr('id', 'plot1')
        .attr('transform', translate(config.plot.x, config.plot.y));

    // Set up a group for the legend
    let legendGroup = lineup_svg.append("g")
        .attr("id", "legend")
        .attr('transform', translate(config.margin.left - 10, config.lineup_svg.height - config.margin.bottom + 50))
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
    // scales.month = d3.scaleBand()
    //     .rangeRound([0, config.plot.height])
    //     .paddingInner(config.plot.paddingBetweenMonths);
    scales.countries = d3.scaleBand()
        .rangeRound([0, config.plot.height])
        .paddingInner(config.plot.paddingBetweenMonths);

    // scales.passengers = d3.scaleLinear();
        // Will give a range later, when we know more about the data

    // scales.regions = d3.scaleBand()
    //     .rangeRound([0, config.plot.width])
    //     .paddingInner(config.plot.paddingBetweenRegions);

    scales.color = d3.scaleOrdinal(d3.schemeCategory10);

    // Title!
    // svg.append('text')
    //     .text('2018 Outgoing International Passenger Counts by Region')
    //     .attr('class', 'overall-title')
    //     .attr('fill', 'black')
    //     .attr('x', config.margin.left + midpoint(scales.explainors.range()))
    //     .attr('y', config.margin.top)
    //     .attr('dy', -40)
    //     .attr('text-anchor', 'middle');

    // Load the data, continue in later methods
    d3.csv("resources/Datasets/WHR Datasets/WHR20_DataForFigure2.1_CSV.csv", convertRow).then(prepVis);
    d3.json('resources/Datasets/countries.geojson').then(prepMap);
};

/**
 * Draw the actual visualization number one
 * @param data the data loaded from csv to use in the visualization
 */
let prepVis = function(dataParam) {
    console.log('data as loaded', dataParam);
    console.log('longData', longData);

    longData = longData.sort(function(a, b) {
        return a['Ladder score'] - b['Ladder score'];
    });

    data = dataParam
        .filter(d => d['geo'] !== 'US'); // Filter out US data because it's too large

    // Work on scales
    let countries = data
        // .filter(row => (row['geo'] === data[0]['geo']))     // Take only the first geo region's months
        .map(row => row['country']);
        // .sort(function(a,b) {return a - b;});
    // scales.month.domain(dates);
    // console.log('found countries', countries);
    scales.countries.domain(countries);

    explainors = longData
        // .sort(function(a, b) {
        //     return maxOfRegion(b, data) - maxOfRegion(a, data);
        // })
        .map(row => row['explainor'])
        .unique();
    // console.log('found explainors', explainors);
    // scales.regions.domain(explainors);
    scales.color.domain(explainors);

    // let maxPassengers = Math.max(... data.map(row => row['passengers']));
    // scales.passengers.domain([0,maxPassengers])
    //     .rangeRound([0, scales.regions.bandwidth()])
    //     .nice();

    // scales.regions = d3.scaleBand()
    //     .rangeRound([0, config.plot.width])
    //     .paddingInner(config.plot.paddingBetweenRegions);

    // Better scales
    // Band scale for the different explainors
    scales.explainors = d3.scaleBand()
        .domain(explainors)
        .rangeRound([0, config.plot.width])
        .paddingInner(config.plot.paddingBetweenRegions);

    // Linear scales, one for each explainor's values
    for (let explainor of Object.keys(data[0])) {
        // Skip non-related things
        if (!explainor.includes('Explained by') && !explainor.includes('residual')) {
            continue;
        }

        // console.log('mapped', explainor, data.map(d => d[explainor]).sort().reverse());
        let maxOfExplainor = Math.max(...data.map(d => d[explainor]));
        // console.log('max of ', explainor, maxOfExplainor);

        // console.log('explainor', explainor);
        scales[explainor] = d3.scaleLinear()
            .domain([0,maxOfExplainor])
            .rangeRound([0, scales.explainors.bandwidth()])
            .nice();

        // Also give the weight an initial value
        weights[explainor] = 50;
    }

    // Make the static axes
    let explainorsAxis = d3.axisTop(scales.explainors)
        .tickFormat(function(d) {
            if (d.includes('Explained'))
                return d.substring(14);
            else
                return 'Residual Happiness';
        });
    axes.explainors = explainorsAxis;
    let explainorsAxisGroup = plot.append("g")
        .attr("id", "explainors-axis")
        .attr("class", "axis hidden-ticks");
    explainorsAxisGroup.call(explainorsAxis);

    // let passengerAxesGroup = plot.append("g")
    //     .attr("id", "passenger-axes");
    // let passengersAxis = d3.axisBottom(scales.passengers)
    //     // .tickPadding(0)
    //     .tickValues([0,100000,200000])
    //     .tickFormat(passengerTicksFormatter);
    //     // .ticks(3);
    // axes.passengers = passengersAxis;
    // for( let [index, region] of regions.entries() ) {
    //     let passengersAxisGroup = passengerAxesGroup.append("g")
    //         .attr("class", "axis hidden-ticks")
    //         .attr("id", "axis" + index.toString())
    //         .attr("transform", translate(scales.regions(region) ,config.plot.height));
    //     passengersAxisGroup.call(passengersAxis);
    //
    //     let title = passengerAxesGroup.append('text')
    //         .text('Passengers')
    //         .style('fill', 'black')
    //         .style('font-size', '0.7rem')
    //         .attr('text-anchor', 'middle')
    //         .attr("transform", translate(scales.regions(region) ,config.plot.height))
    //         .attr('x', midpoint(scales.passengers.range()))
    //         .attr('y', 30);
    // }
    //
    // // Draw gridlines
    // var ygridlines = d3.axisBottom(scales.passengers)
    //     .tickFormat("")
    //     .tickSize(-config.plot.height)
    //     .ticks(3);
    // for (let [index, region] of regions.entries() ) {
    //     let passengersAxisGroup = grid.append("g")
    //         .attr("class", "gridline")
    //         .attr("id", "grid-" + index.toString())
    //         .attr("style", "color: #BBB")
    //         .attr("transform", translate(scales.regions(region) ,config.plot.height))
    //         .call(ygridlines);
    // }

    // Make a legend
    // https://www.d3-graph-gallery.com/graph/custom_legend.html
    // let legendGroup = d3.select("#legend");
    // let legendKeys = ["Asia", 'Canada', 'Australia / Oceania', 'Central America', 'Europe', 'Mexico',  'Middle East'];
    // let index = 0;
    // for (let region of legendKeys) {
    //
    //     // Draw a little square
    //     legendGroup.append("rect")
    //     .attr('class', 'legend-square')
    //     .attr('x', config.legend.betweenSquares + (index % 4) * config.legend.column_width)
    //     .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)))
    //     .attr('width', config.legend.squareSize)
    //     .attr('height', config.legend.squareSize)
    //     .style('fill', scales.color(region))
    //         .style('stroke', 'white');
    //
    //     // Draw a little label
    //     legendGroup.append("text")
    //         .attr('x',  config.legend.betweenSquares*2 + config.legend.squareSize + config.legend.betweenSquares + (index % 4) * config.legend.column_width)
    //         .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)) + config.legend.squareSize / 2)
    //         .style('fill', 'black')
    //         .text(region)
    //         .attr('text-anchor', 'left')
    //         .style('alignment-baseline', 'middle')
    //         .attr('font-size', '1em');
    //
    //     index++;
    // }

    setupSliders();

    updateVis();
};

/**
 * Prep the map visualization
 * @param dataParam the data loaded from CSV
 */
let prepMap = function(dataParam) {
    let mapData = dataParam;
    console.log('mapData', mapData);

    // Make the map projection and path generator
    let projection = d3.geoNaturalEarth1()
        .rotate([-10, 0])
        .fitWidth(config.map_svg.width, mapData);
    let pathGenerator = d3.geoPath(projection);

    // Update the map SVG's height
    // console.log('pathGenerator.bounds', pathGenerator.bounds(mapData)[1][1]);
    map_svg.attr('height', pathGenerator.bounds(mapData)[1][1]);


    let outlinesG = map_svg.select('g#outlines');
    // console.log('outlines', outlinesG);
    let outlines = outlinesG.selectAll('path.country_outline')
        .data(mapData.features)
        .enter()
        .append('path')
        .attr('class', 'country_outline')
        .attr('d', pathGenerator);


    let graticule = d3.geoGraticule10();
    let graticuleG = map_svg.select('g#graticule');
    console.log('graticule', graticule);
    graticuleG.append('path')
        .attr('d', None => pathGenerator(graticule))
        .attr('stroke', '#ccc')
        .attr('fill', 'none');
};

/**
 * Update the visualization after a modified
 */
function updateVis() {
    // Sort the data according to the current weights
    let sorted = data.sort(function(a, b) {
        let weightedSumA = weightedSmExplainors(a);
        let weightedSumB = weightedSmExplainors(b);
        return weightedSumB - weightedSumA;
    });
    console.log('sorted data: ', sorted);

    // Update the scale to show the new order!
    scales.countries.domain(sorted.map(r => r.country));

    // Draw actual bars
    let rect = d3.select("#bars");
    console.assert(rect.size() === 1); // Make sure we just have one thing

    let things = rect.selectAll(".bars")
        .data(longData, function(d) {return d["country"]+d['explainor']});

    // Draw new bars for entering data
    things.join(
        enter =>
            enter
                .append("rect")
                .attr("class","bars")
                .attr("width", d => scales[d['explainor']](d["value"]))
                // .attr("width", d => scales[d['explainor']](d["value"]) * weights[d['explainor']]/50)
                .attr("x", d => scales.explainors(d["explainor"]))
                .attr("y", d => scales.countries(d["country"]))
                .attr("height", scales.countries.bandwidth())
                .style("fill", d => scales.color(d['explainor']))
                .style('stroke', 'white'),
        update =>
            update
                .transition()
                .duration(750)
                .attr("width", d => scales[d['explainor']](d["value"]))
                // .attr("width", d => scales[d['explainor']](d["value"]) * weights[d['explainor']]/50)
                .attr("y", d => scales.countries(d["country"]))
    );

    // Update Axes
    let countriesAxis = d3.axisLeft(scales.countries);
    axes.countries = countriesAxis;
    // plot.remove('g#countries-axis');
    plot.select('g#countriesaxis').remove();
    let countriesAxisGroup = plot.append("g")
        .attr("id", "countriesaxis")
        .attr("class", "axis hidden-ticks");
    countriesAxisGroup.call(countriesAxis);

}

/**
 * Calculate the weighted sum of a given data element's explainors
 * @param d the data element
 */
function weightedSmExplainors(d) {
    // console.log('weights', weights);
    let sum = 0;
    let keys = Object.keys(d)
        .filter(a => a.includes("Explained")  || a.includes('residual'))
        .map(key => d[key] * weights[key])
        .forEach(function(d) {sum += d});

    // console.log('calculated sum for', d.country, sum);
    return sum;
}

/**
 * Setup sliders to update the vis each time they get moved
 */
function setupSliders() {

    // Setup slider (old)
    // let slider = document.getElementById("myRange");
    // console.log('this is my slider', slider);
    // slider.oninput = function() {
    //     console.log('slider is now', this.value);
    // }


    let sliders = d3.selectAll('.slider');
    console.log('sliders', sliders);

    sliders.on('change', function () {
        let explainor = d3.select(this).attr('id');
        let scale_factor = parseFloat(this.value);
        console.log(explainor, scale_factor);

        weights[explainor] = scale_factor;

        updateVis();

        // TODO I have the new value, now do something with it (update the visualization)
    });

}

/**
 * Sophie's helpful helper method to make translating easier. Thank you, Sophie!
 */
function translate(x, y) {
    return 'translate(' + x + ',' + y + ')';
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
 * This function converts date values during csv import
 * @param row the row object to convert
 * @returns the converted row
 */
let convertRow = function(row) {
    // console.log('row', row);

    let out = {
        'country': row['Country name'],
        "Explained by: Freedom to make life choices" : parseFloat(row["Explained by: Freedom to make life choices"]),
        "Explained by: Generosity" : parseFloat(row["Explained by: Generosity"]),
        "Explained by: Healthy life expectancy" : parseFloat(row["Explained by: Healthy life expectancy"]),
        "Explained by: Log GDP per capita" : parseFloat(row["Explained by: Log GDP per capita"]),
        "Explained by: Perceptions of corruption" : parseFloat(row["Explained by: Perceptions of corruption"]),
        "Explained by: Social support" : parseFloat(row["Explained by: Social support"]),
        "Dystopia + residual" : parseFloat(row["Dystopia + residual"]),
        "Ladder score" : parseFloat(row["Ladder score"]),
        "Regional indicator" : row["Regional indicator"]

    };

    for (let explainor of Object.keys(out)) {

        // Skip non-related things
        if (!explainor.includes('Explained by') && !explainor.includes('residual')) {
            continue;
        }

        let newThing = {
            'country': row['Country name'],
            "Regional indicator" : row["Regional indicator"],
            "Ladder score" : parseFloat(row["Ladder score"]),
            'value' : parseFloat(row[explainor]),
            'explainor': explainor
        };

        longData.push(newThing);

    }
    return out;
};

letsGetItStarted();

/**
 * calculates the midpoint of a range given as a 2 element array
 * @source Sophie! Thank you.
 */
function midpoint(range) {
    return range[0] + (range[1] - range[0]) / 2.0;
}
