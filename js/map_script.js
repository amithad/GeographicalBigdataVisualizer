/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



/* global d3, shp */

var globalgeo;
var csv;
var path;
var mapPathFillColor = "#808080";
var mapPathStrokeColor = "white";
var mins = {};
var maxs = {};
var bar_selected = [];
var pie_selected = [];
var option_flag; //to find the type of the visualizer
var adminelement; //eg: district in sri lanka
//selected metrics
var bar_metric;
var pie_metric;
$("#btnDraw").click(function () {

    $("#baseMap").remove();
    //read file
    var file = $("#shapefile")[0].files[0];
    var reader = new FileReader();
    reader.onload = function () {
        shp(reader.result).then(function (json) {
            var geojson = json[1];
            drawGeo(geojson);
        });
    };
    reader.readAsArrayBuffer(file);
    return false;
}); //draw the map

$("#btnCSV").click(function () {


//read file
    var file = $("#csvfile")[0].files[0];
    var reader = new FileReader();
    reader.onload = function () {
        csv = d3.csv.parse(reader.result);
        adminelement = Object.keys(csv[0])[0];
        console.log(adminelement);
        $.each(csv, function (index, data) {
            
        }
        );
        $.each(Object.keys(csv[0]), function (index, value) {
            //console.log(value);
            if (value.toLowerCase() !== adminelement)
            {
                $('#select-chrp')
                        .append($("<option></option>")
                                .attr("value", value)
                                .text(value));
                $('#select-bar')
                        .append($("<option></option>")
                                .attr("value", value)
                                .text(value));
                $('#select-pie')
                        .append($("<option></option>")
                                .attr("value", value)
                                .text(value));
                mins[value] = Number.MAX_VALUE;
                maxs[value] = Number.MIN_VALUE;
                $.each(csv, function (index, data) {

                    if (mins[value] > data[value])
                        mins[value] = data[value];
                    if (maxs[value] < data[value])
                        maxs[value] = data[value];
                });
            }

        });
    };
    reader.readAsText(file);
    return false;
}); //load the csvfile

function getColor(value, metric) {
    var R = 0, G = 0, B = 0;
    B = 255 - 255 * ((value - mins[metric]) / (maxs[metric] - mins[metric]));
    console.log(metric);
    return "rgb(" + R + "," + G + "," + Math.floor(B) + ")";
} //coloring function
;
function readcsv(pathelement) {
    var pelement = d3.select(pathelement);
    var distr = pelement.datum().properties.NAME_1;
    $.each(csv, function (index, value) {
        if (value[Object.keys(value)[0]] === distr) {
            d3.select("#elements").append('text').text(value[$('#select-chrp').val()])
                    .attr('x', path.centroid(d3.select(pathelement).datum())[0])
                    .attr('y', path.centroid(d3.select(pathelement).datum())[1] + 12)
                    .style({"font-size": "10px"})
                    .style({"fill": "white"});
        }

    });
}  //read csv and match to the map

