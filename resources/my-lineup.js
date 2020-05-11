// https://bl.ocks.org/d3noob/10632804
// https://www.w3schools.com/howto/howto_js_rangeslider.asp
// https://www.freecodecamp.org/news/how-to-work-with-d3-jss-general-update-pattern-8adce8d55418/
// https://devdocs.io/html/element/input/range
// https://datahub.io/core/geo-countries#readme
// https://bl.ocks.org/sjengle/2f6d4832397e3cdd78d735774cb5a4f2
// http://techslides.com/demos/d3/d3-continents-projections.html
// https://bl.ocks.org/syntagmatic/ba569633d51ebec6ec6e
// https://observablehq.com/@d3/world-map-svg
// https://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
// https://www.w3schools.com/howto/howto_js_rangeslider.asp
// https://d3-legend.susielu.com

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
        right : 35,
        bottom : 10,
        left : 170
    },
    'plot' : {},
    'legend' : {
        squareSize : 10,
        betweenSquares : 5,
        firstSquareX : 5,
        column_width : 225,
    },

    other_countries_color : '#eee'
};
let scales = {};

let map_svg;
let lineup_svg;

let axes = {};
let plot;
let grid;

let whr_data;
let longData = [];
let mapData;
let countryShapesSelection;
let countriesG;
let detailsDiv;
let barsSelection;

let friendlyLink = {};

let explainors;
let weights = {};
let color_numbers = {};

// TODO allow zooming into specific map regions
// TODO allow selecting just a specific region

/**
 * This function will draw all of the visualization.
 */
async function stepOne() {

    initialPrep();

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
    const promises = [
        d3.csv("resources/Datasets/WHR Datasets/WHR20_DataForFigure2.1_CSV.csv", convertRow),
        d3.json('resources/Datasets/countries.geojson'),
        // d3.json('resources/Datasets/countries_simplified.geojson')
    ];

    Promise.all(promises).then(function (values) {
        whr_data = values[0];
        mapData = values[1];
        // console.log('mapData', mapData);
        stepTwo()
    });
    // TODO clean up the order of 'prep', 'draw', etc... methods and their waiting and such
}

/**
 * Do the next round of preparation work that can be done with the WHR dataset.
 */
function stepTwo() {

    longData = longData.sort(function(a, b) {
        return a['Ladder score'] - b['Ladder score'];
    });

    // console.log('dataParam', dataParam);
    // whr_data = dataParam;
    //     .filter(d => d['geo'] !== 'US'); // Filter out US data because it's too large

    // Work on scales
    let countries = whr_data
        .map(row => row['country']);
    scales.countries.domain(countries);

    explainors = longData
        .map(row => row['explainor'])
        .unique();
    // console.log('found explainors', explainors);
    if ('domain' in scales.color)
        scales.color.domain(explainors);

    // Band scale for the different explainors
    scales.explainors = d3.scaleBand()
        .domain(explainors)
        .rangeRound([0, config.plot.width])
        .paddingInner(config.plot.paddingBetweenRegions);

    // Linear scales, one for each explainor's values
    for (let explainor of Object.keys(whr_data[0])) {
        // Skip non-related things
        if (!explainor.includes('Explained by') && !explainor.includes('residual')) {
            continue;
        }

        // console.log('mapped', explainor, data.map(d => d[explainor]).sort().reverse());
        let maxOfExplainor = Math.max(...whr_data.map(d => d[explainor]));
        // console.log('max of ', explainor, maxOfExplainor);

        // console.log('explainor', explainor);
        scales[explainor] = d3.scaleLinear()
            .domain([0,maxOfExplainor])
            .rangeRound([0, scales.explainors.bandwidth()])
            .nice();

        // Also give the weight an initial value
        weights[explainor] = 50;
    }

    stepThree();
}

/**
 * Draw the actual visualization number one
 * @param dataParam the data loaded from csv to use in the visualization
 */
function stepThree() {

    makeLineupAxes();

    prepMap();
    matchCountries();
    makeMapLegend();


    // makeLineupLegend();

    setupSliders();
    updateVis();

    enableHover();
}

/**
 * Prep the map visualization
 * @param dataParam the data loaded from CSV
 */
