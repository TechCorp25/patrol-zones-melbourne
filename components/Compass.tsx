import React, { memo, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Svg, Circle, Line, Text as SvgText, Path } from "react-native-svg";
import Colors from "@/constants/colors";

interface CompassProps {
  heading: number;
  size?: number;
}

function CompassInner({ heading, size = 120 }: CompassProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Normalize to prevent spinning the long way round
    let current = rotation.value % 360;
    let target = -heading;
    let diff = ((target - current + 540) % 360) - 180;
    rotation.value = withSpring(current + diff, {
      damping: 20,
      stiffness: 120,
    });
  }, [heading]);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const r = size / 2;
  const innerR = r - 6;
  const tickLen = 8;

  const staticSvgElements = useMemo(() => {
    const ticks = Array.from({ length: 36 }).map((_, i) => {
      const angle = (i * 10 * Math.PI) / 180;
      const isMajor = i % 9 === 0;
      const len = isMajor ? tickLen : tickLen * 0.5;
      const x1 = r + (innerR - 1) * Math.sin(angle);
      const y1 = r - (innerR - 1) * Math.cos(angle);
      const x2 = r + (innerR - len) * Math.sin(angle);
      const y2 = r - (innerR - len) * Math.cos(angle);
      return (
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isMajor ? Colors.dark.text : Colors.dark.textMuted}
          strokeWidth={isMajor ? 1.5 : 0.8}
        />
      );
    });

    const cardinals = [
      { label: "N", angle: 0, color: "#EF4444" },
      { label: "E", angle: 90, color: Colors.dark.text },
      { label: "S", angle: 180, color: Colors.dark.text },
      { label: "W", angle: 270, color: Colors.dark.text },
    ].map(({ label, angle, color }) => {
      const rad = (angle * Math.PI) / 180;
      const dist = innerR - tickLen - 10;
      const x = r + dist * Math.sin(rad);
      const y = r - dist * Math.cos(rad);
      return (
        <SvgText
          key={label}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.1}
          fontWeight="700"
        >
          {label}
        </SvgText>
      );
    });

    return { ticks, cardinals };
  }, [size]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[StyleSheet.absoluteFill, dialStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={r}
            cy={r}
            r={innerR}
            fill="rgba(10,22,40,0.92)"
            stroke={Colors.dark.border}
            strokeWidth={1.5}
          />
          {staticSvgElements.ticks}
          {staticSvgElements.cardinals}
          <Path
            d={`M ${r} ${r - innerR + tickLen + 18} L ${r - 5} ${r + 10} L ${r} ${r + 4} L ${r + 5} ${r + 10} Z`}
            fill="#EF4444"
            opacity={0.95}
          />
          <Path
            d={`M ${r} ${r + innerR - tickLen - 18} L ${r - 5} ${r - 10} L ${r} ${r - 4} L ${r + 5} ${r - 10} Z`}
            fill={Colors.dark.textMuted}
            opacity={0.8}
          />
        </Svg>
      </Animated.View>

      <View
        style={[
          styles.pivot,
          {
            width: size * 0.09,
            height: size * 0.09,
            borderRadius: size * 0.045,
            left: r - size * 0.045,
            top: r - size * 0.045,
          },
        ]}
      />
    </View>
  );
}

const Compass = memo(CompassInner);
export default Compass;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  pivot: {
    position: "absolute",
    backgroundColor: Colors.dark.tint,
    borderWidth: 2,
    borderColor: Colors.dark.background,
    zIndex: 10,
  },
});
