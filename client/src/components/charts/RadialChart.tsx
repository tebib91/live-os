import React from 'react';
import ReactApexChart from 'react-apexcharts';

type ChartProps = {
    // using `interface` is also ok
    [x: string]: any;
};
type ChartState = {
    chartData: any[];
    chartOptions: any;
};

class RadialChart extends React.Component<ChartProps, ChartState> {
    constructor(props: { chartData: any[]; chartOptions: any }) {
        super(props);

        this.state = {
            chartData: [],
            chartOptions: {}
        };
    }

    componentDidMount() {
        this.setState({
            chartData: this.props.chartData,
            chartOptions: this.props.chartOptions
        });
        console.log('test', this.props.chartData);
    }

    render() {
        return (
            <ReactApexChart
                options={this.state.chartOptions}
                series={this.state.chartData}
                type='radialBar'
                width='100%'
                height='100%'
            />
        );
    }
}

export default RadialChart;