function prepMap() {

    // Make the map projection and path generator
    let projection = d3.geoNaturalEarth1()
        .rotate([-10, 0])
        .fitWidth(config.map_svg.width, mapData);
    pathGenerator = d3.geoPath(projection);


    // Update the map SVG's height
    // console.log('pathGenerator.bounds', pathGenerator.bounds(mapData)[1][1]);
    map_svg.attr('width', pathGenerator.bounds(mapData)[1][0]);
    map_svg.attr('height', pathGenerator.bounds(mapData)[1][1]);
    console.log('bounds',  pathGenerator.bounds(mapData))

    // Fix sizes of other things too
    // d3.select('div.scrollable')
    //     .attr('width', config.lineup_svg.width);
    // d3.select('div.slidecontainer')
    //     .attr('width', config.lineup_svg.width);

    // Make some graticule lines
    let graticule = d3.geoGraticule10();
    let graticuleG = map_svg.select('g#graticule');
    // console.log('graticule', graticule);
    // graticule.coordinates.splice(0, 0, [[179, -80.000001], [179, 9.999999000000003], [179, 80.000001]]);
    graticuleG.append('path')
        .attr('class', 'graticule')
        .attr('d', pathGenerator(graticule));


    // Make some selections ahead of time to make things faster
    countriesG = map_svg.select('g#countries');

    // countryShapesSelection = countriesG.selectAll('path.country_outline')
        // .data(mapData.features, d => d['properties']['ISO_A3']);
}


/**
 * Draw a legend for the lineup visualization.
 */
function makeLineupLegend() {
    // Make a legend
    // https://www.d3-graph-gallery.com/graph/custom_legend.html
    let legendGroup = lineup_svg.append('g')
        .attr('id', "legend")
        .attr('transform', translate(0, config.lineup_svg.height - config.margin.bottom ));
    // let legendKeys = ["Asia", 'Canada', 'Australia / Oceania', 'Central America', 'Europe', 'Mexico',  'Middle East'];
    // let legendKeys = ['Freedom','Generosity','Healthy Life Exp.','GDP per capita','Corruption','Social support','Residual Happiness'];
    let legendKeys = explainors;
    let index = 0;
    for (let explainorName of legendKeys) {

        // Draw a little square
        legendGroup.append("rect")
            .attr('class', 'legend-square')
            .attr('x', config.legend.betweenSquares + (index % 4) * config.legend.column_width)
            .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)))
            .attr('width', config.legend.squareSize)
            .attr('height', config.legend.squareSize)
            .style('fill', scales.color(explainorName))
            .style('stroke', 'white');

        // Draw a little label
        legendGroup.append("text")
            .attr('x',  config.legend.betweenSquares*2 + config.legend.squareSize + config.legend.betweenSquares + (index % 4) * config.legend.column_width)
            .attr('y', config.legend.firstSquareX + ((index > 3) * (config.legend.squareSize + config.legend.betweenSquares)) + config.legend.squareSize / 2)
            .style('fill', 'black')
            .text(explainor_name_abbreviator(explainorName))
            .attr('text-anchor', 'left')
            .style('alignment-baseline', 'middle')
            .attr('font-size', '0.75em');

        index++;
    }
}

/**
 * Draw a legend for the map visualization.
 */
