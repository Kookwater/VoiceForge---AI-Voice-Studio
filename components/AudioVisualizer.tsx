import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyser || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Configure analyser
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Scales
    const xScale = d3.scaleLinear().domain([0, bufferLength]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 255]).range([height, 0]);

    // Line generator
    const line = d3.line<number>()
      .x((d, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveBasis); // Smooth curve

    // Draw loop
    let animationId: number;
    
    const renderFrame = () => {
      animationId = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      // Create a nice mirrored wave effect or just a simple frequency graph
      // Let's do a center-out mirrored visualization for a "voice" look
      
      const chartData = Array.from(dataArray);
      // Simplify data for performance and aesthetics (take every nth sample)
      const factor = 2; // downsample
      const simpleData = chartData.filter((_, i) => i % factor === 0);

      svg.selectAll('path')
        .data([simpleData])
        .join('path')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', isPlaying ? '#4f46e5' : '#334155') // Indigo when playing, Slate when idle
        .attr('stroke-width', 3);
        
      // Add a glow effect
      svg.style('filter', isPlaying ? 'drop-shadow(0 0 10px rgba(79, 70, 229, 0.5))' : 'none');
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[150px] relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
      <svg ref={svgRef} className="w-full h-full absolute inset-0" preserveAspectRatio="none" />
      {!isPlaying && (
         <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-medium">
            Waiting for audio...
         </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
