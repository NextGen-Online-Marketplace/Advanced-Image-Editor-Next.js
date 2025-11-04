import React from "react";

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  icon?: string;
  className?: string;
}

const Heading: React.FC<HeadingProps> = ({ level = 2, children, icon, className = "" }) => {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  
  return (
    <Tag className={`text-gray-800 font-bold flex items-center gap-2 ${className}`}>
      {icon && <i className={icon}></i>}
      {children}
    </Tag>
  );
};

export default Heading;