function makeMapLegend() {

    let legendHeight = 220;
    let legendWidth = 130;

    let legendTranslateX = 20;
    // let legendTranslateY = 200;
    let legendTranslateY = parseInt(map_svg.attr('height')) - legendHeight + 10;
    // console.log()


    map_svg.select('g#mapLegend').remove();
    let parentLegendG = map_svg.append('g')
        .attr('id', 'mapLegend')
        .attr("transform", translate(legendTranslateX, legendTranslateY));

    // Make the white background first
    parentLegendG.append('rect')
        .attr('id', 'map_legend_background')
        // .style('fill', 'white')
        .attr('x', -10)
        .attr('y', -25)
        .attr('width', legendWidth)
        .attr('height', legendHeight);

    // Then make the actual legend
    let legendG = parentLegendG.append('g')
        .attr('class', 'legendLinear');

    let legend = d3.legendColor()
        .ascending(true)
        .titleWidth(200)
        .shapePadding(5)
        .shapeWidth(20)
        .shapeHeight(15)
        .cells(7)
        .title('Country Colors :')
        .labels(['Least Happy', '.',   '.', '.', '.', '.', 'Most Happy'])
        .orient('vertical')
        .scale(scales.mapColorScale);

    legendG.call(legend);
    legendG.select('.legendCells')
        .insert('g')
        .attr('class', 'cell')
        .attr('transform', 'translate(0, 150)')
        .html('<rect class="swatch" height="15" width="20" style="fill: rgb(238, 238, 238);"></rect>' +
            '        <text class="label" transform="translate( 30, 12.5)">\n' +
            '            No Data\n' +
            '        </text>');

    // console.log('scales.mapColorScale.domain()', scales.mapColorScale.domain());

    // Interactivity
    // let swatches = g.legend.selectAll('rect.swatch')
    //     .attr('enabled', 'true');       // Set all to be enabled by default
    // swatches.on('click', function(element) {
    //         let thisSelect = d3.select(this);
    //
    //         let clickedCategory = reverseTypeLookup[thisSelect.style('fill')];
    //         // console.log('clickedCategory', clickedCategory)
    //
    //         // Toggle enabled-ness
    //         if (thisSelect.attr('enabled') === 'true') {
    //             thisSelect.attr('enabled', 'false');
    //             thisSelect.style('opacity', .1);
    //
    //             // Now disable those dots
    //             let jsindexisdumb = allowedTypes.indexOf(clickedCategory);
    //             allowedTypes.splice(jsindexisdumb, 1);
    //             drawDots(dotsJson);
    //
    //         } else {
    //             thisSelect.attr('enabled', 'true');
    //             thisSelect.style('opacity', .8);
    //
    //             // Now enable those dots
    //             allowedTypes.push(clickedCategory);
    //
    //             drawDots(dotsJson)
    //
    //         }
    //         // console.log(thisSelect);
    //     });
}

/**
 * Setup sliders to update the vis each time they get moved
 */
function setupSliders() {

    let sliders = d3.selectAll('.slider');
    // console.log('sliders', sliders);

    // Setup the weights to begin with
    sliders.each(function () {
        let explainor = d3.select(this).attr('id');
        // let scale_factor = parseFloat(this.value);
        // console.log(explainor, scale_factor);

        weights[explainor] = parseFloat(this.value);
    });

    // Setup modification/interactivty
    sliders.on('change', function () {
        let explainor = d3.select(this).attr('id');
        let scale_factor = parseFloat(this.value);
        console.log(explainor, 'set to', scale_factor);

        weights[explainor] = scale_factor;

        updateVis();
    });
}


///////////////////////////////
// My Main Drawing Functions //
///////////////////////////////

/**
 * Draw the axes for the lineup visualization
 */
function makeLineupAxes() {

    // Make the static axes
    let explainorsAxis = d3.axisTop(scales.explainors)
        .tickFormat(explainor_name_abbreviator);
    axes.explainors = explainorsAxis;
    let explainorsAxisGroup = plot.append("g")
        .attr("id", "explainors-axis")
        .attr("class", "axis hidden-ticks");
    explainorsAxisGroup.call(explainorsAxis);

    // Rotate the text
    explainorsAxisGroup.selectAll('text')
        .attr('transform', "rotate(-30 -40 -40)");

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
    // Draw gridlines
    // let ygridlines = d3.axisBottom(scales.explainors)
    //     .tickFormat("")
    //     .tickSize(-config.plot.height)
    //     .ticks(3);
    // for (let [index, region] of regions.entries() ) {
    //     let passengersAxisGroup = grid.append("g")
    //         .attr("class", "gridline")
    //         .attr("id", "grid-" + index.toString())
    //         .attr("style", "color: #BBB")
    //         .attr("transform", translate(scales.regions(region), config.plot.height))
    //         .call(ygridlines);
    // }
}


///////////////////////
// My Prep Functions //
///////////////////////

/**
 * Prepare config values and svg selections.
 */
function initialPrep() {
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
        .attr('width', config.map_svg.width);
    // .attr('height', config.map_svg.height);


    // Set up svg plot area
    plot = lineup_svg.append('g')
        .attr('id', 'plot1')
        .attr('transform', translate(config.plot.x, config.plot.y));

    // Set up a group for the legend
    // let legendGroup = lineup_svg.append("g")
    //     .attr("id", "legend")
    //     .attr('transform', translate(config.margin.left - 10, config.lineup_svg.height - config.margin.bottom + 50))
    //     .attr('width', config.legend.width)
    //     .attr('height', config.legend.height)
    //     .attr('fill', 'black');

    // Set up a group for gridlines in the svg
    grid = plot.append("g")
        // .attr('transform', translate(config.plot.x, config.plot.y + config.plot.height))
        // .attr('transform', translate(config.plot.x, config.plot.y))
        .attr("class", "gridlines");

    // Set up a group inside the g for bars
    plot.append('g')
        .attr('id', 'bars')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', config.plot.width)
        .attr('height', config.plot.height);

    prepScales();
}

