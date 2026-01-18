/**
 * Theme: Darkone- Responsive Bootstrap 5 Admin Dashboard
 * Author: Stackbros
 * Module/App: Dashboard
 */

// Chart 01

var options1 = {
    chart: {
        type: 'area',
        height: 50,
        sparkline: {
            enabled: true
        }
    },
    series: [{
        data: [25, 28, 32, 38, 43, 55, 60, 48, 42, 51, 35]
    }],
    stroke: {
        width: 2,
        curve: 'smooth'
    },
    markers: {
        size: 0
    },
    colors: ["#7e67fe"],
    tooltip: {
        fixed: {
            enabled: false
        },
        x: {
            show: false
        },
        y: {
            title: {
                formatter: function (seriesName) {
                    return ''
                }
            }
        },
        marker: {
            show: false
        }
    },
    fill: {
        opacity: [1],
        type: ['gradient'],
        gradient: {
            type: "vertical",
            //   shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 100]
        },
    },
}

new ApexCharts(document.querySelector("#chart01"), options1).render();


var options1 = {
    chart: {
        type: 'area',
        height: 50,
        sparkline: {
            enabled: true
        }
    },
    series: [{
        data: [87, 54, 4, 76, 31, 95, 70, 92, 53, 9, 6]
    }],
    stroke: {
        width: 2,
        curve: 'smooth'
    },
    markers: {
        size: 0
    },
    colors: ["#7e67fe"],
    tooltip: {
        fixed: {
            enabled: false
        },
        x: {
            show: false
        },
        y: {
            title: {
                formatter: function (seriesName) {
                    return ''
                }
            }
        },
        marker: {
            show: false
        }
    },
    fill: {
        opacity: [1],
        type: ['gradient'],
        gradient: {
            type: "vertical",
            //   shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 100]
        },
    },
}

new ApexCharts(document.querySelector("#chart02"), options1).render();



var options1 = {
    chart: {
        type: 'area',
        height: 50,
        sparkline: {
            enabled: true
        }
    },
    series: [{
        data: [41, 42, 35, 42, 6, 12, 13, 22, 42, 94, 95]
    }],
    stroke: {
        width: 2,
        curve: 'smooth'
    },
    markers: {
        size: 0
    },
    colors: ["#7e67fe"],
    tooltip: {
        fixed: {
            enabled: false
        },
        x: {
            show: false
        },
        y: {
            title: {
                formatter: function (seriesName) {
                    return ''
                }
            }
        },
        marker: {
            show: false
        }
    },
    fill: {
        opacity: [1],
        type: ['gradient'],
        gradient: {
            type: "vertical",
            //   shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 100]
        },
    },
}

new ApexCharts(document.querySelector("#chart03"), options1).render();


var options1 = {
    chart: {
        type: 'area',
        height: 50,
        sparkline: {
            enabled: true
        }
    },
    series: [{
        data: [8, 41, 40, 48, 77, 35, 0, 77, 63, 100, 71]
    }],
    stroke: {
        width: 2,
        curve: 'smooth'
    },
    markers: {
        size: 0
    },
    colors: ["#7e67fe"],
    tooltip: {
        fixed: {
            enabled: false
        },
        x: {
            show: false
        },
        y: {
            title: {
                formatter: function (seriesName) {
                    return ''
                }
            }
        },
        marker: {
            show: false
        }
    },
    fill: {
        opacity: [1],
        type: ['gradient'],
        gradient: {
            type: "vertical",
            //   shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 100]
        },
    },
}

new ApexCharts(document.querySelector("#chart04"), options1).render();

// Conversions
var options = {
    chart: {
        height: 180,
        type: 'donut',
    },
    series: [44.25, 52.68, 45.98],
    legend: {
        show: false
    },
    stroke: {
        width: 0
    },
    plotOptions: {
        pie: {
            donut: {
                size: '70%',
                labels: {
                    show: false,
                    total: {
                        showAlways: true,
                        show: true
                    }
                }
            }
        }
    },
    labels: ["Direct", "Affilliate", "Sponsored"],
    colors: ["#7e67fe", "#17c553", "#7942ed"],
    dataLabels: {
        enabled: false
    },
    responsive: [{
        breakpoint: 480,
        options: {
            chart: {
                width: 200
            }
        }
    }],
    fill: {
        type: 'gradient'
    }
}
var chart = new ApexCharts(
    document.querySelector("#conversions"),
    options
);
chart.render();

