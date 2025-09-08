// Provider interface for depth chart data
import { DepthChart, ProcessedDepthChart } from '@/types/teams';

export interface DepthChartProvider {
  getDepthChart(teamId: string, season?: number): Promise<DepthChart | null>;
  getProcessedDepthChart(teamId: string, season?: number): Promise<ProcessedDepthChart | null>;
}