/**
 * Do all the prepwork that can be done to scales before data is loaded.
 */
function prepScales() {
    // Make some scales!
    // Month scale (y)
    // scales.month = d3.scaleBand()
    //     .rangeRound([0, config.plot.height])
    //     .paddingInner(config.plot.paddingBetweenMonths);
    scales.countries = d3.scaleBand()
        .range([3, config.plot.height])
        .paddingOuter(config.plot.paddingBetweenMonths)
        .paddingInner(config.plot.paddingBetweenMonths);

    // scales.passengers = d3.scaleLinear();
    // Will give a range later, when we know more about the data

    // scales.regions = d3.scaleBand()
    //     .rangeRound([0, config.plot.width])
    //     .paddingInner(config.plot.paddingBetweenRegions);

    // scales.color = d3.scaleOrdinal(d3.schemeCategory10);
    scales.color = anything => "#666";

    // Restrict to the lighter parts of the scale
    scales.mapColorScale = d3.scaleSequential(num => d3.interpolateRdYlBu(num * 0.6 + 0.2));
}



//////////////////////////
// My Updater Functions //
//////////////////////////

/**
 * Update the visualization after a modification.
 */
function updateVis() {

    // Sort the data according to the current weights

    // Calculate values for color calculations
    whr_data.forEach(function (row) {
        let sum = weightedSmExplainors(row);

        // Store the sum
        color_numbers[row['country']] = sum;
    });

    // Actually sort it
    whr_data = whr_data.sort(function(a, b) {
        let weightedSumA = color_numbers[a['country']];
        let weightedSumB = color_numbers[b['country']];
        return weightedSumB - weightedSumA;
    });
    // console.log('calculated color_numbers', color_numbers);
    // console.log('color numbers', color_numbers);

    // Add a new domain to the scale.
    updateMapScale(whr_data);

    // Update the lineup y scale to show the new order!
    scales.countries.domain(whr_data.map(r => r.country));

    // Draw actual bars
    let rect = d3.select("#bars");
    console.assert(rect.size() === 1); // Make sure we just have one thing

    let things = rect.selectAll(".bars")
        .data(longData, function(d) {
            // console.log('bars key function d', d);
            return d["country"] + d['explainor'];
        });

    // Draw new bars for entering data
    let colorUpdater = function(d) {
        return scales.mapColorScale(color_numbers[d['country']]);
    };
    things.join(
        enter =>
            enter
                .append("rect")
                .attr("class",function (d) {
                    // console.log('bars enter');
                    return "bars " + d['country'];
                })
                .attr("width", d => scales[d['explainor']](d["value"]))
                // .attr("width", d => scales[d['explainor']](d["value"]) * weights[d['explainor']]/50)
                .attr("x", d => scales.explainors(d["explainor"]))
                .attr("y", d => scales.countries(d["country"]))
                .attr("height", scales.countries.bandwidth())
                .style("fill", d => scales.color(d['explainor']))
                .style('fill', colorUpdater),
                // .style('stroke', 'white'),
        update =>
            update
                .transition()
                .duration(750)
                // .attr("width", d => scales[d['explainor']](d["value"]))
                // .attr("width", d => scales[d['explainor']](d["value"]) * weights[d['explainor']]/50)
                .style('fill', colorUpdater)
                .attr("y", function(d) {
                    // console.log('bars update');
                    return scales.countries(d["country"]);
                })
    );

    // Save bars selection for later
    barsSelection = d3.selectAll('rect.bars');

    // Update Axes
    let countriesAxis = d3.axisLeft(scales.countries);
    axes.countries = countriesAxis;
    plot.select('g#countriesaxis').remove();
    let countriesAxisGroup = plot.append("g")
        .attr("id", "countriesaxis")
        .attr("class", "axis hidden-ticks");
    countriesAxisGroup.call(countriesAxis);

    // Use the map visualization too!
    updateMapVis();
}