//Sales Report -chart
var options = {
    series: [{
        name: "Page Views",
        type: "bar",
        data: [34, 65, 46, 68, 49, 61, 42, 44, 78, 52, 63, 67],
    },
    {
        name: "Clicks",
        type: "area",
        data: [8, 12, 7, 17, 21, 11, 5, 9, 7, 29, 12, 35],
    },
    {
        name: "Revenue",
        type: "area",
        data: [12, 16, 11, 22, 28, 25, 15, 29, 35, 45, 42, 48],
    }
    ],
    chart: {
        height: 330,
        type: "line",
        toolbar: {
            show: false,
        },
    },
    stroke: {
        dashArray: [0, 0, 2],
        width: [0, 2, 2],
        curve: 'smooth'
    },
    fill: {
        opacity: [1, 1, 1],
        type: ['solid', 'gradient', 'gradient'],
        gradient: {
            type: "vertical",
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
            stops: [0, 90]
        },
    },
    markers: {
        size: [0, 0],
        strokeWidth: 2,
        hover: {
            size: 4,
        },
    },
    xaxis: {
        categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ],
        axisTicks: {
            show: false,
        },
        axisBorder: {
            show: false,
        },
    },
    yaxis: {
        min: 0,
        axisBorder: {
            show: false,
        }
    },
    grid: {
        show: true,
        strokeDashArray: 3,
        xaxis: {
            lines: {
                show: false,
            },
        },
        yaxis: {
            lines: {
                show: true,
            },
        },
        padding: {
            top: 0,
            right: -2,
            bottom: 10,
            left: 10,
        },
    },
    legend: {
        show: true,
        horizontalAlign: "center",
        offsetX: 0,
        offsetY: 5,
        markers: {
            width: 9,
            height: 9,
            radius: 6,
        },
        itemMargin: {
            horizontal: 10,
            vertical: 0,
        },
    },
    plotOptions: {
        bar: {
            columnWidth: "30%",
            barHeight: "70%",
            borderRadius: 3,
        },
    },
    colors: ["#7e67fe", "#17c553", "#7942ed"],
    tooltip: {
        shared: true,
        y: [{
            formatter: function (y) {
                if (typeof y !== "undefined") {
                    return y.toFixed(1) + "k";
                }
                return y;
            },
        },
        {
            formatter: function (y) {
                if (typeof y !== "undefined") {
                    return y.toFixed(1) + "k";
                }
                return y;
            },
        },
        ],
    },
}

var chart = new ApexCharts(
    document.querySelector("#dash-performance-chart"),
    options
);

chart.render();


class VectorMap {

    initWorldMapMarker() {
        const map = new jsVectorMap({
            map: 'world',
            selector: '#world-map-markers',
            zoomOnScroll: true,
            zoomButtons: false,
            markersSelectable: true,
            markers: [
                { name: "Canada", coords: [56.1304, -106.3468] },
                { name: "Brazil", coords: [-14.2350, -51.9253] },
                { name: "Russia", coords: [61, 105] },
                { name: "China", coords: [35.8617, 104.1954] },
                { name: "United States", coords: [37.0902, -95.7129] }
            ],
            markerStyle: {
                initial: { fill: "#7f56da" },
                selected: { fill: "#1bb394" }
            },
            labels: {
                markers: {
                    render: marker => marker.name
                }
            },
            regionStyle: {
                initial: {
                    fill: 'rgba(169,183,197, 0.3)',
                    fillOpacity: 1,
                },
            },
        });
    }

    init() {
        this.initWorldMapMarker();
    }

}

document.addEventListener('DOMContentLoaded', function (e) {
    new VectorMap().init();
});