function drawGeo(geojson) {

    globalgeo = geojson;
    var width = $("#container-visualization").width(), height = $("#container-visualization").height();
    //draw svg
    var svg = d3.select("#container-visualization").append("svg").attr("id", "baseMap")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "mapbg");
    var scale = 100;
    var zoom = d3.behavior.zoom().scaleExtent([.1, 10]).on("zoom", zoom);
    var projection = d3.geo.mercator()
            .scale(scale)
            .center(d3.geo.centroid(geojson))
            .translate([width / 2, height / 2]); //mat to svg




    path = d3.geo.path().projection(projection);
    var bounds = path.bounds(geojson);
    //console.log(bounds);

    var hscale = scale * width / (bounds[1][0] - bounds[0][0]);
    var vscale = scale * height / (bounds[1][1] - bounds[0][1]);
    var scale = (hscale < vscale) ? hscale : vscale;
    var offset = [width - (bounds[0][0] + bounds[1][0]) / 2,
        height - (bounds[0][1] + bounds[1][1]) / 2];
    var group = svg.append("g").attr("id", "elements");
    svg.call(zoom).call(zoom.event);
    //console.log(scale);
    //console.log(offset);
    projection = d3.geo.mercator().center(d3.geo.centroid(geojson)).scale(scale).translate(offset);
    // Define path generator
    path = path.projection(projection);
    group.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("fill", mapPathFillColor)
            .style("stroke-width", ".5")
            .style("stroke", mapPathStrokeColor)
            .style("vector-effect", "non-scaling-stroke");
    //print the district


    group.selectAll('path').on("mouseenter", function () {


//group.selectAll("path").style("fill", mapPathFillColor).style({opacity: '1'});

//d3.select(this).style({fill: 'hotpink'}).style({opacity: '1'});
        $('#elements circle').remove();
        $('#elements text').remove();
        group.append('circle')
                .attr("cx", path.centroid(d3.select(this).datum())[0])
                .attr("cy", path.centroid(d3.select(this).datum())[1])
                .attr("r", 2)
                .style("fill", "#D8D8D8");
        group.append('text').text(d3.select(this).datum().properties.NAME_1)
                .attr('x', path.centroid(d3.select(this).datum())[0])
                .attr('y', path.centroid(d3.select(this).datum())[1])
                .style({"font-size": "12px"})
                .style({"fill": "white"});
        readcsv(this);
        //d3.select(this).append('text').text('test1');
    }); //click function


    function zoom() {

        //console.log("translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");

        group.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    } // zoom functiom  

    svg.append('text').text('Prototype - #1 - Visualizer')
            .attr('x', 50)
            .attr('y', 50)
            .style({"font-size": "18px"})
            .style({"fill": "white"});
    //console.log(projection([79.861243, 6.9270786]));
    var elem = document.elementFromPoint(100, 100); // check the values
    //console.log(elem);
    d3.select(elem).style({fill: 'black'});
}  //draw the map

$('#select-chrp').change(function () {
    console.log($(this).val());
}); // log on console when drop down list is changed
$('#btn-chrp').click(function () {

    d3.selectAll('path').datum(function (d) {
        var elem = this;
        $.each(csv, function (index, value) {
            if (d.properties.NAME_1 === value[Object.keys(value)[0]])
            {
                d3.select(elem).style("fill", getColor(value[$('#select-chrp').val()], $('#select-chrp').val()));
                console.log(getColor(value[$('#select-chrp').val()], $('#select-chrp').val()));
            }

        });
        return  d;
    });
}); //change metric function

$('#select-bar').change(function () {
    console.log($(this).val());
}); //log on coonsole when bar changes

$('#btn-bar').click((function () {
    option_flag = "bar";
    $('#chart1').html('');

    $('#submit-attr').attr("style", "display:inline");
    $('#select-all').attr("style", "display:inline");
    $('#clear-all').attr("style", "display:inline");

    bar_metric = $('#select-bar').val();
    console.log(bar_metric);
    $('#static-text').attr("style", "display:block");
    $('#dialog-title').text("Visualization of " + bar_metric);
    $('#dialog-sub').text("Select " + adminelement + " /(s) to be viewed.");
    $('#check-boxes').html("");
    $.each(csv, function (index, data) {
        
        $('#check-boxes')

                .append('<input type="checkbox" class="cb" value="' + data[Object.keys(data)[0]] + '"/>' + data[Object.keys(data)[0]]);
        

    }
    );
})); //choose attributes to the bar chart

