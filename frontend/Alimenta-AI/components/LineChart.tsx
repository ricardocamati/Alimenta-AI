import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';

interface LineChartProps {
  data: { semana: string; quantidade_atendida: number }[];
  demandaPrevista: number;
  theme: { text: string; textSecondary: string; background: string };
}

export function LineChart({ data, demandaPrevista, theme }: LineChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={styles.placeholder}>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Dados insuficientes para gerar o gráfico.{'\n'}
          É necessário histórico de pelo menos 2 semanas.
        </ThemedText>
      </View>
    );
  }

  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Encontrar valores min/max
  const valores = data.map(d => d.quantidade_atendida);
  const maxReal = Math.max(...valores);
  const maxValor = Math.max(maxReal, demandaPrevista) * 1.15;
  const minValor = 0;
  const range = maxValor - minValor;

  // Helpers de escala (com guarda contra divisão por zero)
  const denomX = data.length - 1;
  const xScale = (index: number) =>
    padding.left + (index / denomX) * chartWidth;
  const yScale = (valor: number) =>
    range === 0
      ? padding.top + chartHeight / 2
      : padding.top + chartHeight - ((valor - minValor) / range) * chartHeight;

  // Construir path da linha
  const linePath = data.map((d, i) => {
    const x = xScale(i);
    const y = yScale(d.quantidade_atendida);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Linha da demanda prevista (horizontal tracejada)
  const yDemanda = yScale(demandaPrevista);

  // Eixo Y labels
  const yLabels = [0, maxValor * 0.33, maxValor * 0.66, maxValor];

  // Eixo X labels (mostrar apenas algumas datas para não poluir)
  const xStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Grid horizontal */}
        {yLabels.map((val, i) => {
          const y = yScale(val);
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#444"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            </G>
          );
        })}

        {/* Eixo Y labels */}
        {yLabels.map((val, i) => {
          const y = yScale(val);
          return (
            <SvgText
              key={`ylabel-${i}`}
              x={padding.left - 8}
              y={y + 4}
              fontSize="9"
              fill={theme.textSecondary}
              textAnchor="end"
            >
              {Math.round(val)} kg
            </SvgText>
          );
        })}

        {/* Eixo X labels */}
        {data.map((d, i) => {
          if (i % xStep !== 0 && i !== data.length - 1) return null;
          const x = xScale(i);
          const label = d.semana.slice(5); // "MM-DD"
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={x}
              y={height - padding.bottom + 15}
              fontSize="8"
              fill={theme.textSecondary}
              textAnchor="middle"
              transform={`rotate(-30, ${x}, ${height - padding.bottom + 15})`}
            >
              {label}
            </SvgText>
          );
        })}

        {/* Linha de demanda prevista (tracejada vermelha) */}
        <Line
          x1={padding.left}
          y1={yDemanda}
          x2={width - padding.right}
          y2={yDemanda}
          stroke="#e91e63"
          strokeWidth="2"
          strokeDasharray="6,4"
        />
        <SvgText
          x={width - padding.right + 5}
          y={yDemanda + 3}
          fontSize="9"
          fill="#e91e63"
          textAnchor="start"
        >
          {Math.round(demandaPrevista)} kg
        </SvgText>

        {/* Linha do histórico */}
        <Path
          d={linePath}
          stroke="#3c87f7"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos da linha */}
        {data.map((d, i) => {
          const x = xScale(i);
          const y = yScale(d.quantidade_atendida);
          return (
            <G key={`point-${i}`}>
              <Circle cx={x} cy={y} r="4" fill="#3c87f7" />
              <Circle cx={x} cy={y} r="2" fill={theme.background} />
            </G>
          );
        })}

        {/* Área preenchida suave abaixo da linha */}
        <Path
          d={`${linePath} L ${xScale(data.length - 1)} ${padding.top + chartHeight} L ${xScale(0)} ${padding.top + chartHeight} Z`}
          fill="#3c87f7"
          fillOpacity="0.1"
          stroke="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
});