/**
 * Update the map visualization.
 */
function updateMapVis() {

    // Color function defined here ahead of time
    let map_feature_to_color = function(feature) {
        if ('whrdata' in feature) {
            return scales.mapColorScale(color_numbers[feature['whrdata']['country']]);
        } else {
            return config.other_countries_color;
        }
    };

    // console.log('before enter update', country_shapes);

    let drawShapes = function(countryShapesSelection) {
        countryShapesSelection.join(
            enter =>
                enter
                    .append('path')
                    .attr('class', function (d) {
                        // console.log('map enter')
                        // link to whr_data
                        // console.log('this in map enter', this);
                        // console.log('d in map enter', d);
                        // console.log('d[\'whrdata\'] in map enter', d['whrdata']);
                        if (d['whrdata'] != undefined) {
                            // console.log('map linking!')
                            d['whrdata']['map_link'] = this;
                            friendlyLink[d['whrdata']['map_data_link_maybe']] = this;
                        }


                        return 'country_outline';
                    })
                    .attr('d', pathGenerator)
                    .attr('id', d => d['properties']['ISO_A3'])
                    .style('fill', map_feature_to_color),

            update => update
                .transition()
                .duration(750)
                .style('fill', function (d) {
                    // console.log('map update');
                    return map_feature_to_color(d);
                })
        );
    };

    countryShapesSelection = countriesG.selectAll('path.country_outline')
        // data(mapData.features, d => d['properties']['ISO_A3']);
    // countryShapesSelection.data(mapData.features, function(d) { return d ? d['properties']['ISO_A3'] : this.id; });
        .data(mapData.features, function(d) {

            let to_return = d['properties']['ISO_A3'];
            // console.log('map key function returning', to_return,' from d', d);
            return to_return;
        });

    // example:
    // let things = rect.selectAll(".bars")
    //     .data(longData, function(d) {return d["country"] + d['explainor']});

    // console.log(countryShapesSelection);
    drawShapes(countryShapesSelection);


    // let map_country_names = mapData.features.map(d => d.properties.ADMIN).forEach(name => console.log('map', name));
    // let data_country_names = sortedData.map(d => d.country).forEach(name => console.log('data', name));
    // console.log('map_country_names', map_country_names);
    // console.log('data_country_names', data_country_names);

    // Make (or update the map legend)
    // makeMapLegend();
}

/**
 * Use the recently sorted values from my lineup to change the scale of the map visualization.
 */
function updateMapScale(sorted) {

    let maxWeighted = weightedSmExplainors(sorted[0]);
    // console.log('maxWeighted', maxWeighted, '(from)', sorted[0]);

    let minWeighted = weightedSmExplainors(sorted[sorted.length - 1]);
    // console.log('minWeighted', minWeighted, '(from)', sorted[sorted.length - 1]);

    scales.mapColorScale.domain([minWeighted, maxWeighted]);
}



/////////////////////////
// My Helper Functions //
/////////////////////////

/**
 * This function converts date values during csv import
 * @param row the row object to convert
 * @returns converted row
 */
function convertRow(row) {
    // console.log('row', row);

    // Shorten overly long country names
    let country_name;
    switch (row['Country name']) {
        case 'Taiwan Province of China':
            country_name = 'Taiwan';
            break;

        case 'Hong Kong S.A.R. of China':
            country_name = 'Hong Kong S.A.R.';
            break;

        case 'Palestinian Territories':
            country_name = 'Palestine';
            break;

        case 'Congo (Kinshasa)':
            country_name = 'Congo-Kinshasa';
            break;

        case 'Congo (Brazzaville)':
            country_name = 'Congo-Brazzaville';
            break;

        default:
            country_name = row['Country name']
            break;
    }

    let out = {
        'country': country_name,
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
            'country': country_name,
            "Regional indicator" : row["Regional indicator"],
            "Ladder score" : parseFloat(row["Ladder score"]),
            'value' : parseFloat(row[explainor]),
            'explainor': explainor,
            'whr_data_link' : out
        };

        longData.push(newThing);

    }
    return out;
}

/**
 * Calculate the weighted sum of a given data element's explainors
 * @param d the data element
 */
function weightedSmExplainors(d) {
    // console.log('weights', weights);
    let weights_to_use = weights;

    let sum = 0;
    Object.keys(d)
        .filter(a => a.includes("Explained")  || a.includes('residual'))
        .map(key => d[key] * weights_to_use[key])
        .forEach(function(d) {sum += d});

    // console.log('calculated sum for', d.country, sum);
    return sum;
}