$('#submit-attr').click(function () {
    $('#chart1').html('<svg id="map-svg" style="height: 400px;"></svg>');


    bar_selected = [];
    pie_selected = [];
    $('#check-boxes input:checked').each(function () {
//console.log(" F you");
        bar_selected.push($(this).attr('value'));
        pie_selected.push($(this).attr('value'));
    });
    //console.log(bar_selected);

    var numbers = [];
    if (option_flag === "bar") {
        var jsn = {key: "Cumulative Return", values: []};
        $.each(bar_selected, function (index, value) {
            console.log(value);
            $.each(csv, function (id, row) {

                //console.log(row);
                if (value === row[adminelement.toLowerCase()]) {
                    numbers[value] = row[bar_metric];
                    jsn.values.push({
                        "label": value,
                        "value": row[bar_metric]
                    });
                }
            }
            );
        } //create json object
        );
        var dat = [jsn];
        drawbar(dat);
    }
    ;

    if (option_flag === "pie") {
        $('#chart1').html('<svg id="map-svg" class="mypiechart" style="height: 400px; "></svg>');

        var jsn = [];
        $.each(bar_selected, function (index, value) {
            console.log(value);
            $.each(csv, function (id, row) {

                //console.log(row);
                if (value === row[adminelement.toLowerCase()]) {
                    numbers[value] = row[pie_metric];
                    jsn.push({"key": value, "y": row[pie_metric]});
                }
            }
            );
        } //create json object
        );
        //var dat = [jsn];
        
        drawpie(jsn);
        console.log(jsn);
        //console.log(testdata);

    }
    ;


    //console.log(numbers);

    // var jsno={key: "Cumulative Return",jsn};
    //console.log(jsn);



    $('#map-svg').attr("style", "height:400px");

    $('#check-boxes').html('');
    $('#static-text').attr("style", "display:none");
    $('#submit-attr').attr("style", "display:none");
    $('#select-all').attr("style", "display:none");
    $('#clear-all').attr("style", "display:none");
}); //draw the charts

function drawbar(jsonData) {

    nv.addGraph(function () {
        var chart = nv.models.discreteBarChart()
                .x(function (d) {
                    return d.label
                })
                .y(function (d) {
                    return d.value
                })
                .staggerLabels(true)
                //.staggerLabels(historicalBarChart[0].values.length > 8)
                .showValues(true)
                .duration(1000)
                ;
        d3.select('#chart1 svg')
                .datum(jsonData)
                .call(chart);
        nv.utils.windowResize(chart.update);
        return chart;
    });
} //draw bar chart
;

function drawpie(jsonData) {
    var height = 350;
    var width = 350;
    //var chart1;
    nv.addGraph(function () {
        var chart1 = nv.models.pieChart()
                .x(function (d) {
                    return d.key
                })
                .y(function (d) {
                    return d.y
                })
                .donut(true)
                .width(width)
                .height(height)
                .padAngle(.08)
                .cornerRadius(5)
                .id('donut1'); // allow custom CSS for this one svg
        chart1.title("100%");
        chart1.pie.donutLabelsOutside(true).donut(true);
        d3.select("#chart1 svg")
                .datum(jsonData)        
                .transition().duration(1200)
                .call(chart1);
        //nv.utils.windowResize(chart1.update);
        return chart1;
    });

} //draw the pie chart
;

$('#btn-pie').click(function () {
    option_flag = "pie";
    $('#chart1').html('');
    $('#submit-attr').attr("style", "display:inline");
    $('#select-all').attr("style", "display:inline");
    $('#clear-all').attr("style", "display:inline");
    pie_metric = $('#select-pie').val();
    console.log(pie_metric);
    $('#static-text').attr("style", "display:block");
    $('#dialog-title').text("Visualization of " + pie_metric);
    $('#dialog-sub').text("Select " + adminelement + " /(s) to be viewed.");
    $('#check-boxes').html("");

    $.each(csv, function (index, data) {
        
        $('#check-boxes')

                .append('<input type="checkbox" class="cb" value="' + data[Object.keys(data)[0]] + '"/>' + data[Object.keys(data)[0]]);
        

    }
    );

});  //choose attributes to the pie chart

$('#select-all').click(function () {
    $(".cb").prop('checked', true);
} //select all checkboxes
);

$('#clear-all').click(function () {
    $(".cb").prop('checked', false);
}  //select no checkboxes
);



            