import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './D3Heatmap.css';

interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

interface D3HeatmapProps {
  data: HeatmapData[];
  width?: number;
  height?: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  colorScheme?: string[];
  onCellClick?: (data: HeatmapData) => void;
  className?: string;
}

const D3Heatmap: React.FC<D3HeatmapProps> = ({
  data,
  width = 600,
  height = 400,
  title,
  xLabel,
  yLabel,
  colorScheme = ['#f7fbff', '#08519c'],
  onCellClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 50, right: 80, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get unique x and y values
    const xValues = Array.from(new Set(data.map(d => d.x))).sort();
    const yValues = Array.from(new Set(data.map(d => d.y))).sort();

    // Create scales
    const xScale = d3.scaleBand()
      .domain(xValues)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(yValues)
      .range([0, innerHeight])
      .padding(0.05);

    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain(d3.extent(data, d => d.value) as [number, number]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(title);
    }

    // Create tooltip div
    const tooltipDiv = d3.select(svgRef.current.parentElement)
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Create heatmap cells
    g.selectAll('.cell')
      .data(data)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.x) || 0)
      .attr('y', d => yScale(d.y) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => colorScale(d.value))
      .style('stroke', 'white')
      .style('stroke-width', 1)
      .style('cursor', onCellClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d) {
        tooltipDiv.transition()
          .duration(200)
          .style('opacity', .9);
        
        tooltipDiv.html(`
          <strong>${d.x} × ${d.y}</strong><br/>
          Value: ${d.value.toLocaleString()}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        d3.select(this)
          .style('stroke', '#333')
          .style('stroke-width', 2);
      })
      .on('mouseout', function() {
        tooltipDiv.transition()
          .duration(500)
          .style('opacity', 0);

        d3.select(this)
          .style('stroke', 'white')
          .style('stroke-width', 1);
      })
      .on('click', function(event, d) {
        if (onCellClick) {
          onCellClick(d);
        }
      });

    // Add x-axis
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add y-axis
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add x-axis label
    if (xLabel) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text(xLabel);
    }

    // Add y-axis label
    if (yLabel) {
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#666')
        .text(yLabel);
    }

    // Add color legend
    const legendWidth = 20;
    const legendHeight = innerHeight;
    const legendSteps = 10;

    const legendScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.value) as [number, number])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.0f'));

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - margin.right + 10},${margin.top})`);

    // Create gradient for legend
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    const [minValue, maxValue] = d3.extent(data, d => d.value) as [number, number];
    
    for (let i = 0; i <= legendSteps; i++) {
      const offset = (i / legendSteps) * 100;
      const value = minValue + (maxValue - minValue) * (i / legendSteps);
      gradient.append('stop')
        .attr('offset', offset + '%')
        .attr('stop-color', colorScale(value));
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .style('stroke', '#ccc')
      .style('stroke-width', 1);

    legend.append('g')
      .attr('transform', `translate(${legendWidth},0)`)
      .call(legendAxis);

    // Cleanup function
    return () => {
      tooltipDiv.remove();
    };
  }, [data, width, height, title, xLabel, yLabel, colorScheme, onCellClick]);

  return (
    <div className={`d3-heatmap-container ${className}`} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: 'white' }}
      />
    </div>
  );
};

// Helper function to convert tabular data to heatmap format
export const prepareHeatmapData = (
  data: any[],
  xField: string,
  yField: string,
  valueField?: string,
  aggregation: 'count' | 'sum' | 'avg' = 'count'
): HeatmapData[] => {
  const grouped: { [key: string]: { [key: string]: number[] } } = {};

  // Group data by x and y fields
  data.forEach(row => {
    const x = String(row[xField] || 'null');
    const y = String(row[yField] || 'null');
    const value = valueField ? Number(row[valueField]) || 0 : 1;

    if (!grouped[x]) grouped[x] = {};
    if (!grouped[x][y]) grouped[x][y] = [];
    
    grouped[x][y].push(value);
  });

  // Convert to heatmap format with aggregation
  const heatmapData: HeatmapData[] = [];
  
  Object.keys(grouped).forEach(x => {
    Object.keys(grouped[x]).forEach(y => {
      const values = grouped[x][y];
      let aggregatedValue: number;
      
      switch (aggregation) {
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
        default:
          aggregatedValue = values.length;
          break;
      }
      
      heatmapData.push({ x, y, value: aggregatedValue });
    });
  });

  return heatmapData;
};

export default D3Heatmap;", "original_text": "", "replace_all": false}]