"use client";

type Props = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
};

export const Skeleton = ({ width = "100%", height = 12, radius = 6, style }: Props) => {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "#e5e7eb",
        ...style,
      }}
    />
  );
};
