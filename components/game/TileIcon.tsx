import React from "react";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";
import { TileType } from "@/lib/game/types";
import { TILE_COLORS } from "@/lib/game/constants";

interface TileIconProps {
  type: TileType;
  size: number;
}

/**
 * Fire icon - a flame shape
 */
function FireIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M12 2C12 2 7 8 7 13C7 16.31 9.69 19 13 19C13 19 11 17 11 14.5C11 12 13 10 13 10C13 10 15 12 15 14.5C15 16 14.5 17.5 13.5 18.5C16 17.5 18 15 18 12C18 7 12 2 12 2Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Water icon - a droplet
 */
function WaterIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M12 2C12 2 5 10.5 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 10.5 12 2 12 2ZM9.5 16C9.22 16 9 15.78 9 15.5C9 13.57 10.57 12 12.5 12C12.78 12 13 12.22 13 12.5C13 12.78 12.78 13 12.5 13C11.12 13 10 14.12 10 15.5C10 15.78 9.78 16 9.5 16Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Earth icon - a leaf
 */
function EarthIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8.16 20C12.68 20 17.5 15 17.5 15C17.5 15 19 12.5 19 9C19 8 18.5 7 18.5 7C18.5 7 18 8 17 8ZM8.16 17.5C7.73 17.5 7.33 17.39 6.96 17.24L8.55 13.26C10.31 13.67 11.8 14.85 12.55 16.5C11.22 17.22 9.67 17.5 8.16 17.5Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Air icon - a wind/swirl
 */
function AirIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M3 8H10C11.1 8 12 7.1 12 6C12 4.9 11.1 4 10 4C9.28 4 8.65 4.37 8.28 4.93"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M3 12H16C17.66 12 19 10.66 19 9C19 7.34 17.66 6 16 6C15.04 6 14.19 6.5 13.67 7.25"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M3 16H13C14.66 16 16 17.34 16 19C16 20.66 14.66 22 13 22C12.04 22 11.19 21.5 10.67 20.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Light icon - a sun/star
 */
function LightIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} fill={color} />
      <Path
        d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Dark icon - a crescent moon
 */
function DarkIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M21 12.79C20.45 12.93 19.87 13 19.27 13C15.03 13 11.57 9.54 11.57 5.3C11.57 4.12 11.85 3.01 12.34 2.02C7.62 2.6 4 6.55 4 11.35C4 16.59 8.22 20.82 13.47 20.82C17.09 20.82 20.21 18.7 21.64 15.62C21.56 14.71 21.34 13.73 21 12.79Z"
        fill={color}
      />
    </Svg>
  );
}

export default function TileIcon({ type, size }: TileIconProps) {
  const color = TILE_COLORS[type];
  const iconSize = size * 0.6;

  switch (type) {
    case TileType.Fire:
      return <FireIcon size={iconSize} color={color} />;
    case TileType.Water:
      return <WaterIcon size={iconSize} color={color} />;
    case TileType.Earth:
      return <EarthIcon size={iconSize} color={color} />;
    case TileType.Air:
      return <AirIcon size={iconSize} color={color} />;
    case TileType.Light:
      return <LightIcon size={iconSize} color={color} />;
    case TileType.Dark:
      return <DarkIcon size={iconSize} color={color} />;
    default:
      return null;
  }
}