/**
 * Convert a long explainor name to a shorter abbreviaton
 * @param long_name
 */
function explainor_name_abbreviator(long_name) {
    switch (long_name) {
        case 'Explained by: Freedom to make life choices' :
            return 'Freedom';

        case 'Explained by: Generosity' :
            return 'Generosity';

        case 'Explained by: Healthy life expectancy' :
            return 'Healthy Life Exp.';

        case 'Explained by: Log GDP per capita' :
            return 'GDP per capita';

        case 'Explained by: Perceptions of corruption' :
            return 'Corruption (lack of)';

        case 'Explained by: Social support' :
            return 'Social support';

        case 'Dystopia + residual' :
            return 'Residual Happiness';
    }
}

/**
 * Make sure the countries in the map match the countries in the dataset
 */
function matchCountries() {
    // console.log('mapData', mapData);
    // console.log('whr_data', whr_data);

    // Arrays of country names. Will be kept sparse, to preserve indexing of original datasets
    let remaining_whr_country_names = whr_data.map(entry => entry.country);
    let remaining_map_country_names = mapData.features.map(feature => feature.properties['ADMIN']);

    // First pass : look for exact name-name matches
    for (let entry of remaining_map_country_names.entries()) {
        let map_data_index = entry[0];
        let map_name = entry[1];

        // Success! Exact match:
        if (remaining_whr_country_names.includes(map_name)) {

            let whr_index = remaining_whr_country_names.indexOf(map_name);

            // Store the match in the real mapData
            mapData.features[map_data_index]['whrdata'] = whr_data[whr_index];
            // console.log('linked whr data in mapData.features');

            // Remove this from the map country names
            delete remaining_map_country_names[map_data_index];

            // Remove this from the whr country names
            delete remaining_whr_country_names[whr_index];
            whr_data[whr_index]['map_data_link_maybe'] = mapData.features[map_data_index];
        }
    }
    // console.log('First pass made, exact matches made.');

    // Second pass : manually match a few
    for (let entry of remaining_whr_country_names.entries()) {

        // Skip entries for since-removed countries
        if (entry[1] === undefined) {
            continue;
        }

        let whr_data_index = entry[0];
        let whr_name = entry[1];

        // Lookup what that WHR country is called in the map dataset...
        let map_name;
        switch (whr_name) {
            case 'United States':
                map_name = 'United States of America';
                break;

            case 'Taiwan Province of China':
                map_name = 'Taiwan';
                break;

            case 'Serbia' :
                map_name = 'Republic of Serbia';
                break;

            case 'North Cyprus':
                map_name = 'Northern Cyprus';
                break;

            case 'Hong Kong S.A.R. of China':
                map_name = 'Hong Kong S.A.R.';
                break;

            case 'Congo-Brazzaville':
                map_name = 'Republic of Congo';
                break;

            case 'Palestinian Territories':
                map_name = 'Palestine';
                break;

            case 'Congo-Kinshasa':
                map_name = 'Democratic Republic of the Congo';
                break;

            case 'Tanzania':
                map_name = 'United Republic of Tanzania';
                break;
        }
        let map_data_index = remaining_map_country_names.indexOf(map_name);

        // Store the match in the real mapData
        mapData.features[map_data_index]['whrdata'] = whr_data[whr_data_index];
        // console.log('linked whr data in mapData.features');

        whr_data[whr_data_index]['map_data_link_maybe'] = mapData.features[map_data_index];

        // Delete from the remaining name lists
        delete remaining_map_country_names[map_data_index];
        delete remaining_whr_country_names[whr_data_index];

    }
    // console.log('Second pass made. Custom matches made.');

    // Third pass : give 'none' to others
    // ACTUALLY, instead of this, I'm just not going to define whrdata for those elements that should be grey.

    // console.log('Matched exact matches');
}

/**
 * Enable hover interactivity
 */
function enableHover() {
    let countries = d3.selectAll('path.country_outline');
    let bars = d3.selectAll('rect.bars');

    bars.on('mouseover.hover', function (d) {

        // console.log('d in mouseover bar', d);
        let country = d['country']
        // if (!d.hasOwnProperty('whr_data_link'))
        //     return;

        let meMap = d3.select(d['whr_data_link']['map_link']);
        // let me = d3.select(this);

        // let siblingBars = d3.select(this.parentNode).selectAll('rect');

        // Highlight bars too
        let desire = 'rect.' + d['country'].replace(new RegExp(' ', 'g'), '.');
        // console.log('looking for', desire);
        // console.log('barsSelection', barsSelection);
        let siblingBars = d3.select(this.parentNode).selectAll(desire);
        // console.log('siblingBars', siblingBars);
        siblingBars.style('stroke-width', '1px')
            .style('stroke', 'red');
        //
        // // highlight country
        meMap.raise();
        meMap.style('stroke-width', '1px');
        meMap.style('stroke', 'red');
    });

    bars.on('mouseout.hover', function (d) {
        // let me = d3.select(this);
        // detailsDiv.remove();

        // unHighlight bars too
        let desire = 'rect.' + d['country'].replace(new RegExp(' ', 'g'), '.');
        let siblingBars = d3.select(this.parentNode).selectAll(desire);
        // let relevantBars = d3.selectAll(desire);
        // console.log('un sibling bars', siblingBars);
        siblingBars.style('stroke-width', '0.5px')
            .style('stroke', '#666666');

        let meMap = d3.select(d['whr_data_link']['map_link']);

        // unhighlight country
        meMap.style('stroke-width', '0.5px');
        meMap.style('stroke', '#999999');


    })

    countries.on("mouseover.hover", function(d) {
        // Skip grey countries
        if (!d.hasOwnProperty('whrdata'))
            return;

        let me = d3.select(this);
        detailsDiv = d3.select("body").append("div");

        detailsDiv.attr("id", "details");
        detailsDiv.attr("class", "tooltip");

        let rows = detailsDiv.append("table")
            .selectAll("tr")
            .data(d.hasOwnProperty('whrdata') ? Object.keys(d['whrdata']).filter(d=>d[0] != 'm') : [])
            .enter()
            .append("tr");

        rows.append("th")
            .text(function (key) {
                let shortened = explainor_name_abbreviator(key);
                // console.log(shortened, 'shortened')
                if (shortened === undefined)
                    return key
                else
                    return shortened
            })
            .style('padding-right', '10px');
        rows.append("td")
            .text(function(key) {
                // console.log(d['whrdata'][key]);
                return d['whrdata'][key];
            });

        // Highlight bars too
        let desire = '#bars rect.' + d['whrdata']['country'].replace(new RegExp(' ', 'g'), '.');
        // console.log('looking for', desire);
        // console.log('barsSelection', barsSelection);
        let relevantBars = d3.selectAll(desire);
        // console.log('relevant bars', relevantBars);
        relevantBars.style('stroke-width', '1px')
            .style('stroke', 'red');

        // highlight country
        me.raise();
        me.style('stroke-width', '1px');
        me.style('stroke', 'red');
    });

    countries.on("mousemove.hover2", function(d) {
        // Skip grey countries
        if (!d.hasOwnProperty('whrdata'))
            return;

        // let div = d3.select("div#details");

        // get height of tooltip
        let bbox = detailsDiv.node().getBoundingClientRect();

        detailsDiv.style("left", d3.event.pageX + "px")
        detailsDiv.style("top",  (d3.event.pageY - bbox.height) + "px");
    });

    countries.on("mouseout.hover2", function(d) {
        // Skip grey countries
        if (!d.hasOwnProperty('whrdata'))
            return;

        let me = d3.select(this);
        detailsDiv.remove();

        // unHighlight bars too
        let desire = 'rect.' + d['whrdata']['country'].replace(new RegExp(' ', 'g'), '.');
        let relevantBars = d3.selectAll(desire);
        // console.log('un relevant bars', relevantBars);
        relevantBars.style('stroke-width', '0.5px')
            .style('stroke', '#666666');

        // unhighlight country
        me.style('stroke-width', '0.5px');
        me.style('stroke', '#999999');
    })
    // Thank you Sophie Engle for this code
}



//////////////////////////////
// Others' Helper Functions //
//////////////////////////////

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
 * Sophie's helpful helper method to make translating easier. Thank you, Sophie!
 */
function translate(x, y) {
    return 'translate(' + x + ',' + y + ')';
}



////////////////////
// Run this show! //
////////////////////
stepOne();
